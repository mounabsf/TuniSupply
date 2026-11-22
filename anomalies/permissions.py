from comptes.models import Role, role_de


def peut_gerer(user, signalement):
    """Modifier / supprimer un signalement : un administrateur, ou l'inspecteur qui l'a enregistré."""
    if not user or not user.is_authenticated:
        return False
    if role_de(user) == Role.ADMIN:
        return True
    return bool(signalement.inspecteur_id and signalement.inspecteur.user_id == user.id)
