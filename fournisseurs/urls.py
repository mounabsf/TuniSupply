from rest_framework.routers import DefaultRouter

from .views import FournisseurViewSet

router = DefaultRouter()
router.register("fournisseurs", FournisseurViewSet, basename="fournisseur")

urlpatterns = router.urls
