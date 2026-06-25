from django.apps import AppConfig


class UsersAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users_app"
    verbose_name = "Utilisateurs"

    def ready(self):
        from django.contrib import admin

        # Clean up unused admin registrations
        for model in list(admin.site._registry):
            app = model._meta.app_label
            name = model.__name__
            if app in ("account", "socialaccount", "sites", "authtoken", "auth") and name in (
                "EmailAddress", "SocialApp", "SocialAccount", "SocialToken", "Site", "TokenProxy", "Group",
            ):
                try:
                    admin.site.unregister(model)
                except admin.sites.NotRegistered:
                    pass
