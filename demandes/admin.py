from django.contrib import admin
from .models import (ZoneGeographique, Produit, Commerce,
                     DemandeAllocation, LigneDemande)


class LigneInline(admin.TabularInline):
    model = LigneDemande
    extra = 1


@admin.register(DemandeAllocation)
class DemandeAdmin(admin.ModelAdmin):
    list_display = ("id", "commerce", "commercant", "statut", "score_legitime", "date_demande")
    list_filter = ("statut",)
    inlines = [LigneInline]


admin.site.register(ZoneGeographique)
admin.site.register(Produit)
admin.site.register(Commerce)