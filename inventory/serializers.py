from django.db import transaction
from rest_framework import serializers

from .models import Product, StockMovement


class ProductSerializer(serializers.ModelSerializer):
    initial_quantity = serializers.IntegerField(
        min_value=0, required=False, write_only=True
    )
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'sku',
            'name',
            'category',
            'description',
            'unit_price',
            'quantity',
            'minimum_stock',
            'is_active',
            'is_low_stock',
            'initial_quantity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'quantity', 'is_active', 'created_at', 'updated_at']

    def create(self, validated_data):
        initial_quantity = validated_data.pop('initial_quantity', 0)
        with transaction.atomic():
            product = Product.objects.create(
                quantity=initial_quantity,
                **validated_data,
            )
            if initial_quantity:
                StockMovement.objects.create(
                    product=product,
                    movement_type=StockMovement.MovementType.IN,
                    quantity=initial_quantity,
                    stock_before=0,
                    stock_after=initial_quantity,
                    reason='Stock initial',
                )
        return product

    def update(self, instance, validated_data):
        if 'initial_quantity' in validated_data:
            raise serializers.ValidationError(
                {'initial_quantity': 'Ce champ est reserve a la creation.'}
            )
        return super().update(instance, validated_data)


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id',
            'product',
            'product_name',
            'product_sku',
            'movement_type',
            'quantity',
            'stock_before',
            'stock_after',
            'reason',
            'created_at',
        ]
        read_only_fields = ['id', 'stock_before', 'stock_after', 'created_at']

    def validate(self, attrs):
        product = attrs.get('product')
        if product and not product.is_active:
            raise serializers.ValidationError(
                {'product': 'Ce produit est archive et ne peut plus recevoir de mouvement.'}
            )

        movement_type = attrs.get('movement_type')
        quantity = attrs.get('quantity')

        if movement_type in (StockMovement.MovementType.IN, StockMovement.MovementType.OUT):
            if quantity is None or quantity <= 0:
                raise serializers.ValidationError(
                    {'quantity': 'La quantite doit etre superieure a zero.'}
                )
        elif movement_type == StockMovement.MovementType.ADJUSTMENT and quantity == 0:
            raise serializers.ValidationError(
                {'quantity': 'Un ajustement doit modifier le stock.'}
            )
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            product = Product.objects.select_for_update().get(
                pk=validated_data['product'].pk
            )
            if not product.is_active:
                raise serializers.ValidationError(
                    {'product': 'Ce produit est archive et ne peut plus recevoir de mouvement.'}
                )
            movement_type = validated_data['movement_type']
            quantity = validated_data['quantity']
            delta = -quantity if movement_type == StockMovement.MovementType.OUT else quantity
            stock_before = product.quantity
            stock_after = stock_before + delta
            if stock_after < 0:
                raise serializers.ValidationError(
                    {'quantity': 'Le stock disponible est insuffisant.'}
                )

            movement = StockMovement.objects.create(
                **validated_data,
                stock_before=stock_before,
                stock_after=stock_after,
            )
            product.quantity = stock_after
            product.save(update_fields=['quantity', 'updated_at'])
        return movement