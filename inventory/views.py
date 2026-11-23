from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Q, Sum
from rest_framework import mixins, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, StockMovement
from .serializers import ProductSerializer, StockMovementSerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True)
        search = self.request.query_params.get('search', '').strip()
        stock_status = self.request.query_params.get('stock_status')
        category = self.request.query_params.get('category', '').strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(category__icontains=search)
            )
        if category:
            queryset = queryset.filter(category__iexact=category)
        if stock_status == 'low':
            queryset = queryset.filter(quantity__lte=F('minimum_stock'))
        elif stock_status == 'out':
            queryset = queryset.filter(quantity=0)

        ordering = self.request.query_params.get('ordering', 'name')
        allowed_ordering = {'name', '-name', 'sku', '-sku', 'quantity', '-quantity'}
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering, 'sku')
        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class StockMovementViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = StockMovementSerializer
    queryset = StockMovement.objects.select_related('product').all()

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset


class DashboardView(APIView):
    def get(self, request):
        products = Product.objects.filter(is_active=True)
        totals = products.aggregate(
            total_units=Sum('quantity'),
            inventory_value=Sum(
                ExpressionWrapper(
                    F('quantity') * F('unit_price'),
                    output_field=DecimalField(max_digits=16, decimal_places=2),
                )
            ),
        )
        low_stock = products.filter(quantity__lte=F('minimum_stock'))
        recent_movements = StockMovement.objects.select_related('product')[:8]

        return Response(
            {
                'total_products': products.count(),
                'total_units': totals['total_units'] or 0,
                'low_stock_products': low_stock.count(),
                'out_of_stock_products': products.filter(quantity=0).count(),
                'inventory_value': totals['inventory_value'] or Decimal('0.00'),
                'category_count': products.exclude(category='').values('category').distinct().count(),
                'categories': list(
                    products.exclude(category='')
                    .values_list('category', flat=True)
                    .distinct()
                    .order_by('category')
                ),
                'recent_movements': StockMovementSerializer(
                    recent_movements, many=True
                ).data,
            }
        )
