from rest_framework.permissions import BasePermission, SAFE_METHODS

from comptes.models import Role, role_de


class StockPermission(BasePermission):
    message = "Vous ne pouvez pas modifier les stocks de ce commerce."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = role_de(request.user)
        if role == Role.INSPECTEUR:
            return request.method in SAFE_METHODS
        return role in (Role.ADMIN, Role.COMMERCANT)

    def has_object_permission(self, request, view, obj):
        if role_de(request.user) == Role.INSPECTEUR:
            return request.method in SAFE_METHODS
        if role_de(request.user) == Role.ADMIN:
            return True
        return obj.commerce.commercant_id == request.user.pk
