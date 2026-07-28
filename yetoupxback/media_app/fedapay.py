"""FedaPay — paiement carte Visa / Mastercard (formulaire bancaire classique)."""

import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

FEDAPAY_API_BASE = {
    "sandbox": "https://sandbox-api.fedapay.com/v1",
    "live": "https://api.fedapay.com/v1",
}


def fcfa_to_usd(amount_fcfa: int):
    """Conversion indicative FCFA → USD (sessions carte)."""
    from decimal import Decimal, ROUND_HALF_UP

    rate = Decimal(str(getattr(settings, "FCFA_PER_USD", 650)))
    if rate <= 0:
        rate = Decimal("650")
    usd = (Decimal(amount_fcfa) / rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return max(usd, Decimal("1.00"))


def is_configured() -> bool:
    return bool(getattr(settings, "FEDAPAY_SECRET_KEY", "").strip())


def _api_base() -> str:
    env = getattr(settings, "FEDAPAY_ENVIRONMENT", "sandbox").strip().lower()
    return FEDAPAY_API_BASE.get(env, FEDAPAY_API_BASE["sandbox"])


def _api_key() -> str:
    return getattr(settings, "FEDAPAY_SECRET_KEY", "").strip()


def _fedapay_request(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{_api_base().rstrip('/')}/{path.lstrip('/')}"
    data = json.dumps(body).encode() if body is not None else None
    req = Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {_api_key()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method=method,
    )
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def _extract_resource(payload: dict, *keys: str) -> dict:
    """FedaPay renvoie parfois {transaction: ...}, parfois à la racine, parfois v1/transaction."""
    if not isinstance(payload, dict):
        return {}
    for key in keys:
        nested = payload.get(key)
        if isinstance(nested, dict):
            return nested
    if "id" in payload or "url" in payload:
        return payload
    for value in payload.values():
        if isinstance(value, dict) and ("id" in value or "url" in value):
            return value
    return payload


def create_payment(
    order_id: str,
    amount_fcfa: int,
    customer_email: str,
    customer_name: str = "",
    description: str = "Achat Gabon Pixel",
) -> dict:
    if not is_configured():
        return {
            "success": False,
            "message": (
                "Paiement carte non configuré. Ajoutez FEDAPAY_SECRET_KEY dans le backend "
                "(compte gratuit sur sandbox.fedapay.com)."
            ),
        }

    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    callback_url = f"{frontend}/paiement/retour?ref={order_id}"

    name = (customer_name or "").strip()
    parts = name.split(None, 1) if name else []
    firstname = parts[0] if parts else "Client"
    lastname = parts[1] if len(parts) > 1 else "Gabon Pixel"

    currency = getattr(settings, "FEDAPAY_CURRENCY", "XOF").strip().upper() or "XOF"

    try:
        tx_payload = _fedapay_request(
            "POST",
            "transactions",
            {
                "description": description[:255],
                "amount": int(amount_fcfa),
                "currency": {"iso": currency},
                "callback_url": callback_url,
                "customer": {
                    "firstname": firstname[:100],
                    "lastname": lastname[:100],
                    "email": customer_email,
                },
            },
        )
        transaction = _extract_resource(tx_payload, "transaction", "v1/transaction")
        tx_id = transaction.get("id")
        if not tx_id:
            return {
                "success": False,
                "message": "Réponse FedaPay invalide (transaction manquante).",
                "debug": str(tx_payload)[:300],
            }

        token_payload = _fedapay_request(
            "POST",
            f"transactions/{tx_id}/token",
            {"mode": getattr(settings, "FEDAPAY_CHECKOUT_MODE", "card")},
        )
        token_data = _extract_resource(token_payload, "token", "v1/token")
        payment_url = token_data.get("url") or token_payload.get("url")
        if not payment_url:
            return {
                "success": False,
                "message": "FedaPay n'a pas renvoyé de lien de paiement.",
                "debug": str(token_payload)[:300],
            }

        # Forcer l'onglet carte (Visa/Mastercard) — pas Mobile Money seul
        checkout_mode = getattr(settings, "FEDAPAY_CHECKOUT_MODE", "card")
        if checkout_mode and "mode=" not in payment_url:
            sep = "&" if "?" in payment_url else "?"
            payment_url = f"{payment_url}{sep}mode={checkout_mode}"

        logger.info("FedaPay transaction %s créée (order=%s)", tx_id, order_id)
        return {
            "success": True,
            "payment_url": payment_url,
            "transaction_id": str(tx_id),
        }
    except HTTPError as exc:
        body = exc.read().decode()[:500] if exc.fp else ""
        logger.error("FedaPay HTTP %s: %s", exc.code, body)
        return {"success": False, "message": f"Erreur FedaPay (HTTP {exc.code}).", "debug": body}
    except (URLError, json.JSONDecodeError, TimeoutError, ValueError) as exc:
        logger.error("FedaPay: %s", exc)
        return {"success": False, "message": "Impossible de joindre FedaPay."}


def verify_transaction(transaction_id: str) -> dict:
    """Vérifie le statut réel côté API (ne pas se fier uniquement à l'URL de retour)."""
    if not is_configured():
        return {"success": False, "status": "", "message": "FedaPay non configuré."}
    try:
        payload = _fedapay_request("GET", f"transactions/{transaction_id}", None)
        transaction = _extract_resource(payload, "transaction", "v1/transaction")
        status = str(transaction.get("status", "")).lower()
        return {"success": True, "status": status, "transaction": transaction}
    except (HTTPError, URLError, json.JSONDecodeError, TimeoutError) as exc:
        logger.error("FedaPay verify %s: %s", transaction_id, exc)
        return {"success": False, "status": "", "message": "Vérification FedaPay impossible."}
