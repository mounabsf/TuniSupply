from rest_framework.routers import SimpleRouter

from . import api

# SimpleRouter (pas DefaultRouter) : évite un second « api root » à côté de celui de l'app demandes.
router = SimpleRouter()
router.register("signalements", api.SignalementViewSet, basename="api-signalement")
router.register("alertes", api.AlerteViewSet, basename="api-alerte")

urlpatterns = router.urls
