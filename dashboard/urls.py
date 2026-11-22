from django.urls import path

from .api import TableauBordView

urlpatterns = [path("dashboard/", TableauBordView.as_view())]
