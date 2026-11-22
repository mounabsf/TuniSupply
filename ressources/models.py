from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class CentreDistribution(models.Model):
    """Dépôt régional qui stocke les réserves stratégiques (classe CentreDistribution du diagramme).
    idCentre = la clé primaire automatique de Django (id)."""
    nom = models.CharField("nom", max_length=150)
    adresse = models.CharField("adresse", max_length=255, blank=True)
    capacite_stockage = models.DecimalField("capacité de stockage", max_digits=12, decimal_places=2,
                                            validators=[MinValueValidator(Decimal("0.01"))])

    class Meta:
        ordering = ["nom"]
        verbose_name = "centre de distribution"
        verbose_name_plural = "centres de distribution"

    def __str__(self):
        return self.nom


class EtatLot(models.TextChoices):
    CONFORME = "CONFORME", "Conforme"
    NON_CONFORME = "NON_CONFORME", "Non conforme"
    PERIME = "PERIME", "Périmé"


class RessourceSubventionnee(models.Model):
    """Lot de ressources subventionnées (classe RessourceSubventionnee du diagramme).
    Relation « stocke » : un centre stocke 0..* lots (composition : si le centre disparaît, ses lots aussi)."""
    centre = models.ForeignKey(CentreDistribution, on_delete=models.CASCADE,
                               related_name="ressources", verbose_name="centre")
    id_lot = models.CharField("numéro de lot", max_length=50, unique=True)
    type_ressource = models.CharField("type de ressource", max_length=100)
    quantite_totale_lot = models.DecimalField("quantité totale du lot", max_digits=12, decimal_places=2,
                                              validators=[MinValueValidator(Decimal("0.01"))])
    date_peremption = models.DateField("date de péremption")
    prix_achat_etat = models.DecimalField("prix d'achat (État)", max_digits=10, decimal_places=3,
                                          validators=[MinValueValidator(Decimal("0"))])
    # Ajout par rapport au diagramme : nécessaire pour « supprimer les lots non conformes »
    conforme = models.BooleanField("conforme", default=True)

    class Meta:
        ordering = ["-pk"]
        verbose_name = "ressource subventionnée"
        verbose_name_plural = "ressources subventionnées"

    def __str__(self):
        return f"Lot {self.id_lot} - {self.type_ressource} ({self.centre.nom})"

    @property
    def est_perime(self):
        return self.date_peremption is not None and self.date_peremption < timezone.localdate()

    @property
    def etat(self):
        if self.est_perime:
            return EtatLot.PERIME
        return EtatLot.CONFORME if self.conforme else EtatLot.NON_CONFORME

    @property
    def etat_label(self):
        return EtatLot(self.etat).label

    @property
    def valeur_totale(self):
        return self.quantite_totale_lot * self.prix_achat_etat