from rest_framework import status
from rest_framework.test import APITestCase

from .models import Product, StockMovement


class InventoryApiTests(APITestCase):
    def setUp(self):
        self.product = Product.objects.create(
            sku='UNI-001',
            name='Cahier A4',
            category='Papeterie',
            unit_price='2.50',
            quantity=8,
            minimum_stock=5,
        )

    def test_create_product_records_initial_stock(self):
        response = self.client.post(
            '/api/products/',
            {
                'sku': 'UNI-002',
                'name': 'Stylo bleu',
                'category': 'Papeterie',
                'unit_price': '1.20',
                'minimum_stock': 4,
                'initial_quantity': 10,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(sku='UNI-002')
        movement = StockMovement.objects.get(product=product)
        self.assertEqual(product.quantity, 10)
        self.assertEqual(movement.stock_before, 0)
        self.assertEqual(movement.stock_after, 10)

    def test_product_update_does_not_change_tracked_quantity(self):
        response = self.client.patch(
            f'/api/products/{self.product.pk}/',
            {'name': 'Cahier quadrille', 'quantity': 99},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Cahier quadrille')
        self.assertEqual(self.product.quantity, 8)

    def test_stock_movements_update_quantity_and_prevent_negative_stock(self):
        response = self.client.post(
            '/api/movements/',
            {
                'product': self.product.pk,
                'movement_type': 'out',
                'quantity': 3,
                'reason': 'Vente',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 5)
        self.assertEqual(response.data['stock_before'], 8)
        self.assertEqual(response.data['stock_after'], 5)

        response = self.client.post(
            '/api/movements/',
            {
                'product': self.product.pk,
                'movement_type': 'out',
                'quantity': 6,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 5)

    def test_adjustment_can_correct_stock_in_both_directions(self):
        response = self.client.post(
            '/api/movements/',
            {
                'product': self.product.pk,
                'movement_type': 'adjustment',
                'quantity': -2,
                'reason': 'Comptage physique',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 6)

    def test_search_low_stock_and_dashboard_statistics(self):
        self.client.post(
            '/api/movements/',
            {
                'product': self.product.pk,
                'movement_type': 'out',
                'quantity': 4,
            },
            format='json',
        )

        products = self.client.get('/api/products/?search=cahier&stock_status=low')
        self.assertEqual(products.status_code, status.HTTP_200_OK)
        self.assertEqual(len(products.data), 1)
        self.assertTrue(products.data[0]['is_low_stock'])

        dashboard = self.client.get('/api/dashboard/')
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard.data['total_products'], 1)
        self.assertEqual(dashboard.data['total_units'], 4)
        self.assertEqual(dashboard.data['low_stock_products'], 1)
        self.assertEqual(len(dashboard.data['recent_movements']), 1)

    def test_delete_archives_product_and_preserves_history(self):
        StockMovement.objects.create(
            product=self.product,
            movement_type=StockMovement.MovementType.IN,
            quantity=8,
            stock_before=0,
            stock_after=8,
        )
        response = self.client.delete(f'/api/products/{self.product.pk}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        self.assertEqual(self.client.get('/api/products/').data, [])
        self.assertEqual(
            len(self.client.get(f'/api/movements/?product={self.product.pk}').data), 1
        )

        response = self.client.post(
            '/api/movements/',
            {
                'product': self.product.pk,
                'movement_type': 'in',
                'quantity': 2,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)