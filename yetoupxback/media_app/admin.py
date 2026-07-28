from django.contrib import admin
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
    list_display = ("preview_thumb", "title", "type", "quality", "category", "price_display", "status_badge", "downloads", "created_at")
    list_display_links = ("title",)
    list_filter = ("status", "type", "category", "quality")
    search_fields = ("title", "description", "province", "city", "tags")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("media_preview", "price_display", "downloads", "views", "rating", "file_size_display", "created_at", "updated_at")
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
        colors = {"draft": "#8A8A95", "published": "#22c55e", "archived": "#C8371A"}
        labels = {"draft": "Brouillon", "published": "Publié", "archived": "Archivé"}
        color = colors.get(obj.status, "#8A8A95")
        label = labels.get(obj.status, obj.status)
        return format_html(
            '<span style="background:{}20;color:{};padding:3px 10px;border-radius:8px;'
            'font-size:10px;font-weight:700">{}</span>',
            color, color, label,
        )

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
                '<a href="javascript:void(0)" class="yetou-media-preview" data-type="video" data-src="{}" '
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
            '<a href="javascript:void(0)" class="yetou-media-preview" data-type="{}" data-src="{}" '
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
        "amount_usd", "status_badge", "created_at",
    )
    list_filter = ("provider", "method", "status")
    search_fields = ("reference", "user__email")
    ordering = ("-created_at",)
    readonly_fields = (
        "reference", "provider", "user", "media", "amount_fcfa", "amount_usd",
        "method", "plan", "status", "purchase", "created_at",
    )
    list_per_page = 30

    @admin.display(description="Fournisseur", ordering="provider")
    def provider_badge(self, obj):
        colors = {"fedapay": "#7c3aed", "singpay": "#0ea5e9"}
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
