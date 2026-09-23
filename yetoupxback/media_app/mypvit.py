"""Client HTTP isolé pour l'API MyPVit v2 (docs.mypvit.pro).

Ce module ne connaît rien de Pixia (Media, Purchase, plans) : il ne fait que
parler la langue de MyPVit (endpoints, headers, payloads) et lever des erreurs
explicites. Toute la logique métier (achat, activation de plan) vit dans
`media_app.payments`, qui consomme ce client.

Repris de l'intégration NOXIA (subscriptions/payments/mypvit_client.py), déjà
validée en production.

Référence API : https://docs.mypvit.pro/fr/intro/getting-started
"""

import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 15  # secondes — appel réseau vers un agrégateur de paiement tiers
SECRET_CACHE_KEY = "mypvit:secret_key"
SECRET_CACHE_TTL = 3300  # 55 min — la clé MyPVit expire à 3600s

# Codes opérateur MyPVit.
AIRTEL_MONEY = "AIRTEL_MONEY"
MOOV_MONEY = "MOOV_MONEY"
VISA_MASTERCARD = "VISA_MASTERCARD"

# Code MyPVit TRANSACTION_NOT_FOUND (Check Status).
TRANSACTION_NOT_FOUND = 4006
# L'IP publique du serveur n'est pas autorisée dans le compte marchand.
INVALID_MERCHANT_IP_ADDRESS = 1000


class MyPvitError(Exception):
    """Erreur côté MyPVit (réponse HTTP en erreur, ou champ manquant). Le
    message est destiné aux logs, pas à être affiché tel quel au client.

    `mypvit_status_code` : le `status_code` numérique du corps JSON MyPVit
    (ex: 4006 pour TRANSACTION_NOT_FOUND) quand disponible, sinon None."""

    def __init__(self, message, mypvit_status_code=None):
        super().__init__(message)
        self.mypvit_status_code = mypvit_status_code


class MyPvitNotConfiguredError(MyPvitError):
    """Une variable MYPVIT_* requise est absente des settings."""


def _require_setting(name):
    value = getattr(settings, name, "")
    if not value:
        raise MyPvitNotConfiguredError(f"{name} n'est pas configuré — voir .env.example (section MyPVit).")
    return value


def is_configured() -> bool:
    return all(
        getattr(settings, name, "")
        for name in (
            "MYPVIT_ACCOUNT_CODE", "MYPVIT_API_PASSWORD", "MYPVIT_CODE_URL_SECRET",
            "MYPVIT_CODE_URL_PAYMENT", "MYPVIT_CODE_URL_STATUS", "MYPVIT_CALLBACK_URL_CODE",
        )
    )


def card_is_configured() -> bool:
    return is_configured() and all(
        getattr(settings, name, "")
        for name in (
            "MYPVIT_CODE_URL_LINK", "MYPVIT_SUCCESS_REDIRECTION_URL_CODE", "MYPVIT_FAILED_REDIRECTION_URL_CODE",
        )
    )


def _mypvit_status_code(exc):
    response = getattr(exc, "response", None)
    if response is None:
        return None
    try:
        return response.json().get("status_code")
    except ValueError:
        return None


def _error_body(exc):
    """Corps de la réponse en erreur — `str(exc)` ne contient que le code HTTP,
    jamais le message explicatif renvoyé par MyPVit (ex: champ rejeté sur 422)."""
    response = getattr(exc, "response", None)
    if response is None:
        return ""
    try:
        return f" — réponse MyPVit : {response.json()}"
    except ValueError:
        return f" — réponse MyPVit : {response.text[:500]}"


def _base_url():
    return getattr(settings, "MYPVIT_BASE_URL", "https://api.mypvit.pro/v2").rstrip("/")


def _root_url():
    """Racine sans `/v2` — `status` n'existe que sous `/{code-url}/status`."""
    return _base_url().removesuffix("/v2")


# Chaque compte d'opération MyPVit est lié à UN opérateur (403
# OPERATOR_AND_OPERATION_ACCOUNT_MISMATCH sinon) : on choisit le compte selon
# l'opérateur, avec repli sur MYPVIT_ACCOUNT_CODE.
_OPERATOR_ACCOUNT_SETTINGS = {
    MOOV_MONEY: "MYPVIT_ACCOUNT_CODE_MOOV",
    AIRTEL_MONEY: "MYPVIT_ACCOUNT_CODE_AIRTEL",
    VISA_MASTERCARD: "MYPVIT_ACCOUNT_CODE_VISA_MASTERCARD",
}


def account_code_for(operator_code=None):
    setting_name = _OPERATOR_ACCOUNT_SETTINGS.get(operator_code)
    if setting_name and getattr(settings, setting_name, ""):
        return getattr(settings, setting_name)
    return _require_setting("MYPVIT_ACCOUNT_CODE")


def renew_secret_key(account_code=None):
    """POST /{code_url_secret}/renew-secret — nouvelle clé secrète (~3600s)."""
    code_url_secret = _require_setting("MYPVIT_CODE_URL_SECRET")
    account_code = account_code or _require_setting("MYPVIT_ACCOUNT_CODE")
    password = _require_setting("MYPVIT_API_PASSWORD")

    url = f"{_base_url()}/{code_url_secret}/renew-secret"
    try:
        response = requests.post(
            url,
            data={"operationAccountCode": account_code, "password": password},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.error("MyPVit renew-secret a échoué (account_code=%s) : %s%s", account_code, exc, _error_body(exc))
        if _mypvit_status_code(exc) == INVALID_MERCHANT_IP_ADDRESS:
            logger.error(
                "MyPVit refuse l'IP publique de ce serveur : ajoutez-la aux adresses IP autorisées "
                "du compte marchand sur mypvit.pro (IP visible via https://api.ipify.org)."
            )
        raise MyPvitError(
            f"Échec du renouvellement de la clé secrète MyPVit : {exc}", mypvit_status_code=_mypvit_status_code(exc),
        ) from exc

    data = response.json()
    secret = data.get("secret")
    if not secret:
        raise MyPvitError("Réponse renew-secret inattendue (pas de 'secret').")
    return secret, data.get("expires_in", 3600)


def get_secret_key(account_code=None, force_refresh=False):
    """Clé secrète valide pour `account_code`, depuis le cache si possible. Une
    clé est mise en cache PAR compte : une clé générée pour un compte est
    rejetée sur les requêtes d'un autre (observé en production)."""
    account_code = account_code or _require_setting("MYPVIT_ACCOUNT_CODE")
    cache_key = f"{SECRET_CACHE_KEY}:{account_code}"
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached
    secret, expires_in = renew_secret_key(account_code=account_code)
    cache.set(cache_key, secret, min(SECRET_CACHE_TTL, max(int(expires_in) - 60, 60)))
    return secret


def _auth_headers(account_code=None, force_refresh=False):
    return {
        "X-Secret": get_secret_key(account_code=account_code, force_refresh=force_refresh),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _is_authentication_failed(exc):
    """AUTHENTICATION_FAILED (status_code 3100, HTTP 403) : clé expirée/rejetée."""
    response = getattr(exc, "response", None)
    return response is not None and response.status_code == 403 and _mypvit_status_code(exc) == 3100


def _send(method, url, *, error_label, log_context="", json_body=None, params=None, account_code=None):
    """Requête authentifiée, retentée UNE fois avec une clé renouvelée si la
    clé en cache est rejetée. Toute autre erreur est levée immédiatement."""
    for attempt, force_refresh in enumerate((False, True)):
        try:
            response = requests.request(
                method, url, json=json_body, params=params,
                headers=_auth_headers(account_code=account_code, force_refresh=force_refresh),
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            if attempt == 0 and _is_authentication_failed(exc):
                logger.warning("MyPVit %s : clé secrète rejetée, nouvelle tentative.", error_label)
                continue
            logger.error("MyPVit %s a échoué%s : %s%s", error_label, log_context, exc, _error_body(exc))
            raise MyPvitError(f"{error_label} : {exc}", mypvit_status_code=_mypvit_status_code(exc)) from exc


def create_transaction(*, amount, reference, operator_code, customer_account_number,
                       owner_charge="CUSTOMER", free_info="", product=""):
    """POST /{code_url_payment}/rest — paiement Mobile Money (push USSD).

    La réponse synchrone n'est qu'un accusé de réception (PENDING) : le statut
    définitif arrive par webhook. Ne jamais rien activer sur ce seul retour."""
    code_url_payment = _require_setting("MYPVIT_CODE_URL_PAYMENT")
    account_code = account_code_for(operator_code)
    payload = {
        "amount": float(amount),
        "reference": reference,
        "merchant_operation_account_code": account_code,
        "callback_url_code": _require_setting("MYPVIT_CALLBACK_URL_CODE"),
        "transaction_type": "PAYMENT",
        "service": "RESTFUL",
        "operator_code": operator_code,
        "customer_account_number": customer_account_number,
        "owner_charge": owner_charge,
        "owner_charge_operator": owner_charge,
    }
    if free_info:
        payload["free_info"] = free_info[:15]
    if product:
        payload["product"] = product[:15]

    return _send(
        "POST", f"{_base_url()}/{code_url_payment}/rest", json_body=payload, account_code=account_code,
        error_label="Échec de l'initiation du paiement MyPVit", log_context=f" (reference={reference})",
    )


def create_link_transaction(*, amount, reference, customer_account_number,
                            owner_charge="CUSTOMER", free_info="", product=""):
    """POST /{code_url_link}/link — paiement carte (Visa/Mastercard).

    Renvoie l'URL d'un formulaire bancaire hébergé par PVit vers lequel rediriger
    le client. Le statut final arrive quand même par webhook.
    `customer_account_number` est exigé par MyPVit même pour la carte (422 sinon)."""
    code_url_link = _require_setting("MYPVIT_CODE_URL_LINK")
    account_code = account_code_for(VISA_MASTERCARD)
    payload = {
        "amount": float(amount),
        "reference": reference,
        "merchant_operation_account_code": account_code,
        "callback_url_code": _require_setting("MYPVIT_CALLBACK_URL_CODE"),
        "transaction_type": "PAYMENT",
        "service": "VISA_MASTERCARD",
        "customer_account_number": customer_account_number,
        "owner_charge": owner_charge,
        "owner_charge_operator": owner_charge,
        "success_redirection_url_code": _require_setting("MYPVIT_SUCCESS_REDIRECTION_URL_CODE"),
        "failed_redirection_url_code": _require_setting("MYPVIT_FAILED_REDIRECTION_URL_CODE"),
    }
    if free_info:
        payload["free_info"] = free_info[:15]
    if product:
        payload["product"] = product[:15]

    return _send(
        "POST", f"{_base_url()}/{code_url_link}/link", json_body=payload, account_code=account_code,
        error_label="Échec de la création du lien de paiement carte", log_context=f" (reference={reference})",
    )


def get_transaction_status(*, transaction_id, operator_code=None, transaction_operation="PAYMENT"):
    """GET /{code_url_status}/status — source de vérité côté MyPVit.

    `operator_code` doit correspondre au compte qui a CRÉÉ la transaction :
    un autre compte renvoie TRANSACTION_NOT_FOUND."""
    code_url_status = _require_setting("MYPVIT_CODE_URL_STATUS")
    account_code = account_code_for(operator_code)
    params = {
        "transactionId": transaction_id,
        "accountOperationCode": account_code,
        "transactionOperation": transaction_operation,
    }
    return _send(
        "GET", f"{_root_url()}/{code_url_status}/status", params=params, account_code=account_code,
        error_label="Échec de la vérification de statut MyPVit", log_context=f" (transaction_id={transaction_id})",
    )


def get_kyc(*, customer_account_number, operator_code):
    """GET /{code_url_kyc}/kyc — identité du titulaire du numéro Mobile Money."""
    code_url_kyc = _require_setting("MYPVIT_CODE_URL_KYC")
    params = {"customerAccountNumber": customer_account_number, "operatorCode": operator_code}
    return _send(
        "GET", f"{_base_url()}/{code_url_kyc}/kyc", params=params,
        error_label="Échec de la vérification KYC MyPVit",
    )
