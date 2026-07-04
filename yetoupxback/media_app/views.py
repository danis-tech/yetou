import hmac
import hashlib
import logging
import time

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Exists, OuterRef
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import Media, MediaLike, Purchase, PaymentLog, PaygateSession, PricingConfig, Quality
from .filters import apply_media_filters, apply_media_order
from .pagination import MediaPagination
from .fedapay import (
    create_payment as create_fedapay_payment,
    verify_transaction,
    is_configured as fedapay_configured,
    fcfa_to_usd,
)
from .serializers import (
    MediaListSerializer, MediaDetailSerializer,
    PurchaseSerializer, CreatePurchaseSerializer, _public_file_url,
)

logger = logging.getLogger(__name__)

PLAN_DOWNLOADS = {"none": 1, "monthly": 10, "pro": -1}


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
        qs = super().get_queryset()
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


class PurchaseViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = CreatePurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        media = get_object_or_404(Media, id=serializer.validated_data["media_id"], status="published")
        user = request.user
        max_dl = PLAN_DOWNLOADS.get(user.plan, 1)
        if max_dl == -1:
            max_dl = 999

        purchase = Purchase.objects.create(
            user=user, media=media, price=media.price, max_downloads=max_dl,
            payment_method=serializer.validated_data.get("payment_method", ""),
            payment_reference=serializer.validated_data.get("payment_reference", ""),
            payment_status=serializer.validated_data.get("payment_status", "success") or "success",
        )
        from users_app.notifications import notify_purchase
        if purchase.payment_status in ("success", "simulated", "failed", "pending"):
            notify_purchase(user, purchase)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def download(self, request, pk=None):
        purchase = get_object_or_404(Purchase, id=pk, user=request.user)

        if purchase.payment_status not in ("success", "simulated"):
            return Response(
                {"error": "Le téléchargement n'est disponible qu'après confirmation du paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if purchase.download_count >= purchase.max_downloads:
            return Response({"error": "Limite de téléchargements atteinte."}, status=400)

        purchase.download_count += 1
        purchase.save(update_fields=["download_count"])

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

        file_url = _public_file_url(purchase.media.file)
        return Response({
            "message": "Téléchargement autorisé.",
            "url": file_url,
            "remaining": remaining,
        })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def log_payment(request):
    secret = request.headers.get("X-Internal-Secret", "")
    expected = getattr(settings, "INTERNAL_API_SECRET", "")
    if secret != expected:
        return Response({"error": "Non autorisé."}, status=403)

    try:
        PaymentLog.objects.create(
            amount=request.data.get("amount", 0),
            method=request.data.get("method", "Airtel Money"),
            reference=request.data.get("reference", ""),
            phone=request.data.get("phone", ""),
            status=request.data.get("status", "success"),
            message=request.data.get("message", ""),
            transaction_id=request.data.get("transaction_id", ""),
        )
        return Response({"success": True}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def singpay_webhook(request):
    """
    Endpoint webhook pour les notifications asynchrones de SingPay.

    SingPay envoie une requête POST quand le statut d'un paiement change
    (ex: l'utilisateur a validé ou refusé sur son téléphone).

    Sécurité : vérification HMAC-SHA256 avec SINGPAY_WEBHOOK_SECRET.
    Si le secret n'est pas configuré, on accepte quand même (mode dev)
    mais on logue un avertissement.

    Corps attendu (SingPay) :
    {
      "reference": "YETOU-...",
      "status": "SUCCESS" | "FAILED" | "PENDING",
      "transaction_id": "...",
      "amount": 1500,
      "client_msisdn": "077000000"
    }
    """
    webhook_secret = getattr(settings, "SINGPAY_WEBHOOK_SECRET", "")

    # ── Vérification signature HMAC ────────────────────────────────────
    if webhook_secret:
        sig_header = request.headers.get("X-SingPay-Signature", "")
        raw_body = request.body
        expected_sig = hmac.new(
            webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig_header, expected_sig):
            logger.warning("SingPay webhook: signature invalide.")
            return Response({"error": "Signature invalide."}, status=403)
    else:
        logger.warning("SingPay webhook reçu sans SINGPAY_WEBHOOK_SECRET configuré.")

    data = request.data
    reference = data.get("reference", "")
    singpay_status = str(data.get("status", "")).upper()
    transaction_id = str(data.get("transaction_id", ""))
    amount = data.get("amount", 0)
    phone = str(data.get("client_msisdn", ""))

    logger.info(
        "SingPay webhook: ref=%s status=%s tx=%s",
        reference, singpay_status, transaction_id,
    )

    # ── Mettre à jour le PaymentLog si il existe ───────────────────────
    log_status = "success" if singpay_status == "SUCCESS" else "failed"
    PaymentLog.objects.filter(reference=reference).update(
        status=log_status,
        transaction_id=transaction_id or PaymentLog.objects.filter(
            reference=reference,
        ).values_list("transaction_id", flat=True).first() or "",
        message=f"Webhook SingPay: {singpay_status}",
    )

    # ── Si succès et qu'aucun achat n'a encore été créé ────────────────
    # (cas où le frontend n'a pas pu appeler /api/purchases/ après le paiement)
    # ── Activer les achats en attente liés à cette référence ─────────
    if reference:
        from media_app.models import Purchase
        from users_app.notifications import notify_purchase

        if singpay_status == "SUCCESS":
            updated = Purchase.objects.filter(
                payment_reference=reference,
                payment_status="pending",
            )
            for purchase in updated.select_related("media", "user"):
                purchase.payment_status = "success"
                purchase.save(update_fields=["payment_status"])
                notify_purchase(purchase.user, purchase)
        elif singpay_status == "FAILED":
            failed = Purchase.objects.filter(
                payment_reference=reference,
                payment_status="pending",
            ).select_related("media", "user")
            for purchase in failed:
                purchase.payment_status = "failed"
                purchase.save(update_fields=["payment_status"])
                notify_purchase(purchase.user, purchase)

    if singpay_status == "SUCCESS" and reference:
        # On ne peut pas identifier l'utilisateur sans le lier à la référence
        # Ce bloc est un filet de sécurité — à améliorer en stockant
        # (reference → user_id + media_id) dans PaymentLog lors de l'initiation.
        logger.info(
            "SingPay webhook SUCCESS: ref=%s montant=%s phone=%s",
            reference, amount, phone,
        )

    return Response({"received": True}, status=200)


def _complete_card_session(session: PaygateSession, transaction_id: str = "", log_message: str = "") -> None:
    """Finalise achat ou abonnement après paiement carte confirmé."""
    if session.status == "success":
        return

    session.status = "success"
    session.save(update_fields=["status"])

    PaymentLog.objects.filter(reference=session.reference).update(
        status="success",
        message=log_message or "Paiement carte confirmé",
        transaction_id=transaction_id or "",
    )

    user = session.user

    if session.media_id:
        max_dl = PLAN_DOWNLOADS.get(user.plan, 1)
        if max_dl == -1:
            max_dl = 999

        purchase = Purchase.objects.create(
            user=user,
            media=session.media,
            price=session.amount_fcfa,
            max_downloads=max_dl,
            payment_method=session.method,
            payment_reference=session.reference,
            payment_status="success",
        )
        session.purchase = purchase
        session.save(update_fields=["purchase"])

        from users_app.notifications import notify_purchase
        notify_purchase(user, purchase)

    elif session.plan in ("monthly", "pro"):
        old_plan = user.plan
        user.plan = session.plan
        user.save(update_fields=["plan"])
        from users_app.notifications import notify_plan_change
        notify_plan_change(user, old_plan, session.plan)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def card_payment_status(request):
    """Indique si le paiement carte (FedaPay) est prêt."""
    return Response({
        "enabled": fedapay_configured(),
        "provider": "fedapay" if fedapay_configured() else None,
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def fedapay_initiate(request):
    """
    Paiement carte via FedaPay (Visa / Mastercard — formulaire bancaire).
    Corps : { media_id?, amount_fcfa, method: "Visa"|"Mastercard", plan? }
    """
    if not fedapay_configured():
        return Response(
            {
                "error": (
                    "Paiement carte non activé. Créez un compte sur sandbox.fedapay.com "
                    "et ajoutez FEDAPAY_SECRET_KEY dans le fichier .env du backend."
                ),
            },
            status=503,
        )

    method = str(request.data.get("method", "")).strip()
    if method not in ("Visa", "Mastercard"):
        return Response({"error": "Méthode invalide. Utilisez Visa ou Mastercard."}, status=400)

    plan = str(request.data.get("plan", "")).strip()
    if plan and plan not in ("monthly", "pro"):
        return Response({"error": "Plan invalide."}, status=400)

    media_id = request.data.get("media_id")
    media = None
    amount_fcfa = request.data.get("amount_fcfa")

    if media_id:
        media = get_object_or_404(Media, id=media_id, status="published")
        amount_fcfa = media.price
    else:
        try:
            amount_fcfa = int(amount_fcfa)
        except (TypeError, ValueError):
            return Response({"error": "Montant invalide."}, status=400)
        if amount_fcfa < 500:
            return Response({"error": "Le montant minimum est de 500 FCFA."}, status=400)

    if not media_id and not plan:
        return Response({"error": "media_id ou plan requis."}, status=400)

    order_id = f"YETOU-FP-{request.user.id}-{int(time.time() * 1000)}"
    amount_usd = fcfa_to_usd(amount_fcfa)
    description = media.title if media else f"Abonnement yétou ({plan})"

    session = PaygateSession.objects.create(
        reference=order_id,
        user=request.user,
        media=media,
        amount_fcfa=amount_fcfa,
        amount_usd=amount_usd,
        method=method,
        plan=plan,
    )

    customer_name = getattr(request.user, "name", "") or request.user.get_full_name() or ""
    result = create_fedapay_payment(
        order_id,
        amount_fcfa,
        request.user.email,
        customer_name=customer_name,
        description=description,
    )
    if not result["success"]:
        session.status = "failed"
        session.save(update_fields=["status"])
        PaymentLog.objects.create(
            amount=amount_fcfa,
            method=method,
            reference=order_id,
            status="failed",
            message=result.get("message", ""),
        )
        return Response({"error": result["message"]}, status=502)

    PaymentLog.objects.create(
        amount=amount_fcfa,
        method=method,
        reference=order_id,
        status="pending",
        message="FedaPay initié",
        transaction_id=result.get("transaction_id", ""),
    )

    return Response({
        "payment_url": result["payment_url"],
        "reference": order_id,
        "transaction_id": result.get("transaction_id"),
        "amount_fcfa": amount_fcfa,
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def fedapay_confirm(request):
    """
    Confirme un paiement FedaPay après retour client.
    Corps : { reference, transaction_id }
    """
    reference = str(request.data.get("reference", "")).strip()
    transaction_id = str(request.data.get("transaction_id", "")).strip()
    if not reference or not transaction_id:
        return Response({"error": "reference et transaction_id requis."}, status=400)

    session = (
        PaygateSession.objects.filter(reference=reference, user=request.user)
        .select_related("user", "media")
        .first()
    )
    if not session:
        return Response({"error": "Session de paiement introuvable."}, status=404)

    if session.status == "success":
        return Response({"status": "success", "reference": reference})

    verified = verify_transaction(transaction_id)
    if not verified.get("success"):
        return Response({"error": verified.get("message", "Vérification impossible.")}, status=502)

    status = verified.get("status", "")
    if status not in ("approved", "transferred", "completed"):
        return Response(
            {"error": f"Paiement non confirmé (statut : {status or 'inconnu'})."},
            status=400,
        )

    _complete_card_session(session, transaction_id)
    return Response({"status": "success", "reference": reference})
