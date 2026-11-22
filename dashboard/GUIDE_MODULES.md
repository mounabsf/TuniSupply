# Brancher un module sur le tableau de bord (5 minutes, aucun React)

Le tableau de bord réserve déjà une place à chaque module. Tant que le module n'a rien branché,
un aperçu en pointillés s'affiche. **Dès que ce fichier existe et renvoie des chiffres, la vraie
section remplace l'aperçu automatiquement** (redémarrer Django une fois).

1. Créer `<ton_app>/dashboard_stats.py`
2. Utiliser la clé de ton module :

| Module | clé à utiliser |
|---|---|
| Stocks des commerces | `stocks` |
| Centres de distribution | `ressources` |
| Opérations logistiques | `logistique` |
| Carte & Intelligence IA | `intelligence` |

3. Copier / adapter (exemple Stocks) :

```python
from dashboard.registry import enregistrer

@enregistrer("stocks", titre="Stocks des commerces", ordre=30)
def stats_stocks(ctx):
    # ctx.perso == True : c'est un commerçant -> ne compter QUE ses données (ctx.commerces est déjà filtré)
    return {
        "kpis": [
            {"label": "Produits en rupture", "valeur": 12, "detail": "sur 340 références"},
            {"label": "Couverture", "valeur": 9, "suffixe": " j"},
        ],
        "graphiques": [
            {"type": "barres", "titre": "Stock par produit",
             "items": [{"label": "Huile", "value": 40}, {"label": "Farine", "value": 25}]},
            {"type": "anneau", "titre": "État des stocks", "centre": "produits",
             "items": [{"label": "OK", "value": 30}, {"label": "Bas", "value": 8}]},
            {"type": "courbe", "titre": "Mouvements sur 14 jours",
             "dates": ["2026-11-01", "2026-11-02"], "series": [{"nom": "Entrées", "data": [3, 5]}]},
        ],
    }
```
Types de graphiques : `barres`, `anneau`, `courbe`. Les chiffres doivent venir des vrais modèles
(`Model.objects.filter(...).count()`, `.aggregate(...)`), pas de valeurs écrites en dur.
Une erreur dans ta fonction est ignorée et loguée : elle ne casse jamais la page des autres.
Indicateurs prévus (modifiables) : voir `frontend/src/dashboardPrevu.js`.
