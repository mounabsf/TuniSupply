from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from ressources.models import CentreDistribution, RessourceSubventionnee


class Command(BaseCommand):
    help = "Crée quelques centres et lots de démonstration pour le module Ressources."

    def handle(self, *args, **options):
        aujourdhui = timezone.localdate()

        centres = {}
        for nom, adresse, capacite in [
            ("Dépôt de Tunis", "Zone industrielle Charguia, Tunis", 50000),
            ("Dépôt de Sfax", "Route de Gabès, Sfax", 40000),
            ("Dépôt de Sousse", "Zone industrielle Sidi Abdelhamid, Sousse", 30000),
        ]:
            centres[nom], _ = CentreDistribution.objects.get_or_create(
                nom=nom, defaults={"adresse": adresse, "capacite_stockage": capacite})

        lots = [
            ("Dépôt de Tunis", "TUN-F-001", "Farine", 5000, "0.500", 120, False),
            ("Dépôt de Tunis", "TUN-H-001", "Huile végétale", 1200, "2.600", -5, False),
            ("Dépôt de Tunis", "TUN-L-001", "Lait", 900, "1.300", 12, False),
            ("Dépôt de Sfax", "SFX-S-001", "Semoule", 3000, "0.700", 90, False),
            ("Dépôt de Sfax", "SFX-U-001", "Sucre", 800, "1.200", 200, True),
            ("Dépôt de Sousse", "SOU-F-001", "Farine", 2500, "0.500", 60, False),
        ]
        for centre, id_lot, type_ressource, quantite, prix, jours, non_conforme in lots:
            RessourceSubventionnee.objects.get_or_create(
                id_lot=id_lot,
                defaults={
                    "centre": centres[centre],
                    "type_ressource": type_ressource,
                    "quantite_totale_lot": quantite,
                    "prix_achat_etat": prix,
                    "date_peremption": aujourdhui + timedelta(days=jours),
                    "conforme": not non_conforme,
                },
            )
        self.stdout.write(self.style.SUCCESS("Données de démonstration chargées."))