from django.contrib import admin
from .models import CentreDistribution, RessourceSubventionnee


@admin.register(CentreDistribution)
class CentreDistributionAdmin(admin.ModelAdmin):
    list_display = ("nom", "adresse", "capacite_stockage")
    search_fields = ("nom",)


@admin.register(RessourceSubventionnee)
class RessourceSubventionneeAdmin(admin.ModelAdmin):
    list_display = ("id_lot", "type_ressource", "centre", "quantite_totale_lot",
                    "prix_achat_etat", "date_peremption", "conforme")
    list_filter = ("centre", "conforme")
    search_fields = ("id_lot", "type_ressource")