from django.conf import settings
from django.db import models

# Commerce et ZoneGeographique sont (pour l'instant) définis dans l'app « demandes ».
from demandes.models import Commerce, ZoneGeographique


# ---------- ÉNUMÉRATIONS (diagramme de classes) ----------
class TypeAnomalie(models.TextChoices):
    PRIX_ABUSIF = "PRIX_ABUSIF", "Prix abusif"
    STOCKAGE_EXCESSIF = "STOCKAGE_EXCESSIF", "Stockage excessif"
    PRODUIT_PERIME = "PRODUIT_PERIME", "Produit périmé"
    AUTRE = "AUTRE", "Autre"


class Urgence(models.TextChoices):
    FAIBLE = "FAIBLE", "Faible"
    MOYENNE = "MOYENNE", "Moyenne"
    ELEVEE = "ELEVEE", "Élevée"
    CRITIQUE = "CRITIQUE", "Critique"


# ---------- CLASSES ----------
class Inspecteur(models.Model):
    """Spécialisation de « Utilisateur » : un compte Django + les champs propres à l'inspecteur."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="inspecteur")
    zone_intervention = models.CharField(max_length=100, blank=True)
    badge_inspecteur = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.get_username()} ({self.badge_inspecteur})"


class SignalementAnomalie(models.Model):
    inspecteur = models.ForeignKey(Inspecteur, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name="signalements")                 # « Enregistre »
    commerce = models.ForeignKey(Commerce, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="signalements")                   # « cible » (0..1)
    type_anomalie = models.CharField(max_length=20, choices=TypeAnomalie.choices)
    description = models.TextField()
    date_signalement = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_signalement", "-pk"]

    def __str__(self):
        return f"Signalement #{self.pk} - {self.get_type_anomalie_display()}"

    @property
    def zone(self):
        """La zone d'un signalement est celle du commerce ciblé (None si pas de commerce)."""
        return self.commerce.zone if self.commerce_id else None


class Alerte(models.Model):
    message = models.CharField(max_length=255)
    niveau_urgence = models.CharField(max_length=10, choices=Urgence.choices, default=Urgence.FAIBLE)
    date_creation = models.DateTimeField(auto_now_add=True)
    zone = models.ForeignKey(ZoneGeographique, on_delete=models.PROTECT,
                             related_name="alertes")                             # « concerne »
    signalements = models.ManyToManyField(SignalementAnomalie, blank=True,
                                          related_name="alertes")                # « regroupe »

    class Meta:
        ordering = ["-date_creation"]

    def __str__(self):
        return f"Alerte #{self.pk} - {self.get_niveau_urgence_display()} - {self.zone}"
