from rest_framework import serializers
from .models import Commerce, DemandeAllocation, LigneDemande, Produit
from .services import calculer_score


class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = ["id", "nom", "plafond_ministere"]


class CommerceSerializer(serializers.ModelSerializer):
    zone_nom = serializers.CharField(source="zone.nom", read_only=True)

    class Meta:
        model = Commerce
        fields = ["id", "nom_boutique", "zone_nom"]


class LigneSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source="produit.nom", read_only=True)

    class Meta:
        model = LigneDemande
        fields = ["id", "produit", "produit_nom", "quantite_demandee", "quantite_accordee"]
        read_only_fields = ["quantite_accordee"]


class DemandeSerializer(serializers.ModelSerializer):
    lignes = LigneSerializer(many=True, allow_empty=False)
    commerce_nom = serializers.CharField(source="commerce.nom_boutique", read_only=True)
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    peut_modifier = serializers.BooleanField(read_only=True)
    est_terminee = serializers.BooleanField(read_only=True)

    class Meta:
        model = DemandeAllocation
        fields = ["id", "commerce", "commerce_nom", "date_demande", "statut", "statut_label",
                  "score_legitime", "peut_modifier", "est_terminee", "lignes"]
        read_only_fields = ["statut", "score_legitime", "date_demande"]

    def _save_lignes(self, demande, lignes):
        for l in lignes:
            LigneDemande.objects.create(demande=demande, **l)
        demande.score_legitime = calculer_score(demande)
        demande.save(update_fields=["score_legitime"])

    def create(self, validated_data):
        lignes = validated_data.pop("lignes")
        demande = DemandeAllocation.objects.create(**validated_data)
        self._save_lignes(demande, lignes)
        return demande

    def update(self, instance, validated_data):
        lignes = validated_data.pop("lignes", None)
        instance.commerce = validated_data.get("commerce", instance.commerce)
        instance.save()
        if lignes is not None:
            instance.lignes.all().delete()
            self._save_lignes(instance, lignes)
        return instance