import hmac
import hashlib
import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import Media, Purchase, PaymentLog
from .serializers import (
    MediaListSerializer, MediaDetailSerializer,
    PurchaseSerializer, CreatePurchaseSerializer,
)

logger = logging.getLogger(__name__)

PLAN_DOWNLOADS = {"none": 1, "monthly": 10, "pro": -1}


class MediaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Media.objects.filter(status="published")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == "list":
            return MediaListSerializer
        return MediaDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        media_type = self.request.query_params.get("type")
        category = self.request.query_params.get("category")
        if media_type in ("photo", "video"):
            qs = qs.filter(type=media_type)
        if category:
            qs = qs.filter(category=category)
        return qs


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
            payment_status=serializer.validated_data.get("payment_status", "success"),
        )
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def download(self, request, pk=None):
        purchase = get_object_or_404(Purchase, id=pk, user=request.user)
        if purchase.download_count >= purchase.max_downloads:
            return Response({"error": "Limite de téléchargements atteinte."}, status=400)
        purchase.download_count += 1
        purchase.save()
        return Response({
            "message": "Téléchargement autorisé.",
            "url": purchase.media.file.url if purchase.media.file else "",
            "remaining": purchase.remaining_downloads,
        })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def log_payment(request):
    secret = request.headers.get("X-Internal-Secret", "")
    expected = getattr(settings, "INTERNAL_API_SECRET", "yetou-internal-secret")
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
    if singpay_status == "SUCCESS" and reference:
        # On ne peut pas identifier l'utilisateur sans le lier à la référence
        # Ce bloc est un filet de sécurité — à améliorer en stockant
        # (reference → user_id + media_id) dans PaymentLog lors de l'initiation.
        logger.info(
            "SingPay webhook SUCCESS: ref=%s montant=%s phone=%s",
            reference, amount, phone,
        )

    return Response({"received": True}, status=200)
