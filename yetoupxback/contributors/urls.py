from django.urls import path

from . import views

urlpatterns = [
    path("config/", views.program_config, name="contributors-config"),
    path("join/", views.join, name="contributors-join"),
    path("me/", views.me, name="contributors-me"),
    path("media/", views.my_media, name="contributors-media"),
    path("media/<int:pk>/", views.my_media_detail, name="contributors-media-detail"),
    path("earnings/", views.my_earnings, name="contributors-earnings"),
    path("payouts/", views.my_payouts, name="contributors-payouts"),
    path("payouts/<int:pk>/proof/", views.my_payout_proof, name="contributors-payout-proof"),
]
