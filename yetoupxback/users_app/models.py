from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField("adresse email", unique=True)
    name = models.CharField("nom complet", max_length=255, blank=True)

    PLAN_CHOICES = [
        ("none", "Achat à l'unité"),
        ("monthly", "Mensuel - 15 000 FCFA"),
        ("pro", "Pro - 50 000 FCFA"),
    ]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="none")
    plan_expires_at = models.DateTimeField("expiration de l'abonnement", null=True, blank=True)
    terms_accepted_at = models.DateTimeField("conditions acceptées le", null=True, blank=True,
        help_text="Date d'acceptation des conditions d'utilisation et de la politique de confidentialité.")

    # Prix des abonnements, source de vérité côté serveur (jamais le montant
    # envoyé par le client).
    PLAN_PRICES = {"monthly": 15000, "pro": 50000}
    PLAN_DURATION = timedelta(days=30)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def active_plan(self) -> str:
        """Plan réellement en vigueur : « none » une fois l'abonnement expiré.
        Un plan sans date d'expiration (attribué depuis l'admin) reste actif."""
        if self.plan == "none":
            return "none"
        if self.plan_expires_at and self.plan_expires_at <= timezone.now():
            return "none"
        return self.plan

    def activate_plan(self, plan: str) -> None:
        """Active ou prolonge un abonnement payé pour PLAN_DURATION. Un
        renouvellement du même plan s'ajoute à la période restante."""
        now = timezone.now()
        if self.active_plan == plan and self.plan_expires_at and self.plan_expires_at > now:
            start = self.plan_expires_at
        else:
            start = now
        self.plan = plan
        self.plan_expires_at = start + self.PLAN_DURATION
        self.save(update_fields=["plan", "plan_expires_at"])


class Notification(models.Model):
    TYPE_CHOICES = [
        ("welcome", "Bienvenue"),
        ("purchase_success", "Achat réussi"),
        ("purchase_failed", "Achat échoué"),
        ("payment_pending", "Paiement en attente"),
        ("download_limit_warning", "Quota téléchargement"),
        ("plan_activated", "Plan activé"),
        ("contribution_submitted", "Contribution reçue"),
        ("contribution_approved", "Contribution publiée"),
        ("contribution_rejected", "Contribution refusée"),
        ("contributor_earning", "Gain contributeur"),
        ("payout_requested", "Retrait demandé"),
        ("payout_paid", "Retrait versé"),
        ("payout_proof", "Preuve de paiement ajoutée"),
        ("payout_rejected", "Retrait refusé"),
        ("system", "Système"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="system")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.title}"
