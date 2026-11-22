from django.urls import include, path
from rest_framework.routers import SimpleRouter

from . import api

router = SimpleRouter()
router.register("comptes", api.CompteViewSet, basename="api-compte")

urlpatterns = [
    path("auth/session/", api.SessionView.as_view()),
    path("auth/login/", api.ConnexionView.as_view()),
    path("auth/logout/", api.DeconnexionView.as_view()),
    path("auth/register/", api.InscriptionView.as_view()),
    path("auth/me/", api.MonProfilView.as_view()),
    path("auth/password/", api.ChangerMotDePasseView.as_view()),
    path("", include(router.urls)),
]
