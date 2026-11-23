from rest_framework.routers import SimpleRouter

from .api import LogisticienViewSet, OperationLogistiqueViewSet

router = SimpleRouter()
router.register("operations", OperationLogistiqueViewSet, basename="api-operation")
router.register("logisticiens", LogisticienViewSet, basename="api-logisticien")

urlpatterns = router.urls
