from django.contrib import admin
from django import forms
from .models import Media, Purchase, PricingConfig, PaymentLog


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
    list_display = ("title", "type", "quality", "category", "price_display", "status_badge", "downloads", "created_at")
    list_filter = ()
    search_fields = ("title", "description", "province", "city", "tags")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("downloads", "views", "rating", "file_size_display", "created_at", "updated_at")
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
                "file",
                "thumbnail",
                ("license_type", "price"),
            ),
            "description": "Stockage automatique sur Cloudflare R2",
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

    def price_display(self, obj):
        return f"{obj.price:,} FCFA".replace(",", " ")
    price_display.short_description = "Prix"
    price_display.admin_order_field = "price"

    def status_badge(self, obj):
        colors = {"draft": "#8A8A95", "published": "#22c55e", "archived": "#C8371A"}
        labels = {"draft": "Brouillon", "published": "Publié", "archived": "Archivé"}
        return f'<span style="background:{colors.get(obj.status, "#8A8A95")}20;color:{colors.get(obj.status, "#8A8A95")};padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700">{labels.get(obj.status, obj.status)}</span>'
    status_badge.short_description = "Statut"
    status_badge.allow_tags = True

    class Media:
        js = ("admin/js/upload_progress.js",)


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("user_email", "media_title", "price_display", "download_progress", "purchased_at")
    list_filter = ()
    search_fields = ("user__email", "media__title")
    ordering = ("-purchased_at",)
    date_hierarchy = "purchased_at"
    readonly_fields = ("download_count", "purchased_at")

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Client"
    user_email.admin_order_field = "user__email"

    def media_title(self, obj):
        return obj.media.title
    media_title.short_description = "Média"
    media_title.admin_order_field = "media__title"

    def price_display(self, obj):
        return f"{obj.price:,} FCFA".replace(",", " ")
    price_display.short_description = "Prix"
    price_display.admin_order_field = "price"

    def download_progress(self, obj):
        return f"{obj.download_count}/{obj.max_downloads}"
    download_progress.short_description = "Téléchargements"


@admin.register(PricingConfig)
class PricingConfigAdmin(admin.ModelAdmin):
    list_display = ("media_type", "quality", "price", "description", "is_active", "order")
    list_filter = ("media_type",)
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
    readonly_fields = ("amount", "method", "reference", "phone", "status", "message", "transaction_id", "created_at")
    list_per_page = 30

    def amount_display(self, obj):
        return f"{obj.amount:,} FCFA".replace(",", " ")
    amount_display.short_description = "Montant"
    amount_display.admin_order_field = "amount"

    def status_badge(self, obj):
        colors = {"success": "#22c55e", "simulated": "#f59e0b", "failed": "#C8371A"}
        return f'<span style="background:{colors.get(obj.status, "#8A8A95")}20;color:{colors.get(obj.status, obj.status)};padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700">{obj.get_status_display()}</span>'
    status_badge.short_description = "Statut"
    status_badge.allow_tags = True

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
