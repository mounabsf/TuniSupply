from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.db.models import ProtectedError, Q, RestrictedError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .authentication import SessionAuthentication401
from .models import Role
from .permissions import IsAdminRole
from .serializers import (ChangerMotDePasseSerializer, CompteSerializer, ConnexionSerializer,
                          InscriptionSerializer, MonProfilSerializer)

User = get_user_model()


def _donnees(user, request):
    return CompteSerializer(user, context={"request": request}).data


# ======================= session : connexion / déconnexion =======================
@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Appelée au démarrage de l'application : pose le cookie CSRF et dit qui est connecté."""
    authentication_classes = [SessionAuthentication401]
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        return Response({"user": _donnees(user, request) if user else None})


class ConnexionView(APIView):
    authentication_classes = []          # pas de session requise pour se connecter
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"             # limite les essais de mot de passe (voir settings)

    def post(self, request):
        s = ConnexionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        identifiant = s.validated_data["username"].strip()
        if "@" in identifiant:           # connexion possible avec l'e-mail
            trouves = list(User.objects.filter(email__iexact=identifiant)[:2])
            identifiant = trouves[0].get_username() if len(trouves) == 1 else identifiant
        user = authenticate(request, username=identifiant, password=s.validated_data["password"])
        if user is None:                 # message volontairement identique : compte inconnu, mauvais mdp ou désactivé
            return Response({"detail": "Identifiant ou mot de passe incorrect."},
                            status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response(_donnees(user, request))


class DeconnexionView(APIView):
    authentication_classes = [SessionAuthentication401]
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InscriptionView(APIView):
    """Inscription libre : uniquement Commerçant ou Grossiste (jamais Admin / Inspecteur)."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        s = InscriptionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        login(request, user)             # l'utilisateur est connecté directement
        return Response(_donnees(user, request), status=status.HTTP_201_CREATED)


# ======================= espace personnel =======================
class MonProfilView(APIView):
    authentication_classes = [SessionAuthentication401]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_donnees(request.user, request))

    def patch(self, request):
        s = MonProfilSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(_donnees(request.user, request))


class ChangerMotDePasseView(APIView):
    authentication_classes = [SessionAuthentication401]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = ChangerMotDePasseSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        request.user.set_password(s.validated_data["new_password"])
        request.user.save()
        update_session_auth_hash(request, request.user)  # reste connecté après le changement
        return Response({"detail": "Mot de passe modifié."})


# ======================= administration des comptes (CRUD) =======================
class CompteViewSet(viewsets.ModelViewSet):
    """Ajout, consultation, modification et suppression des comptes — administrateurs seulement."""
    serializer_class = CompteSerializer
    authentication_classes = [SessionAuthentication401]
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = User.objects.select_related("profil").order_by("-date_joined", "-pk")
        p = self.request.query_params
        role = p.get("role")
        if role == Role.ADMIN:  # un superuser est ADMIN même sans profil ADMIN
            qs = qs.filter(Q(profil__role=Role.ADMIN) | Q(is_superuser=True))
        elif role:
            qs = qs.filter(profil__role=role, is_superuser=False)
        if p.get("actif") in ("true", "false"):
            qs = qs.filter(is_active=p["actif"] == "true")
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q)
                           | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        return qs

    def perform_update(self, serializer):
        user = serializer.save()
        if user.pk == self.request.user.pk:  # changer son propre mdp ne déconnecte pas
            update_session_auth_hash(self.request, user)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({"detail": "Vous ne pouvez pas supprimer votre propre compte."},
                            status=status.HTTP_400_BAD_REQUEST)
        if user.is_superuser and not request.user.is_superuser:
            return Response({"detail": "Seul un super-utilisateur peut supprimer ce compte."},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            user.delete()
        except (ProtectedError, RestrictedError):
            return Response(
                {"detail": "Ce compte est lié à des données (commerces, demandes…) et ne peut pas "
                           "être supprimé. Désactivez-le à la place."},
                status=status.HTTP_409_CONFLICT)
        return Response(status=status.HTTP_204_NO_CONTENT)
