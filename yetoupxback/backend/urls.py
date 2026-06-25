from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter
from media_app.views import MediaViewSet, PurchaseViewSet, log_payment, singpay_webhook
from users_app.views import profile, google_callback

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
    path("api/payments/log/", log_payment, name="log-payment"),
    path("api/payments/webhook/singpay/", singpay_webhook, name="singpay-webhook"),
    path("api/", include(router.urls)),
]
