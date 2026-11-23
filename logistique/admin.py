from django.contrib import admin

from .models import OperationLogistique


@admin.register(OperationLogistique)
class OperationLogistiqueAdmin(admin.ModelAdmin):
    list_display = ("id_operation", "date_prevue", "logisticien", "centre_depart", "statut_livraison")
    list_filter = ("statut_livraison", "date_prevue", "centre_depart")
    search_fields = ("itineraire_optimise",)
