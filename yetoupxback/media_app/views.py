import ipaddress
import logging

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Count, Exists, F, OuterRef
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from . import mypvit
from .filters import apply_media_filters, apply_media_order
from .models import Media, MediaLike, PaymentSession, PricingConfig, Purchase, Quality
from .pagination import MediaPagination
from .payments import confirm_payment, friendly_failure_reason, initiate_payment, reconcile_session
from .serializers import MediaDetailSerializer, MediaListSerializer, PurchaseSerializer

logger = logging.getLogger(__name__)

# Durée de validité du lien de téléchargement signé (secondes).
DOWNLOAD_URL_TTL = 300


class PaymentInitiateThrottle(UserRateThrottle):
    scope = "payments"


class PaymentStatusThrottle(UserRateThrottle):
    scope = "payment_status"


class MediaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Media.objects.filter(status="published")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = MediaPagination

    def get_serializer_class(self):
        if self.action == "list":
            return MediaListSerializer
        return MediaDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_queryset(self):
        qs = super().get_queryset().select_related("contributor__contributor_profile")
        qs = apply_media_filters(qs, self.request.query_params)
        qs = qs.annotate(likes_count=Count("likes", distinct=True))

        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(
                _user_liked=Exists(
                    MediaLike.objects.filter(media_id=OuterRef("pk"), user_id=user.id)
                )
            )

        return apply_media_order(qs, self.request.query_params)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        media = self.get_object()
        like_obj, created = MediaLike.objects.get_or_create(user=request.user, media=media)
        if not created:
            like_obj.delete()
            liked = False
        else:
            liked = True

        likes_count = media.likes.count()
        return Response({"likes_count": likes_count, "is_liked": liked})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def pricing_table(request):
    """Grille tarifaire publique : qualités disponibles + prix par type et qualité.

    Permet au frontend d'afficher des filtres/tarifs 100% dynamiques (ajout d'une
    qualité ou modification d'un prix dans l'admin = mise à jour immédiate du site).
    """
    qualities = [
        {"slug": q.slug, "name": q.name}
        for q in Quality.objects.filter(is_active=True).order_by("order", "name")
    ]
    pricing = {"photo": [], "video": []}
    for config in PricingConfig.get_pricing_table():
        pricing.setdefault(config.media_type, []).append({
            "quality": config.quality,
            "quality_display": config.get_quality_display(),
            "price": config.price,
            "description": config.description,
        })
    return Response({"qualities": qualities, "pricing": pricing})


class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """Achats de l'utilisateur, en lecture seule : un achat n'est créé QUE par
    la confirmation d'un paiement (media_app.payments.confirm_payment)."""

    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(user=self.request.user).select_related("media")

    @action(detail=True, methods=["post"])
    def download(self, request, pk=None):
        purchase = get_object_or_404(Purchase, id=pk, user=request.user)

        if purchase.payment_status not in Purchase.PAID_STATUSES:
            return Response(
                {"error": "Le téléchargement n'est disponible qu'après confirmation du paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )
        media_file = purchase.media.file
        if not media_file:
            return Response({"error": "Fichier indisponible. Contactez le support."}, status=404)

        # Incrément atomique : deux requêtes simultanées ne peuvent pas dépasser le quota.
        updated = Purchase.objects.filter(
            id=purchase.id, download_count__lt=F("max_downloads"),
        ).update(download_count=F("download_count") + 1)
        if not updated:
            return Response({"error": "Limite de téléchargements atteinte."}, status=400)
        Media.objects.filter(id=purchase.media_id).update(downloads=F("downloads") + 1)
        purchase.refresh_from_db(fields=["download_count"])

        remaining = purchase.remaining_downloads
        if remaining == 1:
            from users_app.notifications import create_notification
            create_notification(
                request.user,
                "download_limit_warning",
                "Dernier téléchargement",
                f"Il vous reste 1 téléchargement sur « {purchase.media.title} ».",
                action_url="/dashboard?tab=downloads",
                metadata={"purchase_id": purchase.id, "remaining": 1},
            )

        filename = media_file.name.rsplit("/", 1)[-1]
        try:
            # URL signée à durée de vie courte (jamais l'URL publique permanente).
            file_url = media_file.storage.url(
                media_file.name,
                parameters={"ResponseContentDisposition": f'attachment; filename="{filename}"'},
                expire=DOWNLOAD_URL_TTL,
            )
        except TypeError:  # stockage local (dev) sans URL signée
            file_url = media_file.url
        return Response({
            "message": "Téléchargement autorisé.",
            "url": file_url,
            "remaining": remaining,
        })


# ─── Paiements MyPVit ────────────────────────────────────────────────────────

def _session_payload(session: PaymentSession, user) -> dict:
    if session.status == "success":
        message = "Paiement confirmé avec succès."
    elif session.status == "failed":
        message = friendly_failure_reason(session.failure_reason)
    elif session.redirect_url:
        message = "Finalisez le paiement sur le formulaire carte sécurisé."
    else:
        message = "Validez le paiement sur votre téléphone (code PIN)."
    return {
        "reference": session.reference,
        "status": session.status,
        "message": message,
        "method": session.method,
        "amount_fcfa": session.amount_fcfa,
        "media_id": session.media_id,
        "plan": session.plan,
        "purchase_id": session.purchase_id,
        "redirect_url": session.redirect_url if session.status == "pending" else "",
        "user_plan": user.active_plan,
        "plan_expires_at": user.plan_expires_at,
    }


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def payment_methods(request):
    """Moyens de paiement actuellement disponibles."""
    return Response({
        "mobile": mypvit.is_configured(),
        "card": mypvit.card_is_configured(),
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([PaymentInitiateThrottle])
def payment_initiate(request):
    """
    Initie un paiement MyPVit. Corps : { media_id? | plan?, method, phone }.
    - Mobile Money : un push USSD est envoyé au téléphone ; le frontend sonde
      ensuite GET /api/payments/<reference>/.
    - Carte : la réponse contient `redirect_url` (formulaire bancaire PVit).
    Le montant est calculé côté serveur.
    """
    if not mypvit.is_configured():
        return Response({"error": "Le paiement est momentanément indisponible."}, status=503)

    method = str(request.data.get("method", "")).strip()
    phone = str(request.data.get("phone", "")).strip()
    plan = str(request.data.get("plan", "") or "").strip()
    media_id = request.data.get("media_id")

    media = None
    if media_id not in (None, "", 0):
        try:
            media = Media.objects.get(id=int(media_id), status="published")
        except (Media.DoesNotExist, TypeError, ValueError):
            return Response({"error": "Média introuvable."}, status=404)

    try:
        session = initiate_payment(user=request.user, method=method, phone=phone, media=media, plan=plan)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)
    except mypvit.MyPvitError as exc:
        logger.error("Initiation MyPVit impossible : %s", exc)
        return Response(
            {"error": "Le service de paiement est momentanément indisponible. Réessayez dans un instant."},
            status=503,
        )
    return Response(_session_payload(session, request.user), status=201)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([PaymentStatusThrottle])
def payment_detail(request, reference):
    """Statut d'un paiement de l'utilisateur connecté (sondé par le frontend).

    Si le webhook tarde, interroge MyPVit (au plus toutes les 15 s par paiement)
    pour ne pas laisser le client dans l'incertitude."""
    session = get_object_or_404(PaymentSession, reference=reference, user=request.user)

    age = (timezone.now() - session.created_at).total_seconds()
    if session.status == "pending" and session.provider == "mypvit" and age > 30:
        if cache.add(f"mypvit:reconcile:{session.reference}", 1, 15):
            session = reconcile_session(session)

    request.user.refresh_from_db(fields=["plan", "plan_expires_at"])
    return Response(_session_payload(session, request.user))


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def payment_list(request):
    """Historique des paiements de l'utilisateur connecté."""
    sessions = PaymentSession.objects.filter(user=request.user).select_related("media")[:50]
    return Response([
        {
            "reference": s.reference,
            "status": s.status,
            "method": s.method,
            "amount_fcfa": s.amount_fcfa,
            "media_title": s.media.title if s.media_id else "",
            "plan": s.plan,
            "created_at": s.created_at,
            "failure_reason": friendly_failure_reason(s.failure_reason) if s.status == "failed" else "",
        }
        for s in sessions
    ])


def _client_ip(request) -> str:
    """IP de l'appelant. Derrière un reverse proxy de confiance
    (TRUST_X_FORWARDED_FOR=True), on prend la dernière IP ajoutée par le proxy."""
    if getattr(settings, "TRUST_X_FORWARDED_FOR", False):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded:
            return forwarded.split(",")[-1].strip()
    return request.META.get("REMOTE_ADDR", "")


def _is_mypvit_ip(ip: str) -> bool:
    allowed = getattr(settings, "MYPVIT_WEBHOOK_ALLOWED_IPS", [])
    if not ip or not allowed:
        return False
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in ipaddress.ip_network(net, strict=False) for net in allowed)
    except ValueError:
        return False


@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def mypvit_webhook(request):
    """
    Webhook MyPVit : notification asynchrone du statut final (SUCCESS/FAILED).

    MyPVit ne signe pas ses webhooks : le statut reçu n'est JAMAIS appliqué tel
    quel — `confirm_payment` le contre-vérifie via Check Status. Si
    MYPVIT_WEBHOOK_ALLOWED_IPS est défini, les autres IP sont rejetées.

    Règle MyPVit : répondre 200 avec l'écho EXACT de transactionId / code reçus.
    """
    ip = _client_ip(request)
    trusted_source = _is_mypvit_ip(ip)
    if getattr(settings, "MYPVIT_WEBHOOK_ALLOWED_IPS", []) and not trusted_source:
        logger.warning("Webhook MyPVit rejeté : IP non autorisée (%s).", ip)
        return Response({"error": "Forbidden"}, status=403)

    payload = request.data if hasattr(request.data, "get") else {}
    transaction_id = payload.get("transactionId")
    reference = payload.get("merchantReferenceId")
    code = payload.get("code")
    ack = {"transactionId": transaction_id, "responseCode": code}

    if not reference:
        logger.warning("Webhook MyPVit sans merchantReferenceId.")
        return Response(ack, status=200)

    confirm_payment(
        reference=str(reference),
        reported_status=str(payload.get("status") or ""),
        transaction_id=str(transaction_id or ""),
        raw_payload=dict(payload),
        amount=payload.get("amount"),
        fees=payload.get("fees"),
        message=str(payload.get("message") or ""),
        trusted_source=trusted_source,
    )
    return Response(ack, status=200)
