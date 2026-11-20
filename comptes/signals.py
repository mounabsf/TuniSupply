from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profil, Role


@receiver(post_save, sender="auth.User")
def creer_profil(sender, instance, created, **kwargs):
    """Tout nouveau compte (inscription, admin Django, createsuperuser…) reçoit un profil."""
    if created:
        role = Role.ADMIN if (instance.is_staff or instance.is_superuser) else Role.COMMERCANT
        Profil.objects.get_or_create(user=instance, defaults={"role": role})
