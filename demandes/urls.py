from django.urls import path
from . import views

app_name = "demandes"

urlpatterns = [
    path("", views.DemandeListView.as_view(), name="liste"),
    path("nouvelle/", views.DemandeCreateView.as_view(), name="creer"),
    path("regroupement/", views.regroupement, name="regroupement"),
    path("<int:pk>/", views.DemandeDetailView.as_view(), name="detail"),
    path("<int:pk>/modifier/", views.DemandeUpdateView.as_view(), name="modifier"),
    path("<int:pk>/<str:action>/", views.changer_statut, name="statut"),
]