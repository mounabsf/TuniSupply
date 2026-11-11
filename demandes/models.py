from django.conf import settings
from django.db import models


# ---------- MODÈLES TEMPORAIRES (à remplacer par ceux des camarades) ----------
class ZoneGeographique(models.Model):
    nom = models.CharField(max_length=100)
    gouvernorat = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nom} ({self.gouvernorat})"


class Produit(models.Model):
    nom = models.CharField(max_length=100)
    prix_unitaire_legal = models.DecimalField(max_digits=10, decimal_places=3)
    # plafond officiel du ministère par demande (sert au calcul du score)
    plafond_ministere = models.DecimalField(max_digits=10, decimal_places=2, default=100)

    def __str__(self):
        return self.nom


class Commerce(models.Model):
    commercant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name="commerces")
    nom_boutique = models.CharField(max_length=150)
    matricule_fiscale = models.CharField(max_length=50, blank=True)
    adresse = models.CharField(max_length=255, blank=True)
    zone = models.ForeignKey(ZoneGeographique, on_delete=models.PROTECT)

    def __str__(self):
        return self.nom_boutique


# ---------- TES MODÈLES ----------
class StatutDemande(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    ACCEPTEE = "ACCEPTEE", "Acceptée"
    REFUSEE = "REFUSEE", "Refusée"
    LIVREE = "LIVREE", "Livrée"
    ANNULEE = "ANNULEE", "Annulée"


class DemandeAllocation(models.Model):
    commercant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name="demandes")                      # « emet »
    commerce = models.ForeignKey(Commerce, on_delete=models.PROTECT,
                                 related_name="demandes")
    grossiste = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, blank=True, related_name="demandes_traitees")  # « traite »
    date_demande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=StatutDemande.choices,
                              default=StatutDemande.EN_ATTENTE)
    score_legitime = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ["-date_demande"]

    def __str__(self):
        return f"Demande #{self.pk} - {self.commerce}"

    @property
    def peut_modifier(self):
        return self.statut == StatutDemande.EN_ATTENTE

    @property
    def est_terminee(self):
        return self.statut in (StatutDemande.LIVREE, StatutDemande.ANNULEE)


class LigneDemande(models.Model):
    demande = models.ForeignKey(DemandeAllocation, on_delete=models.CASCADE,
                                related_name="lignes")                           # composition « contient »
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)                # « concerne »
    quantite_demandee = models.DecimalField(max_digits=10, decimal_places=2)
    quantite_accordee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.produit} x {self.quantite_demandee}"