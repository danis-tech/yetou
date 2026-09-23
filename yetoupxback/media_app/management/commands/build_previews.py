from django.core.management.base import BaseCommand

from media_app.models import Media
from media_app.previews import build_preview


class Command(BaseCommand):
    help = "Génère les aperçus filigranés des photos qui n'en ont pas (ou dont le fichier a changé)."

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Régénère aussi les aperçus existants.")

    def handle(self, *args, **options):
        done = failed = 0
        for media in Media.objects.filter(type="photo").exclude(file="").exclude(file__isnull=True).iterator():
            if not options["all"] and media.preview and media.preview_source == media.file.name:
                continue
            if build_preview(media):
                done += 1
                self.stdout.write(f"  ok     {media.pk} {media.title}")
            else:
                failed += 1
                self.stdout.write(self.style.WARNING(f"  echec  {media.pk} {media.title}"))
        self.stdout.write(self.style.SUCCESS(f"{done} aperçu(s) générés, {failed} échec(s)."))

        # Taille des fichiers envoyés avant son enregistrement en base.
        filled = 0
        for media in Media.objects.filter(file_size__isnull=True).exclude(file="").exclude(file__isnull=True).iterator():
            try:
                Media.objects.filter(pk=media.pk).update(file_size=media.file.size)
                filled += 1
            except Exception as exc:  # fichier absent du stockage
                self.stdout.write(self.style.WARNING(f"  taille inconnue pour {media.pk} : {exc}"))
        self.stdout.write(self.style.SUCCESS(f"{filled} taille(s) de fichier enregistrée(s)."))
