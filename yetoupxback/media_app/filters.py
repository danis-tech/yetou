from django.db.models import Q

SORT_OPTIONS = {
    "recent": ("-created_at", "-id"),
    "popular": ("-likes_count", "-id"),
    "price-asc": ("price", "-id"),
    "price-desc": ("-price", "-id"),
}

SEARCH_FIELDS = ("title", "tags", "province", "city", "category")


def build_search_q(search: str) -> Q:
    terms = [t.strip() for t in search.split() if t.strip()]
    if not terms:
        return Q()

    combined = Q()
    for term in terms:
        term_q = Q()
        for field in SEARCH_FIELDS:
            term_q |= Q(**{f"{field}__icontains": term})
        combined &= term_q
    return combined


def apply_media_filters(qs, params):
    """Filtres + recherche (sans tri — le tri se fait après annotation likes_count)."""
    media_type = params.get("type")
    if media_type in ("photo", "video"):
        qs = qs.filter(type=media_type)

    category = params.get("category")
    if category and category != "all":
        qs = qs.filter(category=category)

    resolution = params.get("resolution")
    if resolution and resolution != "all":
        qs = qs.filter(quality__iexact=resolution)

    duration = params.get("duration")
    if duration == "60":
        qs = qs.filter(duration__startswith="1:")
    elif duration == "30":
        qs = qs.filter(~Q(duration__startswith="1:"))

    search = (params.get("search") or "").strip()
    if search:
        qs = qs.filter(build_search_q(search))

    return qs


def apply_media_order(qs, params):
    sort_key = params.get("sort", "recent")
    order = SORT_OPTIONS.get(sort_key, SORT_OPTIONS["recent"])
    return qs.order_by(*order)
