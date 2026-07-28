import json

from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from rest_framework.authtoken.models import TokenProxy
from django.db.models import Sum, Q, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from .models import User, Notification

# Unregister unused models
for model in (Group, Site, TokenProxy):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass

admin.site.site_header = "Gabon Pixel Administration"
admin.site.site_title = "Gabon Pixel Admin"
admin.site.index_title = "Tableau de bord"

original_index = admin.site.index


def admin_index(request, extra_context=None):
    if extra_context is None:
        extra_context = {}

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    from media_app.models import Purchase, Media, Category

    paid_filter = Q(payment_status__in=Purchase.PAID_STATUSES)

    extra_context["total_users"] = User.objects.count()
    extra_context["subscribers"] = User.objects.filter(~Q(plan="none")).count()
    extra_context["subscriber_details"] = (
        f"{User.objects.filter(plan='monthly').count()} Mensuels · "
        f"{User.objects.filter(plan='pro').count()} Pro"
    )

    today_purchases = Purchase.objects.filter(purchased_at__gte=today_start).filter(paid_filter)
    extra_context["today_revenue"] = today_purchases.aggregate(s=Sum("price"))["s"] or 0
    extra_context["today_orders"] = today_purchases.count()

    extra_context["week_revenue"] = Purchase.objects.filter(
        purchased_at__gte=week_start,
    ).filter(paid_filter).aggregate(s=Sum("price"))["s"] or 0

    month_purchases = Purchase.objects.filter(purchased_at__gte=month_start).filter(paid_filter)
    extra_context["month_revenue"] = month_purchases.aggregate(s=Sum("price"))["s"] or 0
    extra_context["month_orders"] = month_purchases.count()

    extra_context["total_media"] = Media.objects.filter(status="published").count()
    extra_context["total_purchases"] = Purchase.objects.filter(paid_filter).count()
    extra_context["total_revenue"] = Purchase.objects.filter(paid_filter).aggregate(s=Sum("price"))["s"] or 0

    extra_context["recent_purchases"] = (
        Purchase.objects.filter(paid_filter)
        .select_related("user", "media")
        .order_by("-purchased_at")[:10]
    )

    # ─── Graphiques : évolution du CA (14 jours) ───
    days_range = 14
    range_start = (today_start - timedelta(days=days_range - 1)).date()
    daily_map = {
        row["day"]: row for row in (
            Purchase.objects.filter(paid_filter, purchased_at__gte=today_start - timedelta(days=days_range - 1))
            .annotate(day=TruncDate("purchased_at"))
            .values("day")
            .annotate(revenue=Sum("price"), orders=Count("id"))
        )
    }
    revenue_labels, revenue_data, orders_data = [], [], []
    for i in range(days_range):
        d = range_start + timedelta(days=i)
        revenue_labels.append(d.strftime("%d/%m"))
        row = daily_map.get(d)
        revenue_data.append(row["revenue"] if row else 0)
        orders_data.append(row["orders"] if row else 0)
    extra_context["chart_revenue_labels"] = json.dumps(revenue_labels)
    extra_context["chart_revenue_data"] = json.dumps(revenue_data)
    extra_context["chart_orders_data"] = json.dumps(orders_data)

    # ─── Graphiques : ventes par type de média ───
    type_map = {
        row["media__type"]: row for row in (
            Purchase.objects.filter(paid_filter).values("media__type").annotate(count=Count("id"), revenue=Sum("price"))
        )
    }
    extra_context["chart_type_data"] = json.dumps([
        (type_map.get("photo") or {}).get("count", 0),
        (type_map.get("video") or {}).get("count", 0),
    ])

    # ─── Graphiques : meilleures catégories (par nombre de ventes) ───
    category_names = dict(Category.objects.values_list("slug", "name"))
    top_categories = list(
        Purchase.objects.filter(paid_filter)
        .values("media__category")
        .annotate(count=Count("id"))
        .order_by("-count")[:6]
    )
    extra_context["chart_category_labels"] = json.dumps([
        category_names.get(row["media__category"], row["media__category"] or "—") for row in top_categories
    ])
    extra_context["chart_category_data"] = json.dumps([row["count"] for row in top_categories])

    return original_index(request, extra_context)


admin.site.index = admin_index


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "name", "plan", "is_active", "is_staff", "created_at")
    list_filter = ("plan", "is_active", "is_staff")
    search_fields = ("email", "name")
    ordering = ("-created_at",)
    filter_horizontal = ()

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Infos", {"fields": ("name", "plan")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {"fields": ("email", "name", "password1", "password2")}),
    )

    def get_fieldsets(self, request, obj=None):
        fieldsets = list(super().get_fieldsets(request, obj))
        if not request.user.is_superuser:
            fieldsets = [
                fs for fs in fieldsets
                if fs[0] != "Permissions"
            ]
        return fieldsets

    def get_list_display(self, request):
        if request.user.is_superuser:
            return ("email", "name", "plan", "is_active", "is_staff", "created_at")
        return ("email", "name", "plan", "created_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "notification_type", "read", "created_at")
    list_filter = ("notification_type", "read")
    search_fields = ("title", "user__email")
    readonly_fields = ("created_at",)


ACTION_FLAG_LABELS = {1: "Ajout", 2: "Modification", 3: "Suppression"}


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    """Journal d'activité : historique des actions effectuées dans l'admin."""
    list_display = ("action_time", "user", "content_type", "object_repr", "action_display")
    list_filter = ("action_flag", "content_type")
    search_fields = ("object_repr", "change_message", "user__email")
    ordering = ("-action_time",)
    readonly_fields = [f.name for f in LogEntry._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Action")
    def action_display(self, obj):
        return ACTION_FLAG_LABELS.get(obj.action_flag, obj.action_flag)


# ─── Regroupement de l'admin en 5 sections métier ───
SECTION_ORDER = ["Médias", "Utilisateurs", "Catégories & Qualités", "Paiements", "Activités"]

MODEL_SECTIONS = {
    "media": "Médias",
    "medialike": "Médias",
    "user": "Utilisateurs",
    "category": "Catégories & Qualités",
    "quality": "Catégories & Qualités",
    "purchase": "Paiements",
    "paymentlog": "Paiements",
    "paymentsession": "Paiements",
    "pricingconfig": "Paiements",
    "notification": "Activités",
    "logentry": "Activités",
}

MODEL_ORDER = [
    "media", "medialike",
    "user",
    "category", "quality",
    "purchase", "paymentlog", "paymentsession", "pricingconfig",
    "notification", "logentry",
]


def get_app_list(request, app_label=None):
    raw_apps = admin.site._build_app_dict(request)
    sections: dict[str, list] = {}

    for app in raw_apps.values():
        for model_dict in app["models"]:
            model_name = model_dict["model"]._meta.model_name
            section_name = MODEL_SECTIONS.get(model_name)
            if not section_name:
                continue
            sections.setdefault(section_name, []).append(model_dict)

    def sort_key(model_dict):
        model_name = model_dict["model"]._meta.model_name
        return MODEL_ORDER.index(model_name) if model_name in MODEL_ORDER else len(MODEL_ORDER)

    app_list = []
    for section_name in SECTION_ORDER:
        models = sections.get(section_name)
        if not models:
            continue
        models.sort(key=sort_key)
        app_list.append({
            "name": section_name,
            "app_label": section_name.lower(),
            "app_url": "#",
            "has_module_perms": True,
            "models": models,
        })

    return app_list


admin.site.get_app_list = get_app_list
