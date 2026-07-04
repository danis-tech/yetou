from django.test import TestCase
from django.db.models import Count
from media_app.models import Media
from media_app.filters import apply_media_filters, apply_media_order


class MediaFiltersTest(TestCase):
    def setUp(self):
        self.photo_old = Media.objects.create(
            title="Libreville ancienne",
            type="photo",
            category="ville",
            quality="HD",
            status="published",
            price=1500,
            province="Estuaire",
            city="Libreville",
        )
        self.photo_new = Media.objects.create(
            title="Parc Lopé récent",
            type="photo",
            category="nature",
            quality="4K",
            status="published",
            price=3000,
            tags="drone,paysage",
        )
        self.video = Media.objects.create(
            title="Vidéo mer",
            type="video",
            category="mer",
            quality="4K",
            status="published",
            price=5000,
            duration="0:30",
        )
        self.video_long = Media.objects.create(
            title="Vidéo longue",
            type="video",
            category="events",
            quality="4K",
            status="published",
            price=10000,
            duration="1:00",
        )

    def _filter(self, **params):
        qs = Media.objects.filter(status="published").annotate(likes_count=Count("likes"))
        qs = apply_media_filters(qs, params)
        return list(apply_media_order(qs, params))

    def test_filter_type_photo(self):
        ids = [m.id for m in self._filter(type="photo")]
        self.assertEqual(set(ids), {self.photo_old.id, self.photo_new.id})

    def test_filter_category(self):
        ids = [m.id for m in self._filter(type="photo", category="nature")]
        self.assertEqual(ids, [self.photo_new.id])

    def test_filter_resolution_hd(self):
        ids = [m.id for m in self._filter(type="photo", resolution="hd")]
        self.assertEqual(ids, [self.photo_old.id])

    def test_filter_search(self):
        ids = [m.id for m in self._filter(type="photo", search="Libreville")]
        self.assertEqual(ids, [self.photo_old.id])

    def test_sort_price_asc(self):
        ids = [m.id for m in self._filter(type="photo", sort="price-asc")]
        self.assertEqual(ids, [self.photo_old.id, self.photo_new.id])
