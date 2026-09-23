import uuid

from django.conf import settings
from django.db import models
from django.utils.text import get_valid_filename
from django.db.utils import OperationalError, ProgrammingError
from django.core.validators import FileExtensionValidator, MinValueValidator


def media_upload_path(instance, filename):
    """Organise les fichiers dans R2 : bucket/photo/... ou bucket/video/...

    Préfixe aléatoire : le stockage écrase les fichiers de même nom
    (AWS_S3_FILE_OVERWRITE), deux envois « photo.jpg » ne doivent jamais
    se remplacer l'un l'autre."""
    folder = "photo" if instance.type == "photo" else "video"
    return f"{folder}/{uuid.uuid4().hex[:12]}-{get_valid_filename(filename)[-80:]}"



def preview_upload_path(instance, filename):
    """Aperçus publics filigranés, séparés des originaux."""
    return f"previews/{uuid.uuid4().hex}.jpg"


class Category(models.Model):
    """Catégorie de média, gérable dynamiquement depuis l'admin (ajout, renommage, ordre, activation)."""
    name = models.CharField("Nom", max_length=100)
    slug = models.SlugField(
        "Identifiant (slug)", max_length=30, unique=True,
        help_text="Utilisé dans les filtres et l'API. Sans espace ni accent (ex: nature, paysages).",
    )
    order = models.PositiveIntegerField("Ordre d'affichage", default=0)
    is_active = models.BooleanField(
        "Active", default=True,
        help_text="Décochez pour masquer cette catégorie des filtres sans supprimer les médias associés.",
    )
    created_at = models.DateTimeField("Créée le", auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.name

    @classmethod
    def choices(cls):
        """Choix dynamiques pour le champ Media.category (Django 5+ : choices callable).

        Repli sur une liste vide si la table n'existe pas encore (avant migration).
        """
        try:
            return [(c.slug, c.name) for c in cls.objects.filter(is_active=True)]
        except (OperationalError, ProgrammingError):
            return []


class Quality(models.Model):
    """Qualité de média (HD, 4K, ...), gérable dynamiquement depuis l'admin.

    Utilisée à la fois pour Media.quality et PricingConfig.quality : ajouter une
    qualité ici la rend immédiatement disponible partout (formulaires, filtres, tarifs).
    """
    name = models.CharField("Nom", max_length=50)
    slug = models.SlugField(
        "Code technique", max_length=10, unique=True,
        help_text="Valeur exacte utilisée en base et dans l'API (ex: HD, 4K, 8K). Respectez la casse.",
    )
    order = models.PositiveIntegerField("Ordre d'affichage", default=0)
    is_active = models.BooleanField(
        "Active", default=True,
        help_text="Décochez pour masquer cette qualité des filtres et des tarifs sans supprimer les médias associés.",
    )
    created_at = models.DateTimeField("Créée le", auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Qualité"
        verbose_name_plural = "Qualités"

    def __str__(self):
        return self.name

    @classmethod
    def choices(cls):
        """Choix dynamiques pour Media.quality / PricingConfig.quality (Django 5+ : choices callable)."""
        try:
            return [(q.slug, q.name) for q in cls.objects.filter(is_active=True)]
        except (OperationalError, ProgrammingError):
            return []


class Media(models.Model):
    TYPE_CHOICES = [("photo", "Photo"), ("video", "Vidéo")]
    STATUS_CHOICES = [
        ("draft", "Brouillon"),
        ("pending", "En attente de validation"),
        ("published", "Publié"),
        ("rejected", "Refusé"),
        ("archived", "Archivé"),
    ]
    PAYOUT_MODE_CHOICES = [
        ("revenue_share", "Partage des ventes"),
        ("buyout", "Rachat direct"),
    ]
    LICENSE_CHOICES = [
        ("Commerciale · Illimitée", "Commerciale · Illimitée (web, print, publicité — sans limite d'usage)"),
        ("Usage web uniquement", "Usage web uniquement (sites internet, réseaux sociaux, newsletters)"),
        ("Usage éditorial", "Usage éditorial (presse, actualités — usage non commercial)"),
        ("Usage personnel", "Usage personnel (usage privé, non commercial, non revendable)"),
        ("Exclusive", "Exclusive (droits exclusifs, média retiré du catalogue public après achat)"),
    ]

    # ─── Général ───
    title = models.CharField("Titre", max_length=255,
        help_text="Nom du média tel qu'affiché sur la plateforme. Soyez descriptif.")
    description = models.TextField("Description", blank=True,
        help_text="Description détaillée visible sur la page du média.")
    type = models.CharField("Type de média", max_length=10, choices=TYPE_CHOICES,
        help_text="Photo : image fixe. Vidéo : séquence animée.")
    category = models.CharField("Catégorie", max_length=30, choices=Category.choices,
        help_text="Catégorie principale pour le classement et les filtres. Gérées dans « Catégories ».")
    quality = models.CharField("Qualité", max_length=10, choices=Quality.choices, default="HD",
        help_text="Qualité du média. Gérée dans « Qualités ». Détermine le prix (voir Paiements → Configurations de prix).")
    status = models.CharField("Statut de publication", max_length=15, choices=STATUS_CHOICES, default="draft",
        help_text="Brouillon : invisible. Publié : visible et achetable. Archivé : masqué mais conservé.")

    # ─── Fichier ───
    file = models.FileField("Fichier média", upload_to=media_upload_path, blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=["jpg","jpeg","png","webp","avif","mp4","webm","mov"])],
        help_text="Sélectionnez le fichier image ou vidéo. Stockage automatique sur Cloudflare R2. Formats acceptés : JPG, PNG, WebP, AVIF, MP4, WebM, MOV.")
    thumbnail = models.ImageField("Miniature", upload_to=media_upload_path, blank=True, null=True,
        help_text="Image d'aperçu affichée dans les grilles et listes. Pour les vidéos, choisissez une image représentative. Format recommandé : 16/9.")
    preview = models.ImageField("Aperçu public filigrané", upload_to=preview_upload_path, blank=True, null=True,
        editable=False, help_text="Généré automatiquement depuis l'original : c'est la seule image d'une photo servie au public.")
    preview_source = models.CharField(max_length=255, blank=True, editable=False)
    # Taille enregistrée à l'envoi : l'afficher ne doit jamais coûter un appel
    # réseau au stockage (≈ 0,8 s par média sur R2).
    file_size = models.PositiveBigIntegerField("Taille du fichier (octets)", null=True, blank=True, editable=False)
    license_type = models.CharField("Type de licence", max_length=50, choices=LICENSE_CHOICES,
        default="Commerciale · Illimitée",
        help_text="Droits accordés à l'acheteur. Par défaut : licence commerciale illimitée (usage web, print, publicité).")
    price = models.PositiveIntegerField("Prix (FCFA)", default=1500,
        validators=[MinValueValidator(100, "Le prix minimum est de 100 FCFA.")],
        help_text="Calculé automatiquement depuis la configuration de prix (type + qualité). "
                   "Modifiable uniquement s'il n'existe aucune configuration pour cette combinaison.")

    # ─── Photo ───
    width = models.PositiveIntegerField("Largeur (px)", null=True, blank=True,
        help_text="Largeur de l'image en pixels (ex: 8000 pour une photo 4K).")
    height = models.PositiveIntegerField("Hauteur (px)", null=True, blank=True,
        help_text="Hauteur de l'image en pixels (ex: 5333 pour une photo 4K).")
    resolution = models.CharField("Résolution", max_length=50, blank=True,
        help_text="Format d'affichage : '8 000 × 5 333 px' pour la 4K, '6 000 × 4 000 px' pour la HD.")
    color_profile = models.CharField("Profil couleur", max_length=50, blank=True, default="sRGB",
        help_text="Espace colorimétrique de l'image. sRGB pour le web, Adobe RGB ou DCI-P3 pour l'impression.")

    # ─── Vidéo ───
    duration = models.CharField("Durée", max_length=20, blank=True,
        help_text="Durée de la vidéo au format '0:30' (30 secondes) ou '1:00' (1 minute).")
    frame_rate = models.CharField("Images par seconde", max_length=10, blank=True,
        help_text="Fréquence d'images : 24fps (cinéma), 30fps (standard), 60fps (fluide).")
    codec = models.CharField("Codec vidéo", max_length=50, blank=True,
        help_text="Format de compression : H.264 (compatible partout), H.265/HEVC (meilleure compression), VP9 (web).")
    bitrate = models.CharField("Bitrate", max_length=30, blank=True,
        help_text="Débit vidéo : 50 Mbps pour la 4K standard, 100 Mbps pour la 4K haute qualité.")

    # ─── Équipement ───
    camera_model = models.CharField("Drone / Caméra", max_length=100, blank=True, default="DJI Mavic 3 Pro",
        help_text="Modèle de drone ou appareil photo utilisé. Ex: DJI Mavic 3 Pro, DJI Air 3, Sony A7R V.")
    lens = models.CharField("Objectif", max_length=100, blank=True,
        help_text="Objectif utilisé. Pour un drone : 'Hasselblad 24mm f/2.8'. Pour un appareil photo : '24-70mm f/2.8'.")
    focal_length = models.CharField("Focale", max_length=20, blank=True,
        help_text="Longueur focale en mm (ex: '24mm', '70mm'). Influence le champ de vision et la compression de la perspective.")
    aperture = models.CharField("Ouverture", max_length=10, blank=True,
        help_text="Ouverture du diaphragme (ex: 'f/2.8', 'f/5.6'). Affecte la profondeur de champ et la luminosité.")
    iso = models.CharField("Sensibilité ISO", max_length=10, blank=True,
        help_text="Sensibilité du capteur (ex: '100', '400', '800'). ISO bas = moins de bruit, ISO élevé = faible luminosité.")
    shutter_speed = models.CharField("Vitesse d'obturation", max_length=20, blank=True,
        help_text="Temps d'exposition (ex: '1/1000s', '1/60s'). Rapide pour figer le mouvement, lent pour les filés.")

    # ─── Localisation ───
    country = models.CharField("Pays", max_length=50, default="Gabon",
        help_text="Pays où la prise de vue a été réalisée.")
    province = models.CharField("Province", max_length=50, blank=True,
        help_text="Province du Gabon : Estuaire, Haut-Ogooué, Moyen-Ogooué, Ngounié, Nyanga, Ogooué-Ivindo, Ogooué-Lolo, Ogooué-Maritime, Woleu-Ntem.")
    city = models.CharField("Ville / Localité", max_length=100, blank=True,
        help_text="Ville ou localité la plus proche du lieu de prise de vue (ex: Libreville, Port-Gentil, Franceville).")
    latitude = models.FloatField("Latitude", null=True, blank=True,
        help_text="Coordonnée GPS de latitude (ex: 0.4162 pour Libreville).")
    longitude = models.FloatField("Longitude", null=True, blank=True,
        help_text="Coordonnée GPS de longitude (ex: 9.4673 pour Libreville).")
    altitude = models.FloatField("Altitude drone (m)", null=True, blank=True,
        help_text="Altitude du drone au moment de la capture, en mètres (ex: 120 pour la limite légale au Gabon).")

    # ─── Métadonnées ───
    tags = models.CharField("Mots-clés", max_length=500, blank=True,
        help_text="Tags séparés par des virgules. Ex: drone, paysage, coucher de soleil, estuaire, gabon. Améliorent la recherche.")
    season = models.CharField("Saison", max_length=50, blank=True,
        help_text="Saison de la prise de vue : Saison des pluies (oct-mai), Saison sèche (juin-sept).")
    weather = models.CharField("Conditions météo", max_length=100, blank=True,
        help_text="Météo lors de la capture : Ensoleillé, Nuageux, Pluvieux, Orageux, Brumeux.")
    capture_date = models.DateField("Date de capture", null=True, blank=True,
        help_text="Date à laquelle la photo/vidéo a été prise (JJ/MM/AAAA).")
    capture_time = models.TimeField("Heure de capture", null=True, blank=True,
        help_text="Heure de la prise de vue. Important pour les photos de golden hour (lever/coucher du soleil).")

    # ─── Contribution (média proposé par un contributeur) ───
    contributor = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Contributeur", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="contributions",
        help_text="Vide pour un média de la plateforme.",
    )
    payout_mode = models.CharField("Rémunération choisie", max_length=20, choices=PAYOUT_MODE_CHOICES, blank=True,
        help_text="Partage : le contributeur touche un pourcentage de chaque vente. "
                  "Rachat : il est payé une fois, à la validation, et le média devient celui de la plateforme.")
    contributor_price = models.PositiveIntegerField("Prix fixé par le contributeur (FCFA)", null=True, blank=True,
        help_text="Utilisé comme prix de vente en mode « partage des ventes ».")
    declared_duration_seconds = models.PositiveIntegerField("Durée déclarée (s)", null=True, blank=True)
    buyout_amount = models.PositiveIntegerField("Montant du rachat (FCFA)", null=True, blank=True,
        help_text="Rachat direct : laissé vide, il est calculé depuis les tarifs de rachat selon la qualité retenue.")
    submitted_at = models.DateTimeField("Soumis le", null=True, blank=True)
    reviewed_at = models.DateTimeField("Examiné le", null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Examiné par", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )
    rejection_reason = models.TextField("Motif du refus", blank=True,
        help_text="Communiqué au contributeur si le média est refusé.")

    # ─── Stats (lecture seule) ───
    downloads = models.PositiveIntegerField("Téléchargements", default=0)
    views = models.PositiveIntegerField("Vues", default=0)
    rating = models.FloatField("Note moyenne", default=0)

    created_at = models.DateTimeField("Date de création", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière modification", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Média"
        verbose_name_plural = "Médias"
        indexes = [
            models.Index(fields=["type", "category"]),
            models.Index(fields=["status"]),
            models.Index(fields=["contributor", "status"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.get_type_display()}] {self.title}"

    @property
    def is_contribution(self) -> bool:
        return self.contributor_id is not None

    def save(self, *args, **kwargs):
        """Prix de vente : celui du contributeur en mode « partage des ventes »,
        sinon le tarif configuré (type + qualité) s'il existe."""
        if self.file and not getattr(self.file, "_committed", True):
            self.file_size = self.file.size  # fichier en cours d'envoi : taille connue localement
        if self.contributor_id and self.payout_mode == "revenue_share" and self.contributor_price:
            self.price = self.contributor_price
        else:
            configured_price = PricingConfig.get_price(self.type, self.quality)
            if configured_price is not None:
                self.price = configured_price
        super().save(*args, **kwargs)
        # Photo nouvelle ou fichier remplacé : (re)génère l'aperçu filigrané.
        if self.type == "photo" and self.file and self.preview_source != self.file.name:
            from .previews import build_preview
            build_preview(self)

    @property
    def file_url(self):
        return self.file.url if self.file else ""

    @property
    def file_size_display(self):
        s = self.file_size
        if s:
            return f"{s/1024:.0f} Ko" if s < 1048576 else f"{s/1048576:.1f} Mo"
        return "—"


class Purchase(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchases")
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name="purchases")
    price = models.PositiveIntegerField("Prix payé (FCFA)")
    download_count = models.PositiveIntegerField("Nb téléchargements", default=0)
    max_downloads = models.PositiveIntegerField("Max téléchargements", default=1)
    purchased_at = models.DateTimeField("Acheté le", auto_now_add=True)

    # Infos de paiement
    payment_method = models.CharField("Méthode de paiement", max_length=20, blank=True, default="")
    payment_reference = models.CharField("Référence transaction", max_length=255, blank=True, default="")
    PAYMENT_STATUS_CHOICES = [
        ("pending", "En attente"),
        ("success", "Réussi"),
        ("simulated", "Simulé"),
        ("failed", "Échoué"),
    ]
    payment_status = models.CharField(
        "Statut du paiement", max_length=15, choices=PAYMENT_STATUS_CHOICES, blank=True, default="success",
    )

    PAID_STATUSES = ("success", "simulated")

    class Meta:
        ordering = ["-purchased_at"]
        verbose_name = "Achat"
        verbose_name_plural = "Achats"

    @property
    def remaining_downloads(self):
        return max(0, self.max_downloads - self.download_count)

    def __str__(self):
        return f"{self.user.email} — {self.media.title}"


class PaymentLog(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("success", "Réussi"),
        ("simulated", "Simulé"),
        ("failed", "Échoué"),
    ]
    METHOD_CHOICES = [
        ("Airtel Money", "Airtel Money"),
        ("Moov Money", "Moov Money"),
        ("PayPal", "PayPal"),
        ("Visa", "Visa"),
        ("Mastercard", "Mastercard"),
    ]

    amount = models.PositiveIntegerField("Montant (FCFA)")
    method = models.CharField("Méthode", max_length=20, choices=METHOD_CHOICES)
    reference = models.CharField("Référence", max_length=255, blank=True)
    phone = models.CharField("Téléphone", max_length=20, blank=True)
    status = models.CharField("Statut", max_length=15, choices=STATUS_CHOICES, default="success")
    message = models.TextField("Message", blank=True)
    transaction_id = models.CharField("ID Transaction", max_length=255, blank=True)
    raw_payload = models.JSONField("Détails bruts (webhook)", null=True, blank=True,
        help_text="Payload brut renvoyé par le fournisseur de paiement (SingPay/FedaPay), conservé pour audit.")
    created_at = models.DateTimeField("Date", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Paiement reçu"
        verbose_name_plural = "Paiements reçus"

    def __str__(self):
        return f"{self.get_method_display()} · {self.amount:,} FCFA · {self.get_status_display()}".replace(",", " ")


class PaymentSession(models.Model):
    """Session de paiement MyPVit (Airtel Money, Moov Money, Visa/Mastercard).

    Créée côté serveur dès l'initiation, avec un montant calculé côté serveur.
    Elle ne passe à « success » que via `media_app.payments.confirm_payment`,
    après contre-vérification auprès de MyPVit — jamais sur la foi du client.
    Les anciennes sessions FedaPay/SingPay sont conservées pour l'historique.
    """

    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("success", "Réussi"),
        ("failed", "Échoué"),
    ]
    PROVIDER_CHOICES = [
        ("mypvit", "MyPVit"),
        ("fedapay", "FedaPay (ancien)"),
        ("singpay", "SingPay (ancien)"),
    ]

    reference = models.CharField("Référence commande", max_length=255, unique=True)
    provider = models.CharField("Fournisseur", max_length=20, choices=PROVIDER_CHOICES, default="mypvit")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_sessions",
    )
    media = models.ForeignKey(
        Media,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_sessions",
    )
    amount_fcfa = models.PositiveIntegerField("Montant (FCFA)")
    amount_usd = models.DecimalField("Montant (USD)", max_digits=10, decimal_places=2, null=True, blank=True)
    method = models.CharField("Méthode", max_length=20, choices=PaymentLog.METHOD_CHOICES)
    plan = models.CharField("Plan abonnement", max_length=20, blank=True, default="")
    status = models.CharField("Statut", max_length=15, choices=STATUS_CHOICES, default="pending")
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_sessions",
    )

    # ─── MyPVit ───
    # Identifiant attribué par MyPVit (réponse d'initiation ou webhook) — sert à
    # la contre-vérification via l'API Check Status.
    pvit_transaction_id = models.CharField("ID transaction MyPVit", max_length=100, blank=True, default="")
    customer_account_number = models.CharField("Téléphone client", max_length=23, blank=True, default="")
    redirect_url = models.URLField("URL formulaire carte", max_length=500, blank=True, default="")
    fees = models.DecimalField("Frais", max_digits=12, decimal_places=2, null=True, blank=True)
    failure_reason = models.CharField("Raison de l'échec", max_length=255, blank=True, default="")
    raw_create_response = models.JSONField("Réponse d'initiation", default=dict, blank=True)
    raw_webhook_payload = models.JSONField("Dernier webhook", default=dict, blank=True)
    confirmed_at = models.DateTimeField("Confirmé le", null=True, blank=True)

    created_at = models.DateTimeField("Créé le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]
        verbose_name = "Session de paiement"
        verbose_name_plural = "Sessions de paiement"

    def __str__(self):
        return f"{self.reference} · {self.get_status_display()}"


class PricingConfig(models.Model):
    """Configuration des prix par type et qualité de média."""
    media_type = models.CharField("Type de média", max_length=10, choices=[("photo", "Photo"), ("video", "Vidéo")])
    quality = models.CharField("Qualité", max_length=10, choices=Quality.choices,
        help_text="Qualité concernée par ce tarif. Gérée dans « Qualités ».")
    price = models.PositiveIntegerField("Prix (FCFA)", validators=[MinValueValidator(100)],
        help_text="Prix minimum : 100 FCFA")
    description = models.CharField("Description", max_length=255, blank=True,
        help_text="Description affichée sur la grille tarifaire")
    is_active = models.BooleanField("Actif", default=True)
    order = models.PositiveIntegerField("Ordre", default=0,
        help_text="Ordre d'affichage (0 = premier)")

    class Meta:
        ordering = ["media_type", "order"]
        verbose_name = "Configuration de prix"
        verbose_name_plural = "Configurations de prix"
        unique_together = [["media_type", "quality"]]

    def __str__(self):
        return f"{self.get_media_type_display()} {self.quality} — {self.price:,} FCFA".replace(",", " ")

    @classmethod
    def get_price(cls, media_type: str, quality: str) -> int | None:
        config = cls.objects.filter(media_type=media_type, quality=quality, is_active=True).first()
        return config.price if config else None

    @classmethod
    def get_pricing_table(cls):
        return cls.objects.filter(is_active=True).order_by("media_type", "order")


class MediaLike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_likes",
    )
    media = models.ForeignKey(
        Media,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "media"]]
        verbose_name = "Like média"
        verbose_name_plural = "Likes médias"
        indexes = [
            models.Index(fields=["media", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} ♥ {self.media.title}"
