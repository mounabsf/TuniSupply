from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import Stock


class StockSerializer(serializers.ModelSerializer):
    commerce_nom = serializers.CharField(source="commerce.nom_boutique", read_only=True)
    produit_nom = serializers.CharField(source="produit.nom", read_only=True)
    est_critique = serializers.BooleanField(read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id",
            "commerce",
            "commerce_nom",
            "produit",
            "produit_nom",
            "quantite",
            "seuil_critique",
            "est_critique",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = ["id", "cree_le", "modifie_le"]
        validators = [
            UniqueTogetherValidator(
                queryset=Stock.objects.all(),
                fields=("commerce", "produit"),
                message="Ce produit est déjà enregistré pour ce commerce.",
            )
        ]
