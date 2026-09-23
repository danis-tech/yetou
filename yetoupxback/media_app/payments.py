"""Logique métier des paiements Pixia via MyPVit.

Règles de sécurité :
- le montant est TOUJOURS calculé côté serveur (prix du média ou du plan) ;
- un achat / un abonnement n'est accordé QUE par `confirm_payment`, après
  contre-vérification du statut auprès de MyPVit (API Check Status) — jamais
  sur la foi du frontend ni d'un webhook non vérifié ;
- `confirm_payment` est idempotent et verrouille la session (select_for_update)
  pour qu'un webhook rejoué ou concurrent ne crée jamais deux achats.
"""

import logging
import re
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction as db_transaction
from django.utils import timezone

from . import mypvit
from .models import Media, PaymentLog, PaymentSession, Purchase

logger = logging.getLogger(__name__)

# Le client paie les frais de transaction : le montant débité côté Pixia est
# exactement le prix affiché.
OWNER_CHARGE = "CUSTOMER"

# Nombre de téléchargements accordés par achat selon le plan actif.
PLAN_DOWNLOADS = {"none": 1, "monthly": 10, "pro": 999}

# Moyen de paiement affiché (frontend) → code opérateur MyPVit.
METHOD_TO_OPERATOR = {
    "Airtel Money": mypvit.AIRTEL_MONEY,
    "Moov Money": mypvit.MOOV_MONEY,
    "Visa": mypvit.VISA_MASTERCARD,
    "Mastercard": mypvit.VISA_MASTERCARD,
}

FAILURE_REASON_MAP = (
    ("insuffi", "Solde insuffisant sur votre compte mobile money."),
    ("balance", "Solde insuffisant sur votre compte mobile money."),
    ("pin", "Code PIN incorrect."),
    ("incorrect", "Code PIN incorrect."),
    ("invalid", "Informations de paiement invalides."),
    ("annul", "Paiement annulé."),
    ("cancel", "Paiement annulé."),
    ("refus", "Paiement refusé par votre opérateur."),
    ("declin", "Paiement refusé par votre opérateur."),
    ("reject", "Paiement refusé par votre opérateur."),
    ("timeout", "Le délai de paiement a expiré. Veuillez réessayer."),
    ("expir", "Le délai de paiement a expiré. Veuillez réessayer."),
)

GABON_LOCAL_NUMBER_LENGTH = 9


def friendly_failure_reason(raw_message: str) -> str:
    lowered = (raw_message or "").lower()
    for marker, friendly in FAILURE_REASON_MAP:
        if marker in lowered:
            return friendly
    return "Le paiement a échoué ou a été annulé."


def _generate_reference() -> str:
    """≤ 20 caractères alphanumériques (contrainte MyPVit), jamais réutilisée."""
    return f"PX{uuid.uuid4().hex[:18].upper()}"


def to_local_gabon_number(raw_phone: str) -> str:
    """Normalise vers le format local attendu par MyPVit (9 chiffres, ex:
    '074821635'). Renvoie '' si le résultat n'est pas exactement 9 chiffres."""
    digits = re.sub(r"\D", "", raw_phone or "")
    if digits.startswith("241") and len(digits) > GABON_LOCAL_NUMBER_LENGTH:
        digits = digits[3:]
    if len(digits) == 8 and digits[0] in "67":
        digits = f"0{digits}"
    return digits if len(digits) == GABON_LOCAL_NUMBER_LENGTH and digits.startswith("0") else ""


def _verify_kyc(*, customer_account_number: str, operator_code: str) -> None:
    """Vérifie que le numéro Mobile Money est rattaché à un titulaire identifié.
    Une panne de l'API KYC elle-même n'empêche pas le paiement."""
    if not getattr(settings, "MYPVIT_CODE_URL_KYC", ""):
        return
    try:
        result = mypvit.get_kyc(customer_account_number=customer_account_number, operator_code=operator_code)
    except mypvit.MyPvitError as exc:
        # Panne / problème de configuration côté marchand (IP non autorisée,
        # authentification) : ce n'est pas le numéro du client qui est en cause.
        if exc.mypvit_status_code in (None, mypvit.INVALID_MERCHANT_IP_ADDRESS, 3100):
            logger.warning("KYC MyPVit indisponible (%s) — paiement autorisé malgré tout.", exc)
            return
        raise ValidationError("Ce numéro n'est pas reconnu par l'opérateur. Vérifiez le numéro saisi.") from exc
    if not (result or {}).get("data"):
        raise ValidationError("Impossible de vérifier l'identité associée à ce numéro. Vérifiez le numéro saisi.")


def initiate_payment(*, user, method: str, phone: str, media: Media | None = None, plan: str = "") -> PaymentSession:
    """Crée une PaymentSession PENDING et l'envoie à MyPVit. N'accorde JAMAIS
    l'achat ici : seul `confirm_payment` le fait, une fois MyPVit consulté."""
    from users_app.models import User

    operator_code = METHOD_TO_OPERATOR.get(method)
    if not operator_code:
        raise ValidationError("Moyen de paiement non supporté.")
    if (media is None) == (not plan):
        raise ValidationError("Indiquez soit un média, soit un abonnement.")
    if plan and plan not in User.PLAN_PRICES:
        raise ValidationError("Abonnement invalide.")

    is_card = operator_code == mypvit.VISA_MASTERCARD
    if is_card and not mypvit.card_is_configured():
        raise ValidationError("Le paiement par carte n'est pas encore disponible.")

    customer_account_number = to_local_gabon_number(phone)
    if not customer_account_number:
        raise ValidationError("Numéro de téléphone invalide. Format attendu : 077 00 00 00.")

    if media is not None and Purchase.objects.filter(
        user=user, media=media, payment_status__in=Purchase.PAID_STATUSES,
    ).exists():
        raise ValidationError("Vous avez déjà acheté ce média : retrouvez-le dans vos téléchargements.")

    if not is_card:
        _verify_kyc(customer_account_number=customer_account_number, operator_code=operator_code)

    amount = media.price if media is not None else User.PLAN_PRICES[plan]
    session = PaymentSession.objects.create(
        reference=_generate_reference(),
        provider="mypvit",
        user=user,
        media=media,
        amount_fcfa=amount,
        method=method,
        plan=plan,
        customer_account_number=customer_account_number,
    )
    PaymentLog.objects.create(
        amount=amount, method=method, reference=session.reference,
        phone=customer_account_number, status="pending", message="MyPVit initié",
    )

    product = "MEDIA" if media is not None else "ABONNEMENT"
    free_info = f"Media {media.id}" if media is not None else f"Plan {plan}"
    try:
        if is_card:
            response = mypvit.create_link_transaction(
                amount=amount, reference=session.reference, customer_account_number=customer_account_number,
                owner_charge=OWNER_CHARGE, free_info=free_info, product=product,
            )
        else:
            response = mypvit.create_transaction(
                amount=amount, reference=session.reference, operator_code=operator_code,
                customer_account_number=customer_account_number,
                owner_charge=OWNER_CHARGE, free_info=free_info, product=product,
            )
    except mypvit.MyPvitError as exc:
        session.status = "failed"
        session.failure_reason = str(exc)[:255]
        session.save(update_fields=["status", "failure_reason"])
        PaymentLog.objects.filter(reference=session.reference).update(status="failed", message=str(exc)[:500])
        raise

    session.raw_create_response = response
    session.pvit_transaction_id = str(response.get("reference_id") or "")
    session.redirect_url = str(response.get("url") or "") if is_card else ""
    session.save(update_fields=["raw_create_response", "pvit_transaction_id", "redirect_url"])
    if session.pvit_transaction_id:
        PaymentLog.objects.filter(reference=session.reference).update(transaction_id=session.pvit_transaction_id)

    if is_card and not session.redirect_url:
        session.status = "failed"
        session.failure_reason = "MyPVit n'a pas renvoyé d'URL de paiement carte."
        session.save(update_fields=["status", "failure_reason"])
        raise mypvit.MyPvitError(session.failure_reason)
    return session


def confirm_payment(*, reference: str, reported_status: str = "", transaction_id: str = "",
                    raw_payload=None, amount=None, fees=None, message: str = "",
                    already_verified: bool = False, trusted_source: bool = False) -> PaymentSession | None:
    """Applique le statut définitif d'une session et, si SUCCESS, accorde
    l'achat / l'abonnement.

    MyPVit ne signe pas ses webhooks : `reported_status` n'est jamais appliqué
    tel quel, on interroge d'abord Check Status (source de vérité), sauf si
    l'appelant l'a déjà fait (`already_verified`, réconciliation).

    Si Check Status répond TRANSACTION_NOT_FOUND (observé en production chez
    NOXIA pour des transactions pourtant réelles), le statut du webhook n'est
    retenu que si la requête vient d'une IP MyPVit autorisée (`trusted_source`,
    voir MYPVIT_WEBHOOK_ALLOWED_IPS). Sinon la session reste en attente et doit
    être vérifiée à la main depuis l'admin — c'est ce qui empêche un utilisateur
    de lancer un paiement sans le valider puis de forger un webhook SUCCESS.
    """
    session = PaymentSession.objects.filter(reference=reference, provider="mypvit").first()
    if session is None:
        logger.warning("Paiement MyPVit pour une référence inconnue : %s", reference)
        return None
    if session.status != "pending":
        return session

    verified_status = reported_status
    if not already_verified:
        lookup_id = session.pvit_transaction_id or transaction_id
        if not lookup_id:
            logger.warning("Paiement %s sans transactionId exploitable : contre-vérification impossible.", reference)
            return session
        try:
            verified = mypvit.get_transaction_status(
                transaction_id=lookup_id, operator_code=METHOD_TO_OPERATOR.get(session.method),
            )
            verified_status = verified.get("status")
            amount = verified.get("amount", amount)
            fees = verified.get("fees", fees)
            message = verified.get("message") or message
        except mypvit.MyPvitError as exc:
            # Repli TRANSACTION_NOT_FOUND (Check Status ne retrouve pas des
            # transactions pourtant réelles) : on ne retient le webhook que s'il
            # vient d'une IP MyPVit ET qu'il porte le transactionId que MyPVit
            # nous a lui-même renvoyé à l'initiation.
            same_transaction = (
                not session.pvit_transaction_id or str(transaction_id) == session.pvit_transaction_id
            )
            if exc.mypvit_status_code == mypvit.TRANSACTION_NOT_FOUND and trusted_source and same_transaction:
                logger.warning(
                    "Paiement %s : MyPVit renvoie TRANSACTION_NOT_FOUND, statut %s du webhook retenu "
                    "(IP MyPVit autorisée).", reference, reported_status,
                )
            else:
                logger.error(
                    "Contre-vérification MyPVit impossible pour %s (%s) — session laissée en attente "
                    "(IP MyPVit : %s, transaction cohérente : %s).",
                    reference, exc, trusted_source, same_transaction,
                )
                if raw_payload:
                    # Conservé pour la vérification manuelle depuis l'admin.
                    PaymentSession.objects.filter(id=session.id).update(
                        raw_webhook_payload=raw_payload if isinstance(raw_payload, dict) else {"payload": raw_payload},
                    )
                return session

    if verified_status not in ("SUCCESS", "FAILED"):
        return session

    if verified_status == "SUCCESS" and amount not in (None, ""):
        try:
            paid = float(amount)
        except (TypeError, ValueError):
            paid = None
        if paid is not None and paid + 0.5 < session.amount_fcfa:
            logger.error(
                "Paiement %s : montant payé %s inférieur au montant attendu %s — refusé.",
                reference, paid, session.amount_fcfa,
            )
            verified_status = "FAILED"
            message = "Montant payé inférieur au montant attendu."

    return _apply_final_status(
        session_id=session.id, final_status=verified_status, transaction_id=transaction_id,
        raw_payload=raw_payload, fees=fees, message=message,
    )


def manually_confirm(session: PaymentSession) -> PaymentSession:
    """Action admin : accorde l'achat d'une session en attente ou échouée
    après vérification MANUELLE du paiement dans le tableau de bord MyPVit
    (cas TRANSACTION_NOT_FOUND ou webhook jamais reçu)."""
    return _apply_final_status(
        session_id=session.id, final_status="SUCCESS", transaction_id="", raw_payload=None,
        fees=None, message="Confirmé manuellement depuis l'admin", allow_from_failed=True,
    )


def _apply_final_status(*, session_id, final_status, transaction_id, raw_payload, fees, message,
                        allow_from_failed=False):
    with db_transaction.atomic():
        session = PaymentSession.objects.select_for_update(of=("self",)).select_related("user", "media").get(id=session_id)
        allowed = ("pending", "failed") if allow_from_failed else ("pending",)
        if session.status not in allowed:
            return session  # traité entre-temps par un autre webhook / la réconciliation

        if transaction_id and not session.pvit_transaction_id:
            session.pvit_transaction_id = str(transaction_id)
        if raw_payload:
            session.raw_webhook_payload = raw_payload if isinstance(raw_payload, dict) else {"payload": raw_payload}
        if fees not in (None, ""):
            try:
                session.fees = fees
            except (TypeError, ValueError):
                pass
        session.confirmed_at = timezone.now()

        if final_status == "SUCCESS":
            session.status = "success"
            session.failure_reason = ""
            _fulfill(session)
        else:
            session.status = "failed"
            session.failure_reason = (message or "Échec du paiement")[:255]
        session.save()

        PaymentLog.objects.filter(reference=session.reference).update(
            status=session.status,
            transaction_id=session.pvit_transaction_id,
            message=(message or ("Paiement confirmé" if session.status == "success" else "Paiement échoué"))[:500],
            raw_payload=session.raw_webhook_payload or None,
        )

    _notify(session)
    logger.info("Paiement MyPVit %s : %s", session.reference, session.status)
    return session


def _fulfill(session: PaymentSession) -> None:
    """Accorde l'achat ou l'abonnement payé (appelé sous verrou, une seule fois)."""
    user = session.user
    if session.media_id:
        purchase = Purchase.objects.filter(user=user, payment_reference=session.reference).first()
        if purchase is None:
            purchase = Purchase.objects.create(
                user=user,
                media=session.media,
                price=session.amount_fcfa,
                max_downloads=PLAN_DOWNLOADS.get(user.active_plan, 1),
                payment_method=session.method,
                payment_reference=session.reference,
                payment_status="success",
            )
            # Média de contributeur en « partage des ventes » : sa part est
            # créditée dans la même transaction que l'achat (une seule fois).
            from contributors.services import record_sale
            record_sale(purchase)
        session.purchase = purchase
    elif session.plan:
        user.activate_plan(session.plan)


def _notify(session: PaymentSession) -> None:
    from users_app.notifications import create_notification, notify_plan_change, notify_purchase

    try:
        if session.status == "success" and session.purchase_id:
            notify_purchase(session.user, session.purchase)
        elif session.status == "success" and session.plan:
            notify_plan_change(session.user, "none", session.plan)
        elif session.status == "failed":
            label = f"« {session.media.title} »" if session.media_id else "votre abonnement"
            create_notification(
                session.user, "purchase_failed", "Paiement échoué",
                f"Le paiement pour {label} n'a pas abouti : {friendly_failure_reason(session.failure_reason)}",
                action_url="/dashboard?tab=payments",
                metadata={"reference": session.reference, "media_id": session.media_id},
            )
    except Exception:  # une notification ne doit jamais faire échouer un paiement
        logger.exception("Notification de paiement impossible pour %s", session.reference)


def reconcile_session(session: PaymentSession) -> PaymentSession:
    """Interroge Check Status pour une session encore en attente."""
    if session.status != "pending" or not session.pvit_transaction_id:
        return session
    try:
        result = mypvit.get_transaction_status(
            transaction_id=session.pvit_transaction_id, operator_code=METHOD_TO_OPERATOR.get(session.method),
        )
    except mypvit.MyPvitError as exc:
        logger.info("Réconciliation %s impossible : %s", session.reference, exc)
        return session
    if result.get("status") not in ("SUCCESS", "FAILED"):
        return session
    return confirm_payment(
        reference=session.reference, reported_status=result.get("status"),
        transaction_id=session.pvit_transaction_id, raw_payload=result,
        amount=result.get("amount"), fees=result.get("fees"), message=result.get("message", ""),
        already_verified=True,
    ) or session


def reconcile_pending_sessions(pending_since_minutes: int = 3, expire_after_hours: int = 24) -> int:
    """Filet de sécurité quand le webhook n'arrive pas (voir la commande
    `manage.py reconcile_payments`, à planifier toutes les 5 minutes)."""
    now = timezone.now()
    stale = PaymentSession.objects.filter(
        provider="mypvit", status="pending", created_at__lt=now - timedelta(minutes=pending_since_minutes),
    ).exclude(pvit_transaction_id="")
    count = 0
    for session in stale:
        if reconcile_session(session).status != "pending":
            count += 1

    # Sessions abandonnées (jamais confirmées) : on les clôt pour ne pas les
    # laisser indéfiniment en attente.
    expired = PaymentSession.objects.filter(
        provider="mypvit", status="pending", created_at__lt=now - timedelta(hours=expire_after_hours),
    )
    for session in expired:
        _apply_final_status(
            session_id=session.id, final_status="FAILED", transaction_id="",
            raw_payload=None, fees=None, message="Paiement expiré sans confirmation.",
        )
        count += 1
    return count
