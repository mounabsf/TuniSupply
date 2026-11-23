from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from comptes.models import Role
from demandes.models import Commerce, Produit, ZoneGeographique

from .models import Stock

User = get_user_model()


def client_connecte(user):
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)
    client.get("/api/auth/session/")
    client.credentials(HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value)
    return client


class StocksApiTests(TestCase):
    def setUp(self):
        self.marchand = User.objects.create_user("marchand-stock", password="test-pass-123")
        self.autre_marchand = User.objects.create_user(
            "autre-marchand-stock", password="test-pass-123"
        )
        self.zone = ZoneGeographique.objects.create(nom="Tunis", gouvernorat="Tunis")
        self.commerce = Commerce.objects.create(
            commercant=self.marchand, nom_boutique="Hanout 1", zone=self.zone
        )
        self.autre_commerce = Commerce.objects.create(
            commercant=self.autre_marchand, nom_boutique="Hanout 2", zone=self.zone
        )
        self.produit = Produit.objects.create(
            nom="Huile", prix_unitaire_legal="4.500"
        )
        self.client = client_connecte(self.marchand)

    def stock_data(self, **overrides):
        data = {
            "commerce": self.commerce.pk,
            "produit": self.produit.pk,
            "quantite": 8,
            "seuil_critique": 5,
        }
        data.update(overrides)
        return data

    def test_create_stock_and_mark_critical_threshold(self):
        response = self.client.post(
            "/api/stocks/",
            self.stock_data(quantite=5),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.data["est_critique"])
        self.assertEqual(
            Stock.objects.get(pk=response.data["id"]).quantite,
            5,
        )
        duplicate = self.client.post(
            "/api/stocks/",
            self.stock_data(),
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("déjà enregistré", duplicate.data["non_field_errors"][0])

    def test_get_stocks_filters_by_commerce_and_owner(self):
        owned_stock = Stock.objects.create(
            commerce=self.commerce,
            produit=self.produit,
            quantite=8,
            seuil_critique=5,
        )
        other_product = Produit.objects.create(
            nom="Sucre", prix_unitaire_legal="2.000"
        )
        Stock.objects.create(
            commerce=self.autre_commerce,
            produit=other_product,
            quantite=3,
            seuil_critique=4,
        )

        response = self.client.get(f"/api/stocks/?commerce={self.commerce.pk}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [owned_stock.pk])
        self.assertEqual(
            [item["id"] for item in self.client.get("/api/stocks/").data],
            [owned_stock.pk],
        )
        self.assertEqual(
            self.client.get("/api/stocks/?commerce=invalid").status_code,
            400,
        )

    def test_put_updates_stock_and_missing_stock_returns_404(self):
        stock = Stock.objects.create(
            commerce=self.commerce,
            produit=self.produit,
            quantite=8,
            seuil_critique=5,
        )

        response = self.client.put(
            f"/api/stocks/{stock.pk}/",
            self.stock_data(quantite=3, seuil_critique=4),
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["est_critique"])
        stock.refresh_from_db()
        self.assertEqual(stock.quantite, 3)
        self.assertEqual(stock.seuil_critique, 4)
        self.assertEqual(self.client.put("/api/stocks/99999/", {}).status_code, 404)

    def test_delete_removes_stock_without_deleting_catalogue_product(self):
        stock = Stock.objects.create(
            commerce=self.commerce,
            produit=self.produit,
            quantite=8,
            seuil_critique=5,
        )

        response = self.client.delete(f"/api/stocks/{stock.pk}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Stock.objects.filter(pk=stock.pk).exists())
        self.assertTrue(Produit.objects.filter(pk=self.produit.pk).exists())

    def test_required_and_nonnegative_fields_are_validated(self):
        missing_fields = self.client.post(
            "/api/stocks/",
            {"commerce": self.commerce.pk},
            format="json",
        )
        negative_quantity = self.client.post(
            "/api/stocks/",
            self.stock_data(quantite=-1),
            format="json",
        )
        negative_threshold = self.client.post(
            "/api/stocks/",
            self.stock_data(seuil_critique=-1),
            format="json",
        )

        self.assertEqual(missing_fields.status_code, 400)
        self.assertEqual(negative_quantity.status_code, 400)
        self.assertEqual(negative_threshold.status_code, 400)

    def test_commerce_owner_and_authentication_are_enforced(self):
        other_commerce_response = self.client.post(
            "/api/stocks/",
            self.stock_data(commerce=self.autre_commerce.pk),
            format="json",
        )
        anonymous_response = APIClient().get("/api/stocks/")
        other_stock = Stock.objects.create(
            commerce=self.autre_commerce,
            produit=self.produit,
            quantite=7,
            seuil_critique=2,
        )
        other_stock_url = f"/api/stocks/{other_stock.pk}/"

        self.assertEqual(other_commerce_response.status_code, 403)
        self.assertEqual(anonymous_response.status_code, 401)
        self.assertEqual(self.client.get(other_stock_url).status_code, 404)
        self.assertEqual(
            self.client.put(
                other_stock_url,
                self.stock_data(commerce=self.autre_commerce.pk),
                format="json",
            ).status_code,
            404,
        )
        self.assertEqual(self.client.delete(other_stock_url).status_code, 404)

    def test_inspector_can_read_but_cannot_write_stock(self):
        inspector = User.objects.create_user("inspecteur-stock", password="test-pass-123")
        inspector.profil.role = Role.INSPECTEUR
        inspector.profil.save(update_fields=["role"])
        client = client_connecte(inspector)
        stock = Stock.objects.create(
            commerce=self.commerce,
            produit=self.produit,
            quantite=8,
            seuil_critique=5,
        )
        stock_url = f"/api/stocks/{stock.pk}/"

        self.assertEqual(client.get("/api/stocks/").status_code, 200)
        self.assertEqual(
            client.post("/api/stocks/", self.stock_data(), format="json").status_code,
            403,
        )
        self.assertEqual(
            client.put(stock_url, self.stock_data(), format="json").status_code,
            403,
        )
        self.assertEqual(
            client.patch(stock_url, {"quantite": 2}, format="json").status_code,
            403,
        )
        self.assertEqual(client.delete(stock_url).status_code, 403)
        stock.refresh_from_db()
        self.assertEqual(stock.quantite, 8)

    def test_grossiste_has_no_stock_access(self):
        grossiste = User.objects.create_user("grossiste-stock", password="test-pass-123")
        grossiste.profil.role = Role.GROSSISTE
        grossiste.profil.save(update_fields=["role"])
        client = client_connecte(grossiste)

        self.assertEqual(client.get("/api/stocks/").status_code, 403)
        self.assertEqual(
            client.post("/api/stocks/", self.stock_data(), format="json").status_code,
            403,
        )
