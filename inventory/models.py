from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
    sku = models.CharField('reference', max_length=32, unique=True)
    name = models.CharField('nom', max_length=160)
    category = models.CharField('categorie', max_length=80, blank=True)
    description = models.TextField('description', blank=True)
    unit_price = models.DecimalField(
        'prix unitaire',
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    quantity = models.PositiveIntegerField('quantite en stock', default=0)
    minimum_stock = models.PositiveIntegerField('seuil minimum', default=0)
    is_active = models.BooleanField('actif', default=True)
    created_at = models.DateTimeField('cree le', auto_now_add=True)
    updated_at = models.DateTimeField('modifie le', auto_now=True)

    class Meta:
        ordering = ['name', 'sku']
        verbose_name = 'produit'
        verbose_name_plural = 'produits'

    def __str__(self):
        return f'{self.sku} - {self.name}'

    @property
    def is_low_stock(self):
        return self.quantity <= self.minimum_stock


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = 'in', 'Entree'
        OUT = 'out', 'Sortie'
        ADJUSTMENT = 'adjustment', 'Ajustement'

    product = models.ForeignKey(
        Product,
        related_name='movements',
        on_delete=models.PROTECT,
        verbose_name='produit',
    )
    movement_type = models.CharField(
        'type de mouvement', max_length=12, choices=MovementType.choices
    )
    quantity = models.IntegerField('quantite du mouvement')
    stock_before = models.PositiveIntegerField('stock avant')
    stock_after = models.PositiveIntegerField('stock apres')
    reason = models.CharField('motif', max_length=240, blank=True)
    created_at = models.DateTimeField('date', auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-pk']
        verbose_name = 'mouvement de stock'
        verbose_name_plural = 'mouvements de stock'

    def __str__(self):
        return f'{self.get_movement_type_display()} - {self.product.sku} ({self.quantity})'