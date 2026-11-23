from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from comptes.models import Role
from .models import OperationLogistique, StatutOperation
from .serializers import LogisticienSerializer, OperationLogistiqueSerializer

User = get_user_model()


class LogisticienViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LogisticienSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    queryset = (
        User.objects.filter(profil__role=Role.LOGISTICIEN, is_active=True)
        .select_related("profil")
        .order_by("first_name", "last_name", "username")
    )


class OperationLogistiqueViewSet(viewsets.ModelViewSet):
    serializer_class = OperationLogistiqueSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ["get", "post", "put", "head", "options"]

    def get_queryset(self):
        queryset = (
            OperationLogistique.objects.select_related(
                "logisticien__profil",
                "centre_depart",
            )
            .prefetch_related("ressources__centre")
        )
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut_livraison=statut)
        return queryset

    def update(self, request, *args, **kwargs):
        operation = self.get_object()
        if not operation.peut_modifier:
            return Response(
                {"detail": "Seule une opération planifiée peut être modifiée."},
                status=400,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        operation = self.get_object()
        if not operation.peut_annuler:
            return Response(
                {"detail": "Seule une opération qui n'a pas commencé peut être annulée."},
                status=400,
            )
        operation.statut_livraison = StatutOperation.ANNULEE
        operation.save(update_fields=["statut_livraison"])
        return Response(self.get_serializer(operation).data)

    @action(detail=True, methods=["post"])
    def demarrer(self, request, pk=None):
        operation = self.get_object()
        if not operation.peut_demarrer:
            return Response(
                {"detail": "Seule une opération planifiée peut être démarrée."},
                status=400,
            )
        operation.statut_livraison = StatutOperation.EN_COURS
        operation.save(update_fields=["statut_livraison"])
        return Response(self.get_serializer(operation).data)

    @action(detail=True, methods=["post"])
    def terminer(self, request, pk=None):
        operation = self.get_object()
        if not operation.peut_terminer:
            return Response(
                {"detail": "Seule une opération en cours peut être terminée."},
                status=400,
            )
        operation.statut_livraison = StatutOperation.TERMINEE
        operation.save(update_fields=["statut_livraison"])
        return Response(self.get_serializer(operation).data)
