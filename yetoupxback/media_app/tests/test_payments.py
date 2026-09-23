from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from media_app import mypvit
from media_app.models import Media, PaymentSession, Purchase
from users_app.models import User

MYPVIT_SETTINGS = dict(
    MYPVIT_ACCOUNT_CODE="ACC_TEST",
    MYPVIT_API_PASSWORD="pwd",
    MYPVIT_CODE_URL_SECRET="SEC",
    MYPVIT_CODE_URL_PAYMENT="PAY",
    MYPVIT_CODE_URL_STATUS="STA",
    MYPVIT_CODE_URL_KYC="",
    MYPVIT_CODE_URL_LINK="LNK",
    MYPVIT_CALLBACK_URL_CODE="CB",
    MYPVIT_SUCCESS_REDIRECTION_URL_CODE="OK",
    MYPVIT_FAILED_REDIRECTION_URL_CODE="KO",
    MYPVIT_WEBHOOK_ALLOWED_IPS=[],
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
        "DEFAULT_THROTTLE_RATES": {"payments": "1000/min", "payment_status": "1000/min"},
    },
)


@override_settings(**MYPVIT_SETTINGS)
class PaymentSecurityTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="client@test.ga", password="Sup3r-secret!", name="Client")
        self.other = User.objects.create_user(email="autre@test.ga", password="Sup3r-secret!", name="Autre")
        self.media = Media.objects.create(
            title="Estuaire", type="photo", category="nature", quality="HD", status="published", price=2500,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        patcher = mock.patch.object(mypvit, "create_transaction", return_value={"reference_id": "PVIT123", "status": "PENDING"})
        self.create_tx = patcher.start()
        self.addCleanup(patcher.stop)

    def _initiate(self, **data):
        body = {"method": "Airtel Money", "phone": "077 00 00 00", **data}
        return self.client.post("/api/payments/initiate/", body, format="json")

    def _webhook(self, reference, status="SUCCESS", ip="1.2.3.4", **extra):
        payload = {"transactionId": "PVIT123", "merchantReferenceId": reference, "status": status, "code": 200, **extra}
        return APIClient().post("/api/payments/webhook/mypvit/", payload, format="json", REMOTE_ADDR=ip)

    def test_client_cannot_create_purchase_directly(self):
        res = self.client.post(
            "/api/purchases/", {"media_id": self.media.id, "payment_status": "success"}, format="json",
        )
        self.assertEqual(res.status_code, 405)
        self.assertFalse(Purchase.objects.exists())

    def test_client_cannot_set_plan_via_profile(self):
        self.client.patch("/api/users/profile/", {"plan": "pro"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan, "none")

    def test_amount_is_computed_server_side(self):
        res = self._initiate(media_id=self.media.id, amount_fcfa=100)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["amount_fcfa"], self.media.price)
        self.assertEqual(self.create_tx.call_args.kwargs["amount"], self.media.price)
        self.assertEqual(self.create_tx.call_args.kwargs["customer_account_number"], "077000000")
        self.assertFalse(Purchase.objects.exists())

    def test_forged_webhook_is_ignored_when_mypvit_says_pending(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        with mock.patch.object(mypvit, "get_transaction_status", return_value={"status": "PENDING"}):
            self.assertEqual(self._webhook(ref).status_code, 200)
        self.assertEqual(PaymentSession.objects.get(reference=ref).status, "pending")
        self.assertFalse(Purchase.objects.exists())

    def test_verified_webhook_grants_purchase_once(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        with mock.patch.object(mypvit, "get_transaction_status", return_value={"status": "SUCCESS", "amount": self.media.price}):
            res = self._webhook(ref)
            self._webhook(ref)  # webhook rejoué
        self.assertEqual(res.data, {"transactionId": "PVIT123", "responseCode": 200})
        self.assertEqual(Purchase.objects.filter(user=self.user, media=self.media).count(), 1)
        self.assertEqual(PaymentSession.objects.get(reference=ref).status, "success")

    def test_underpaid_transaction_is_refused(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        with mock.patch.object(mypvit, "get_transaction_status", return_value={"status": "SUCCESS", "amount": self.media.price - 100}):
            self._webhook(ref)
        self.assertEqual(PaymentSession.objects.get(reference=ref).status, "failed")
        self.assertFalse(Purchase.objects.exists())

    def test_transaction_not_found_is_not_trusted_from_unknown_ip(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        not_found = mypvit.MyPvitError("not found", mypvit_status_code=mypvit.TRANSACTION_NOT_FOUND)
        with mock.patch.object(mypvit, "get_transaction_status", side_effect=not_found):
            self._webhook(ref)
        self.assertEqual(PaymentSession.objects.get(reference=ref).status, "pending")
        self.assertFalse(Purchase.objects.exists())

    def test_transaction_not_found_trusted_from_mypvit_ip(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        not_found = mypvit.MyPvitError("not found", mypvit_status_code=mypvit.TRANSACTION_NOT_FOUND)
        with override_settings(MYPVIT_WEBHOOK_ALLOWED_IPS=["10.0.0.0/24"]), \
                mock.patch.object(mypvit, "get_transaction_status", side_effect=not_found):
            self.assertEqual(self._webhook(ref, ip="8.8.8.8").status_code, 403)
            self.assertEqual(PaymentSession.objects.get(reference=ref).status, "pending")
            self._webhook(ref, ip="10.0.0.7", amount=self.media.price)
        self.assertEqual(PaymentSession.objects.get(reference=ref).status, "success")
        self.assertTrue(Purchase.objects.filter(user=self.user, media=self.media).exists())

    def test_plan_payment_uses_server_price_and_sets_expiry(self):
        res = self._initiate(plan="pro", amount_fcfa=100)
        self.assertEqual(res.data["amount_fcfa"], 50000)
        with mock.patch.object(mypvit, "get_transaction_status", return_value={"status": "SUCCESS", "amount": 50000}):
            self._webhook(res.data["reference"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.active_plan, "pro")
        self.assertIsNotNone(self.user.plan_expires_at)

    def test_user_cannot_read_someone_else_payment(self):
        ref = self._initiate(media_id=self.media.id).data["reference"]
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        self.assertEqual(other_client.get(f"/api/payments/{ref}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/payments/{ref}/").data["status"], "pending")

    def test_invalid_phone_is_rejected(self):
        res = self._initiate(media_id=self.media.id, phone="12")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(PaymentSession.objects.exists())

    def test_download_requires_paid_purchase_and_respects_quota(self):
        pending = Purchase.objects.create(user=self.user, media=self.media, price=2500, payment_status="pending")
        self.assertEqual(self.client.post(f"/api/purchases/{pending.id}/download/").status_code, 403)

        self.media.file.name = "photo/estuaire.jpg"
        self.media.save()
        paid = Purchase.objects.create(user=self.user, media=self.media, price=2500, payment_status="success", max_downloads=1)
        with mock.patch("storages.backends.s3boto3.S3Boto3Storage.url", return_value="https://signed.example/x"):
            self.assertEqual(self.client.post(f"/api/purchases/{paid.id}/download/").status_code, 200)
            self.assertEqual(self.client.post(f"/api/purchases/{paid.id}/download/").status_code, 400)


class GoogleCallbackRedirectTest(TestCase):
    def test_redirect_to_unknown_origin_is_refused(self):
        res = self.client.get("/api/auth/google/?frontend=https://evil.example")
        self.assertFalse(res["Location"].startswith("https://evil.example"))
