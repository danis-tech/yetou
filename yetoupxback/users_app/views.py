from django.shortcuts import redirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == "GET":
        return Response(UserSerializer(request.user).data)

    if request.method == "PATCH":
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    return Response({}, status=405)


def google_callback(request):
    """Callback après OAuth Google. Redirige vers le frontend avec le JWT."""
    frontend = request.GET.get("frontend", "http://localhost:3000")

    if request.user.is_authenticated:
        tokens = get_tokens_for_user(request.user)
        return redirect(f"{frontend}?access={tokens['access']}&refresh={tokens['refresh']}")

    return redirect(f"{frontend}?error=auth_failed")
