from django.urls import path
from . import views

app_name = "anomalies"

urlpatterns = [
    path("", views.AlerteListView.as_view(), name="liste"),
    path("nouvelle/", views.AlerteCreateView.as_view(), name="creer"),
    path("<int:pk>/", views.AlerteDetailView.as_view(), name="detail"),
    path("<int:pk>/modifier/", views.AlerteUpdateView.as_view(), name="modifier"),
    path("<int:pk>/<str:action>/", views.changer_statut_alerte, name="statut"),
]