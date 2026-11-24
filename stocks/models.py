from django.core.validators import MinValueValidator
from django.db import models

from demandes.models import Commerce, Produit


class Stock(models.Model):
    commerce = models.ForeignKey(
        Commerce, on_delete=models.CASCADE, related_name="stocks"
    )
    produit = models.ForeignKey(
        Produit, on_delete=models.PROTECT, related_name="stocks"
    )
    quantite = models.PositiveIntegerField(
        validators=[MinValueValidator(0)]
    )
    seuil_critique = models.PositiveIntegerField(
        default=0, validators=[MinValueValidator(0)]
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["produit__nom", "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["commerce", "produit"],
                name="unique_stock_per_commerce_product",
            )
        ]

    def __str__(self):
        return f"{self.produit} — {self.commerce} ({self.quantite})"

    @property
    def est_critique(self):
        return self.quantite <= self.seuil_critique
