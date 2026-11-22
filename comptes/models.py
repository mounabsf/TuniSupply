from django.conf import settings
from django.db import models


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrateur"
    COMMERCANT = "COMMERCANT", "Commerçant"
    GROSSISTE = "GROSSISTE", "Grossiste"
    INSPECTEUR = "INSPECTEUR", "Inspecteur"


# Rôles qu'une personne peut choisir elle-même à l'inscription.
# ADMIN et INSPECTEUR ne s'obtiennent que par un administrateur.
ROLES_INSCRIPTION = (Role.COMMERCANT, Role.GROSSISTE)


class Profil(models.Model):
    """Complète le User de Django : rôle métier + téléphone."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="profil")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.COMMERCANT)
    telephone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.get_username()} ({self.get_role_display()})"


def role_de(user):
    """Rôle d'un utilisateur (None si non connecté). Un superuser est toujours ADMIN."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return Role.ADMIN
    profil = getattr(user, "profil", None)
    return profil.role if profil else Role.COMMERCANT
