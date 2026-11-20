from django.contrib.auth import get_user_model
from django.test import TestCase

from demandes.models import Commerce, ZoneGeographique

from .models import Alerte, Inspecteur, SignalementAnomalie, TypeAnomalie, Urgence
from .services import calculer_urgence, signalements_lies


class AnomaliesTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_superuser("admin", password="x")
        cls.zone_a = ZoneGeographique.objects.create(nom="Zone A", gouvernorat="Tunis")
        cls.zone_b = ZoneGeographique.objects.create(nom="Zone B", gouvernorat="Sfax")
        cls.c1 = Commerce.objects.create(commercant=cls.admin, nom_boutique="C1", zone=cls.zone_a)
        cls.c2 = Commerce.objects.create(commercant=cls.admin, nom_boutique="C2", zone=cls.zone_a)
        cls.c3 = Commerce.objects.create(commercant=cls.admin, nom_boutique="C3", zone=cls.zone_b)

    def poster(self, commerce, type_anomalie=TypeAnomalie.PRIX_ABUSIF, description="Test"):
        return self.client.post("/api/signalements/", {
            "commerce": commerce.pk if commerce else None,
            "type_anomalie": type_anomalie, "description": description,
        }, content_type="application/json")

    def test_creation_genere_alerte_et_regroupe_par_zone(self):
        r1 = self.poster(self.c1)
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(Alerte.objects.count(), 1)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.FAIBLE)

        self.poster(self.c2)                       # même zone -> même alerte
        self.assertEqual(Alerte.objects.count(), 1)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.MOYENNE)

        self.poster(self.c3)                       # autre zone -> nouvelle alerte
        self.assertEqual(Alerte.objects.count(), 2)

    def test_escalade_jusqu_a_critique(self):
        for _ in range(5):
            self.poster(self.c1)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.CRITIQUE)

    def test_produit_perime_force_au_moins_elevee(self):
        self.poster(self.c1, TypeAnomalie.PRODUIT_PERIME)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.ELEVEE)

    def test_signalement_sans_commerce_ne_cree_pas_d_alerte(self):
        r = self.poster(None, TypeAnomalie.AUTRE)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Alerte.objects.count(), 0)

    def test_description_obligatoire(self):
        self.assertEqual(self.poster(self.c1, description="   ").status_code, 400)

    def test_alertes_triees_par_urgence(self):
        self.poster(self.c3)                                          # FAIBLE (zone B)
        self.poster(self.c1, TypeAnomalie.PRODUIT_PERIME)             # ELEVEE (zone A)
        data = self.client.get("/api/alertes/").json()
        self.assertEqual([a["niveau_urgence"] for a in data], ["ELEVEE", "FAIBLE"])
        self.assertEqual(self.client.get("/api/alertes/?urgence=FAIBLE").json()[0]["zone_nom"], "Zone B")
        self.assertEqual(self.client.get("/api/alertes/resume/").json(),
                         {"FAIBLE": 1, "MOYENNE": 0, "ELEVEE": 1, "CRITIQUE": 0})

    def test_anomalies_liees(self):
        self.poster(self.c1)
        self.poster(self.c2)    # même alerte que le 1er
        self.poster(self.c3)    # autre zone, sans lien
        premier = SignalementAnomalie.objects.order_by("pk").first()
        self.assertEqual(signalements_lies(premier).count(), 1)
        data = self.client.get(f"/api/signalements/{premier.pk}/liees/").json()
        self.assertEqual(len(data), 1)

    def test_liste_filtrable_par_type(self):
        self.poster(self.c1, TypeAnomalie.PRIX_ABUSIF)
        self.poster(self.c1, TypeAnomalie.AUTRE)
        data = self.client.get("/api/signalements/?type=AUTRE").json()
        self.assertEqual(len(data), 1)

    def test_calculer_urgence_seuils(self):
        mk = lambda n: [SignalementAnomalie(type_anomalie=TypeAnomalie.AUTRE) for _ in range(n)]
        self.assertEqual([calculer_urgence(mk(n)) for n in (1, 2, 3, 4, 5, 9)],
                         ["FAIBLE", "MOYENNE", "ELEVEE", "ELEVEE", "CRITIQUE", "CRITIQUE"])

    def test_badge_deja_pris_ne_bloque_pas_la_creation(self):
        """Régression : le badge auto de l'inspecteur par défaut ne doit jamais entrer en collision."""
        autre = get_user_model().objects.create_user("autre")
        Inspecteur.objects.create(user=autre, badge_inspecteur=f"INSP-{self.admin.pk:04d}")
        self.assertEqual(self.poster(self.c1).status_code, 201)
        self.assertEqual(Inspecteur.objects.filter(user=self.admin).count(), 1)
