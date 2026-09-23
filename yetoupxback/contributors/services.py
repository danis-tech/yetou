"""Règles du programme contributeurs.

- Un média soumis reste « en attente » tant que l'équipe ne l'a pas validé.
- Rachat direct : le contributeur est crédité une fois, à la validation, du
  tarif de rachat de la qualité retenue (BuyoutRate), ou d'un montant fixé par
  l'équipe, jamais au-dessus du plafond de ce type de média.
- Partage des ventes : à chaque vente confirmée, le contributeur est crédité du
  prix moins la part de la plateforme (ContributorSettings.commission_percent,
  figée sur la ligne de gain au moment de la vente).
- Le solde n'est jamais stocké : il se recalcule depuis le journal des gains et
  des retraits. Une demande de retrait « réserve » immédiatement son montant.
"""

import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, Sum
from django.utils import timezone

from media_app.models import Media
from users_app.notifications import create_notification

from .models import BuyoutRate, ContributorEarning, ContributorProfile, ContributorSettings, PayoutRequest

logger = logging.getLogger(__name__)


def balance_for(user) -> dict:
    earned = ContributorEarning.objects.filter(contributor=user).aggregate(s=Sum("amount"))["s"] or 0
    payouts = PayoutRequest.objects.filter(contributor=user)
    pending = payouts.filter(status="requested").aggregate(s=Sum("amount"))["s"] or 0
    paid = payouts.filter(status="paid").aggregate(s=Sum("amount"))["s"] or 0
    return {"earned": earned, "pending_payout": pending, "paid_out": paid, "available": earned - pending - paid}


def max_buyout_for(media_type: str) -> int | None:
    """Plafond de rachat pour un type (tarif de la meilleure qualité)."""
    return BuyoutRate.objects.filter(media_type=media_type, is_active=True).aggregate(m=Max("amount"))["m"]


# ─── Examen des médias ────────────────────────────────────────────────────────

def approve_media(media: Media, reviewer) -> Media:
    """Publie un média de contributeur et, en rachat direct, crédite le contributeur."""
    with transaction.atomic():
        media = Media.objects.select_for_update().get(pk=media.pk)
        if not media.contributor_id:
            raise ValidationError("Ce média n'est pas une contribution.")
        if media.status == "published":
            return media

        if media.payout_mode == "buyout":
            amount = media.buyout_amount or BuyoutRate.amount_for(media.type, media.quality)
            if not amount:
                raise ValidationError(
                    f"Aucun tarif de rachat pour « {media.get_type_display()} {media.quality} ». "
                    "Renseignez le montant du rachat sur le média, ou ajoutez ce tarif dans « Tarifs de rachat »."
                )
            ceiling = max_buyout_for(media.type)
            if ceiling and amount > ceiling:
                raise ValidationError(f"Le rachat ne peut pas dépasser {ceiling} FCFA pour ce type de média.")
            media.buyout_amount = amount
            ContributorEarning.objects.get_or_create(
                media=media, kind="buyout",
                defaults={"contributor_id": media.contributor_id, "gross_amount": amount, "amount": amount,
                          "note": "Rachat à la validation"},
            )

        media.status = "published"
        media.reviewed_at = timezone.now()
        media.reviewed_by = reviewer
        media.rejection_reason = ""
        media.save()

    body = f"« {media.title} » est en ligne."
    if media.payout_mode == "buyout":
        body += f" {media.buyout_amount} FCFA ont été ajoutés à votre solde."
    else:
        body += " Vous toucherez votre part à chaque vente."
    create_notification(media.contributor, "contribution_approved", "Média publié", body,
                        action_url="/contributeur?tab=medias", metadata={"media_id": media.id})
    return media


def reject_media(media: Media, reviewer, reason: str = "") -> Media:
    reason = (reason or media.rejection_reason or "").strip() or "Le média ne répond pas à nos critères de qualité."
    media.status = "rejected"
    media.reviewed_at = timezone.now()
    media.reviewed_by = reviewer
    media.rejection_reason = reason
    media.save(update_fields=["status", "reviewed_at", "reviewed_by", "rejection_reason", "updated_at"])
    create_notification(media.contributor, "contribution_rejected", "Média refusé",
                        f"« {media.title} » n'a pas été retenu : {reason}",
                        action_url="/contributeur?tab=medias", metadata={"media_id": media.id})
    return media


# ─── Ventes ───────────────────────────────────────────────────────────────────

def record_sale(purchase) -> ContributorEarning | None:
    """Crédite la part du contributeur sur une vente confirmée (appelé une seule
    fois par achat, sous le verrou de la session de paiement)."""
    media = purchase.media
    if not media.contributor_id or media.payout_mode != "revenue_share" or not purchase.price:
        return None
    commission = ContributorSettings.get().commission_percent
    amount = purchase.price * (100 - commission) // 100
    earning, created = ContributorEarning.objects.get_or_create(
        purchase=purchase,
        defaults={"contributor_id": media.contributor_id, "media": media, "kind": "sale_share",
                  "gross_amount": purchase.price, "commission_percent": commission, "amount": amount},
    )
    if created:
        create_notification(media.contributor, "contributor_earning", "Nouvelle vente",
                            f"« {media.title} » vient d'être acheté : +{amount} FCFA sur votre solde.",
                            action_url="/contributeur?tab=gains", metadata={"media_id": media.id})
    return earning


# ─── Retraits ─────────────────────────────────────────────────────────────────

def request_payout(user, amount: int) -> PayoutRequest:
    cfg = ContributorSettings.get()
    with transaction.atomic():
        # Verrou sur le profil : deux demandes simultanées ne peuvent pas
        # réserver deux fois le même solde.
        profile = ContributorProfile.objects.select_for_update().filter(user=user).first()
        if profile is None:
            raise ValidationError("Créez d'abord votre profil contributeur.")
        if profile.status != "active":
            raise ValidationError("Votre compte contributeur est suspendu. Contactez-nous.")
        if not (profile.payout_operator and profile.payout_phone):
            raise ValidationError("Renseignez votre numéro Mobile Money dans vos paramètres avant de demander un retrait.")
        if amount < cfg.min_payout:
            raise ValidationError(f"Le retrait minimum est de {cfg.min_payout} FCFA.")
        available = balance_for(user)["available"]
        if amount > available:
            raise ValidationError(f"Solde disponible insuffisant ({available} FCFA).")
        payout = PayoutRequest.objects.create(
            contributor=user, amount=amount, operator=profile.payout_operator, phone=profile.payout_phone,
        )
    create_notification(user, "payout_requested", "Demande de retrait reçue",
                        f"Votre demande de {amount} FCFA vers {payout.operator} {payout.phone} est en cours de traitement. "
                        "Vous serez notifié dès le versement.",
                        action_url="/contributeur?tab=retraits", metadata={"payout_id": payout.id})
    return payout


def mark_payout_paid(payout: PayoutRequest, admin_user, reference: str) -> PayoutRequest:
    reference = (reference or "").strip()
    if not reference:
        raise ValidationError("Indiquez la référence du transfert Mobile Money.")
    with transaction.atomic():
        payout = PayoutRequest.objects.select_for_update().get(pk=payout.pk)
        if payout.status != "requested":
            raise ValidationError("Cette demande a déjà été traitée.")
        payout.status = "paid"
        payout.transaction_reference = reference
        payout.processed_at = timezone.now()
        payout.processed_by = admin_user
        payout.save()
    proof_note = " La preuve de paiement est disponible dans votre espace." if payout.proof else ""
    create_notification(payout.contributor, "payout_paid", "Retrait versé",
                        f"{payout.amount} FCFA ont été envoyés sur votre {payout.operator} ({payout.phone}). "
                        f"Référence : {reference}.{proof_note}",
                        action_url="/contributeur?tab=retraits", metadata={"payout_id": payout.id})
    return payout


def reject_payout(payout: PayoutRequest, admin_user, note: str = "") -> PayoutRequest:
    with transaction.atomic():
        payout = PayoutRequest.objects.select_for_update().get(pk=payout.pk)
        if payout.status != "requested":
            raise ValidationError("Cette demande a déjà été traitée.")
        payout.status = "rejected"
        payout.admin_note = (note or payout.admin_note or "").strip()
        payout.processed_at = timezone.now()
        payout.processed_by = admin_user
        payout.save()
    create_notification(payout.contributor, "payout_rejected", "Retrait refusé",
                        f"Votre demande de {payout.amount} FCFA a été refusée"
                        + (f" : {payout.admin_note}" if payout.admin_note else ".")
                        + " Le montant est de nouveau disponible sur votre solde.",
                        action_url="/contributeur?tab=retraits", metadata={"payout_id": payout.id})
    return payout


def notify_proof_added(payout: PayoutRequest) -> None:
    """Prévient le contributeur qu'une preuve de paiement a été jointe (ou
    remplacée) après le versement."""
    create_notification(payout.contributor, "payout_proof", "Preuve de paiement disponible",
                        f"La preuve du versement de {payout.amount} FCFA (réf. {payout.transaction_reference}) "
                        "est consultable dans votre espace contributeur.",
                        action_url="/contributeur?tab=retraits", metadata={"payout_id": payout.id})
