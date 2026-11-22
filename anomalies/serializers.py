from rest_framework import serializers

from .models import Alerte, SignalementAnomalie
from .permissions import peut_gerer


class SignalementSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_anomalie_display", read_only=True)
    commerce_nom = serializers.CharField(source="commerce.nom_boutique", read_only=True, default=None)
    zone_nom = serializers.CharField(source="commerce.zone.nom", read_only=True, default=None)
    gouvernorat = serializers.CharField(source="commerce.zone.gouvernorat", read_only=True, default=None)
    inspecteur_nom = serializers.SerializerMethodField()
    alertes = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    peut_modifier = serializers.SerializerMethodField()  # le frontend affiche Modifier / Supprimer selon ce drapeau

    class Meta:
        model = SignalementAnomalie
        fields = ["id", "type_anomalie", "type_label", "description", "date_signalement",
                  "commerce", "commerce_nom", "zone_nom", "gouvernorat",
                  "inspecteur", "inspecteur_nom", "alertes", "peut_modifier"]
        read_only_fields = ["date_signalement", "inspecteur"]

    def get_peut_modifier(self, obj):
        request = self.context.get("request")
        return bool(request) and peut_gerer(request.user, obj)

    def get_inspecteur_nom(self, obj):
        return str(obj.inspecteur) if obj.inspecteur_id else None

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("La description est obligatoire.")
        return value.strip()


class AlerteSerializer(serializers.ModelSerializer):
    urgence_label = serializers.CharField(source="get_niveau_urgence_display", read_only=True)
    zone_nom = serializers.CharField(source="zone.nom", read_only=True)
    gouvernorat = serializers.CharField(source="zone.gouvernorat", read_only=True)
    nb_signalements = serializers.SerializerMethodField()
    signalements = SignalementSerializer(many=True, read_only=True)

    class Meta:
        model = Alerte
        fields = ["id", "message", "niveau_urgence", "urgence_label", "date_creation",
                  "zone", "zone_nom", "gouvernorat", "nb_signalements", "signalements"]

    def get_nb_signalements(self, obj):
        return len(obj.signalements.all())  # utilise le prefetch
