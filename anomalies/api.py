from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, Count, IntegerField, Value, When
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response

from comptes.authentication import SessionAuthentication401
from comptes.models import Role, role_de

from .models import Alerte, Inspecteur, SignalementAnomalie, Urgence
from .permissions import peut_gerer
from .serializers import AlerteSerializer, SignalementSerializer
from .services import (rattacher_a_alerte, signalements_lies, supprimer_signalement,
                       synchroniser_alertes)


def inspecteur_courant():
    """TEMPORAIRE (développement) : pas encore de login, on utilise le premier superuser
    comme inspecteur. À remplacer par request.user.inspecteur quand l'authentification existera."""
    user = get_user_model().objects.filter(is_superuser=True).first()
    if user is None:
        return None
    return fiche_inspecteur(user)


def fiche_inspecteur(user):
    """Fiche Inspecteur de ce compte (créée si besoin, avec un badge unique)."""
    inspecteur = Inspecteur.objects.filter(user=user).first()
    if inspecteur is None:
        badge, n = f"INSP-{user.pk:04d}", 1
        while Inspecteur.objects.filter(badge_inspecteur=badge).exists():  # badge unique
            n += 1
            badge = f"INSP-{user.pk:04d}-{n}"
        inspecteur = Inspecteur.objects.create(user=user, badge_inspecteur=badge)
    return inspecteur


def inspecteur_de(user):
    """Auteur d'un nouveau signalement : le compte connecté s'il est administrateur ou inspecteur
    (c'est ce qui lui permettra de le modifier ensuite) ; sinon on garde le comportement provisoire."""
    if role_de(user) in (Role.ADMIN, Role.INSPECTEUR):
        return fiche_inspecteur(user)
    return inspecteur_courant()


class SignalementPermission(BasePermission):
    """Lire / créer : tout compte connecté. Modifier / supprimer : administrateur ou auteur du signalement."""
    message = "Seul un administrateur ou l'inspecteur auteur peut modifier ou supprimer ce signalement."

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return peut_gerer(request.user, obj)


class SignalementViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = SignalementSerializer
    authentication_classes = [SessionAuthentication401]   # connexion fournie par le module Comptes
    permission_classes = [SignalementPermission]

    def get_queryset(self):
        qs = (SignalementAnomalie.objects.select_related("commerce__zone", "inspecteur__user")
              .prefetch_related("alertes"))
        p = self.request.query_params
        if p.get("type"):
            qs = qs.filter(type_anomalie=p["type"])
        if p.get("commerce"):
            qs = qs.filter(commerce_id=p["commerce"])
        if p.get("zone"):
            qs = qs.filter(commerce__zone_id=p["zone"])
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        signalement = serializer.save(inspecteur=inspecteur_de(self.request.user))
        rattacher_a_alerte(signalement)

    @transaction.atomic
    def perform_update(self, serializer):
        ancienne_zone = serializer.instance.zone          # avant l'enregistrement
        signalement = serializer.save()
        synchroniser_alertes(signalement, ancienne_zone.pk if ancienne_zone else None)

    @transaction.atomic
    def perform_destroy(self, instance):
        supprimer_signalement(instance)

    @action(detail=True, methods=["get"])
    def liees(self, request, pk=None):
        """Anomalies liées au signalement : même alerte ou même commerce."""
        liees = signalements_lies(self.get_object())
        return Response(self.get_serializer(liees, many=True).data)


class AlerteViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AlerteSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        rang = Case(
            When(niveau_urgence=Urgence.CRITIQUE, then=Value(4)),
            When(niveau_urgence=Urgence.ELEVEE, then=Value(3)),
            When(niveau_urgence=Urgence.MOYENNE, then=Value(2)),
            default=Value(1), output_field=IntegerField(),
        )
        qs = (Alerte.objects.select_related("zone")
              .prefetch_related("signalements__commerce__zone", "signalements__inspecteur__user",
                                "signalements__alertes")
              .annotate(rang=rang).order_by("-rang", "-date_creation"))   # les plus urgentes d'abord
        urgence = self.request.query_params.get("urgence")
        return qs.filter(niveau_urgence=urgence) if urgence else qs

    @action(detail=False, methods=["get"])
    def resume(self, request):
        """Nombre d'alertes par niveau d'urgence."""
        comptes = dict(Alerte.objects.values_list("niveau_urgence").annotate(n=Count("id")))
        return Response({code: comptes.get(code, 0) for code, _ in Urgence.choices})
