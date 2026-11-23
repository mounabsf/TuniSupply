from rest_framework import serializers

from .models import Fournisseur, Livraison


class FournisseurSerializer(serializers.ModelSerializer):
    score_fiabilite = serializers.SerializerMethodField()

    class Meta:
        model = Fournisseur
        fields = [
            "id", "nom", "zone_couverte", "capacite_livraison", "statut",
            "score_fiabilite", "est_archive", "date_archivage", "date_creation",
        ]
        # Le statut et l'archivage passent par leurs propres endpoints.
        read_only_fields = ["statut", "est_archive", "date_archivage", "date_creation"]

    def validate_nom(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom est obligatoire.")
        return value

    def validate_zone_couverte(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La zone couverte est obligatoire.")
        return value

    def validate_capacite_livraison(self, value):
        if value <= 0:
            raise serializers.ValidationError("La capacité de livraison doit être supérieure à 0.")
        return value

    def get_score_fiabilite(self, obj):
        """Part des livraisons à la fois conformes et ponctuelles (en %), None sans historique."""
        total = obj.livraisons.count()
        if total == 0:
            return None
        bonnes = obj.livraisons.filter(conforme=True, ponctuel=True).count()
        return round(bonnes * 100 / total)


class StatutSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(
        choices=[
            Fournisseur.Statut.ACTIF,
            Fournisseur.Statut.SUSPENDU,
            Fournisseur.Statut.SOUS_SURVEILLANCE,
        ]
    )


class LivraisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livraison
        fields = ["id", "date_livraison", "quantite_livree", "conforme", "ponctuel"]
