import io
from unittest import mock

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from contributors.models import BuyoutRate, ContributorEarning, ContributorProfile, ContributorSettings, PayoutRequest
from contributors.services import approve_media, balance_for, mark_payout_paid, record_sale, request_payout
from media_app.models import Category, Media, Purchase, Quality
from users_app.models import User

REST = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_THROTTLE_RATES": {"payments": "1000/min", "payment_status": "1000/min", "contributions": "1000/min"},
}


def png_bytes(size=(64, 48)):
    buf = io.BytesIO()
    Image.new("RGB", size, (40, 110, 115)).save(buf, format="PNG")
    return buf.getvalue()


@override_settings(REST_FRAMEWORK=REST)
@mock.patch("storages.backends.s3boto3.S3Boto3Storage._save", side_effect=lambda name, content: name)
@mock.patch("storages.backends.s3boto3.S3Boto3Storage.exists", return_value=False)
@mock.patch("storages.backends.s3boto3.S3Boto3Storage.size", return_value=1024)
@mock.patch("media_app.previews.build_preview", return_value=True)
class ContributorFlowTest(TestCase):
    def setUp(self):
        cache.clear()
        Category.objects.get_or_create(slug="nature", defaults={"name": "Nature"})
        Quality.objects.get_or_create(slug="4K", defaults={"name": "4K"})
        self.user = User.objects.create_user(email="photographe@test.ga", password="Sup3r-secret!", name="Photo")
        self.admin = User.objects.create_superuser(email="admin@test.ga", password="Sup3r-secret!", name="Admin")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _join(self):
        return self.client.post("/api/contributors/join/", {
            "display_name": "Studio Nyanga", "payout_operator": "Airtel Money",
            "payout_phone": "077 00 00 00", "accept_terms": True,
        }, format="json")

    def _submit(self, **extra):
        data = {"title": "Lagune au lever du jour", "category": "nature", "quality": "4K",
                "payout_mode": "revenue_share", "price": "2000",
                "file": SimpleUploadedFile("lagune.png", png_bytes(), content_type="image/png")}
        data.update(extra)
        return self.client.post("/api/contributors/media/", data, format="multipart")

    def test_join_requires_terms(self, *_):
        res = self.client.post("/api/contributors/join/", {"display_name": "X Y"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self._join().status_code, 201)

    def test_submission_stays_private_until_approved(self, *_):
        self._join()
        res = self._submit()
        self.assertEqual(res.status_code, 201, res.data)
        media = Media.objects.get(pk=res.data["id"])
        self.assertEqual(media.status, "pending")
        self.assertEqual(media.price, 2000)  # prix fixé par le contributeur
        self.assertEqual(APIClient().get(f"/api/media/{media.id}/").status_code, 404)

        approve_media(media, self.admin)
        public = APIClient().get(f"/api/media/{media.id}/").data
        self.assertEqual(public["contributor_name"], "Studio Nyanga")
        # Le public ne reçoit jamais l'original d'une photo, seulement l'aperçu filigrané.
        self.assertEqual(public["file_url"], "")
        self.assertEqual(public["stream_url"], "")
        self.assertNotIn(media.file.name, public["preview_url"])

    def test_fake_image_is_refused(self, *_):
        self._join()
        res = self._submit(file=SimpleUploadedFile("faux.jpg", b"ceci n'est pas une image", content_type="image/jpeg"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("file", res.data["errors"])

    def test_video_longer_than_limit_is_refused(self, *_):
        self._join()
        res = self._submit(file=SimpleUploadedFile("vol.mp4", b"\x00" * 100, content_type="video/mp4"), duration_seconds="120")
        self.assertEqual(res.status_code, 400)
        self.assertIn("duration_seconds", res.data["errors"])

    def test_buyout_credited_once_at_rate(self, *_):
        self._join()
        media = Media.objects.get(pk=self._submit(payout_mode="buyout").data["id"])
        approve_media(media, self.admin)
        approve_media(media, self.admin)  # rejoué : aucun double crédit
        self.assertEqual(ContributorEarning.objects.filter(media=media, kind="buyout").count(), 1)
        self.assertEqual(balance_for(self.user)["available"], BuyoutRate.amount_for("photo", "4K"))

    def test_buyout_above_ceiling_is_refused(self, *_):
        self._join()
        media = Media.objects.get(pk=self._submit(payout_mode="buyout").data["id"])
        media.buyout_amount = 5000
        media.save()
        with self.assertRaises(ValidationError):
            approve_media(media, self.admin)
        self.assertFalse(ContributorEarning.objects.exists())

    def test_revenue_share_split_is_configurable(self, *_):
        self._join()
        media = Media.objects.get(pk=self._submit().data["id"])
        approve_media(media, self.admin)
        purchase = Purchase.objects.create(user=self.admin, media=media, price=media.price, payment_status="success")
        record_sale(purchase)
        record_sale(purchase)  # idempotent
        self.assertEqual(balance_for(self.user)["available"], 1400)  # 70 % de 2000

        cfg = ContributorSettings.get()
        cfg.commission_percent = 40
        cfg.save()
        other = Purchase.objects.create(user=self.user, media=media, price=media.price, payment_status="success")
        record_sale(other)
        self.assertEqual(balance_for(self.user)["available"], 1400 + 1200)

    def test_payout_cannot_exceed_balance_and_reserves_amount(self, *_):
        self._join()
        media = Media.objects.get(pk=self._submit(payout_mode="buyout").data["id"])
        approve_media(media, self.admin)
        ContributorEarning.objects.create(contributor=self.user, kind="adjustment", gross_amount=2000, amount=2000)
        available = balance_for(self.user)["available"]  # 300 + 2000

        res = self.client.post("/api/contributors/payouts/", {"amount": available + 1}, format="json")
        self.assertEqual(res.status_code, 400)
        payout = request_payout(self.user, 2000)
        self.assertEqual(balance_for(self.user)["available"], available - 2000)
        with self.assertRaises(ValidationError):
            request_payout(self.user, available - 1999)  # déjà réservé

        with self.assertRaises(ValidationError):
            mark_payout_paid(payout, self.admin, "")
        mark_payout_paid(payout, self.admin, "AM-123")
        self.assertEqual(PayoutRequest.objects.get(pk=payout.pk).status, "paid")
        self.assertEqual(balance_for(self.user)["paid_out"], 2000)

    def test_published_media_cannot_be_deleted_by_contributor(self, *_):
        self._join()
        media = Media.objects.get(pk=self._submit().data["id"])
        approve_media(media, self.admin)
        self.assertEqual(self.client.delete(f"/api/contributors/media/{media.id}/").status_code, 400)

    def test_non_contributor_cannot_submit(self, *_):
        self.assertEqual(self._submit().status_code, 403)
        self.assertFalse(ContributorProfile.objects.exists())

    def test_payout_proof_visible_only_to_its_contributor(self, *_):
        self._join()
        ContributorEarning.objects.create(contributor=self.user, kind="adjustment", gross_amount=5000, amount=5000)
        payout = request_payout(self.user, 2000)
        mark_payout_paid(payout, self.admin, "AM-456")
        self.assertEqual(self.client.get(f"/api/contributors/payouts/{payout.id}/proof/").status_code, 404)

        payout.proof.name = "payouts/1/recu.png"
        payout.save()
        with mock.patch("storages.backends.s3boto3.S3Boto3Storage.url", return_value="https://signed.example/recu"):
            res = self.client.get(f"/api/contributors/payouts/{payout.id}/proof/")
            self.assertEqual(res.data["url"], "https://signed.example/recu")
            intruder = APIClient()
            intruder.force_authenticate(self.admin)
            self.assertEqual(intruder.get(f"/api/contributors/payouts/{payout.id}/proof/").status_code, 404)
        listed = self.client.get("/api/contributors/payouts/").data[0]
        self.assertTrue(listed["has_proof"])
        from users_app.models import Notification
        types = set(Notification.objects.filter(user=self.user).values_list("notification_type", flat=True))
        self.assertTrue({"payout_requested", "payout_paid"} <= types)
