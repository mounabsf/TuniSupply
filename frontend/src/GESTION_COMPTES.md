# Module Gestion des comptes — installation

1. Copier les fichiers de cette archive dans le projet (même arborescence).
2. `python manage.py migrate`   (crée la table Profil et donne un rôle aux comptes existants :
   superuser/staff -> Administrateur, les autres -> Commerçant)
3. `python manage.py test comptes`   (24 tests)
4. Lancer Django (`python manage.py runserver`) et le frontend (`npm run dev` dans `frontend/`).
5. Se connecter sur http://localhost:5173/login avec un compte administrateur
   (ex. votre superuser, ou `python manage.py createsuperuser`).

## Rôles
Administrateur · Commerçant · Grossiste · Inspecteur.
Inscription libre (`/inscription`) : Commerçant ou Grossiste uniquement.
Admin et Inspecteur ne sont créés que par un administrateur (menu « Comptes »).

## API (session Django + cookie CSRF)
| Méthode | URL | Accès |
|---|---|---|
| GET  | /api/auth/session/ | tous (pose le cookie CSRF, renvoie l'utilisateur ou null) |
| POST | /api/auth/login/ , /logout/ , /register/ | tous |
| GET/PATCH | /api/auth/me/ | connecté |
| POST | /api/auth/password/ | connecté |
| GET/POST/PATCH/PUT/DELETE | /api/comptes/ (+ `?q=&role=&actif=`) | administrateur |

## Garde-fous
Un admin ne peut pas se supprimer, se désactiver ni se rétrograder ; seul un superuser
modifie un superuser ; suppression refusée (409) si le compte a des commerces/demandes
(→ le désactiver) ; 10 tentatives de connexion/minute/IP ; mots de passe validés par Django.

## Étape suivante (modules des camarades, non modifiés)
Leurs API ont encore `authentication_classes = []` + `AllowAny` : elles restent ouvertes
même si le frontend exige maintenant une connexion. Pour les sécuriser, remplacer par
`authentication_classes = [SessionAuthentication401]` et `permission_classes = [IsAuthenticated]`
(from comptes.authentication / rest_framework.permissions), puis utiliser `request.user`
à la place de `inspecteur_courant()` (anomalies/api.py) et du premier superuser
(demandes/api.py, `perform_create`).
