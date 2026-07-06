# Generated manually: généralise CardPaymentSession en PaymentSession (carte + mobile)
# afin de préserver les données existantes (RenameModel plutôt que Delete+Create).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media_app', '0015_remove_paygate_branding'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name='CardPaymentSession',
            new_name='PaymentSession',
        ),
        migrations.AlterModelOptions(
            name='paymentsession',
            options={'ordering': ['-created_at'], 'verbose_name': 'Session de paiement', 'verbose_name_plural': 'Sessions de paiement'},
        ),
        migrations.AddField(
            model_name='paymentsession',
            name='provider',
            field=models.CharField(choices=[('fedapay', 'FedaPay (carte)'), ('singpay', 'SingPay (mobile / PayPal)')], default='fedapay', max_length=20, verbose_name='Fournisseur'),
        ),
        migrations.AlterField(
            model_name='paymentsession',
            name='amount_usd',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Montant (USD)'),
        ),
        migrations.AlterField(
            model_name='paymentsession',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_sessions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='paymentsession',
            name='media',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_sessions', to='media_app.media'),
        ),
        migrations.AlterField(
            model_name='paymentsession',
            name='purchase',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_sessions', to='media_app.purchase'),
        ),
    ]
