"""Règles métier du module Gestion des comptes."""
from .models import Profil, Role


def assurer_profil(user):
    profil, _ = Profil.objects.get_or_create(
        user=user,
        defaults={"role": Role.ADMIN if (user.is_staff or user.is_superuser) else Role.COMMERCANT},
    )
    user.profil = profil  # met le cache à jour
    return profil


def _assurer_inspecteur(user):
    """Un compte INSPECTEUR doit avoir sa fiche Inspecteur (module Anomalies), badge unique."""
    from anomalies.models import Inspecteur

    if Inspecteur.objects.filter(user=user).exists():
        return
    badge, n = f"INSP-{user.pk:04d}", 1
    while Inspecteur.objects.filter(badge_inspecteur=badge).exists():
        n += 1
        badge = f"INSP-{user.pk:04d}-{n}"
    Inspecteur.objects.create(user=user, badge_inspecteur=badge)


def appliquer_role(user, role, telephone=None, depot_rattachement=None):
    """Enregistre le rôle (et le téléphone) et garde is_staff cohérent avec le rôle ADMIN."""
    profil = assurer_profil(user)
    profil.role = role
    if telephone is not None:
        profil.telephone = telephone
    if depot_rattachement is not None:
        profil.depot_rattachement = depot_rattachement
    profil.save()

    est_admin = role == Role.ADMIN
    if not user.is_superuser and user.is_staff != est_admin:
        user.is_staff = est_admin  # les vues Django existantes se basent sur is_staff
        user.save(update_fields=["is_staff"])

    if role == Role.INSPECTEUR:
        _assurer_inspecteur(user)
