import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("media_app", "0010_paygate_session"),
    ]

    operations = [
        migrations.CreateModel(
            name="MediaLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "media",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="likes",
                        to="media_app.media",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="media_likes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Like média",
                "verbose_name_plural": "Likes médias",
            },
        ),
        migrations.AddIndex(
            model_name="medialike",
            index=models.Index(fields=["media", "-created_at"], name="media_app_m_media_i_8f3a21_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="medialike",
            unique_together={("user", "media")},
        ),
    ]
