from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import CentreDistribution, RessourceSubventionnee


class RessourceSubventionneeApiTests(TestCase):
    def setUp(self):
        self.centre = CentreDistribution.objects.create(
            nom="Dépôt de Tunis", adresse="Zone industrielle", capacite_stockage=50000)
        self.client = APIClient()
        self.url = "/api/ressources/lots/"
        self.demain = timezone.localdate() + timedelta(days=90)

    def donnees(self, **extra):
        data = {
            "centre": self.centre.pk,
            "id_lot": "L-001",
            "type_ressource": "Farine",
            "quantite_totale_lot": "100.00",
            "prix_achat_etat": "0.500",
            "date_peremption": str(self.demain),
        }
        data.update(extra)
        return data

    def creer_lot(self, **extra):
        champs = {"centre": self.centre, "id_lot": "L-001", "type_ressource": "Farine",
                  "quantite_totale_lot": 100, "prix_achat_etat": "0.500",
                  "date_peremption": self.demain}
        champs.update(extra)
        return RessourceSubventionnee.objects.create(**champs)

    def test_ajouter_un_lot(self):
        rep = self.client.post(self.url, self.donnees(), format="json")
        self.assertEqual(rep.status_code, 201)
        self.assertEqual(rep.json()["etat"], "CONFORME")
        self.assertEqual(RessourceSubventionnee.objects.count(), 1)

    def test_quantite_doit_etre_positive(self):
        rep = self.client.post(self.url, self.donnees(quantite_totale_lot="0"), format="json")
        self.assertEqual(rep.status_code, 400)
        self.assertIn("quantite_totale_lot", rep.json())

    def test_numero_de_lot_unique(self):
        self.creer_lot()
        rep = self.client.post(self.url, self.donnees(), format="json")
        self.assertEqual(rep.status_code, 400)
        self.assertEqual(rep.json()["id_lot"], ["Ce numéro de lot existe déjà."])

    def test_modifier_quantite_et_prix(self):
        lot = self.creer_lot()
        rep = self.client.put(f"{self.url}{lot.pk}/",
                              self.donnees(quantite_totale_lot="80.00", prix_achat_etat="0.650"),
                              format="json")
        self.assertEqual(rep.status_code, 200)
        lot.refresh_from_db()
        self.assertEqual(float(lot.quantite_totale_lot), 80.0)
        self.assertEqual(float(lot.prix_achat_etat), 0.65)

    def test_supprimer_un_lot(self):
        lot = self.creer_lot()
        rep = self.client.delete(f"{self.url}{lot.pk}/")
        self.assertEqual(rep.status_code, 204)
        self.assertFalse(RessourceSubventionnee.objects.exists())

    def test_etats_et_filtre(self):
        hier = timezone.localdate() - timedelta(days=1)
        self.creer_lot(id_lot="L-OK")
        self.creer_lot(id_lot="L-NC", conforme=False)
        self.creer_lot(id_lot="L-PER", date_peremption=hier)

        perimes = self.client.get(self.url, {"etat": "PERIME"}).json()
        self.assertEqual([l["id_lot"] for l in perimes], ["L-PER"])
        non_conformes = self.client.get(self.url, {"etat": "NON_CONFORME"}).json()
        self.assertEqual([l["id_lot"] for l in non_conformes], ["L-NC"])

    def test_resume(self):
        hier = timezone.localdate() - timedelta(days=1)
        self.creer_lot(id_lot="L-OK")
        self.creer_lot(id_lot="L-PER", date_peremption=hier)
        resume = self.client.get(f"{self.url}resume/").json()
        self.assertEqual(resume["nb_lots"], 2)
        self.assertEqual(resume["nb_conformes"], 1)
        self.assertEqual(resume["nb_perimes"], 1)