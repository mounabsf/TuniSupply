from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView

from .forms import AlerteForm
from .models import Alerte  # Adaptez le nom de votre modèle


class AlerteListView(LoginRequiredMixin, ListView):
    template_name = "anomalies/list.html"
    context_object_name = "alertes"

    def get_queryset(self):
        qs = Alerte.objects.all()
        # Si vous souhaitez restreindre l'affichage selon le rôle (ex: non-staff voit ses alertes)
        # if not self.request.user.is_staff and hasattr(Alerte, 'inspecteur'):
        #     qs = qs.filter(inspecteur=self.request.user)
        
        statut = self.request.GET.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        return qs.order_by("-pk")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        # Si votre modèle possède un choix de statuts (ex: StatutAlerte.choices)
        if hasattr(Alerte, 'StatutAlerte'):
            ctx["statuts"] = Alerte.StatutAlerte.choices
        ctx["statut_actif"] = self.request.GET.get("statut", "")
        return ctx


class AlerteDetailView(LoginRequiredMixin, DetailView):
    model = Alerte
    template_name = "anomalies/detail.html"
    context_object_name = "alerte"


class AlerteFormMixin:
    model = Alerte
    form_class = AlerteForm
    template_name = "anomalies/form.html"
    success_url = reverse_lazy("anomalies:liste")

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs

    def form_valid(self, form):
        with transaction.atomic():
            alerte = form.save(commit=False)
            if not alerte.pk and hasattr(Alerte, 'inspecteur'):
                alerte.inspecteur = self.request.user
            alerte.save()
        messages.success(self.request, "Alerte/Anomalie enregistrée avec succès.")
        return redirect(self.success_url)


class AlerteCreateView(LoginRequiredMixin, AlerteFormMixin, CreateView):
    pass


class AlerteUpdateView(LoginRequiredMixin, AlerteFormMixin, UpdateView):
    def dispatch(self, request, *args, **kwargs):
        alerte = self.get_object()
        # Vérification optionnelle si l'alerte peut être modifiée
        if hasattr(alerte, 'peut_modifier') and not alerte.peut_modifier:
            messages.error(request, "Cette alerte ne peut plus être modifiée.")
            return redirect("anomalies:liste")
        return super().dispatch(request, *args, **kwargs)


@login_required
def changer_statut_alerte(request, pk, action):
    """Permet de changer le statut d'une alerte (ex: Traitée, Archivée, etc.)."""
    cibles = {"traiter": "TRAITEE", "archiver": "ARCHIVEE"}  # À adapter selon vos choix de statuts
    if action not in cibles:
        raise Http404
    
    alerte = get_object_or_404(Alerte, pk=pk)
    if request.method == "POST":
        alerte.statut = cibles[action]
        alerte.save(update_fields=["statut"])
        messages.success(request, f"Alerte #{alerte.pk} mise à jour avec succès.")
        return redirect("anomalies:liste")
        
    return render(request, "anomalies/confirm_statut.html", {"alerte": alerte, "action": action})