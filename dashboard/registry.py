"""Registre des sections du tableau de bord.

Chaque module (stocks, centres de distribution, logistique…) peut ajouter sa section SANS toucher
au frontend : il crée un fichier  <son_app>/dashboard_stats.py  et y enregistre une fonction.

    from dashboard.registry import enregistrer

    @enregistrer("stocks", titre="Stocks des commerces", ordre=30)
    def stats_stocks(ctx):
        # ctx.user, ctx.role, ctx.perso (True = commerçant : ne montrer que SES données),
        # ctx.commerces (queryset déjà filtré selon le rôle)
        return {
            "kpis": [{"label": "Produits en rupture", "valeur": 12, "detail": "sur 340 références"}],
            "graphiques": [
                {"type": "barres", "titre": "Stock par produit", "items": [{"label": "Huile", "value": 40}]},
                {"type": "anneau", "titre": "État des stocks", "centre": "produits",
                 "items": [{"label": "OK", "value": 30}, {"label": "Bas", "value": 8}]},
                {"type": "courbe", "titre": "Mouvements", "dates": ["2026-11-01", "2026-11-02"],
                 "series": [{"nom": "Entrées", "data": [3, 5]}]},
            ],
        }

IMPORTANT : la clé (« stocks », « ressources », « logistique », « intelligence ») doit être la même que
celle du module dans frontend/src/modules.js ; c'est elle qui remplace l'aperçu en pointillés.

Le dashboard les découvre au démarrage de Django et les affiche dans l'ordre de `ordre`.
Une section qui plante est ignorée (loguée) : elle ne casse jamais le reste de la page.
"""
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)
_SECTIONS = {}


@dataclass
class Contexte:
    user: object
    role: str
    perso: bool       # True pour un commerçant : limiter les chiffres à ses propres données
    commerces: object  # queryset de Commerce déjà filtré selon le rôle


def enregistrer(cle, titre, ordre=100, description=""):
    def decorateur(fonction):
        _SECTIONS[cle] = {"titre": titre, "ordre": ordre, "description": description, "fonction": fonction}
        return fonction
    return decorateur


def collecter(ctx):
    sections = []
    for cle, s in sorted(_SECTIONS.items(), key=lambda kv: kv[1]["ordre"]):
        try:
            contenu = s["fonction"](ctx) or {}
        except Exception:  # une section défaillante ne doit pas casser tout le tableau de bord
            logger.exception("Section « %s » du tableau de bord ignorée", cle)
            continue
        sections.append({"cle": cle, "titre": s["titre"], "description": s["description"],
                         "kpis": contenu.get("kpis", []), "graphiques": contenu.get("graphiques", [])})
    return sections
