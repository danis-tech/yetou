from django.core.management.base import BaseCommand

from media_app import mypvit
from media_app.payments import reconcile_pending_sessions


class Command(BaseCommand):
    help = (
        "Filet de sécurité MyPVit : revérifie via Check Status les paiements restés "
        "en attente sans webhook, et clôt ceux abandonnés depuis plus de 24 h. "
        "À planifier toutes les 5 minutes (cron / planificateur de tâches)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=3, help="Ancienneté minimale d'un paiement en attente.")
        parser.add_argument("--expire-hours", type=int, default=24, help="Délai avant clôture d'un paiement abandonné.")

    def handle(self, *args, **options):
        if not mypvit.is_configured():
            self.stdout.write(self.style.WARNING("MyPVit non configuré — rien à faire."))
            return
        count = reconcile_pending_sessions(
            pending_since_minutes=options["minutes"], expire_after_hours=options["expire_hours"],
        )
        self.stdout.write(self.style.SUCCESS(f"{count} paiement(s) mis à jour."))
