"""Données de démonstration : python manage.py seed_anomalies [--force]"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from anomalies.models import Inspecteur, SignalementAnomalie, TypeAnomalie as T
from anomalies.services import rattacher_a_alerte
from demandes.models import Commerce, Produit, ZoneGeographique

ZONES = [("Bab Souika", "Tunis"), ("La Marsa", "Tunis"), ("Sfax Ville", "Sfax"), ("Sousse Médina", "Sousse")]
PRODUITS = [("Huile végétale", "2.500", "20"), ("Semoule", "0.800", "50"), ("Sucre", "1.200", "30")]
# (nom boutique, zone)
COMMERCES = [("Épicerie El Baraka", "Bab Souika"), ("Alimentation Ben Salah", "Bab Souika"),
             ("Superette La Marsa", "La Marsa"), ("Hanout Chaabane", "Sfax Ville"),
             ("Épicerie Triki", "Sfax Ville"), ("Alimentation Sousse", "Sousse Médina")]
# (commerce, type, description) -> Bab Souika: 3 (élevée) | Sfax: 5 (critique) | La Marsa: 2 | Sousse: 1
SIGNALEMENTS = [
    ("Épicerie El Baraka", T.PRIX_ABUSIF, "Huile vendue 4,200 DT au lieu du prix légal."),
    ("Épicerie El Baraka", T.STOCKAGE_EXCESSIF, "Plus de 200 bidons d'huile entassés dans l'arrière-boutique."),
    ("Alimentation Ben Salah", T.PRODUIT_PERIME, "Paquets de semoule périmés exposés en rayon."),
    ("Hanout Chaabane", T.PRIX_ABUSIF, "Sucre vendu 2,000 DT le kilo."),
    ("Hanout Chaabane", T.STOCKAGE_EXCESSIF, "Stock de sucre très supérieur aux besoins du commerce."),
    ("Hanout Chaabane", T.AUTRE, "Refus de vendre aux clients non habituels."),
    ("Épicerie Triki", T.PRIX_ABUSIF, "Semoule vendue au double du prix légal."),
    ("Épicerie Triki", T.STOCKAGE_EXCESSIF, "Produits subventionnés stockés sans être mis en vente."),
    ("Superette La Marsa", T.PRIX_ABUSIF, "Huile subventionnée revendue plus cher."),
    ("Superette La Marsa", T.AUTRE, "Vente liée : produit subventionné contre achat d'autres articles."),
    ("Alimentation Sousse", T.PRIX_ABUSIF, "Prix du sucre non conforme à l'affichage."),
]


class Command(BaseCommand):
    help = "Crée des zones, produits, commerces, un inspecteur, des signalements et des alertes de démonstration."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true",
                            help="Ajoute les données même s'il existe déjà des signalements.")

    def handle(self, *args, **opts):
        if SignalementAnomalie.objects.exists() and not opts["force"]:
            self.stdout.write("Des signalements existent déjà (utilisez --force pour en ajouter).")
            return

        User = get_user_model()
        commercant, _ = User.objects.get_or_create(username="commercant_demo")
        inspecteur_user, _ = User.objects.get_or_create(
            username="inspecteur_demo", defaults={"first_name": "Sami", "last_name": "Inspecteur"})
        inspecteur, _ = Inspecteur.objects.get_or_create(
            user=inspecteur_user, defaults={"badge_inspecteur": "INSP-DEMO", "zone_intervention": "Grand Tunis"})

        zones = {nom: ZoneGeographique.objects.get_or_create(nom=nom, gouvernorat=gouv)[0]
                 for nom, gouv in ZONES}
        for nom, prix, plafond in PRODUITS:
            Produit.objects.get_or_create(nom=nom, defaults={
                "prix_unitaire_legal": Decimal(prix), "plafond_ministere": Decimal(plafond)})
        commerces = {nom: Commerce.objects.get_or_create(
            nom_boutique=nom, defaults={"commercant": commercant, "zone": zones[zone]})[0]
            for nom, zone in COMMERCES}

        for nom_commerce, type_anomalie, description in SIGNALEMENTS:
            s = SignalementAnomalie.objects.create(
                inspecteur=inspecteur, commerce=commerces[nom_commerce],
                type_anomalie=type_anomalie, description=description)
            rattacher_a_alerte(s)

        self.stdout.write(self.style.SUCCESS(
            f"{len(SIGNALEMENTS)} signalements créés, {inspecteur.signalements.count()} pour l'inspecteur démo."))
