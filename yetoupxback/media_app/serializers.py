from django.conf import settings
from rest_framework import serializers
from .models import Media, Purchase


def _public_file_url(file_field) -> str:
    """URL publique R2 pour l'affichage catalogue (sans signature)."""
    if not file_field or not file_field.name:
        return ""
    domain = getattr(settings, "R2_PUBLIC_DOMAIN", "")
    if domain:
        return f"https://{domain}/{file_field.name}"
    try:
        return file_field.url
    except Exception:
        return ""


def _public_preview_url(obj) -> str:
    """Image publique d'un média : aperçu filigrané pour une photo, miniature
    (image fixe) pour une vidéo. Jamais le fichier original d'une photo."""
    if obj.type == "photo":
        return _public_file_url(obj.preview) or _public_file_url(obj.thumbnail)
    return _public_file_url(obj.thumbnail)


def _contributor_name(obj) -> str:
    """Nom public du contributeur (vide pour un média de la plateforme)."""
    if not obj.contributor_id:
        return ""
    profile = getattr(obj.contributor, "contributor_profile", None)
    return profile.display_name if profile else ""


class MediaListSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    quality_display = serializers.CharField(source="get_quality_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.CharField(read_only=True)
    preview_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    stream_url = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.SerializerMethodField()
    contributor_name = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id", "title", "type", "type_display", "quality", "quality_display",
            "category", "category_display", "price", "license_type",
            "file_url", "preview_url", "thumbnail_url", "stream_url",
            "file_size_display", "resolution", "duration", "downloads",
            "likes_count", "is_liked", "contributor_name", "created_at",
        ]

    def get_is_liked(self, obj):
        if hasattr(obj, "_user_liked"):
            return bool(obj._user_liked)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_contributor_name(self, obj):
        return _contributor_name(obj)

    # Le public ne reçoit jamais l'original d'une photo : uniquement l'aperçu
    # réduit et filigrané (voir media_app/previews.py). L'original n'est servi
    # qu'après achat, par lien signé (PurchaseViewSet.download).
    def get_thumbnail_url(self, obj):
        return _public_preview_url(obj)

    def get_file_url(self, obj):
        return ""

    def get_preview_url(self, obj):
        return _public_preview_url(obj)

    def get_stream_url(self, obj):
        return _public_file_url(obj.file) if obj.type == "video" else ""


class MediaDetailSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quality_display = serializers.CharField(source="get_quality_display", read_only=True)
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.CharField(read_only=True)
    preview_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    stream_url = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.SerializerMethodField()
    contributor_name = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id", "title", "description", "type", "type_display",
            "quality", "quality_display",
            "category", "category_display", "status", "status_display",
            "file_url", "preview_url", "thumbnail_url", "stream_url",
            "file_size_display", "price", "license_type",
            "width", "height", "resolution", "color_profile",
            "duration", "frame_rate", "codec", "bitrate",
            "camera_model", "lens", "focal_length", "aperture", "iso", "shutter_speed",
            "country", "province", "city", "latitude", "longitude", "altitude",
            "tags", "season", "weather", "capture_date", "capture_time",
            "downloads", "views", "rating", "likes_count", "is_liked", "contributor_name",
            "created_at", "updated_at",
        ]

    def get_is_liked(self, obj):
        if hasattr(obj, "_user_liked"):
            return bool(obj._user_liked)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_contributor_name(self, obj):
        return _contributor_name(obj)

    # Le public ne reçoit jamais l'original d'une photo : uniquement l'aperçu
    # réduit et filigrané (voir media_app/previews.py). L'original n'est servi
    # qu'après achat, par lien signé (PurchaseViewSet.download).
    def get_thumbnail_url(self, obj):
        return _public_preview_url(obj)

    def get_file_url(self, obj):
        return ""

    def get_preview_url(self, obj):
        return _public_preview_url(obj)

    def get_stream_url(self, obj):
        return _public_file_url(obj.file) if obj.type == "video" else ""


class PurchaseSerializer(serializers.ModelSerializer):
    media = MediaListSerializer(read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "media", "price", "download_count", "max_downloads",
                   "purchased_at", "payment_method", "payment_reference", "payment_status"]
        read_only_fields = fields
