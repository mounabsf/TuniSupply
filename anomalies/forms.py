from django import forms
from django.forms import inlineformset_factory
from .models import Alerte  # Remplacez par le nom réel de votre modèle principal d'anomalies/alertes


class AlerteForm(forms.ModelForm):
    class Meta:
        model = Alerte
        fields = "__all__"  # Ou spécifiez vos champs, ex: ["produit", "type_anomalie", "description", "gravite"]

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        # Application automatique des classes Bootstrap/Tailwind sur les champs du formulaire
        for field_name, field in self.fields.items():
            if isinstance(field.widget, (forms.CheckboxInput, forms.RadioSelect)):
                field.widget.attrs["class"] = "form-check-input"
            else:
                field.widget.attrs["class"] = "form-control"
        
        # Exemple de filtrage contextuel si l'alerte est liée à un utilisateur / inspecteur
        if user is not None and hasattr(Alerte, 'inspecteur'):
            pass  # Ajustez selon la logique de filtrage de vos inspecteurs si nécessaire