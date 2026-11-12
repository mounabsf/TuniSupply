from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import api

router = DefaultRouter()
router.register("demandes", api.DemandeViewSet, basename="api-demande")
router.register("produits", api.ProduitViewSet, basename="api-produit")
router.register("commerces", api.CommerceViewSet, basename="api-commerce")

urlpatterns = [
    path("regroupement/", api.regroupement),
    path("", include(router.urls)),
]