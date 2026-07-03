from .models import Notification


def create_notification(
    user,
    notification_type: str,
    title: str,
    body: str = "",
    action_url: str = "",
    metadata: dict | None = None,
):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        body=body,
        action_url=action_url,
        metadata=metadata or {},
    )


def notify_welcome(user):
    if Notification.objects.filter(user=user, notification_type="welcome").exists():
        return
    create_notification(
        user,
        "welcome",
        "Bienvenue sur yétou !",
        "Explorez le catalogue aérien du Gabon et téléchargez vos médias préférés.",
        action_url="/dashboard?tab=catalogue",
    )


def notify_purchase(user, purchase):
    purchase_id = purchase.id
    if Notification.objects.filter(
        user=user,
        notification_type="purchase_success",
        metadata__purchase_id=purchase_id,
    ).exists():
        return

    status = purchase.payment_status or "success"
    if status == "failed":
        create_notification(
            user,
            "purchase_failed",
            "Paiement échoué",
            f"Le paiement pour « {purchase.media.title} » n'a pas abouti.",
            action_url="/dashboard?tab=payments",
            metadata={"purchase_id": purchase_id, "media_id": purchase.media_id},
        )
        return

    if status == "pending":
        create_notification(
            user,
            "payment_pending",
            "Paiement en attente",
            f"Votre paiement pour « {purchase.media.title} » est en cours de validation.",
            action_url="/dashboard?tab=payments",
            metadata={"purchase_id": purchase_id, "media_id": purchase.media_id},
        )
        return

    create_notification(
        user,
        "purchase_success",
        "Achat confirmé",
        f"« {purchase.media.title} » est disponible au téléchargement.",
        action_url="/dashboard?tab=downloads",
        metadata={"purchase_id": purchase_id, "media_id": purchase.media_id},
    )

    remaining = purchase.max_downloads - purchase.download_count
    if 0 < remaining <= 1:
        create_notification(
            user,
            "download_limit_warning",
            "Quota presque épuisé",
            f"Il vous reste {remaining} téléchargement sur « {purchase.media.title} ».",
            action_url="/dashboard?tab=downloads",
            metadata={"purchase_id": purchase_id, "remaining": remaining},
        )


def notify_plan_change(user, old_plan: str, new_plan: str):
    if old_plan == new_plan or new_plan == "none":
        return
    plan_labels = dict(User.PLAN_CHOICES)
    create_notification(
        user,
        "plan_activated",
        "Abonnement activé",
        f"Votre plan « {plan_labels.get(new_plan, new_plan)} » est maintenant actif.",
        action_url="/dashboard?tab=plan",
        metadata={"old_plan": old_plan, "new_plan": new_plan},
    )


def sync_purchase_notifications(user):
    from media_app.models import Purchase

    notify_welcome(user)

    existing_ids = set(
        Notification.objects.filter(user=user, notification_type="purchase_success")
        .exclude(metadata__purchase_id__isnull=True)
        .values_list("metadata__purchase_id", flat=True)
    )

    for purchase in Purchase.objects.filter(user=user).select_related("media").order_by("-purchased_at")[:20]:
        if purchase.id not in existing_ids:
            notify_purchase(user, purchase)
