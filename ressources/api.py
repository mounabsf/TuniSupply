from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import CentreDistribution, EtatLot, RessourceSubventionnee
from .serializers import CentreDistributionSerializer, RessourceSubventionneeSerializer

# TEMPORAIRE (développement) : pas d'authentification, comme dans le module Demandes,
# en attendant le login du groupe.


class RessourceSubventionneeViewSet(viewsets.ModelViewSet):
    """CRUD des lots : ajouter, modifier (quantité/prix), consulter, supprimer."""
    serializer_class = RessourceSubventionneeSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = RessourceSubventionnee.objects.select_related("centre").order_by("-pk")
        params = self.request.query_params

        centre = params.get("centre")
        if centre and centre.isdigit():
            qs = qs.filter(centre_id=centre)

        etat = params.get("etat")
        aujourdhui = timezone.localdate()
        if etat == EtatLot.PERIME:
            qs = qs.filter(date_peremption__lt=aujourdhui)
        elif etat == EtatLot.NON_CONFORME:
            qs = qs.filter(conforme=False).exclude(date_peremption__lt=aujourdhui)
        elif etat == EtatLot.CONFORME:
            qs = qs.filter(conforme=True).exclude(date_peremption__lt=aujourdhui)
        return qs

    @action(detail=False, methods=["get"])
    def resume(self, request):
        """Chiffres globaux, tous centres confondus (pour le tableau de bord)."""
        lots = list(RessourceSubventionnee.objects.select_related("centre"))
        return Response({
            "nb_lots": len(lots),
            "nb_conformes": sum(1 for l in lots if l.etat == EtatLot.CONFORME),
            "nb_non_conformes": sum(1 for l in lots if l.etat == EtatLot.NON_CONFORME),
            "nb_perimes": sum(1 for l in lots if l.etat == EtatLot.PERIME),
            "valeur_totale": sum((l.valeur_totale for l in lots), 0),
        })


class CentreDistributionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CentreDistribution.objects.all()
    serializer_class = CentreDistributionSerializer
    authentication_classes = []
    permission_classes = [AllowAny]