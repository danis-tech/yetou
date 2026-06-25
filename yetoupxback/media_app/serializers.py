from rest_framework import serializers
from .models import Media, Purchase


class MediaListSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    quality_display = serializers.CharField(source="get_quality_display", read_only=True)
    file_url = serializers.CharField(source="file.url", read_only=True)

    class Meta:
        model = Media
        fields = ["id", "title", "type", "type_display", "quality", "quality_display",
                  "category", "price", "file_url", "resolution", "duration", "downloads", "created_at"]


class MediaDetailSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quality_display = serializers.CharField(source="get_quality_display", read_only=True)
    file_url = serializers.CharField(source="file.url", read_only=True)
    file_size_display = serializers.CharField(read_only=True)

    class Meta:
        model = Media
        fields = [
            "id", "title", "description", "type", "type_display",
            "quality", "quality_display",
            "category", "category_display", "status", "status_display",
            "file_url", "file_size_display", "price", "license_type",
            "width", "height", "resolution", "color_profile",
            "duration", "frame_rate", "codec", "bitrate",
            "camera_model", "lens", "focal_length", "aperture", "iso", "shutter_speed",
            "country", "province", "city", "latitude", "longitude", "altitude",
            "tags", "season", "weather", "capture_date", "capture_time",
            "downloads", "views", "rating", "created_at", "updated_at",
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    media = MediaListSerializer(read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "media", "price", "download_count", "max_downloads",
                   "purchased_at", "payment_method", "payment_reference", "payment_status"]


class CreatePurchaseSerializer(serializers.Serializer):
    media_id = serializers.IntegerField()
    payment_method = serializers.CharField(default="Airtel Money")
    payment_reference = serializers.CharField(required=False, allow_blank=True, default="")
    payment_status = serializers.CharField(required=False, allow_blank=True, default="success")
    phone = serializers.CharField(required=False, allow_blank=True)
