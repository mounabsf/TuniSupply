from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import api

router = DefaultRouter()
router.register("lots", api.RessourceSubventionneeViewSet, basename="api-lot")
router.register("centres", api.CentreDistributionViewSet, basename="api-centre")

urlpatterns = [
    path("", include(router.urls)),
]