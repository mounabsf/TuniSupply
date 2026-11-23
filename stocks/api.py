from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied

from comptes.authentication import SessionAuthentication401
from comptes.models import Role, role_de

from .models import Stock
from .permissions import StockPermission
from .serializers import StockSerializer


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    authentication_classes = [SessionAuthentication401]
    permission_classes = [StockPermission]
    queryset = Stock.objects.select_related("commerce", "produit")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = role_de(self.request.user)
        if role == Role.COMMERCANT:
            queryset = queryset.filter(commerce__commercant=self.request.user)
        elif role not in (Role.ADMIN, Role.INSPECTEUR):
            return queryset.none()

        commerce = self.request.query_params.get("commerce")
        if commerce:
            try:
                commerce_id = serializers.IntegerField(min_value=1).run_validation(commerce)
            except serializers.ValidationError:
                raise serializers.ValidationError(
                    {"commerce": "Identifiant de commerce invalide."}
                )
            queryset = queryset.filter(commerce_id=commerce_id)
        return queryset

    def perform_create(self, serializer):
        commerce = serializer.validated_data["commerce"]
        if (
            role_de(self.request.user) == Role.COMMERCANT
            and commerce.commercant_id != self.request.user.pk
        ):
            raise PermissionDenied("Vous ne pouvez gérer que les stocks de vos commerces.")
        serializer.save()

    def perform_update(self, serializer):
        commerce = serializer.validated_data.get(
            "commerce", serializer.instance.commerce
        )
        if (
            role_de(self.request.user) == Role.COMMERCANT
            and commerce.commercant_id != self.request.user.pk
        ):
            raise PermissionDenied("Vous ne pouvez gérer que les stocks de vos commerces.")
        serializer.save()
