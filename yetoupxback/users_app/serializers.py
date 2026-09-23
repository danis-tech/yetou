from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from .models import Notification

User = get_user_model()


class CustomLoginSerializer(LoginSerializer):
    """Connexion par email uniquement (pas de username)."""
    username = None

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")
        if not email or not password:
            raise serializers.ValidationError("Email et mot de passe requis.")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Email ou mot de passe incorrect.") from None

        if not user.check_password(password):
            raise serializers.ValidationError("Email ou mot de passe incorrect.")

        if not user.is_active:
            raise serializers.ValidationError("Ce compte est désactivé.")

        attrs["user"] = user
        return attrs


class CustomRegisterSerializer(RegisterSerializer):
    name = serializers.CharField(max_length=255, required=True)
    accept_terms = serializers.BooleanField(required=True)
    username = None

    def validate_accept_terms(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
            )
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["name"] = self.validated_data.get("name", "")
        return data

    def validate_email(self, email):
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Un compte avec cet email existe déjà. Connectez-vous ou utilisez un autre email."
            )
        return email

    def save(self, request):
        try:
            user = super().save(request)
            user.name = self.validated_data.get("name", "")
            user.terms_accepted_at = timezone.now()
            user.save()
            return user
        except IntegrityError:
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."}) from None


class UserSerializer(serializers.ModelSerializer):
    # Plan réellement en vigueur (« none » une fois l'abonnement expiré). Le plan
    # n'est jamais modifiable par l'utilisateur : seul un paiement confirmé l'active.
    plan = serializers.CharField(source="active_plan", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "name", "plan", "plan_expires_at", "created_at")
        read_only_fields = ("id", "email", "plan", "plan_expires_at", "created_at")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "notification_type",
            "title",
            "body",
            "read",
            "action_url",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
