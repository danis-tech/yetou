from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()


class CustomRegisterSerializer(RegisterSerializer):
    name = serializers.CharField(max_length=255, required=True)
    username = None

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["name"] = self.validated_data.get("name", "")
        return data

    def validate_email(self, email):
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà. Connectez-vous ou utilisez un autre email.")
        return email

    def save(self, request):
        try:
            user = super().save(request)
            user.name = self.validated_data.get("name", "")
            user.save()
            return user
        except IntegrityError:
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name", "plan", "created_at")
        read_only_fields = ("id", "email", "created_at")


class UpdatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("plan",)
