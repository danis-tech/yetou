from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.html import format_html

from .models import BuyoutRate, ContributorEarning, ContributorProfile, ContributorSettings, PayoutRequest
from django.utils import timezone

from .services import balance_for, mark_payout_paid, notify_proof_added, reject_payout

PROOF_MAX_MB = 10


def _badge(label, color):
    return format_html(
        '<span style="background:{}1f;color:{};padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600">{}</span>',
        color, color, label,
    )


@admin.register(ContributorSettings)
class ContributorSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Programme", {"fields": ("accepting_submissions",)}),
        ("Partage des ventes", {
            "fields": ("commission_percent", ("min_price", "max_price")),
            "description": "Sur chaque vente d'un média en « partage des ventes », la plateforme garde ce "
                           "pourcentage du prix fixé par le contributeur ; le contributeur touche le reste.",
        }),
        ("Rachat direct", {
            "fields": (),
            "description": "Les montants versés à la validation se règlent dans « Tarifs de rachat », "
                           "par type de média et par qualité.",
        }),
        ("Limites des fichiers", {"fields": ("max_video_seconds", ("max_photo_size_mb", "max_video_size_mb"))}),
        ("Retraits", {"fields": ("min_payout",)}),
    )

    def has_add_permission(self, request):
        return not ContributorSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BuyoutRate)
class BuyoutRateAdmin(admin.ModelAdmin):
    list_display = ("media_type", "quality", "amount", "is_active")
    list_editable = ("amount", "is_active")
    list_filter = ("media_type", "is_active")


@admin.register(ContributorProfile)
class ContributorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "display_name", "user_email", "status_badge", "media_to_review", "published_count",
        "buyout_count", "share_count", "balance_available", "payout_pending", "payout_phone_display",
    )
    list_filter = ("status", "payout_operator")
    search_fields = ("display_name", "user__email", "payout_phone")
    readonly_fields = ("user", "terms_accepted_at", "created_at", "balance_summary")
    fields = ("user", "display_name", "bio", "status", ("payout_operator", "payout_phone"),
              "balance_summary", "terms_accepted_at", "created_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").annotate(
            n_pending=Count("user__contributions", filter=Q(user__contributions__status="pending"), distinct=True),
            n_published=Count("user__contributions", filter=Q(user__contributions__status="published"), distinct=True),
            n_buyout=Count("user__contributions", filter=Q(user__contributions__payout_mode="buyout"), distinct=True),
            n_share=Count("user__contributions", filter=Q(user__contributions__payout_mode="revenue_share"), distinct=True),
        )

    @admin.display(description="Email", ordering="user__email")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return _badge(obj.get_status_display(), "#2F7D4F" if obj.status == "active" else "#B3412E")

    @admin.display(description="À valider", ordering="n_pending")
    def media_to_review(self, obj):
        if not obj.n_pending:
            return "0"
        url = reverse("admin:media_app_media_changelist") + f"?status__exact=pending&contributor__id__exact={obj.user_id}"
        return format_html('<a href="{}"><strong>{}</strong></a>', url, obj.n_pending)

    @admin.display(description="Publiés", ordering="n_published")
    def published_count(self, obj):
        return obj.n_published

    @admin.display(description="Rachat direct", ordering="n_buyout")
    def buyout_count(self, obj):
        return obj.n_buyout

    @admin.display(description="Partage des ventes", ordering="n_share")
    def share_count(self, obj):
        return obj.n_share

    @admin.display(description="Solde disponible")
    def balance_available(self, obj):
        return f"{balance_for(obj.user)['available']:,} FCFA".replace(",", " ")

    @admin.display(description="Retrait demandé")
    def payout_pending(self, obj):
        pending = balance_for(obj.user)["pending_payout"]
        if not pending:
            return "—"
        url = reverse("admin:contributors_payoutrequest_changelist") + f"?status__exact=requested&contributor__id__exact={obj.user_id}"
        return format_html('<a href="{}"><strong>{} FCFA</strong></a>', url, f"{pending:,}".replace(",", " "))

    @admin.display(description="Mobile Money")
    def payout_phone_display(self, obj):
        return f"{obj.payout_operator} {obj.payout_phone}".strip() or "—"

    @admin.display(description="Solde")
    def balance_summary(self, obj):
        b = balance_for(obj.user)
        return format_html(
            "Gagné : <strong>{}</strong> FCFA · Déjà versé : {} FCFA · Retrait en cours : {} FCFA · "
            "<strong>Disponible : {} FCFA</strong>", b["earned"], b["paid_out"], b["pending_payout"], b["available"],
        )


@admin.register(ContributorEarning)
class ContributorEarningAdmin(admin.ModelAdmin):
    list_display = ("created_at", "contributor", "kind", "media", "gross_amount", "commission_percent", "amount")
    list_filter = ("kind", "created_at")
    search_fields = ("contributor__email", "media__title", "note")
    readonly_fields = ("contributor", "media", "purchase", "kind", "gross_amount", "commission_percent", "created_at")

    def get_readonly_fields(self, request, obj=None):
        # Les gains issus d'une vente ou d'un rachat sont figés ; seul un
        # ajustement manuel se saisit ici.
        return self.readonly_fields + ("amount", "note") if obj else ()

    def get_fields(self, request, obj=None):
        if obj is None:
            return ("contributor", "gross_amount", "amount", "note")
        return super().get_fields(request, obj)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.kind = "adjustment"
            obj.commission_percent = 0
        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        return False


class PayoutRequestForm(forms.ModelForm):
    class Meta:
        model = PayoutRequest
        fields = "__all__"

    def clean_proof(self):
        proof = self.cleaned_data.get("proof")
        if proof and hasattr(proof, "size") and proof.size > PROOF_MAX_MB * 1024 * 1024:
            raise forms.ValidationError(f"Fichier trop lourd : {PROOF_MAX_MB} Mo maximum.")
        return proof

    def clean(self):
        data = super().clean()
        status = data.get("status") or getattr(self.instance, "status", "")
        reference = data.get("transaction_reference") or self.instance.transaction_reference or ""
        if status == "paid" and not reference.strip():
            self.add_error("transaction_reference", "Indiquez la référence du transfert Mobile Money avant de marquer la demande comme versée.")
        if data.get("proof") and status == "rejected":
            self.add_error("proof", "Une preuve de paiement ne se joint qu'à une demande versée.")
        return data


@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    form = PayoutRequestForm
    list_display = ("created_at", "contributor", "amount_display", "operator", "phone", "status_badge",
                    "transaction_reference", "proof_badge", "processed_at")
    list_filter = ("status", "operator", "created_at")
    search_fields = ("contributor__email", "phone", "transaction_reference")
    readonly_fields = ("contributor", "amount", "operator", "phone", "created_at", "processed_at", "processed_by",
                       "contributor_balance", "proof_uploaded_at", "proof_link")
    fields = ("contributor", "contributor_balance", "amount", ("operator", "phone"), "status",
              "transaction_reference", "proof", ("proof_link", "proof_uploaded_at"), "admin_note",
              "created_at", ("processed_at", "processed_by"))

    @admin.display(description="Preuve")
    def proof_badge(self, obj):
        if obj.proof:
            return _badge("Jointe", "#2F7D4F")
        return _badge("Manquante", "#B07A1E") if obj.status == "paid" else "—"

    @admin.display(description="Voir la preuve")
    def proof_link(self, obj):
        if not obj.proof:
            return "—"
        try:
            url = obj.proof.storage.url(obj.proof.name, expire=600)
        except TypeError:
            url = obj.proof.url
        return format_html('<a href="{}" target="_blank" rel="noopener">Ouvrir le fichier</a>', url)

    @admin.display(description="Montant", ordering="amount")
    def amount_display(self, obj):
        return f"{obj.amount:,} FCFA".replace(",", " ")

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        colors = {"requested": "#B07A1E", "paid": "#2F7D4F", "rejected": "#B3412E"}
        return _badge(obj.get_status_display(), colors.get(obj.status, "#4D5C6B"))

    @admin.display(description="Solde du contributeur")
    def contributor_balance(self, obj):
        b = balance_for(obj.contributor)
        return f"Gagné {b['earned']} FCFA · déjà versé {b['paid_out']} FCFA · disponible {b['available']} FCFA"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.status != "requested":
            # Après traitement, seule la preuve de paiement reste modifiable.
            return self.readonly_fields + ("status", "transaction_reference", "admin_note")
        return self.readonly_fields

    def save_model(self, request, obj, form, change):
        """Passer une demande à « Versé » ou « Refusé » applique la règle métier
        (référence obligatoire, notification du contributeur)."""
        previous = PayoutRequest.objects.get(pk=obj.pk).status if change else None
        proof_changed = "proof" in form.changed_data and bool(obj.proof)
        if proof_changed:
            obj.proof_uploaded_at = timezone.now()
        try:
            if previous == "requested" and obj.status == "paid":
                # La preuve est enregistrée avant, pour être citée dans l'avis de versement.
                obj.status = "requested"
                super().save_model(request, obj, form, change)
                mark_payout_paid(obj, request.user, obj.transaction_reference)
                return
            if previous == "requested" and obj.status == "rejected":
                reject_payout(obj, request.user, obj.admin_note)
                return
        except ValidationError as exc:
            self.message_user(request, " ".join(exc.messages), level=messages.ERROR)
            return
        super().save_model(request, obj, form, change)
        if proof_changed and obj.status == "paid":
            notify_proof_added(obj)
