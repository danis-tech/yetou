# Generated manually for PayGate integration

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("media_app", "0009_add_payment_info_to_purchase"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymentlog",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "En attente"),
                    ("success", "Réussi"),
                    ("simulated", "Simulé"),
                    ("failed", "Échoué"),
                ],
                default="success",
                max_length=15,
                verbose_name="Statut",
            ),
        ),
        migrations.CreateModel(
            name="PaygateSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=255, unique=True, verbose_name="Référence commande")),
                ("amount_fcfa", models.PositiveIntegerField(verbose_name="Montant (FCFA)")),
                ("amount_usd", models.DecimalField(decimal_places=2, max_digits=10, verbose_name="Montant (USD)")),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("Airtel Money", "Airtel Money"),
                            ("Moov Money", "Moov Money"),
                            ("Visa", "Visa"),
                            ("Mastercard", "Mastercard"),
                        ],
                        max_length=20,
                        verbose_name="Méthode",
                    ),
                ),
                ("plan", models.CharField(blank=True, default="", max_length=20, verbose_name="Plan abonnement")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "En attente"),
                            ("success", "Réussi"),
                            ("failed", "Échoué"),
                        ],
                        default="pending",
                        max_length=15,
                        verbose_name="Statut",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Créé le")),
                (
                    "media",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="paygate_sessions",
                        to="media_app.media",
                    ),
                ),
                (
                    "purchase",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="paygate_sessions",
                        to="media_app.purchase",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="paygate_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Session PayGate",
                "verbose_name_plural": "Sessions PayGate",
                "ordering": ["-created_at"],
            },
        ),
    ]
