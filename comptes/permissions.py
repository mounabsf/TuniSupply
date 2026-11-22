from rest_framework.permissions import BasePermission

from .models import Role, role_de


class IsAdminRole(BasePermission):
    message = "Réservé aux administrateurs."

    def has_permission(self, request, view):
        return role_de(request.user) == Role.ADMIN
