import logging
import re

from django.core.exceptions import ValidationError
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import permissions, status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from media_app.models import Category, Media, Quality
from media_app.serializers import _public_file_url
from users_app.notifications import create_notification

from .models import BuyoutRate, ContributorEarning, ContributorProfile, ContributorSettings, PayoutRequest
from .services import balance_for, max_buyout_for, request_payout

logger = logging.getLogger(__name__)

PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm"}


class SubmissionThrottle(UserRateThrottle):
    """Limite les envois de médias (la consultation n'est pas limitée)."""
    scope = "contributions"

    def allow_request(self, request, view):
        return request.method != "POST" or super().allow_request(request, view)


def _settings_payload(cfg: ContributorSettings) -> dict:
    rates = [
        {"media_type": r.media_type, "quality": r.quality, "amount": r.amount}
        for r in BuyoutRate.objects.filter(is_active=True)
    ]
    return {
        "accepting_submissions": cfg.accepting_submissions,
        "commission_percent": cfg.commission_percent,
        "contributor_percent": cfg.contributor_percent,
        "min_price": cfg.min_price,
        "max_price": cfg.max_price,
        "max_video_seconds": cfg.max_video_seconds,
        "max_photo_size_mb": cfg.max_photo_size_mb,
        "max_video_size_mb": cfg.max_video_size_mb,
        "min_payout": cfg.min_payout,
        "buyout_rates": rates,
        "max_buyout": {"photo": max_buyout_for("photo"), "video": max_buyout_for("video")},
        "photo_extensions": sorted(PHOTO_EXTENSIONS),
        "video_extensions": sorted(VIDEO_EXTENSIONS),
        "categories": [{"slug": c.slug, "name": c.name} for c in Category.objects.filter(is_active=True)],
        "qualities": [{"slug": q.slug, "name": q.name} for q in Quality.objects.filter(is_active=True)],
    }


def _profile_payload(profile: ContributorProfile) -> dict:
    return {
        "display_name": profile.display_name,
        "bio": profile.bio,
        "payout_operator": profile.payout_operator,
        "payout_phone": profile.payout_phone,
        "status": profile.status,
        "created_at": profile.created_at,
    }


def _normalize_phone(raw: str) -> str:
    from media_app.payments import to_local_gabon_number
    return to_local_gabon_number(raw)


def _active_profile(user) -> ContributorProfile | None:
    return ContributorProfile.objects.filter(user=user).first()


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def program_config(request):
    """Règles publiques du programme (part plateforme, tarifs de rachat, limites)."""
    return Response(_settings_payload(ContributorSettings.get()))


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    profile = _active_profile(request.user)
    if request.method == "GET":
        if profile is None:
            return Response({"is_contributor": False})
        stats = Media.objects.filter(contributor=request.user).values("status").annotate(n=Count("id"))
        return Response({
            "is_contributor": True,
            "profile": _profile_payload(profile),
            "balance": balance_for(request.user),
            "media_counts": {row["status"]: row["n"] for row in stats},
        })

    if profile is None:
        return Response({"error": "Profil contributeur introuvable."}, status=404)
    errors = {}
    if "display_name" in request.data:
        name = str(request.data["display_name"]).strip()
        if not 2 <= len(name) <= 80:
            errors["display_name"] = "Entre 2 et 80 caractères."
        profile.display_name = name
    if "bio" in request.data:
        profile.bio = str(request.data["bio"]).strip()[:600]
    if "payout_operator" in request.data:
        op = str(request.data["payout_operator"])
        if op not in dict(ContributorProfile.OPERATOR_CHOICES):
            errors["payout_operator"] = "Choisissez Airtel Money ou Moov Money."
        profile.payout_operator = op
    if "payout_phone" in request.data:
        phone = _normalize_phone(str(request.data["payout_phone"]))
        if not phone:
            errors["payout_phone"] = "Numéro invalide. Format attendu : 077 00 00 00."
        profile.payout_phone = phone
    if errors:
        return Response({"errors": errors}, status=400)
    profile.save()
    return Response({"profile": _profile_payload(profile)})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def join(request):
    """Crée le profil contributeur de l'utilisateur connecté."""
    if _active_profile(request.user):
        return Response({"error": "Vous êtes déjà contributeur."}, status=400)
    if str(request.data.get("accept_terms", "")).lower() not in ("true", "1", "on"):
        return Response({"errors": {"accept_terms": "Vous devez accepter la charte des contributeurs."}}, status=400)

    name = str(request.data.get("display_name", "")).strip()
    operator = str(request.data.get("payout_operator", "")).strip()
    phone = _normalize_phone(str(request.data.get("payout_phone", "")))
    errors = {}
    if not 2 <= len(name) <= 80:
        errors["display_name"] = "Indiquez le nom affiché sur vos médias (2 à 80 caractères)."
    if operator and operator not in dict(ContributorProfile.OPERATOR_CHOICES):
        errors["payout_operator"] = "Choisissez Airtel Money ou Moov Money."
    if request.data.get("payout_phone") and not phone:
        errors["payout_phone"] = "Numéro invalide. Format attendu : 077 00 00 00."
    if errors:
        return Response({"errors": errors}, status=400)

    profile = ContributorProfile.objects.create(
        user=request.user, display_name=name, bio=str(request.data.get("bio", "")).strip()[:600],
        payout_operator=operator, payout_phone=phone, terms_accepted_at=timezone.now(),
    )
    return Response({"profile": _profile_payload(profile)}, status=201)


def _media_payload(m: Media) -> dict:
    earned = getattr(m, "earned_total", None)
    return {
        "id": m.id,
        "title": m.title,
        "type": m.type,
        "quality": m.quality,
        "category": m.category,
        "status": m.status,
        "status_display": m.get_status_display(),
        "payout_mode": m.payout_mode,
        "price": m.price,
        "contributor_price": m.contributor_price,
        "buyout_amount": m.buyout_amount,
        "rejection_reason": m.rejection_reason if m.status == "rejected" else "",
        "submitted_at": m.submitted_at,
        "reviewed_at": m.reviewed_at,
        "preview_url": _public_file_url(m.thumbnail) or (_public_file_url(m.file) if m.type == "photo" else ""),
        "sales": getattr(m, "sales_count", 0),
        "earned": earned or 0,
    }


def _validate_submission(request, cfg: ContributorSettings) -> tuple[dict, dict]:
    """Contrôle d'une soumission. Renvoie (données propres, erreurs)."""
    data, errors = {}, {}
    upload = request.FILES.get("file")
    if not upload:
        return data, {"file": "Choisissez une photo ou une vidéo."}

    ext = upload.name.rsplit(".", 1)[-1].lower() if "." in upload.name else ""
    if ext in PHOTO_EXTENSIONS:
        media_type, limit_mb = "photo", cfg.max_photo_size_mb
    elif ext in VIDEO_EXTENSIONS:
        media_type, limit_mb = "video", cfg.max_video_size_mb
    else:
        return data, {"file": "Format non accepté. Photos : JPG, PNG, WebP. Vidéos : MP4, MOV, WebM."}
    if upload.size > limit_mb * 1024 * 1024:
        errors["file"] = f"Fichier trop lourd : {limit_mb} Mo maximum pour une {'photo' if media_type == 'photo' else 'vidéo'}."
    data["type"] = media_type

    if media_type == "photo" and "file" not in errors:
        # Vérifie que c'est réellement une image (pas un fichier renommé).
        try:
            with Image.open(upload) as img:
                img.verify()
            upload.seek(0)
            with Image.open(upload) as img:
                data["width"], data["height"] = img.size
            upload.seek(0)
        except (UnidentifiedImageError, OSError, SyntaxError):
            errors["file"] = "Ce fichier n'est pas une image valide."

    if media_type == "video":
        try:
            seconds = int(float(request.data.get("duration_seconds", 0)))
        except (TypeError, ValueError):
            seconds = 0
        if seconds <= 0:
            errors["duration_seconds"] = "Durée de la vidéo introuvable."
        elif seconds > cfg.max_video_seconds:
            errors["duration_seconds"] = (
                f"Vidéo trop longue : {cfg.max_video_seconds // 60} min {cfg.max_video_seconds % 60:02d} s maximum."
            )
        data["declared_duration_seconds"] = seconds
        thumb = request.FILES.get("thumbnail")
        if thumb:
            try:
                with Image.open(thumb) as img:
                    img.verify()
                thumb.seek(0)
                data["thumbnail"] = thumb
            except (UnidentifiedImageError, OSError, SyntaxError):
                errors["thumbnail"] = "Miniature invalide."

    title = str(request.data.get("title", "")).strip()
    if not 3 <= len(title) <= 255:
        errors["title"] = "Donnez un titre (3 à 255 caractères)."
    data["title"] = title
    data["description"] = str(request.data.get("description", "")).strip()[:2000]

    category = str(request.data.get("category", ""))
    if not Category.objects.filter(slug=category, is_active=True).exists():
        errors["category"] = "Choisissez une catégorie."
    data["category"] = category

    quality = str(request.data.get("quality", ""))
    if not Quality.objects.filter(slug=quality, is_active=True).exists():
        errors["quality"] = "Choisissez la qualité proposée."
    data["quality"] = quality

    mode = str(request.data.get("payout_mode", ""))
    if mode not in ("revenue_share", "buyout"):
        errors["payout_mode"] = "Choisissez comment être payé."
    data["payout_mode"] = mode
    if mode == "revenue_share":
        try:
            price = int(request.data.get("price", 0))
        except (TypeError, ValueError):
            price = 0
        if not cfg.min_price <= price <= cfg.max_price:
            errors["price"] = f"Prix entre {cfg.min_price} et {cfg.max_price} FCFA."
        data["contributor_price"] = price

    for field, limit in (("province", 50), ("city", 100), ("tags", 500)):
        data[field] = str(request.data.get(field, "")).strip()[:limit]
    return data, errors


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@throttle_classes([SubmissionThrottle])
def my_media(request):
    profile = _active_profile(request.user)
    if profile is None:
        return Response({"error": "Devenez contributeur pour proposer des médias."}, status=403)

    if request.method == "GET":
        from media_app.models import Purchase
        earned = (ContributorEarning.objects.filter(media=OuterRef("pk"))
                  .values("media").annotate(total=Sum("amount")).values("total"))
        qs = (Media.objects.filter(contributor=request.user)
              .annotate(
                  sales_count=Count("purchases", filter=Q(purchases__payment_status__in=Purchase.PAID_STATUSES), distinct=True),
                  earned_total=Coalesce(Subquery(earned, output_field=IntegerField()), 0),
              )
              .order_by("-submitted_at", "-created_at"))
        return Response([_media_payload(m) for m in qs])

    cfg = ContributorSettings.get()
    if profile.status != "active":
        return Response({"error": "Votre compte contributeur est suspendu."}, status=403)
    if not cfg.accepting_submissions:
        return Response({"error": "Les soumissions sont momentanément fermées."}, status=403)

    data, errors = _validate_submission(request, cfg)
    if errors:
        return Response({"errors": errors}, status=400)

    width, height = data.pop("width", None), data.pop("height", None)
    media = Media(
        contributor=request.user, status="pending", submitted_at=timezone.now(),
        camera_model="", file=request.FILES["file"], width=width, height=height,
        resolution=f"{width} × {height} px" if width else "",
        **data,
    )
    if media.type == "video" and media.declared_duration_seconds:
        s = media.declared_duration_seconds
        media.duration = f"{s // 60}:{s % 60:02d}"
    media.save()
    create_notification(request.user, "contribution_submitted", "Média reçu",
                        f"« {media.title} » est en cours d'examen par notre équipe.",
                        action_url="/contributeur?tab=medias", metadata={"media_id": media.id})
    return Response(_media_payload(media), status=201)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def my_media_detail(request, pk):
    """Retire une soumission encore en attente ou refusée (jamais un média publié)."""
    media = get_object_or_404(Media, pk=pk, contributor=request.user)
    if media.status not in ("pending", "rejected"):
        return Response({"error": "Un média publié ne peut pas être retiré ici. Contactez-nous."}, status=400)
    media.delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_earnings(request):
    rows = ContributorEarning.objects.filter(contributor=request.user).select_related("media")[:200]
    return Response([
        {"id": e.id, "kind": e.kind, "kind_display": e.get_kind_display(), "media_title": e.media.title if e.media else "",
         "gross_amount": e.gross_amount, "commission_percent": e.commission_percent, "amount": e.amount,
         "created_at": e.created_at}
        for e in rows
    ])


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def my_payouts(request):
    if request.method == "GET":
        rows = PayoutRequest.objects.filter(contributor=request.user)[:100]
        return Response([
            {"id": p.id, "amount": p.amount, "operator": p.operator, "phone": p.phone, "status": p.status,
             "status_display": p.get_status_display(), "transaction_reference": p.transaction_reference,
             "admin_note": p.admin_note, "created_at": p.created_at, "processed_at": p.processed_at,
             "has_proof": bool(p.proof), "proof_uploaded_at": p.proof_uploaded_at}
            for p in rows
        ])
    try:
        amount = int(re.sub(r"\D", "", str(request.data.get("amount", ""))) or 0)
    except ValueError:
        amount = 0
    try:
        payout = request_payout(request.user, amount)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)
    return Response({"id": payout.id, "amount": payout.amount, "status": payout.status}, status=201)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_payout_proof(request, pk):
    """Lien temporaire (5 min) vers la preuve de paiement d'un retrait du
    contributeur connecté — jamais celle d'un autre."""
    payout = get_object_or_404(PayoutRequest, pk=pk, contributor=request.user)
    if not payout.proof:
        return Response({"error": "Aucune preuve de paiement pour ce retrait."}, status=404)
    try:
        url = payout.proof.storage.url(payout.proof.name, expire=300)
    except TypeError:
        url = payout.proof.url
    return Response({"url": url})
