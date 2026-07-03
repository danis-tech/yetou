from django.shortcuts import redirect
from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from media_app.models import Purchase
from media_app.serializers import PurchaseSerializer
from .serializers import UserSerializer, NotificationSerializer
from .notifications import notify_plan_change, sync_purchase_notifications
from .models import Notification


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
        old_plan = request.user.plan
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            if "plan" in request.data and user.plan != old_plan:
                notify_plan_change(user, old_plan, user.plan)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    return Response({}, status=405)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user
    sync_purchase_notifications(user)

    purchases_qs = Purchase.objects.filter(user=user).select_related("media")
    paid_qs = purchases_qs.filter(payment_status__in=["success", "simulated"])
    stats = paid_qs.aggregate(
        purchases_count=Count("id"),
        total_spent=Sum("price"),
    )
    recent_purchases = paid_qs.order_by("-purchased_at")[:5]
    unread_count = Notification.objects.filter(user=user, read=False).count()
    notifications = Notification.objects.filter(user=user).order_by("-created_at")[:8]

    return Response({
        "user": UserSerializer(user).data,
        "stats": {
            "purchases_count": stats["purchases_count"] or 0,
            "total_spent": stats["total_spent"] or 0,
            "unread_notifications": unread_count,
        },
        "recent_purchases": PurchaseSerializer(recent_purchases, many=True).data,
        "notifications": NotificationSerializer(notifications, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    sync_purchase_notifications(request.user)
    qs = Notification.objects.filter(user=request.user).order_by("-created_at")
    unread_count = qs.filter(read=False).count()
    limit = min(int(request.GET.get("limit", 50)), 100)
    return Response({
        "count": qs.count(),
        "unread_count": unread_count,
        "results": NotificationSerializer(qs[:limit], many=True).data,
    })


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def notification_detail(request, pk):
    notification = Notification.objects.filter(user=request.user, pk=pk).first()
    if not notification:
        return Response({"error": "Notification introuvable."}, status=404)

    if request.data.get("read") is True:
        notification.read = True
        notification.save(update_fields=["read"])

    return Response(NotificationSerializer(notification).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notifications_mark_all_read(request):
    updated = Notification.objects.filter(user=request.user, read=False).update(read=True)
    return Response({"updated": updated})


def google_callback(request):
    """Callback après OAuth Google. Redirige vers le frontend avec le JWT."""
    from django.conf import settings
    frontend = request.GET.get("frontend") or getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    frontend = frontend.rstrip("/")

    if request.user.is_authenticated:
        tokens = get_tokens_for_user(request.user)
        if not request.user.name and request.user.email:
            request.user.name = request.user.email.split("@")[0]
            request.user.save(update_fields=["name"])
        return redirect(f"{frontend}/auth/callback?access={tokens['access']}&refresh={tokens['refresh']}")

    return redirect(f"{frontend}/auth/callback?error=auth_failed")
