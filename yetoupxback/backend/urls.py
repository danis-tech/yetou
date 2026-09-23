from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter
from media_app.views import (
    MediaViewSet,
    PurchaseViewSet,
    pricing_table,
    payment_methods,
    payment_initiate,
    payment_list,
    payment_detail,
    mypvit_webhook,
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
    # ─── Paiements MyPVit ───
    path("api/payments/methods/", payment_methods, name="payment-methods"),
    path("api/payments/initiate/", payment_initiate, name="payment-initiate"),
    path("api/payments/webhook/mypvit/", mypvit_webhook, name="mypvit-webhook"),
    path("api/payments/", payment_list, name="payment-list"),
    path("api/payments/<str:reference>/", payment_detail, name="payment-detail"),
    path("api/contributors/", include("contributors.urls")),
    path("api/", include(router.urls)),
]
