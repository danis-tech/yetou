from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter
from media_app.views import (
    MediaViewSet,
    PurchaseViewSet,
    pricing_table,
    log_payment,
    singpay_webhook,
    fedapay_initiate,
    fedapay_confirm,
    card_payment_status,
)
from users_app.views import (
    profile,
    google_callback,
    dashboard_summary,
    notifications_list,
    notification_detail,
    notifications_mark_all_read,
)

router = DefaultRouter()
router.register(r"media", MediaViewSet, basename="media")
router.register(r"purchases", PurchaseViewSet, basename="purchase")

urlpatterns = [
    path("", RedirectView.as_view(url="/admin/", permanent=False)),
    path("admin/", admin.site.urls),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/register/", include("dj_rest_auth.registration.urls")),
    path("accounts/", include("allauth.urls")),
    path("api/auth/google/", google_callback, name="google-callback"),
    path("api/users/profile/", profile, name="user-profile"),
    path("api/users/dashboard/", dashboard_summary, name="user-dashboard"),
    path("api/notifications/", notifications_list, name="notifications-list"),
    path("api/notifications/mark-all-read/", notifications_mark_all_read, name="notifications-mark-all-read"),
    path("api/notifications/<int:pk>/", notification_detail, name="notification-detail"),
    path("api/pricing/", pricing_table, name="pricing-table"),
    path("api/payments/log/", log_payment, name="log-payment"),
    path("api/payments/webhook/singpay/", singpay_webhook, name="singpay-webhook"),
    path("api/payments/fedapay/initiate/", fedapay_initiate, name="fedapay-initiate"),
    path("api/payments/fedapay/confirm/", fedapay_confirm, name="fedapay-confirm"),
    path("api/payments/card/status/", card_payment_status, name="card-payment-status"),
    path("api/", include(router.urls)),
]
