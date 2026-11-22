from django.contrib import admin

from .models import Product, StockMovement


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'category', 'quantity', 'minimum_stock', 'unit_price', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('sku', 'name', 'category')
    readonly_fields = ('quantity',)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        'created_at',
        'product',
        'movement_type',
        'quantity',
        'stock_before',
        'stock_after',
    )
    list_filter = ('movement_type', 'created_at')
    search_fields = ('product__sku', 'product__name', 'reason')
    readonly_fields = ('created_at', 'stock_before', 'stock_after')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False