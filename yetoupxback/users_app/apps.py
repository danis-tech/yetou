from django.apps import AppConfig


class UsersAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users_app"
    verbose_name = "Utilisateurs"

    def ready(self):
        import users_app.signals  # noqa: F401
        from django.contrib import admin

        # Admin épuré : uniquement Médias, Utilisateurs, Catégories, Paiements, Activités.
        # Tout le reste (allauth, jetons JWT, etc.) est masqué.
        for model in list(admin.site._registry):
            app = model._meta.app_label
            name = model.__name__
            if app in ("account", "socialaccount", "sites", "authtoken", "auth", "token_blacklist") and name in (
                "EmailAddress", "SocialApp", "SocialAccount", "SocialToken", "Site", "TokenProxy", "Group",
                "OutstandingToken", "BlacklistedToken",
            ):
                try:
                    admin.site.unregister(model)
                except admin.sites.NotRegistered:
                    pass
