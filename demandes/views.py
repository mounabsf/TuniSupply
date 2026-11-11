from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.db.models import Sum, Count, F
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView

from .forms import DemandeForm, LigneFormSet
from .models import DemandeAllocation, LigneDemande, StatutDemande
from .services import calculer_score


class DemandeListView(LoginRequiredMixin, ListView):
    template_name = "demandes/list.html"
    context_object_name = "demandes"

    def get_queryset(self):
        qs = DemandeAllocation.objects.select_related("commerce", "commercant")
        if not self.request.user.is_staff:           # commerçant : ses demandes seulement
            qs = qs.filter(commercant=self.request.user)
        statut = self.request.GET.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        return qs.order_by("-pk")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["statuts"] = StatutDemande.choices
        ctx["statut_actif"] = self.request.GET.get("statut", "")
        return ctx


class DemandeDetailView(LoginRequiredMixin, DetailView):
    model = DemandeAllocation
    template_name = "demandes/detail.html"
    context_object_name = "demande"


class DemandeFormMixin:
    model = DemandeAllocation
    form_class = DemandeForm
    template_name = "demandes/form.html"
    success_url = reverse_lazy("demandes:liste")

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        if self.request.POST:
            ctx["formset"] = LigneFormSet(self.request.POST, instance=self.object)
        else:
            ctx["formset"] = LigneFormSet(instance=self.object)
        return ctx

    def form_valid(self, form):
        formset = self.get_context_data()["formset"]
        if not formset.is_valid():
            return self.render_to_response(self.get_context_data(form=form))
        with transaction.atomic():
            demande = form.save(commit=False)
            if not demande.pk:
                demande.commercant = self.request.user
            demande.save()
            formset.instance = demande
            formset.save()
            demande.score_legitime = calculer_score(demande)   # algorithme
            demande.save(update_fields=["score_legitime"])
        messages.success(self.request, "Demande enregistrée avec succès.")
        return redirect(self.success_url)


class DemandeCreateView(LoginRequiredMixin, DemandeFormMixin, CreateView):
    pass


class DemandeUpdateView(LoginRequiredMixin, DemandeFormMixin, UpdateView):
    def dispatch(self, request, *args, **kwargs):
        if not self.get_object().peut_modifier:
            messages.error(request, "Seule une demande en attente peut être modifiée.")
            return redirect("demandes:liste")
        return super().dispatch(request, *args, **kwargs)


@login_required
def changer_statut(request, pk, action):
    """Clôturer (LIVREE) ou annuler (ANNULEE) une demande."""
    cibles = {"cloturer": StatutDemande.LIVREE, "annuler": StatutDemande.ANNULEE}
    if action not in cibles:
        raise Http404
    demande = get_object_or_404(DemandeAllocation, pk=pk)
    if demande.est_terminee:
        messages.error(request, "Cette demande est déjà terminée.")
        return redirect("demandes:liste")
    if request.method == "POST":
        demande.statut = cibles[action]
        demande.save(update_fields=["statut"])
        messages.success(request, f"Demande #{demande.pk} : statut « {demande.get_statut_display()} ».")
        return redirect("demandes:liste")
    return render(request, "demandes/confirm_statut.html",
                  {"demande": demande, "action": action})


@login_required
def regroupement(request):
    """Regroupe les demandes en attente par zone et par produit."""
    lignes = (
        LigneDemande.objects.filter(demande__statut=StatutDemande.EN_ATTENTE)
        .values(zone=F("demande__commerce__zone__nom"),
                gouvernorat=F("demande__commerce__zone__gouvernorat"),
                produit_nom=F("produit__nom"))
        .annotate(total=Sum("quantite_demandee"), nb=Count("demande", distinct=True))
        .order_by("zone", "produit_nom")
    )
    return render(request, "demandes/regroupement.html", {"lignes": lignes})