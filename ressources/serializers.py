from rest_framework import serializers

from .models import CentreDistribution, RessourceSubventionnee


class CentreDistributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentreDistribution
        fields = ["id", "nom", "adresse", "capacite_stockage"]


class RessourceSubventionneeSerializer(serializers.ModelSerializer):
    # déclaré à la main pour avoir un message d'unicité clair en français
    id_lot = serializers.CharField(max_length=50)
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    etat = serializers.CharField(read_only=True)
    etat_label = serializers.CharField(read_only=True)
    valeur_totale = serializers.DecimalField(max_digits=18, decimal_places=3, read_only=True)

    class Meta:
        model = RessourceSubventionnee
        fields = ["id", "centre", "centre_nom", "id_lot", "type_ressource", "quantite_totale_lot",
                  "prix_achat_etat", "date_peremption", "conforme",
                  "etat", "etat_label", "valeur_totale"]

    def validate_id_lot(self, valeur):
        valeur = valeur.strip()
        doublons = RessourceSubventionnee.objects.filter(id_lot=valeur)
        if self.instance is not None:
            doublons = doublons.exclude(pk=self.instance.pk)
        if doublons.exists():
            raise serializers.ValidationError("Ce numéro de lot existe déjà.")
        return valeur