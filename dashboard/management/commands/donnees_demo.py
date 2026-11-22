"""python manage.py donnees_demo  [--reset]
Crée des données fictives (zones, commerces, demandes, anomalies, alertes) pour alimenter le tableau de bord.
Tous les comptes créés commencent par « demo_ » (mot de passe : Demo-12345!).
--reset : supprime puis recrée   |   --supprimer : supprime les données de démo et s'arrête."""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from anomalies.models import Alerte, SignalementAnomalie
from comptes.models import Role
from comptes.services import appliquer_role
from demandes.models import (Commerce, DemandeAllocation, LigneDemande, Produit, StatutDemande,
                             ZoneGeographique)

User = get_user_model()
ZONES = [("Ariana Ville", "Ariana"), ("La Marsa", "Tunis"), ("Bab Souika", "Tunis"), ("Sfax Nord", "Sfax"),
         ("Sousse Médina", "Sousse"), ("Kairouan Centre", "Kairouan"), ("Bizerte Port", "Bizerte"),
         ("Nabeul Ville", "Nabeul"), ("Gabès Sud", "Gabès"), ("Médenine", "Médenine")]
ALERTES = [("Prix anormalement élevés sur l'huile", "CRITIQUE", 0), ("Stockage suspect détecté", "ELEVEE", 3),
           ("Produits périmés signalés", "MOYENNE", 4), ("Rupture ponctuelle de semoule", "FAIBLE", 6)]
PRODUITS = [("Huile végétale", "3.000"), ("Farine", "0.800"), ("Semoule", "1.000"), ("Sucre", "1.200"), ("Lait", "1.400")]


class Command(BaseCommand):
    help = "Génère des données de démonstration pour le tableau de bord."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="supprime les données demo_ avant de recréer")
        parser.add_argument("--supprimer", action="store_true", help="supprime les données demo_ puis s'arrête")

    def handle(self, *args, **opts):
        if opts["reset"] or opts["supprimer"]:
            # ordre imposé par les clés PROTECT : demandes et signalements d'abord, puis comptes (-> commerces)
            DemandeAllocation.objects.filter(commercant__username__startswith="demo_").delete()
            SignalementAnomalie.objects.filter(commerce__commercant__username__startswith="demo_").delete()
            Alerte.objects.filter(message__in=[m for m, *_ in ALERTES]).delete()
            User.objects.filter(username__startswith="demo_").delete()
            if opts["supprimer"]:
                self.stdout.write(self.style.SUCCESS("Données de démonstration supprimées."))
                return
        rnd = random.Random(42)
        maintenant = timezone.now()

        zones = [ZoneGeographique.objects.get_or_create(nom=n, gouvernorat=g)[0] for n, g in ZONES]
        produits = [Produit.objects.get_or_create(nom=n, defaults={"prix_unitaire_legal": p})[0] for n, p in PRODUITS]

        def compte(nom, role):
            u, cree = User.objects.get_or_create(username=nom, defaults={"first_name": nom[5:].capitalize()})
            if cree:
                u.set_password("Demo-12345!"); u.save()
                appliquer_role(u, role)
            return u

        grossiste = compte("demo_grossiste", Role.GROSSISTE)
        commerces = []
        for i in range(8):
            u = compte(f"demo_commercant{i + 1}", Role.COMMERCANT)
            commerces.append(Commerce.objects.get_or_create(
                commercant=u, nom_boutique=f"Épicerie {i + 1}", defaults={"zone": zones[i % len(zones)]})[0])

        statuts = [StatutDemande.EN_ATTENTE] * 4 + [StatutDemande.ACCEPTEE] * 3 + [StatutDemande.LIVREE] * 5 \
            + [StatutDemande.REFUSEE] + [StatutDemande.ANNULEE]
        for _ in range(60):
            c = rnd.choice(commerces)
            statut = rnd.choice(statuts)
            d = DemandeAllocation.objects.create(
                commercant=c.commercant, commerce=c, statut=statut, score_legitime=rnd.randint(40, 100),
                grossiste=None if statut == StatutDemande.EN_ATTENTE else grossiste)
            DemandeAllocation.objects.filter(pk=d.pk).update(  # date étalée sur 14 jours
                date_demande=maintenant - timedelta(days=rnd.randint(0, 13), hours=rnd.randint(0, 20)))
            demandee = rnd.randint(10, 90)
            accordee = round(demandee * rnd.choice([0.6, 0.8, 1]))
            LigneDemande.objects.create(
                demande=d, produit=rnd.choice(produits), quantite_demandee=demandee,
                quantite_accordee=accordee if statut in (StatutDemande.ACCEPTEE, StatutDemande.LIVREE) else 0)

        types = ["PRIX_ABUSIF"] * 4 + ["STOCKAGE_EXCESSIF"] * 3 + ["PRODUIT_PERIME"] * 2 + ["AUTRE"]
        for _ in range(25):
            s = SignalementAnomalie.objects.create(commerce=rnd.choice(commerces), type_anomalie=rnd.choice(types),
                                                   description="Signalement de démonstration.")
            SignalementAnomalie.objects.filter(pk=s.pk).update(
                date_signalement=maintenant - timedelta(days=rnd.randint(0, 13), hours=rnd.randint(0, 20)))

        for msg, niveau, i in ALERTES:
            Alerte.objects.get_or_create(message=msg, niveau_urgence=niveau, zone=zones[i])
        self.stdout.write(self.style.SUCCESS("Données de démonstration créées (60 demandes, 25 anomalies, 4 alertes)."))
