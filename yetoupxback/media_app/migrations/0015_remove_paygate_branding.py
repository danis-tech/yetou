# Generated manually — retrait de la marque "PayGate" (renommage en CardPaymentSession)
# + ajout de PayPal aux méthodes + stockage du payload brut des webhooks.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("media_app", "0014_alter_media_license_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name="PaygateSession",
            new_name="CardPaymentSession",
        ),
        migrations.AlterModelOptions(
            name="cardpaymentsession",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Session de paiement carte",
                "verbose_name_plural": "Sessions de paiement carte",
            },
        ),
        migrations.AlterField(
            model_name="cardpaymentsession",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="card_sessions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="cardpaymentsession",
            name="media",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="card_sessions",
                to="media_app.media",
            ),
        ),
        migrations.AlterField(
            model_name="cardpaymentsession",
            name="purchase",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="card_sessions",
                to="media_app.purchase",
            ),
        ),
        migrations.AddField(
            model_name="paymentlog",
            name="raw_payload",
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name="Détails bruts (webhook)",
                help_text="Payload brut renvoyé par le fournisseur de paiement (SingPay/FedaPay), conservé pour audit.",
            ),
        ),
        migrations.AlterField(
            model_name="paymentlog",
            name="method",
            field=models.CharField(
                choices=[
                    ("Airtel Money", "Airtel Money"),
                    ("Moov Money", "Moov Money"),
                    ("PayPal", "PayPal"),
                    ("Visa", "Visa"),
                    ("Mastercard", "Mastercard"),
                ],
                max_length=20,
                verbose_name="Méthode",
            ),
        ),
        migrations.AlterField(
            model_name="cardpaymentsession",
            name="method",
            field=models.CharField(
                choices=[
                    ("Airtel Money", "Airtel Money"),
                    ("Moov Money", "Moov Money"),
                    ("PayPal", "PayPal"),
                    ("Visa", "Visa"),
                    ("Mastercard", "Mastercard"),
                ],
                max_length=20,
                verbose_name="Méthode",
            ),
        ),
    ]
