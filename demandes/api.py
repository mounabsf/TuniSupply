from django.contrib.auth import get_user_model
from django.db.models import Count, F, Sum
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Commerce, DemandeAllocation, LigneDemande, Produit, StatutDemande
from .serializers import CommerceSerializer, DemandeSerializer, ProduitSerializer

# TEMPORAIRE (développement) : pas d'authentification, en attendant le login du groupe.
OPEN = dict(authentication_classes=[], permission_classes=[AllowAny])


class DemandeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (DemandeAllocation.objects.select_related("commerce")
              .prefetch_related("lignes__produit").order_by("-pk"))
        statut = self.request.query_params.get("statut")
        return qs.filter(statut=statut) if statut else qs

    def perform_create(self, serializer):
        user = get_user_model().objects.filter(is_superuser=True).first()
        serializer.save(commercant=user)

    def update(self, request, *args, **kwargs):
        if not self.get_object().peut_modifier:
            return Response({"detail": "Seule une demande en attente peut être modifiée."}, status=400)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def statut(self, request, pk=None):
        demande = self.get_object()
        cibles = {"cloturer": StatutDemande.LIVREE, "annuler": StatutDemande.ANNULEE}
        act = request.data.get("action")
        if act not in cibles:
            return Response({"detail": "Action inconnue."}, status=400)
        if demande.est_terminee:
            return Response({"detail": "Demande déjà terminée."}, status=400)
        demande.statut = cibles[act]
        demande.save(update_fields=["statut"])
        return Response(self.get_serializer(demande).data)


class ProduitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer
    authentication_classes = []
    permission_classes = [AllowAny]


class CommerceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Commerce.objects.select_related("zone")
    serializer_class = CommerceSerializer
    authentication_classes = []
    permission_classes = [AllowAny]


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def regroupement(request):
    qs = (LigneDemande.objects.filter(demande__statut=StatutDemande.EN_ATTENTE)
          .values(zone=F("demande__commerce__zone__nom"),
                  gouvernorat=F("demande__commerce__zone__gouvernorat"),
                  produit_nom=F("produit__nom"))
          .annotate(total=Sum("quantite_demandee"), nb=Count("demande", distinct=True))
          .order_by("zone", "produit_nom"))
    return Response(list(qs))