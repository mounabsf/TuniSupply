from django.db import models


class Fournisseur(models.Model):
    class Statut(models.TextChoices):
        ACTIF = "ACTIF", "Actif"
        SUSPENDU = "SUSPENDU", "Suspendu"
        SOUS_SURVEILLANCE = "SOUS_SURVEILLANCE", "Sous surveillance"
        INACTIF = "INACTIF", "Inactif"

    nom = models.CharField(max_length=150)
    zone_couverte = models.CharField(max_length=150)
    capacite_livraison = models.DecimalField(max_digits=12, decimal_places=2)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    est_archive = models.BooleanField(default=False)
    date_archivage = models.DateTimeField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Livraison(models.Model):
    """Historique des livraisons d'un fournisseur (HistoriqueLivraison du diagramme de classes)."""

    # PROTECT : un fournisseur ne peut pas être supprimé tant qu'il a un historique.
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name="livraisons")
    date_livraison = models.DateField()
    quantite_livree = models.DecimalField(max_digits=12, decimal_places=2)
    conforme = models.BooleanField(default=True)
    ponctuel = models.BooleanField(default=True)

    class Meta:
        ordering = ["-date_livraison", "-id"]

    def __str__(self):
        return f"{self.fournisseur} - {self.date_livraison}"
