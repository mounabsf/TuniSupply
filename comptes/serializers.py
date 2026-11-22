from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as valider_mdp
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import transaction
from rest_framework import serializers

from .models import ROLES_INSCRIPTION, Role, role_de
from .services import appliquer_role, assurer_profil

User = get_user_model()


# ---------- validations partagées ----------
def _username_libre(value, exclude_pk=None):
    if User.objects.filter(username__iexact=value).exclude(pk=exclude_pk).exists():
        raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
    return value


def _email_libre(value, exclude_pk=None):
    value = (value or "").strip()
    if value and User.objects.filter(email__iexact=value).exclude(pk=exclude_pk).exists():
        raise serializers.ValidationError("Un compte utilise déjà cette adresse e-mail.")
    return value


def _mdp_valide(mot_de_passe, user=None):
    try:
        valider_mdp(mot_de_passe, user)
    except Exception as exc:  # django.core.exceptions.ValidationError
        raise serializers.ValidationError(list(getattr(exc, "messages", [str(exc)])))


# ---------- lecture d'un compte (réponse de toutes les API) ----------
class CompteSerializer(serializers.ModelSerializer):
    """Gestion des comptes par l'administrateur (ajout / modification / suppression)."""
    role = serializers.ChoiceField(choices=Role.choices, source="profil.role")
    telephone = serializers.CharField(source="profil.telephone", required=False,
                                      allow_blank=True, max_length=20)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True,
                                     trim_whitespace=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "telephone",
                  "password", "is_active", "date_joined", "last_login"]
        read_only_fields = ["date_joined", "last_login"]

    def to_representation(self, instance):
        assurer_profil(instance)
        data = super().to_representation(instance)
        data["role"] = role_de(instance)  # un superuser est toujours ADMIN
        return data

    def validate_username(self, value):
        return _username_libre(value, self.instance.pk if self.instance else None)

    def validate_email(self, value):
        return _email_libre(value, self.instance.pk if self.instance else None)

    def validate_password(self, value):
        if value:
            _mdp_valide(value, self.instance)
        return value

    def validate(self, attrs):
        moi = self.context["request"].user
        if self.instance is None:
            if not attrs.get("password"):
                raise serializers.ValidationError({"password": "Le mot de passe est obligatoire."})
            return attrs

        cible = self.instance
        if cible.is_superuser and not moi.is_superuser:
            raise serializers.ValidationError(
                {"detail": "Seul un super-utilisateur peut modifier ce compte."})
        if cible.pk == moi.pk:  # garde-fous anti-verrouillage
            if attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    {"detail": "Vous ne pouvez pas désactiver votre propre compte."})
            nouveau_role = attrs.get("profil", {}).get("role")
            if nouveau_role and nouveau_role != Role.ADMIN:
                raise serializers.ValidationError(
                    {"detail": "Vous ne pouvez pas retirer votre propre rôle d'administrateur."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        profil = validated_data.pop("profil", {})
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        appliquer_role(user, profil.get("role", Role.COMMERCANT), profil.get("telephone", ""))
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        profil = validated_data.pop("profil", {})
        password = validated_data.pop("password", "")
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if password:
            instance.set_password(password)
        instance.save()
        if profil:
            appliquer_role(instance, profil.get("role", role_de(instance)), profil.get("telephone"))
        return instance


# ---------- connexion / inscription ----------
class ConnexionSerializer(serializers.Serializer):
    username = serializers.CharField()  # nom d'utilisateur OU e-mail
    password = serializers.CharField(trim_whitespace=False)


class InscriptionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[(r.value, r.label) for r in ROLES_INSCRIPTION])
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        return _username_libre(value)

    def validate_email(self, value):
        return _email_libre(value)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les deux mots de passe ne correspondent pas."})
        candidat = User(username=attrs["username"], email=attrs["email"],
                        first_name=attrs.get("first_name", ""), last_name=attrs.get("last_name", ""))
        _mdp_valide(attrs["password"], candidat)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        role = validated_data.pop("role")
        telephone = validated_data.pop("telephone", "")
        user = User.objects.create_user(**validated_data)
        appliquer_role(user, role, telephone)
        return user


# ---------- espace personnel ----------
class MonProfilSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value):
        return _email_libre(value, self.instance.pk)

    @transaction.atomic
    def update(self, instance, validated_data):
        telephone = validated_data.pop("telephone", None)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        instance.save()
        if telephone is not None:
            profil = assurer_profil(instance)
            profil.telephone = telephone
            profil.save(update_fields=["telephone"])
        return instance


class ChangerMotDePasseSerializer(serializers.Serializer):
    old_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)
    new_password_confirm = serializers.CharField(trim_whitespace=False)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Les deux mots de passe ne correspondent pas."})
        _mdp_valide(attrs["new_password"], self.context["request"].user)
        return attrs
