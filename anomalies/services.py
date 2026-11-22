"""Règles métier du module Anomalies & alertes."""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .models import Alerte, SignalementAnomalie, TypeAnomalie, Urgence

# Les signalements d'une même zone sont regroupés dans la même alerte
# tant que celle-ci a été créée il y a moins de FENETRE_JOURS jours.
FENETRE_JOURS = 7

_ORDRE = [Urgence.FAIBLE, Urgence.MOYENNE, Urgence.ELEVEE, Urgence.CRITIQUE]


def calculer_urgence(signalements):
    """Niveau d'urgence d'une alerte, selon le nombre de signalements regroupés :
         1 -> FAIBLE | 2 -> MOYENNE | 3-4 -> ELEVEE | 5 et plus -> CRITIQUE
    Un produit périmé étant un risque sanitaire, il impose au moins ELEVEE."""
    signalements = list(signalements)
    n = len(signalements)
    if n >= 5:
        niveau = Urgence.CRITIQUE
    elif n >= 3:
        niveau = Urgence.ELEVEE
    elif n == 2:
        niveau = Urgence.MOYENNE
    else:
        niveau = Urgence.FAIBLE

    if any(s.type_anomalie == TypeAnomalie.PRODUIT_PERIME for s in signalements):
        niveau = max(niveau, Urgence.ELEVEE, key=_ORDRE.index)
    return niveau


def recalculer_alerte(alerte):
    """Remet à jour le message et l'urgence d'une alerte d'après les signalements qu'elle regroupe.
    Une alerte qui n'en regroupe plus aucun n'a plus de raison d'être : elle est supprimée."""
    liste = list(alerte.signalements.all())
    if not liste:
        alerte.delete()
        return None
    zone = alerte.zone
    types = sorted({s.get_type_anomalie_display() for s in liste})
    alerte.niveau_urgence = calculer_urgence(liste)
    alerte.message = (f"{len(liste)} signalement(s) dans la zone {zone.nom} "
                      f"({zone.gouvernorat}) : {', '.join(types)}")[:255]
    alerte.save()
    return alerte


def rattacher_a_alerte(signalement):
    """Regroupe le signalement dans l'alerte récente de sa zone (ou en crée une).
    Sans commerce (donc sans zone), aucune alerte n'est générée."""
    zone = signalement.zone
    if zone is None:
        return None

    depuis = timezone.now() - timedelta(days=FENETRE_JOURS)
    alerte = (Alerte.objects.filter(zone=zone, date_creation__gte=depuis)
              .order_by("-date_creation").first())
    if alerte is None:
        alerte = Alerte.objects.create(zone=zone)

    alerte.signalements.add(signalement)
    return recalculer_alerte(alerte)


def synchroniser_alertes(signalement, ancienne_zone_id):
    """À appeler après la MODIFICATION d'un signalement.
    - zone inchangée : le signalement reste dans ses alertes, qu'on recalcule (le type a pu changer) ;
    - zone changée (ou commerce retiré) : il quitte ses anciennes alertes (recalculées ou supprimées si
      vides) puis est rattaché à celle de sa nouvelle zone."""
    zone = signalement.zone
    nouvelle_zone_id = zone.pk if zone else None
    if nouvelle_zone_id == ancienne_zone_id:
        for alerte in list(signalement.alertes.all()):
            recalculer_alerte(alerte)
        return
    anciennes = list(signalement.alertes.all())
    signalement.alertes.clear()
    for alerte in anciennes:
        recalculer_alerte(alerte)
    rattacher_a_alerte(signalement)


def supprimer_signalement(signalement):
    """Supprime le signalement puis met à jour (ou supprime si vides) les alertes qui le regroupaient."""
    alertes = list(signalement.alertes.all())
    signalement.delete()
    for alerte in alertes:
        recalculer_alerte(alerte)


def signalements_lies(signalement):
    """Anomalies liées : celles regroupées dans la même alerte, ou visant le même commerce."""
    critere = Q(alertes__in=signalement.alertes.all())
    if signalement.commerce_id:
        critere |= Q(commerce_id=signalement.commerce_id)
    return (SignalementAnomalie.objects.filter(critere).exclude(pk=signalement.pk)
            .select_related("commerce__zone", "inspecteur__user")
            .prefetch_related("alertes").distinct())
