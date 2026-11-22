from django.conf import settings
from django.db import migrations


def creer_profils(apps, schema_editor):
    """Donne un profil aux comptes créés avant ce module :
    superuser / staff -> ADMIN, tous les autres -> COMMERCANT."""
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    Profil = apps.get_model("comptes", "Profil")
    for user in User.objects.filter(profil__isnull=True):
        role = "ADMIN" if (user.is_staff or user.is_superuser) else "COMMERCANT"
        Profil.objects.create(user=user, role=role)


class Migration(migrations.Migration):
    dependencies = [("comptes", "0001_initial")]
    operations = [migrations.RunPython(creer_profils, migrations.RunPython.noop)]
