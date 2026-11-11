from django import forms
from django.forms import inlineformset_factory
from .models import DemandeAllocation, LigneDemande


class DemandeForm(forms.ModelForm):
    class Meta:
        model = DemandeAllocation
        fields = ["commerce"]

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["commerce"].widget.attrs["class"] = "form-control"
        if user is not None:  # le commerçant ne voit que ses commerces
            self.fields["commerce"].queryset = user.commerces.all()


class LigneForm(forms.ModelForm):
    class Meta:
        model = LigneDemande
        fields = ["produit", "quantite_demandee"]
        widgets = {
            "produit": forms.Select(attrs={"class": "form-control"}),
            "quantite_demandee": forms.NumberInput(attrs={"class": "form-control", "min": "0.01"}),
        }


LigneFormSet = inlineformset_factory(
    DemandeAllocation, LigneDemande, form=LigneForm,
    extra=3, can_delete=True, min_num=1, validate_min=True,
)