"""Sections calculées à partir des tables déjà présentes : commerces et produits."""
from django.db.models import Count, F, Q, Sum

from demandes.models import LigneDemande, Produit, StatutDemande
from .registry import enregistrer


def _f(x):
    return float(x or 0)


@enregistrer("commerces", titre="Commerces", ordre=10,
             description="Réseau de commerces de proximité et leur activité")
def stats_commerces(ctx):
    cs = ctx.commerces
    total = cs.count()
    actifs = cs.filter(demandes__statut__in=[StatutDemande.EN_ATTENTE, StatutDemande.ACCEPTEE]).distinct().count()
    par_gouv = (cs.values("zone__gouvernorat").annotate(n=Count("id", distinct=True)).order_by("-n")[:6])
    return {
        "kpis": [
            {"label": "Commerces", "valeur": total, "detail": "enregistrés"},
            {"label": "Gouvernorats couverts", "valeur": cs.values("zone__gouvernorat").distinct().count(),
             "detail": f"{cs.values('zone').distinct().count()} zone(s)"},
            {"label": "Avec demande en cours", "valeur": actifs, "detail": "en attente ou acceptée"},
            {"label": "Sans aucune demande", "valeur": cs.filter(demandes__isnull=True).count(),
             "detail": "à accompagner"},
        ],
        "graphiques": [
            {"type": "barres", "titre": "Commerces par gouvernorat",
             "items": [{"label": r["zone__gouvernorat"], "value": r["n"]} for r in par_gouv]},
            {"type": "anneau", "titre": "Activité des commerces", "centre": "commerces",
             "items": [{"label": "Demande en cours", "value": actifs},
                       {"label": "Aucune en cours", "value": total - actifs}]},
        ],
    }


@enregistrer("produits", titre="Produits & volumes", ordre=20,
             description="Quantités demandées et accordées par produit")
def stats_produits(ctx):
    lignes = LigneDemande.objects.exclude(demande__statut__in=[StatutDemande.ANNULEE])
    if ctx.perso:
        lignes = lignes.filter(demande__commercant=ctx.user)
    par_produit = list(lignes.values(nom=F("produit__nom")).annotate(
        demande=Sum("quantite_demandee"), accorde=Sum("quantite_accordee")).order_by("-demande")[:6])
    demande = sum(_f(p["demande"]) for p in par_produit)
    total = lignes.aggregate(d=Sum("quantite_demandee"), a=Sum("quantite_accordee"))
    d, a = _f(total["d"]), _f(total["a"])
    return {
        "kpis": [
            {"label": "Produits subventionnés", "valeur": Produit.objects.count(), "detail": "au catalogue"},
            {"label": "Quantité demandée", "valeur": round(d), "detail": "demandes non annulées"},
            {"label": "Quantité accordée", "valeur": round(a), "detail": "validée par les grossistes"},
            {"label": "Taux d'accord", "valeur": round(a / d * 100) if d else 0, "suffixe": " %",
             "detail": "accordé / demandé"},
        ],
        "graphiques": [
            {"type": "barres", "titre": "Quantités demandées par produit",
             "items": [{"label": p["nom"], "value": round(_f(p["demande"]))} for p in par_produit]},
            {"type": "anneau", "titre": "Part de chaque produit", "centre": "unités",
             "items": [{"label": p["nom"], "value": round(_f(p["demande"]))} for p in par_produit if demande]},
        ],
    }
