from rest_framework import serializers

from django.contrib.auth import get_user_model

from comptes.models import Role
from ressources.models import CentreDistribution, RessourceSubventionnee
from .models import OperationLogistique

User = get_user_model()


class LogisticienSerializer(serializers.ModelSerializer):
    nom = serializers.SerializerMethodField()
    depot_rattachement = serializers.CharField(source="profil.depot_rattachement", read_only=True)

    class Meta:
        model = User
        fields = ["id", "nom", "depot_rattachement"]

    def get_nom(self, user):
        return user.get_full_name() or user.get_username()


class OperationLogistiqueSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="id_operation", read_only=True)
    statut_label = serializers.CharField(source="get_statut_livraison_display", read_only=True)
    peut_modifier = serializers.BooleanField(read_only=True)
    peut_annuler = serializers.BooleanField(read_only=True)
    peut_demarrer = serializers.BooleanField(read_only=True)
    peut_terminer = serializers.BooleanField(read_only=True)
    logisticien = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(profil__role=Role.LOGISTICIEN)
    )
    logisticien_nom = serializers.SerializerMethodField()
    depot_rattachement = serializers.SerializerMethodField()
    centre_depart = serializers.PrimaryKeyRelatedField(queryset=CentreDistribution.objects.all())
    centre_depart_nom = serializers.SerializerMethodField()
    ressources = serializers.PrimaryKeyRelatedField(
        queryset=RessourceSubventionnee.objects.all(),
        many=True,
        required=False,
    )
    ressources_detail = serializers.SerializerMethodField()

    class Meta:
        model = OperationLogistique
        fields = [
            "id",
            "date_prevue",
            "logisticien",
            "logisticien_nom",
            "depot_rattachement",
            "centre_depart",
            "centre_depart_nom",
            "ressources",
            "ressources_detail",
            "statut_livraison",
            "statut_label",
            "itineraire_optimise",
            "peut_modifier",
            "peut_annuler",
            "peut_demarrer",
            "peut_terminer",
        ]
        read_only_fields = ["statut_livraison"]

    def get_logisticien_nom(self, operation):
        user = operation.logisticien
        if user is None:
            return ""
        return user.get_full_name() or user.get_username()

    def get_depot_rattachement(self, operation):
        user = operation.logisticien
        return user.profil.depot_rattachement if user else ""

    def get_centre_depart_nom(self, operation):
        return operation.centre_depart.nom if operation.centre_depart else ""

    def get_ressources_detail(self, operation):
        return [
            {
                "id": ressource.pk,
                "id_lot": ressource.id_lot,
                "type_ressource": ressource.type_ressource,
                "centre_nom": ressource.centre.nom,
            }
            for ressource in operation.ressources.all()
        ]

    def validate(self, attrs):
        centre = attrs.get("centre_depart", getattr(self.instance, "centre_depart", None))
        ressources = attrs.get("ressources")
        if ressources is None:
            ressources = self.instance.ressources.all() if self.instance else []
        if centre and any(ressource.centre_id != centre.pk for ressource in ressources):
            raise serializers.ValidationError({
                "ressources": "Toutes les ressources doivent appartenir au centre de départ."
            })
        return attrs
