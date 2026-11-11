from decimal import Decimal


def calculer_score(demande):
    """Score 0-100 : compare chaque quantité au plafond officiel du ministère.
    <= plafond  -> 100
    au-dessus   -> baisse proportionnelle au dépassement (0 si le double ou plus)."""
    lignes = demande.lignes.select_related("produit")
    if not lignes:
        return Decimal("0")
    total = Decimal("0")
    for l in lignes:
        ratio = l.quantite_demandee / l.produit.plafond_ministere
        score = Decimal("100") if ratio <= 1 else max(Decimal("0"), 100 - (ratio - 1) * 100)
        total += score
    return round(total / len(lignes), 2)