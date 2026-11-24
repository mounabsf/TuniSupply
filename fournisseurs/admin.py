from django.contrib import admin

from .models import Fournisseur, Livraison

admin.site.register(Fournisseur)
admin.site.register(Livraison)
