from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django import forms
import json

from .models import Media, Purchase, PricingConfig, PaymentLog, PaymentSession, MediaLike, Category, Quality
from .serializers import _public_file_url

PAID_STATUSES = Purchase.PAID_STATUSES


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "is_active", "media_count")
    list_editable = ("order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    ordering = ("order", "name")
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Médias")
    def media_count(self, obj):
        return Media.objects.filter(category=obj.slug).count()


@admin.register(Quality)
class QualityAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "is_active", "media_count")
    list_editable = ("order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    ordering = ("order", "name")

    @admin.display(description="Médias")
    def media_count(self, obj):
        return Media.objects.filter(quality=obj.slug).count()


class MediaForm(forms.ModelForm):
    class Meta:
        model = Media
        fields = "__all__"
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "tags": forms.TextInput(attrs={"placeholder": "drone, paysage, gabon, libreville"}),
            "resolution": forms.TextInput(attrs={"placeholder": "8 000 × 5 333 px"}),
            "duration": forms.TextInput(attrs={"placeholder": "0:30"}),
        }


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    form = MediaForm
    list_display = ("preview_thumb", "title", "type", "quality", "category", "price_display", "status_badge",
                    "contributor_display", "downloads", "created_at")
    list_display_links = ("title",)
    list_filter = ("status", "type", "category", "quality", "payout_mode", ("contributor", admin.RelatedOnlyFieldListFilter))
    actions = ["approve_contributions", "reject_contributions"]
    search_fields = ("title", "description", "province", "city", "tags")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("media_preview", "price_display", "downloads", "views", "rating", "file_size_display", "created_at", "updated_at",
                       "contributor", "payout_mode", "contributor_price", "declared_duration_seconds", "submitted_at",
                       "reviewed_at", "reviewed_by")
    save_on_top = True
    list_per_page = 25

    fieldsets = (
        ("📋 Informations générales", {
            "fields": (
                ("title", "status"),
                "description",
                ("type", "quality", "category"),
            ),
            "classes": ("collapse", "expanded"),
        }),
        ("📁 Fichier média", {
            "fields": (
                "media_preview",
                "file",
                "thumbnail",
                ("license_type", "price_display"),
            ),
            "description": "Stockage automatique sur Cloudflare R2. Le prix est calculé automatiquement "
                            "depuis la configuration de prix (Paiements → Configurations de prix), "
                            "selon le type et la qualité du média.",
            "classes": ("collapse", "expanded"),
        }),
        ("📸 Photo — Résolution & Qualité", {
            "fields": (
                ("width", "height"),
                "resolution",
                "color_profile",
            ),
            "classes": ("collapse",),
        }),
        ("🎬 Vidéo — Détails techniques", {
            "fields": (
                "duration",
                ("frame_rate", "codec"),
                "bitrate",
            ),
            "classes": ("collapse",),
        }),
        ("🚁 Équipement & Prise de vue", {
            "fields": (
                ("camera_model", "lens"),
                ("focal_length", "aperture"),
                ("iso", "shutter_speed"),
            ),
            "classes": ("collapse",),
        }),
        ("📍 Localisation", {
            "fields": (
                ("country", "province", "city"),
                ("latitude", "longitude", "altitude"),
            ),
            "classes": ("collapse", "expanded"),
        }),
        ("🏷️ Métadonnées", {
            "fields": (
                "tags",
                ("season", "weather"),
                ("capture_date", "capture_time"),
            ),
            "classes": ("collapse",),
        }),
        ("🤝 Contribution", {
            "fields": (
                ("contributor", "payout_mode"),
                ("contributor_price", "buyout_amount"),
                ("declared_duration_seconds", "submitted_at"),
                ("reviewed_at", "reviewed_by"),
                "rejection_reason",
            ),
            "description": "Pour valider une contribution : vérifiez la qualité, corrigez la qualité retenue si besoin "
                           "(elle fixe le prix de vente et, en rachat direct, le montant versé), puis passez le statut "
                           "à « Publié ». Pour la refuser, choisissez « Refusé » et indiquez le motif, qui sera "
                           "transmis au contributeur.",
            "classes": ("collapse", "expanded"),
        }),
        ("📊 Statistiques (lecture seule)", {
            "fields": (
                ("downloads", "views", "rating"),
                "file_size_display",
                ("created_at", "updated_at"),
            ),
            "classes": ("collapse", "expanded"),
        }),
    )

    @admin.display(description="Prix", ordering="price")
    def price_display(self, obj):
        return f"{obj.price:,} FCFA".replace(",", " ")

    @admin.display(description="Taille du fichier")
    def file_size_display(self, obj):
        return obj.file_size_display

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if obj is None:
            # Sur le formulaire d'ajout, le média n'existe pas encore :
            # les statistiques (téléchargements, vues, dates...) n'ont pas de sens.
            fieldsets = tuple(fs for fs in fieldsets if fs[0] != "📊 Statistiques (lecture seule)")
        return fieldsets

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        colors = {"draft": "#4D5C6B", "pending": "#B07A1E", "published": "#2F7D4F", "rejected": "#B3412E", "archived": "#7A8793"}
        color = colors.get(obj.status, "#4D5C6B")
        label = obj.get_status_display()
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, label,
        )

    @admin.display(description="Contributeur", ordering="contributor__email")
    def contributor_display(self, obj):
        if not obj.contributor_id:
            return "Plateforme"
        profile = getattr(obj.contributor, "contributor_profile", None)
        name = profile.display_name if profile else obj.contributor.email
        mode = dict(Media.PAYOUT_MODE_CHOICES).get(obj.payout_mode, "")
        return format_html("{}<br><small style='color:var(--body-quiet-color)'>{}</small>", name, mode)

    # ─── Validation des contributions ───
    def _review(self, request, queryset, target):
        from contributors.services import approve_media, reject_media
        done, errors = 0, []
        for media in queryset.filter(contributor__isnull=False, status__in=("pending", "rejected") if target == "published" else ("pending",)):
            try:
                approve_media(media, request.user) if target == "published" else reject_media(media, request.user)
                done += 1
            except ValidationError as exc:
                errors.append(f"« {media.title} » : {' '.join(exc.messages)}")
        if done:
            self.message_user(request, f"{done} contribution(s) {'publiée(s)' if target == 'published' else 'refusée(s)'}.")
        for e in errors:
            self.message_user(request, e, level=messages.ERROR)

    @admin.action(description="Publier les contributions sélectionnées")
    def approve_contributions(self, request, queryset):
        self._review(request, queryset, "published")

    @admin.action(description="Refuser les contributions sélectionnées (motif générique)")
    def reject_contributions(self, request, queryset):
        self._review(request, queryset, "rejected")

    def save_model(self, request, obj, form, change):
        """Changer le statut d'une contribution depuis sa fiche applique la
        règle métier (crédit du rachat, notification du contributeur)."""
        from contributors.services import approve_media, reject_media
        previous = Media.objects.filter(pk=obj.pk).values_list("status", flat=True).first() if change else None
        target = obj.status
        if obj.contributor_id and previous != target and target in ("published", "rejected"):
            obj.status = previous or "pending"
            super().save_model(request, obj, form, change)
            try:
                if target == "published":
                    approve_media(obj, request.user)
                else:
                    reject_media(obj, request.user, obj.rejection_reason)
            except ValidationError as exc:
                self.message_user(request, " ".join(exc.messages), level=messages.ERROR)
            return
        super().save_model(request, obj, form, change)

    @admin.display(description="Aperçu")
    def preview_thumb(self, obj):
        file_url = _public_file_url(obj.file)
        thumb_url = _public_file_url(obj.thumbnail) or (file_url if obj.type == "photo" else "")
        icon = "ti-video-off" if obj.type == "video" else "ti-photo-off"

        if not thumb_url and not file_url:
            return format_html(
                '<div style="width:56px;height:40px;border-radius:6px;background:#1A1A22;'
                'display:flex;align-items:center;justify-content:center;color:#8A8A95;font-size:16px">'
                '<i class="ti {}"></i></div>',
                icon,
            )

        if not thumb_url:
            # Vidéo sans miniature : icône lecture, ouvre quand même le lecteur en modal
            return format_html(
                '<a href="javascript:void(0)" class="pixia-media-preview" data-type="video" data-src="{}" '
                'data-title="{}" title="Lire la vidéo" '
                'style="width:56px;height:40px;border-radius:6px;background:#1A1A22;'
                'display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">'
                '<i class="ti ti-player-play"></i></a>',
                file_url, obj.title,
            )

        badge = (
            '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;'
            'background:rgba(0,0,0,0.35);color:#fff;font-size:16px">▶</span>'
            if obj.type == "video" else ""
        )
        return format_html(
            '<a href="javascript:void(0)" class="pixia-media-preview" data-type="{}" data-src="{}" '
            'data-poster="{}" data-title="{}" title="Voir / lire le média" '
            'style="position:relative;display:inline-block;width:56px;height:40px;border-radius:6px;'
            'overflow:hidden;background:#1A1A22;cursor:zoom-in">'
            '<img src="{}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" />{}'
            '</a>',
            obj.type, file_url or thumb_url, thumb_url, obj.title,
            thumb_url, mark_safe(badge) if badge else "",
        )

    @admin.display(description="Aperçu du média")
    def media_preview(self, obj):
        if not obj.pk:
            return "— Enregistrez le média pour voir l'aperçu —"
        file_url = _public_file_url(obj.file)
        thumb_url = _public_file_url(obj.thumbnail)
        if obj.type == "video" and file_url:
            return format_html(
                '<video src="{}" poster="{}" controls preload="metadata" '
                'style="max-width:480px;max-height:320px;border-radius:10px;background:#000"></video>',
                file_url, thumb_url,
            )
        img_url = thumb_url or file_url
        if img_url:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">'
                '<img src="{}" style="max-width:480px;max-height:320px;border-radius:10px;'
                'object-fit:contain;background:#0A0A0F" /></a>',
                file_url or img_url, img_url,
            )
        return "— Aucun fichier —"

    class Media:
        js = ("admin/js/upload_progress.js", "admin/js/price_preview.js", "admin/js/media_form_ux.js")


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = (
        "user_email", "media_title", "price_display", "payment_status_badge",
        "payment_method", "download_progress", "purchased_at",
    )
    list_filter = ("payment_status", "payment_method", "purchased_at")
    search_fields = ("user__email", "media__title", "payment_reference")
    ordering = ("-purchased_at",)
    date_hierarchy = "purchased_at"
    readonly_fields = ("download_count", "purchased_at", "payment_reference")
    raw_id_fields = ("user", "media")

    fieldsets = (
        (None, {"fields": ("user", "media", "price", "max_downloads", "download_count", "purchased_at")}),
        ("Paiement", {"fields": ("payment_method", "payment_reference", "payment_status")}),
    )

    @admin.display(description="Client", ordering="user__email")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Média", ordering="media__title")
    def media_title(self, obj):
        return obj.media.title

    @admin.display(description="Prix", ordering="price")
    def price_display(self, obj):
        return f"{obj.price:,} FCFA".replace(",", " ")

    @admin.display(description="Statut paiement", ordering="payment_status")
    def payment_status_badge(self, obj):
        colors = {"success": "#22c55e", "simulated": "#f59e0b", "pending": "#8A8A95", "failed": "#C8371A"}
        color = colors.get(obj.payment_status, "#8A8A95")
        label = dict(Purchase.PAYMENT_STATUS_CHOICES).get(obj.payment_status, obj.payment_status)
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, label,
        )

    @admin.display(description="Téléchargements")
    def download_progress(self, obj):
        return f"{obj.download_count}/{obj.max_downloads}"


@admin.register(PricingConfig)
class PricingConfigAdmin(admin.ModelAdmin):
    list_display = ("media_type", "quality", "price", "description", "is_active", "order")
    list_filter = ("media_type", "is_active")
    search_fields = ("quality", "description")
    ordering = ("media_type", "order")
    list_per_page = 50


@admin.register(PaymentLog)
class PaymentLogAdmin(admin.ModelAdmin):
    list_display = ("reference", "amount_display", "method", "phone", "status_badge", "created_at")
    list_filter = ("method", "status")
    search_fields = ("reference", "phone", "transaction_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = (
        "amount", "method", "reference", "phone", "status", "message",
        "transaction_id", "raw_payload_display", "created_at",
    )
    exclude = ("raw_payload",)
    list_per_page = 30

    @admin.display(description="Montant", ordering="amount")
    def amount_display(self, obj):
        return f"{obj.amount:,} FCFA".replace(",", " ")

    @admin.display(description="Détails bruts du fournisseur")
    def raw_payload_display(self, obj):
        if not obj.raw_payload:
            return "—"
        pretty = json.dumps(obj.raw_payload, indent=2, ensure_ascii=False)
        return format_html("<pre style='white-space:pre-wrap;max-width:640px'>{}</pre>", pretty)

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        colors = {"success": "#22c55e", "simulated": "#f59e0b", "failed": "#C8371A", "pending": "#8A8A95"}
        color = colors.get(obj.status, "#8A8A95")
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, obj.get_status_display(),
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentSession)
class PaymentSessionAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "provider_badge", "user", "method", "amount_fcfa",
        "status_badge", "created_at",
    )
    list_filter = ("provider", "method", "status")
    search_fields = ("reference", "user__email", "pvit_transaction_id", "customer_account_number")
    ordering = ("-created_at",)
    readonly_fields = (
        "reference", "provider", "user", "media", "amount_fcfa", "fees",
        "method", "plan", "status", "failure_reason", "purchase", "pvit_transaction_id",
        "customer_account_number", "redirect_url", "raw_create_response", "raw_webhook_payload",
        "confirmed_at", "created_at",
    )
    exclude = ("amount_usd",)
    list_per_page = 30
    actions = ["reverify_with_mypvit", "confirm_manually"]

    @admin.action(description="Revérifier le statut auprès de MyPVit")
    def reverify_with_mypvit(self, request, queryset):
        from .payments import reconcile_session

        changed = 0
        for session in queryset.filter(provider="mypvit", status="pending"):
            if reconcile_session(session).status != "pending":
                changed += 1
        self.message_user(request, f"{changed} session(s) mise(s) à jour depuis MyPVit.")

    @admin.action(description="Confirmer manuellement (paiement vérifié dans le tableau de bord MyPVit)")
    def confirm_manually(self, request, queryset):
        from django.contrib import messages
        from .payments import manually_confirm

        if not request.user.is_superuser:
            self.message_user(request, "Action réservée aux super-administrateurs.", level=messages.ERROR)
            return
        done = 0
        for session in queryset.filter(provider="mypvit", status__in=("pending", "failed")):
            if manually_confirm(session).status == "success":
                done += 1
        self.message_user(request, f"{done} paiement(s) confirmé(s) manuellement.")

    @admin.display(description="Fournisseur", ordering="provider")
    def provider_badge(self, obj):
        colors = {"mypvit": "#16a34a", "fedapay": "#7c3aed", "singpay": "#0ea5e9"}
        color = colors.get(obj.provider, "#8A8A95")
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, obj.get_provider_display(),
        )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        colors = {"success": "#22c55e", "failed": "#C8371A", "pending": "#f59e0b"}
        color = colors.get(obj.status, "#8A8A95")
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, obj.get_status_display(),
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(MediaLike)
class MediaLikeAdmin(admin.ModelAdmin):
    list_display = ("user", "media", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "media__title")
    ordering = ("-created_at",)
    raw_id_fields = ("user", "media")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
