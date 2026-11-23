from rest_framework.routers import DefaultRouter

from .api import StockViewSet

router = DefaultRouter()
router.register("", StockViewSet, basename="stock")

urlpatterns = router.urls
