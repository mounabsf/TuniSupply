import uuid

from django.conf import settings
from django.db import models


class StatutOperation(models.TextChoices):
    PLANIFIEE = "PLANIFIEE", "Planifiée"
    EN_COURS = "EN_COURS", "En cours"
    TERMINEE = "TERMINEE", "Terminée"
    ANNULEE = "ANNULEE", "Annulée"


class OperationLogistique(models.Model):
    id_operation = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date_prevue = models.DateField()
    logisticien = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="operations_logistiques",
        limit_choices_to={"profil__role": "LOGISTICIEN"},
    )
    centre_depart = models.ForeignKey(
        "ressources.CentreDistribution",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="operations_logistiques",
    )
    ressources = models.ManyToManyField(
        "ressources.RessourceSubventionnee",
        blank=True,
        related_name="operations_logistiques",
    )
    statut_livraison = models.CharField(
        max_length=10,
        choices=StatutOperation.choices,
        default=StatutOperation.PLANIFIEE,
    )
    itineraire_optimise = models.TextField()

    class Meta:
        ordering = ["date_prevue", "id_operation"]
        verbose_name = "opération logistique"
        verbose_name_plural = "opérations logistiques"

    def __str__(self):
        return f"Opération {self.id_operation} - {self.get_statut_livraison_display()}"

    @property
    def peut_modifier(self):
        return self.statut_livraison == StatutOperation.PLANIFIEE

    @property
    def peut_annuler(self):
        return self.statut_livraison == StatutOperation.PLANIFIEE

    @property
    def peut_demarrer(self):
        return (
            self.statut_livraison == StatutOperation.PLANIFIEE
            and self.logisticien_id is not None
            and self.centre_depart_id is not None
        )

    @property
    def peut_terminer(self):
        return self.statut_livraison == StatutOperation.EN_COURS
