from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User
from .notifications import notify_welcome


@receiver(post_save, sender=User)
def user_created_welcome(sender, instance, created, **kwargs):
    if created:
        notify_welcome(instance)
