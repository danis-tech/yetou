from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from rest_framework.authtoken.models import TokenProxy
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from .models import User

# Unregister unused models
for model in (Group, Site, TokenProxy):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass

original_index = admin.site.index


def admin_index(request, extra_context=None):
    if extra_context is None:
        extra_context = {}

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    from media_app.models import Purchase, Media, PricingConfig

    extra_context["total_users"] = User.objects.count()
    extra_context["subscribers"] = User.objects.filter(~Q(plan="none")).count()
    extra_context["subscriber_details"] = (
        f"{User.objects.filter(plan='monthly').count()} Mensuels · "
        f"{User.objects.filter(plan='pro').count()} Pro"
    )

    today_purchases = Purchase.objects.filter(purchased_at__gte=today_start)
    extra_context["today_revenue"] = today_purchases.aggregate(s=Sum("price"))["s"] or 0
    extra_context["today_orders"] = today_purchases.count()

    extra_context["week_revenue"] = Purchase.objects.filter(
        purchased_at__gte=week_start
    ).aggregate(s=Sum("price"))["s"] or 0

    month_purchases = Purchase.objects.filter(purchased_at__gte=month_start)
    extra_context["month_revenue"] = month_purchases.aggregate(s=Sum("price"))["s"] or 0
    extra_context["month_orders"] = month_purchases.count()

    extra_context["total_media"] = Media.objects.count()
    extra_context["total_purchases"] = Purchase.objects.count()
    extra_context["total_revenue"] = Purchase.objects.aggregate(s=Sum("price"))["s"] or 0

    extra_context["recent_purchases"] = (
        Purchase.objects.select_related("user", "media")
        .order_by("-purchased_at")[:10]
    )

    return original_index(request, extra_context)


admin.site.index = admin_index
admin.site.index_login = admin_index


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "name", "plan", "created_at")
    list_filter = ()
    search_fields = ("email", "name")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Infos", {"fields": ("name", "plan")}),
    )
    add_fieldsets = (
        (None, {"fields": ("email", "name", "password1", "password2")}),
    )
