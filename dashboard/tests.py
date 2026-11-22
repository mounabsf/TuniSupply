from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from anomalies.models import Alerte, SignalementAnomalie
from comptes.models import Profil, Role
from demandes.models import Commerce, DemandeAllocation, StatutDemande, ZoneGeographique

User = get_user_model()


class DashboardTests(TestCase):
    def setUp(self):
        self.zone = ZoneGeographique.objects.create(nom="Ariana", gouvernorat="Ariana")
        self.a = User.objects.create_user("a", password="x")
        self.b = User.objects.create_user("b", password="x")
        self.admin = User.objects.create_user("adm", password="x")
        Profil.objects.filter(user=self.admin).update(role=Role.ADMIN)
        for u in (self.a, self.b):
            c = Commerce.objects.create(commercant=u, nom_boutique=u.username, zone=self.zone)
            DemandeAllocation.objects.create(commercant=u, commerce=c)
            SignalementAnomalie.objects.create(commerce=c, type_anomalie="PRIX_ABUSIF", description="x")
        DemandeAllocation.objects.create(commercant=self.a, commerce=self.a.commerces.first(),
                                         statut=StatutDemande.LIVREE)
        Alerte.objects.create(message="m", niveau_urgence="CRITIQUE", zone=self.zone)

    def get(self, user=None):
        c = APIClient()
        if user:
            c.force_login(user)
        return c.get("/api/dashboard/")

    def test_anonyme_refuse(self):
        self.assertEqual(self.get().status_code, 401)

    def test_commercant_ne_voit_que_ses_donnees(self):
        d = self.get(self.a).json()
        self.assertEqual(d["portee"], "personnelle")
        self.assertEqual(d["kpis"]["demandes"], 2)      # les siennes (pas celles de b)
        self.assertEqual(d["kpis"]["anomalies"], 1)
        self.assertNotIn("comptes", d)

    def test_admin_voit_tout(self):
        d = self.get(self.admin).json()
        self.assertEqual(d["portee"], "globale")
        self.assertEqual(d["kpis"]["demandes"], 3)
        self.assertEqual(d["kpis"]["alertes_urgentes"], 1)
        self.assertEqual(len(d["demandes_par_jour"]), 14)
        self.assertEqual(sum(j["n"] for j in d["demandes_par_jour"]), 3)
        self.assertEqual(d["zones"][0]["zone"], "Ariana")
        self.assertIn("comptes", d)
        self.assertTrue(0 <= d["sante"] <= 100)

    def test_base_vide(self):
        DemandeAllocation.objects.all().delete(); SignalementAnomalie.objects.all().delete(); Alerte.objects.all().delete()
        d = self.get(self.admin).json()
        self.assertEqual(d["sante"], 100)
        self.assertEqual(d["kpis"]["taux_traitement"], 100)


class SectionsTests(DashboardTests):
    def test_sections_integrees(self):
        d = self.get(self.admin).json()
        cles = [s["cle"] for s in d["sections"]]
        self.assertEqual(cles[:2], ["commerces", "produits"])
        com = d["sections"][0]
        self.assertEqual(com["kpis"][0]["valeur"], 2)          # admin : 2 commerces
        self.assertEqual(com["graphiques"][0]["items"][0], {"label": "Ariana", "value": 2})

    def test_sections_limitees_au_commercant(self):
        d = self.get(self.a).json()
        self.assertEqual(d["sections"][0]["kpis"][0]["valeur"], 1)  # seulement son commerce

    def test_un_module_peut_s_enregistrer_et_un_bug_ne_casse_rien(self):
        from dashboard import registry

        @registry.enregistrer("stocks_test", titre="Stocks", ordre=5)
        def ok(ctx):
            return {"kpis": [{"label": "Ruptures", "valeur": 3}]}

        @registry.enregistrer("bug_test", titre="Bug", ordre=6)
        def plante(ctx):
            raise RuntimeError("section défaillante")

        try:
            with self.assertLogs("dashboard.registry", level="ERROR"):
                d = self.get(self.admin).json()
            cles = [s["cle"] for s in d["sections"]]
            self.assertEqual(cles[0], "stocks_test")           # trié par « ordre »
            self.assertNotIn("bug_test", cles)                  # ignorée, le reste fonctionne
            self.assertIn("commerces", cles)
        finally:
            registry._SECTIONS.pop("stocks_test", None); registry._SECTIONS.pop("bug_test", None)
