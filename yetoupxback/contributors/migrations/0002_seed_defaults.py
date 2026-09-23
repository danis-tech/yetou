from django.db import migrations


def seed(apps, schema_editor):
    ContributorSettings = apps.get_model("contributors", "ContributorSettings")
    BuyoutRate = apps.get_model("contributors", "BuyoutRate")
    ContributorSettings.objects.get_or_create(pk=1)
    # Rachat en qualité maximale : 300 FCFA la photo, 450 FCFA la vidéo
    # (modifiable dans l'admin, « Tarifs de rachat »).
    for media_type, amount in (("photo", 300), ("video", 450)):
        BuyoutRate.objects.get_or_create(media_type=media_type, quality="4K", defaults={"amount": amount})


class Migration(migrations.Migration):
    dependencies = [("contributors", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
