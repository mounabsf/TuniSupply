from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from anomalies.models import Inspecteur
from demandes.models import Commerce, DemandeAllocation, ZoneGeographique

from .models import Profil, Role, role_de

User = get_user_model()
PWD = "Tr0ub4dor-Sup3r!"


def client_connecte(user):
    c = APIClient(enforce_csrf_checks=True)
    c.force_login(user)
    # le vrai navigateur reçoit ce cookie via GET /api/auth/session/
    c.get("/api/auth/session/")
    c.credentials(HTTP_X_CSRFTOKEN=c.cookies["csrftoken"].value)
    return c


class BaseCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin1", "a@x.tn", PWD)
        Profil.objects.filter(user=self.admin).update(role=Role.ADMIN)
        self.admin.is_staff = True
        self.admin.save()
        self.marchand = User.objects.create_user("marchand", "m@x.tn", PWD)


class ProfilTests(BaseCase):
    def test_profil_cree_automatiquement(self):
        self.assertEqual(self.marchand.profil.role, Role.COMMERCANT)
        su = User.objects.create_superuser("root", "r@x.tn", PWD)
        self.assertEqual(role_de(su), Role.ADMIN)


class ConnexionTests(BaseCase):
    def test_session_anonyme_et_cookie_csrf(self):
        r = APIClient().get("/api/auth/session/")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["user"])
        self.assertIn("csrftoken", r.cookies)

    def test_login_logout(self):
        c = APIClient()
        r = c.post("/api/auth/login/", {"username": "marchand", "password": PWD}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["role"], "COMMERCANT")
        self.assertNotIn("password", r.json())
        self.assertEqual(c.get("/api/auth/session/").json()["user"]["username"], "marchand")
        c.credentials(HTTP_X_CSRFTOKEN=c.cookies["csrftoken"].value)
        self.assertEqual(c.post("/api/auth/logout/").status_code, 204)
        self.assertIsNone(c.get("/api/auth/session/").json()["user"])

    def test_login_par_email(self):
        r = APIClient().post("/api/auth/login/", {"username": "M@X.tn", "password": PWD}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_mauvais_mot_de_passe_et_compte_inactif(self):
        c = APIClient()
        r = c.post("/api/auth/login/", {"username": "marchand", "password": "faux"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.marchand.is_active = False
        self.marchand.save()
        r2 = c.post("/api/auth/login/", {"username": "marchand", "password": PWD}, format="json")
        self.assertEqual(r2.status_code, 400)
        self.assertEqual(r.json(), r2.json())  # ne révèle rien sur l'état du compte


class InscriptionTests(BaseCase):
    def data(self, **kw):
        d = {"username": "nouveau", "email": "n@x.tn", "role": "GROSSISTE", "password": PWD,
             "password_confirm": PWD, "first_name": "Nour", "telephone": "20123456"}
        d.update(kw)
        return d

    def test_inscription_ok_et_connecte(self):
        c = APIClient()
        r = c.post("/api/auth/register/", self.data(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["role"], "GROSSISTE")
        self.assertEqual(c.get("/api/auth/session/").json()["user"]["username"], "nouveau")

    def test_impossible_de_se_faire_admin_ou_inspecteur(self):
        for role in ("ADMIN", "INSPECTEUR"):
            r = APIClient().post("/api/auth/register/", self.data(role=role), format="json")
            self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(username="nouveau").exists())

    def test_doublons_et_mot_de_passe_faible(self):
        c = APIClient()
        self.assertEqual(c.post("/api/auth/register/", self.data(username="MARCHAND"), format="json").status_code, 400)
        self.assertEqual(c.post("/api/auth/register/", self.data(email="M@x.tn"), format="json").status_code, 400)
        self.assertEqual(c.post("/api/auth/register/", self.data(password="123", password_confirm="123"), format="json").status_code, 400)
        self.assertEqual(c.post("/api/auth/register/", self.data(password_confirm="autre"), format="json").status_code, 400)


class EspacePersonnelTests(BaseCase):
    def test_modifier_son_profil(self):
        c = client_connecte(self.marchand)
        r = c.patch("/api/auth/me/", {"first_name": "Salah", "telephone": "99", "role": "ADMIN"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.marchand.refresh_from_db()
        self.assertEqual(self.marchand.first_name, "Salah")
        self.assertEqual(self.marchand.profil.telephone, "99")
        self.assertEqual(self.marchand.profil.role, Role.COMMERCANT)  # le rôle n'est pas modifiable ici

    def test_changer_mot_de_passe_reste_connecte(self):
        c = client_connecte(self.marchand)
        r = c.post("/api/auth/password/", {"old_password": PWD, "new_password": "Autre-Mdp-9876!",
                                           "new_password_confirm": "Autre-Mdp-9876!"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(c.get("/api/auth/me/").status_code, 200)
        self.marchand.refresh_from_db()
        self.assertTrue(self.marchand.check_password("Autre-Mdp-9876!"))

    def test_ancien_mot_de_passe_faux(self):
        c = client_connecte(self.marchand)
        r = c.post("/api/auth/password/", {"old_password": "x", "new_password": "Autre-Mdp-9876!",
                                           "new_password_confirm": "Autre-Mdp-9876!"}, format="json")
        self.assertEqual(r.status_code, 400)


class AdministrationComptesTests(BaseCase):
    def test_acces_refuse(self):
        self.assertEqual(APIClient().get("/api/comptes/").status_code, 401)           # anonyme
        self.assertEqual(client_connecte(self.marchand).get("/api/comptes/").status_code, 403)  # non admin

    def test_csrf_exige(self):
        c = APIClient(enforce_csrf_checks=True)
        c.force_login(self.admin)
        r = c.post("/api/comptes/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_ajout(self):
        c = client_connecte(self.admin)
        r = c.post("/api/comptes/", {"username": "insp1", "email": "i@x.tn", "role": "INSPECTEUR",
                                     "password": PWD, "first_name": "Ines"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        u = User.objects.get(username="insp1")
        self.assertTrue(u.check_password(PWD))
        self.assertNotEqual(u.password, PWD)  # haché
        self.assertEqual(u.profil.role, Role.INSPECTEUR)
        self.assertTrue(Inspecteur.objects.filter(user=u).exists())  # fiche Inspecteur créée
        self.assertNotIn("password", r.json())

    def test_ajout_admin_donne_is_staff(self):
        c = client_connecte(self.admin)
        c.post("/api/comptes/", {"username": "adm2", "role": "ADMIN", "password": PWD}, format="json")
        self.assertTrue(User.objects.get(username="adm2").is_staff)

    def test_ajout_sans_mot_de_passe_ou_doublon(self):
        c = client_connecte(self.admin)
        self.assertEqual(c.post("/api/comptes/", {"username": "z", "role": "GROSSISTE"}, format="json").status_code, 400)
        self.assertEqual(c.post("/api/comptes/", {"username": "Marchand", "role": "GROSSISTE", "password": PWD}, format="json").status_code, 400)

    def test_modification_role_mdp_et_desactivation(self):
        c = client_connecte(self.admin)
        r = c.patch(f"/api/comptes/{self.marchand.pk}/",
                    {"role": "GROSSISTE", "last_name": "Ben Ali", "password": "Nouveau-Mdp-5555!"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.marchand.refresh_from_db()
        self.assertEqual(self.marchand.profil.role, Role.GROSSISTE)
        self.assertTrue(self.marchand.check_password("Nouveau-Mdp-5555!"))
        r = c.patch(f"/api/comptes/{self.marchand.pk}/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.marchand.pk).is_active)
        self.assertTrue(self.marchand.check_password("Nouveau-Mdp-5555!"))  # mdp conservé si champ vide

    def test_edition_sans_changer_le_mot_de_passe(self):
        c = client_connecte(self.admin)
        c.put(f"/api/comptes/{self.marchand.pk}/",
              {"username": "marchand", "email": "m@x.tn", "role": "COMMERCANT", "password": ""}, format="json")
        self.marchand.refresh_from_db()
        self.assertTrue(self.marchand.check_password(PWD))

    def test_garde_fous_sur_soi_meme(self):
        c = client_connecte(self.admin)
        url = f"/api/comptes/{self.admin.pk}/"
        self.assertEqual(c.patch(url, {"is_active": False}, format="json").status_code, 400)
        self.assertEqual(c.patch(url, {"role": "GROSSISTE"}, format="json").status_code, 400)
        self.assertEqual(c.delete(url).status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.admin.pk, is_active=True).exists())

    def test_modifier_son_propre_mdp_via_admin_reste_connecte(self):
        c = client_connecte(self.admin)
        r = c.patch(f"/api/comptes/{self.admin.pk}/", {"password": "Encore-Un-Mdp-4242!"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(c.get("/api/comptes/").status_code, 200)

    def test_un_admin_ne_touche_pas_au_superuser(self):
        su = User.objects.create_superuser("root", "r@x.tn", PWD)
        c = client_connecte(self.admin)
        self.assertEqual(c.patch(f"/api/comptes/{su.pk}/", {"first_name": "x"}, format="json").status_code, 400)
        self.assertEqual(c.delete(f"/api/comptes/{su.pk}/").status_code, 403)

    def test_suppression(self):
        c = client_connecte(self.admin)
        self.assertEqual(c.delete(f"/api/comptes/{self.marchand.pk}/").status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.marchand.pk).exists())
        self.assertFalse(Profil.objects.filter(user_id=self.marchand.pk).exists())

    def test_suppression_bloquee_si_donnees_liees(self):
        zone = ZoneGeographique.objects.create(nom="Tunis", gouvernorat="Tunis")
        com = Commerce.objects.create(commercant=self.marchand, nom_boutique="Hanout", zone=zone)
        DemandeAllocation.objects.create(commercant=self.marchand, commerce=com)
        c = client_connecte(self.admin)
        r = c.delete(f"/api/comptes/{self.marchand.pk}/")
        self.assertEqual(r.status_code, 409)
        self.assertTrue(User.objects.filter(pk=self.marchand.pk).exists())

    def test_filtres(self):
        c = client_connecte(self.admin)
        self.assertEqual(len(c.get("/api/comptes/").json()), 2)
        self.assertEqual([u["username"] for u in c.get("/api/comptes/?role=COMMERCANT").json()], ["marchand"])
        self.assertEqual([u["username"] for u in c.get("/api/comptes/?q=m@x").json()], ["marchand"])
        self.assertEqual([u["username"] for u in c.get("/api/comptes/?role=ADMIN").json()], ["admin1"])
