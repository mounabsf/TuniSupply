from django.apps import AppConfig


class DashboardConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dashboard"

    def ready(self):
        from django.utils.module_loading import autodiscover_modules
        from . import sections_base  # noqa: F401  (sections intégrées : commerces, produits)
        autodiscover_modules("dashboard_stats")  # sections fournies par les autres modules
