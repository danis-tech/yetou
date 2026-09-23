import uuid

from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from media_app.models import Media, Purchase, Quality


class ContributorSettings(models.Model):
    """Règles du programme contributeurs, modifiables depuis l'admin (une seule ligne)."""

    accepting_submissions = models.BooleanField("Soumissions ouvertes", default=True,
        help_text="Décochez pour suspendre temporairement l'envoi de nouveaux médias.")
    commission_percent = models.PositiveSmallIntegerField(
        "Part de la plateforme (%)", default=30, validators=[MaxValueValidator(100)],
        help_text="Prélevée sur chaque vente d'un média en « partage des ventes ». Le contributeur touche le reste.",
    )
    min_price = models.PositiveIntegerField("Prix minimum fixé par un contributeur (FCFA)", default=100,
        validators=[MinValueValidator(100)])
    max_price = models.PositiveIntegerField("Prix maximum fixé par un contributeur (FCFA)", default=100000)
    max_video_seconds = models.PositiveIntegerField("Durée maximale d'une vidéo (secondes)", default=90,
        help_text="1 min 30 s = 90 secondes.")
    max_photo_size_mb = models.PositiveIntegerField("Taille maximale d'une photo (Mo)", default=25)
    max_video_size_mb = models.PositiveIntegerField("Taille maximale d'une vidéo (Mo)", default=500)
    min_payout = models.PositiveIntegerField("Retrait minimum (FCFA)", default=1000)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Réglages contributeurs"
        verbose_name_plural = "Réglages contributeurs"

    def __str__(self):
        return "Réglages du programme contributeurs"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls) -> "ContributorSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def contributor_percent(self) -> int:
        return 100 - self.commission_percent


class BuyoutRate(models.Model):
    """Montant versé au contributeur en « rachat direct », selon le type et la
    qualité retenue par l'équipe lors de l'examen du média."""

    media_type = models.CharField("Type de média", max_length=10, choices=Media.TYPE_CHOICES)
    quality = models.CharField("Qualité", max_length=10, choices=Quality.choices)
    amount = models.PositiveIntegerField("Montant du rachat (FCFA)")
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Tarif de rachat"
        verbose_name_plural = "Tarifs de rachat"
        unique_together = [["media_type", "quality"]]
        ordering = ["media_type", "-amount"]

    def __str__(self):
        return f"{self.get_media_type_display()} {self.quality} : {self.amount} FCFA"

    @classmethod
    def amount_for(cls, media_type: str, quality: str) -> int | None:
        rate = cls.objects.filter(media_type=media_type, quality=quality, is_active=True).first()
        return rate.amount if rate else None


class ContributorProfile(models.Model):
    OPERATOR_CHOICES = [("Airtel Money", "Airtel Money"), ("Moov Money", "Moov Money")]
    STATUS_CHOICES = [("active", "Actif"), ("suspended", "Suspendu")]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contributor_profile")
    display_name = models.CharField("Nom affiché", max_length=80,
        help_text="Affiché sur les médias publiés (« par … »).")
    bio = models.TextField("Présentation", blank=True, max_length=600)
    payout_operator = models.CharField("Opérateur Mobile Money", max_length=20, choices=OPERATOR_CHOICES, blank=True)
    payout_phone = models.CharField("Numéro Mobile Money", max_length=12, blank=True,
        help_text="Numéro qui reçoit les retraits (format 077000000).")
    status = models.CharField("Statut", max_length=12, choices=STATUS_CHOICES, default="active",
        help_text="Un contributeur suspendu ne peut plus soumettre de média ni demander de retrait.")
    terms_accepted_at = models.DateTimeField("Charte acceptée le")
    created_at = models.DateTimeField("Inscrit le", auto_now_add=True)

    class Meta:
        verbose_name = "Contributeur"
        verbose_name_plural = "Contributeurs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.display_name} ({self.user.email})"


class ContributorEarning(models.Model):
    """Journal des gains : une ligne par vente partagée ou par rachat. Le solde
    d'un contributeur se calcule toujours depuis ce journal, jamais stocké."""

    KIND_CHOICES = [
        ("sale_share", "Part d'une vente"),
        ("buyout", "Rachat direct"),
        ("adjustment", "Ajustement manuel"),
    ]

    contributor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="contributor_earnings")
    media = models.ForeignKey(Media, on_delete=models.SET_NULL, null=True, blank=True, related_name="contributor_earnings")
    purchase = models.OneToOneField(Purchase, on_delete=models.SET_NULL, null=True, blank=True, related_name="contributor_earning")
    kind = models.CharField("Type", max_length=20, choices=KIND_CHOICES)
    gross_amount = models.PositiveIntegerField("Montant de base (FCFA)",
        help_text="Prix de vente (partage) ou montant du rachat.")
    commission_percent = models.PositiveSmallIntegerField("Part plateforme appliquée (%)", default=0)
    amount = models.IntegerField("Gain du contributeur (FCFA)")
    note = models.CharField("Note", max_length=255, blank=True)
    created_at = models.DateTimeField("Date", auto_now_add=True)

    class Meta:
        verbose_name = "Gain contributeur"
        verbose_name_plural = "Gains contributeurs"
        ordering = ["-created_at"]
        constraints = [
            # Un média racheté ne l'est qu'une fois.
            models.UniqueConstraint(fields=["media"], condition=Q(kind="buyout"), name="unique_buyout_per_media"),
        ]

    def __str__(self):
        return f"{self.contributor.email} · {self.get_kind_display()} · {self.amount} FCFA"


def payout_proof_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"payouts/{instance.contributor_id}/{uuid.uuid4().hex}.{ext}"


class PayoutRequest(models.Model):
    STATUS_CHOICES = [
        ("requested", "À traiter"),
        ("paid", "Versé"),
        ("rejected", "Refusé"),
    ]

    contributor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payout_requests")
    amount = models.PositiveIntegerField("Montant demandé (FCFA)")
    operator = models.CharField("Opérateur", max_length=20)
    phone = models.CharField("Numéro Mobile Money", max_length=12)
    status = models.CharField("Statut", max_length=12, choices=STATUS_CHOICES, default="requested")
    transaction_reference = models.CharField("Référence du transfert", max_length=100, blank=True,
        help_text="Obligatoire pour marquer la demande comme versée.")
    admin_note = models.CharField("Note (visible par le contributeur)", max_length=255, blank=True)
    proof = models.FileField(
        "Preuve de paiement", upload_to=payout_proof_path, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp", "pdf"])],
        help_text="Capture ou reçu du transfert Mobile Money (JPG, PNG, WebP ou PDF, 10 Mo maximum). "
                  "Le contributeur peut la consulter depuis son espace.",
    )
    proof_uploaded_at = models.DateTimeField("Preuve ajoutée le", null=True, blank=True)
    created_at = models.DateTimeField("Demandé le", auto_now_add=True)
    processed_at = models.DateTimeField("Traité le", null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        verbose_name = "Demande de retrait"
        verbose_name_plural = "Demandes de retrait"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contributor.email} · {self.amount} FCFA · {self.get_status_display()}"
