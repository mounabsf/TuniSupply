from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardView, ProductViewSet, StockMovementViewSet

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')
router.register('movements', StockMovementViewSet, basename='movement')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]