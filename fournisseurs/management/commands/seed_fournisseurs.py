from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from fournisseurs.models import Fournisseur, Livraison


class Command(BaseCommand):
    help = "Crée quelques fournisseurs et livraisons de démonstration."

    def handle(self, *args, **options):
        donnees = [
            ("Grossiste Sfax Distribution", "Sfax", "5000", "ACTIF"),
            ("Centrale du Sahel", "Sousse, Monastir", "3200", "SOUS_SURVEILLANCE"),
            ("Tunis Approvisionnement", "Grand Tunis", "8000", "SUSPENDU"),
        ]
        for i, (nom, zone, capacite, statut) in enumerate(donnees):
            f, cree = Fournisseur.objects.get_or_create(
                nom=nom,
                defaults={"zone_couverte": zone, "capacite_livraison": Decimal(capacite), "statut": statut},
            )
            if cree:
                for j in range(5):
                    Livraison.objects.create(
                        fournisseur=f,
                        date_livraison=date.today() - timedelta(days=7 * (j + 1)),
                        quantite_livree=Decimal(200 + 50 * j),
                        conforme=(j + i) % 4 != 0,
                        ponctuel=(j + i) % 3 != 0,
                    )
        self.stdout.write(self.style.SUCCESS("Données de démonstration créées."))
