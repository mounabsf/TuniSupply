from django.contrib import admin

from .models import Alerte, Inspecteur, SignalementAnomalie


@admin.register(Inspecteur)
class InspecteurAdmin(admin.ModelAdmin):
    list_display = ("badge_inspecteur", "user", "zone_intervention")


@admin.register(SignalementAnomalie)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("id", "type_anomalie", "commerce", "inspecteur", "date_signalement")
    list_filter = ("type_anomalie",)


@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display = ("id", "zone", "niveau_urgence", "date_creation")
    list_filter = ("niveau_urgence",)
    filter_horizontal = ("signalements",)
