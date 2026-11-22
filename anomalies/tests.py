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

    def setUp(self):
        self.client.force_login(self.admin)  # l'API des signalements exige maintenant d'être connecté

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


class ModificationSuppressionTests(AnomaliesTestCase):
    """Modifier / supprimer un signalement garde les alertes cohérentes ; droits par rôle."""

    def creer(self, commerce, type_anomalie=TypeAnomalie.PRIX_ABUSIF):
        return self.poster(commerce, type_anomalie).json()["id"]

    def modifier(self, pk, **data):
        return self.client.patch(f"/api/signalements/{pk}/", data, content_type="application/json")

    def test_modifier_description_garde_les_alertes(self):
        pk = self.creer(self.c1)
        alerte = Alerte.objects.get()
        r = self.modifier(pk, description="Nouvelle description")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SignalementAnomalie.objects.get(pk=pk).description, "Nouvelle description")
        self.assertEqual(list(SignalementAnomalie.objects.get(pk=pk).alertes.all()), [alerte])

    def test_changer_le_type_recalcule_l_urgence(self):
        pk = self.creer(self.c1)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.FAIBLE)
        self.modifier(pk, type_anomalie=TypeAnomalie.PRODUIT_PERIME)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.ELEVEE)   # produit périmé => au moins ELEVEE
        self.modifier(pk, type_anomalie=TypeAnomalie.AUTRE)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.FAIBLE)

    def test_changer_de_commerce_et_de_zone_deplace_le_signalement(self):
        pk = self.creer(self.c1)                              # zone A
        pk2 = self.creer(self.c2)                             # zone A, même alerte -> MOYENNE
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.MOYENNE)
        self.modifier(pk, commerce=self.c3.pk)                # zone B
        zones = {a.zone_id: a for a in Alerte.objects.all()}
        self.assertEqual(set(zones), {self.zone_a.pk, self.zone_b.pk})
        self.assertEqual(zones[self.zone_a.pk].niveau_urgence, Urgence.FAIBLE)  # A n'a plus que pk2
        self.assertEqual(zones[self.zone_a.pk].signalements.get().pk, pk2)
        self.assertEqual(zones[self.zone_b.pk].signalements.get().pk, pk)

    def test_retirer_le_commerce_supprime_l_alerte_devenue_vide(self):
        pk = self.creer(self.c1)
        self.assertEqual(self.modifier(pk, commerce=None).status_code, 200)
        self.assertEqual(Alerte.objects.count(), 0)

    def test_supprimer_met_a_jour_ou_supprime_l_alerte(self):
        a, b = self.creer(self.c1), self.creer(self.c2)       # même alerte, MOYENNE
        self.assertEqual(self.client.delete(f"/api/signalements/{a}/").status_code, 204)
        self.assertEqual(Alerte.objects.get().niveau_urgence, Urgence.FAIBLE)
        self.assertEqual(self.client.delete(f"/api/signalements/{b}/").status_code, 204)
        self.assertEqual(Alerte.objects.count(), 0)
        self.assertEqual(SignalementAnomalie.objects.count(), 0)

    def test_description_vide_refusee_a_la_modification(self):
        pk = self.creer(self.c1)
        self.assertEqual(self.modifier(pk, description="  ").status_code, 400)

    def test_acces_anonyme_refuse(self):
        pk = self.creer(self.c1)
        self.client.logout()
        self.assertEqual(self.client.get("/api/signalements/").status_code, 401)
        self.assertEqual(self.modifier(pk, description="x").status_code, 401)
        self.assertEqual(self.client.delete(f"/api/signalements/{pk}/").status_code, 401)

    def test_droits_par_role(self):
        from comptes.models import Profil, Role
        User = get_user_model()
        pk = self.creer(self.c1)                              # auteur : admin
        insp = User.objects.create_user("insp", password="x")
        Profil.objects.filter(user=insp).update(role=Role.INSPECTEUR)
        autre = User.objects.create_user("autre_insp", password="x")
        Profil.objects.filter(user=autre).update(role=Role.INSPECTEUR)
        marchand = User.objects.create_user("marchand", password="x")

        # un commerçant peut lire mais pas modifier ni supprimer
        self.client.force_login(marchand)
        self.assertEqual(self.client.get("/api/signalements/").status_code, 200)
        self.assertFalse(self.client.get(f"/api/signalements/{pk}/").json()["peut_modifier"])
        self.assertEqual(self.modifier(pk, description="x").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/signalements/{pk}/").status_code, 403)

        # un inspecteur : seulement SES signalements
        self.client.force_login(insp)
        mien = self.creer(self.c2)
        self.assertTrue(self.client.get(f"/api/signalements/{mien}/").json()["peut_modifier"])
        self.assertEqual(self.modifier(mien, description="modifié par son auteur").status_code, 200)
        self.assertEqual(self.modifier(pk, description="x").status_code, 403)       # celui de l'admin
        self.client.force_login(autre)
        self.assertEqual(self.modifier(mien, description="x").status_code, 403)     # celui d'un collègue
        self.assertEqual(self.client.delete(f"/api/signalements/{mien}/").status_code, 403)

        # l'administrateur peut tout
        self.client.force_login(self.admin)
        self.assertEqual(self.client.delete(f"/api/signalements/{mien}/").status_code, 204)

    def test_auteur_est_le_compte_connecte(self):
        from comptes.models import Profil, Role
        insp = get_user_model().objects.create_user("insp2", password="x")
        Profil.objects.filter(user=insp).update(role=Role.INSPECTEUR)
        self.client.force_login(insp)
        pk = self.creer(self.c1)
        self.assertEqual(SignalementAnomalie.objects.get(pk=pk).inspecteur.user, insp)
