from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Fournisseur
from .serializers import FournisseurSerializer, LivraisonSerializer, StatutSerializer


class FournisseurViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Pas de suppression : un fournisseur s'archive, son historique reste conservé."""

    serializer_class = FournisseurSerializer

    def get_queryset(self):
        qs = Fournisseur.objects.all()
        # La liste exclut les archivés, sauf avec ?archives=true.
        if self.action == "list" and self.request.query_params.get("archives") != "true":
            qs = qs.filter(est_archive=False)
        return qs

    # 7.3 - PUT /api/fournisseurs/<id>/statut/
    @action(detail=True, methods=["put"], url_path="statut")
    def statut(self, request, pk=None):
        fournisseur = self.get_object()
        if fournisseur.est_archive:
            return Response(
                {"detail": "Un fournisseur archivé ne peut plus être modifié."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = StatutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fournisseur.statut = serializer.validated_data["statut"]
        fournisseur.save(update_fields=["statut"])
        return Response(self.get_serializer(fournisseur).data)

    # 7.4 - POST /api/fournisseurs/<id>/archiver/
    @action(detail=True, methods=["post"], url_path="archiver")
    def archiver(self, request, pk=None):
        fournisseur = self.get_object()
        if fournisseur.est_archive:
            return Response({"detail": "Ce fournisseur est déjà archivé."}, status=status.HTTP_400_BAD_REQUEST)
        fournisseur.est_archive = True
        fournisseur.date_archivage = timezone.now()
        fournisseur.statut = Fournisseur.Statut.INACTIF
        fournisseur.save(update_fields=["est_archive", "date_archivage", "statut"])
        return Response(self.get_serializer(fournisseur).data)

    # 7.2 - GET /api/fournisseurs/<id>/livraisons/
    @action(detail=True, methods=["get"], url_path="livraisons")
    def livraisons(self, request, pk=None):
        fournisseur = self.get_object()
        return Response(LivraisonSerializer(fournisseur.livraisons.all(), many=True).data)
