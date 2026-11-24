from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Fournisseur, Livraison

URL = "/api/fournisseurs/"


def creer_fournisseur(**kwargs):
    data = {"nom": "Grossiste Sfax", "zone_couverte": "Sfax", "capacite_livraison": "5000"}
    data.update(kwargs)
    return Fournisseur.objects.create(**data)


class EnregistrementTests(APITestCase):  # 7.1.4
    def test_creation_valide(self):
        r = self.client.post(URL, {"nom": "Centrale Sahel", "zone_couverte": "Sousse", "capacite_livraison": "3200"})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["statut"], "ACTIF")
        self.assertEqual(Fournisseur.objects.count(), 1)

    def test_champs_obligatoires(self):
        r = self.client.post(URL, {"nom": "", "zone_couverte": "", "capacite_livraison": "0"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(r.data), {"nom", "zone_couverte", "capacite_livraison"})

    def test_statut_ignore_a_la_creation(self):
        r = self.client.post(URL, {"nom": "X", "zone_couverte": "Y", "capacite_livraison": "10", "statut": "SUSPENDU"})
        self.assertEqual(r.data["statut"], "ACTIF")


class HistoriqueTests(APITestCase):  # 7.2.3
    def test_historique_du_fournisseur_trie_par_date(self):
        f, autre = creer_fournisseur(), creer_fournisseur(nom="Autre")
        Livraison.objects.create(fournisseur=f, date_livraison=date(2026, 1, 5), quantite_livree=100)
        Livraison.objects.create(fournisseur=f, date_livraison=date(2026, 3, 5), quantite_livree=200, ponctuel=False)
        Livraison.objects.create(fournisseur=autre, date_livraison=date(2026, 2, 5), quantite_livree=999)
        r = self.client.get(f"{URL}{f.id}/livraisons/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["quantite_livree"] for x in r.data], ["200.00", "100.00"])

    def test_score_fiabilite(self):
        f = creer_fournisseur()
        Livraison.objects.create(fournisseur=f, date_livraison=date(2026, 1, 1), quantite_livree=1)
        Livraison.objects.create(fournisseur=f, date_livraison=date(2026, 1, 2), quantite_livree=1, conforme=False)
        self.assertEqual(self.client.get(f"{URL}{f.id}/").data["score_fiabilite"], 50)
        self.assertIsNone(self.client.get(f"{URL}{creer_fournisseur(nom='Vide').id}/").data["score_fiabilite"])


class StatutTests(APITestCase):  # 7.3.3
    def test_changement_de_statut(self):
        f = creer_fournisseur()
        for statut in ("SUSPENDU", "SOUS_SURVEILLANCE", "ACTIF"):
            r = self.client.put(f"{URL}{f.id}/statut/", {"statut": statut})
            self.assertEqual(r.status_code, 200)
            f.refresh_from_db()
            self.assertEqual(f.statut, statut)

    def test_statut_invalide(self):
        f = creer_fournisseur()
        self.assertEqual(self.client.put(f"{URL}{f.id}/statut/", {"statut": "INACTIF"}).status_code, 400)
        self.assertEqual(self.client.put(f"{URL}{f.id}/statut/", {"statut": "nimporte"}).status_code, 400)

    def test_statut_refuse_si_archive(self):
        f = creer_fournisseur(est_archive=True)
        self.assertEqual(self.client.put(f"{URL}{f.id}/statut/", {"statut": "ACTIF"}).status_code, 400)


class ArchivageTests(APITestCase):  # 7.4.3
    def test_archivage_conserve_l_historique(self):
        f = creer_fournisseur()
        Livraison.objects.create(fournisseur=f, date_livraison=date(2026, 1, 5), quantite_livree=100)
        r = self.client.post(f"{URL}{f.id}/archiver/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["est_archive"])
        self.assertEqual(r.data["statut"], "INACTIF")
        self.assertEqual(Livraison.objects.filter(fournisseur=f).count(), 1)
        self.assertEqual(len(self.client.get(f"{URL}{f.id}/livraisons/").data), 1)

    def test_liste_exclut_les_archives_par_defaut(self):
        creer_fournisseur()
        creer_fournisseur(nom="Ancien", est_archive=True)
        self.assertEqual(len(self.client.get(URL).data), 1)
        self.assertEqual(len(self.client.get(URL + "?archives=true").data), 2)

    def test_double_archivage_refuse(self):
        f = creer_fournisseur()
        self.client.post(f"{URL}{f.id}/archiver/")
        self.assertEqual(self.client.post(f"{URL}{f.id}/archiver/").status_code, 400)

    def test_suppression_impossible(self):
        f = creer_fournisseur()
        self.assertEqual(self.client.delete(f"{URL}{f.id}/").status_code, 405)
