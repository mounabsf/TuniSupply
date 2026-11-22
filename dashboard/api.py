"""Statistiques du tableau de bord (page d'accueil)."""
from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from anomalies.models import Alerte, SignalementAnomalie, TypeAnomalie, Urgence
from comptes.authentication import SessionAuthentication401
from comptes.models import Role, role_de
from demandes.models import Commerce, DemandeAllocation, StatutDemande

from .registry import Contexte, collecter

User = get_user_model()
JOURS = 14


def _serie(qs, champ_date, debut):
    """Nombre d'éléments par jour sur JOURS jours (jours vides = 0)."""
    lignes = (qs.filter(**{f"{champ_date}__date__gte": debut})
              .annotate(j=TruncDate(champ_date)).values("j").annotate(n=Count("id")))
    par_jour = {r["j"]: r["n"] for r in lignes}
    return [{"date": (debut + timedelta(days=i)).isoformat(),
             "n": par_jour.get(debut + timedelta(days=i), 0)} for i in range(JOURS)]


def _repartition(qs, champ, choix):
    comptes = {r[champ]: r["n"] for r in qs.values(champ).annotate(n=Count("id"))}
    return [{"code": code, "label": str(label), "n": comptes.get(code, 0)} for code, label in choix]


def _sante(total_demandes, en_attente, critiques, elevees):
    """Indice indicatif 0-100 : 60 % réactivité sur les demandes, 40 % absence d'alertes graves (7 j)."""
    reactivite = 100 if total_demandes == 0 else (total_demandes - en_attente) / total_demandes * 100
    calme = max(0, 100 - 20 * critiques - 8 * elevees)
    return round(0.6 * reactivite + 0.4 * calme)


class TableauBordView(APIView):
    authentication_classes = [SessionAuthentication401]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user, role = request.user, role_de(request.user)
        perso = role == Role.COMMERCANT      # un commerçant ne voit que ce qui le concerne

        demandes = DemandeAllocation.objects.all()
        signalements = SignalementAnomalie.objects.all()
        alertes = Alerte.objects.select_related("zone")
        commerces = Commerce.objects.all()
        if perso:
            commerces = commerces.filter(commercant=user)
            demandes = demandes.filter(commercant=user)
            signalements = signalements.filter(commerce__commercant=user)
            alertes = alertes.filter(zone__in=commerces.values("zone"))

        maintenant = timezone.now()
        debut = timezone.localdate() - timedelta(days=JOURS - 1)
        il_y_a_7j = maintenant - timedelta(days=7)

        total = demandes.count()
        en_attente = demandes.filter(statut=StatutDemande.EN_ATTENTE).count()
        critiques = alertes.filter(date_creation__gte=il_y_a_7j, niveau_urgence=Urgence.CRITIQUE).count()
        elevees = alertes.filter(date_creation__gte=il_y_a_7j, niveau_urgence=Urgence.ELEVEE).count()

        zones = defaultdict(lambda: {"demandes": 0, "anomalies": 0})
        for r in demandes.values("commerce__zone__nom", "commerce__zone__gouvernorat").annotate(n=Count("id")):
            zones[(r["commerce__zone__nom"], r["commerce__zone__gouvernorat"])]["demandes"] = r["n"]
        for r in (signalements.exclude(commerce=None)
                  .values("commerce__zone__nom", "commerce__zone__gouvernorat").annotate(n=Count("id"))):
            zones[(r["commerce__zone__nom"], r["commerce__zone__gouvernorat"])]["anomalies"] = r["n"]
        zones = sorted(({"zone": k[0], "gouvernorat": k[1], **v} for k, v in zones.items()),
                       key=lambda z: -(z["demandes"] + z["anomalies"]))[:12]

        data = {
            "portee": "personnelle" if perso else "globale",
            "sante": _sante(total, en_attente, critiques, elevees),
            "kpis": {
                "demandes": total,
                "en_attente": en_attente,
                "taux_traitement": 100 if total == 0 else round((total - en_attente) / total * 100),
                "anomalies": signalements.count(),
                "anomalies_7j": signalements.filter(date_signalement__gte=il_y_a_7j).count(),
                "alertes_urgentes": critiques + elevees,
                "commerces": commerces.count(),
            },
            "demandes_par_jour": _serie(demandes, "date_demande", debut),
            "anomalies_par_jour": _serie(signalements, "date_signalement", debut),
            "demandes_par_statut": _repartition(demandes, "statut", StatutDemande.choices),
            "anomalies_par_type": _repartition(signalements, "type_anomalie", TypeAnomalie.choices),
            "zones": zones,
            "sections": collecter(Contexte(user=user, role=role, perso=perso, commerces=commerces)),
            "alertes_recentes": [
                {"id": a.id, "message": a.message, "niveau": a.niveau_urgence,
                 "zone": a.zone.nom, "date": a.date_creation.isoformat()}
                for a in alertes.order_by("-date_creation")[:5]],
        }
        if role == Role.ADMIN:
            data["comptes"] = {
                "actifs": User.objects.filter(is_active=True).count(),
                "par_role": _repartition(User.objects.filter(is_active=True), "profil__role", Role.choices),
            }
        return Response(data)
