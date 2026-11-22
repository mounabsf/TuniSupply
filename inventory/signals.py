from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product


@receiver(post_save, sender=Product)
def synchroniser_produit_demandes(sender, instance, **kwargs):
    """Copie le produit du stock vers le module Demandes."""
    from demandes.models import Produit

    if not instance.is_active:
        return
    Produit.objects.update_or_create(
        nom=instance.name,
        defaults={"prix_unitaire_legal": instance.unit_price},
    )