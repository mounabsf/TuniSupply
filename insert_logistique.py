"""
Insertion des données de test du module LOGISTIQUE (OperationLogistique).
À placer à côté de manage.py.

Exécution :
    python insert_logistique.py                 (utilise db.sqlite3)
    python insert_logistique.py chemin/ma.db    (autre fichier de base)

- Crée si besoin : 2 logisticiens, 3 centres, 6 lots (les mêmes que insert_data.py).
- Crée 7 opérations logistiques (tous les statuts) et leurs ressources.
- Les doublons sont évités, une seule transaction est utilisée.
- Mot de passe des comptes créés : Test1234!
"""

import base64
import hashlib
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
candidats = [
    sys.argv[1] if len(sys.argv) > 1 else None,
    os.path.join(BASE_DIR, "db.sqlite3"),
    os.path.join(BASE_DIR, "backend", "db.sqlite3"),
]
DB = next((c for c in candidats if c and os.path.exists(c)), None)
if not DB:
    raise SystemExit("Base introuvable. Lance : python insert_logistique.py chemin/vers/db.sqlite3")
print(f"Base utilisée : {DB}\n")

now_dt = datetime.now()
now = now_dt.strftime("%Y-%m-%d %H:%M:%S.%f")
today = now_dt.date()

conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = ON")
cur = conn.cursor()


def columns(table):
    return {r[1] for r in cur.execute(f"PRAGMA table_info({table})")}


def find_table(required):
    for (name,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        if set(required) <= columns(name):
            return name
    raise SystemExit(f"Table introuvable (colonnes {required}). As-tu lancé 'python manage.py migrate' ?")


AUTO_DATES = ("cree_le", "modifie_le", "created_at", "updated_at", "date_joined")


def insert(table, data):
    cols = columns(table)
    d = {k: v for k, v in data.items() if k in cols}
    for c in AUTO_DATES:
        if c in cols and c not in d:
            d[c] = now
    for c in ("actif", "is_active"):
        if c in cols and c not in d:
            d[c] = 1
    # Colonnes NOT NULL sans valeur par défaut (ajoutées par de nouvelles migrations) :
    # on met une valeur neutre pour ne pas faire échouer l'insertion.
    for _, name, typ, notnull, dflt, pk in cur.execute(f"PRAGMA table_info({table})").fetchall():
        if notnull and dflt is None and not pk and name not in d:
            t = (typ or "").upper()
            if "DATE" in t or "TIME" in t:
                d[name] = now
            elif any(x in t for x in ("INT", "BOOL", "REAL", "NUM", "DEC", "FLOAT")):
                d[name] = 0
            else:
                d[name] = ""
    cur.execute(f"INSERT INTO {table} ({', '.join(d)}) VALUES ({', '.join('?' for _ in d)})",
                tuple(d.values()))
    return cur.lastrowid


def get_or_create(table, lookup, data=None):
    where = " AND ".join(f"{k} = ?" for k in lookup)
    row = cur.execute(f"SELECT id FROM {table} WHERE {where}", tuple(lookup.values())).fetchone()
    if row:
        return row[0], False
    return insert(table, {**lookup, **(data or {})}), True


def make_password(raw):
    iterations = 720000
    salt = base64.b64encode(os.urandom(9)).decode()[:12]
    h = hashlib.pbkdf2_hmac("sha256", raw.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(h).decode().strip()}"


T = {
    "user": "auth_user",
    "profil": find_table({"user_id", "role", "telephone"}),
    "centre": find_table({"capacite_stockage", "nom"}),
    "ressource": find_table({"id_lot"}),
    "operation": find_table({"id_operation", "date_prevue", "statut_livraison"}),
    "op_ressources": find_table({"operationlogistique_id", "ressourcesubventionnee_id"}),
}


def counts():
    return {k: cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for k, t in T.items()}


avant = counts()

try:
    # =================================================================
    # 1. LOGISTICIENS (rôle LOGISTICIEN dans Profil)
    # =================================================================
    pwd = make_password("Test1234!")
    L = {}
    for username, fn, ln, email, tel in [
        ("logisticien_hedi", "Hedi", "Ben Ammar", "hedi.logistique@gmail.com", "21600010"),
        ("logisticien_rim", "Rim", "Khelifi", "rim.logistique@gmail.com", "21600011"),
    ]:
        uid, created = get_or_create(
            T["user"], {"username": username},
            {"password": pwd, "is_superuser": 0, "first_name": fn, "last_name": ln,
             "email": email, "is_staff": 0, "is_active": 1})
        row = cur.execute(f"SELECT id FROM {T['profil']} WHERE user_id = ?", (uid,)).fetchone()
        if row:
            cur.execute(f"UPDATE {T['profil']} SET role = 'LOGISTICIEN' WHERE id = ?", (row[0],))
        else:
            insert(T["profil"], {"user_id": uid, "role": "LOGISTICIEN", "telephone": tel})
        L[username] = uid
        print(("Logisticien ajouté : " if created else "Logisticien déjà existant : ") + username)

    # =================================================================
    # 2. CENTRES + LOTS (créés seulement s'ils n'existent pas)
    # =================================================================
    CD = {}
    for nom, adr, cap in [
        ("Centre Tunis Nord", "Zone industrielle Ariana", 50000),
        ("Centre Sfax", "Route de Tunis km 8, Sfax", 35000),
        ("Centre Sousse", "Zone industrielle Sidi Abdelhamid", 28000),
    ]:
        CD[nom], _ = get_or_create(T["centre"], {"nom": nom},
                                   {"adresse": adr, "capacite_stockage": cap})

    R = {}
    for lot, centre, typ, qte, jours, prix, conf in [
        ("LOT-001", "Centre Tunis Nord", "Sucre", 12000, 365, "0.900", 1),
        ("LOT-002", "Centre Tunis Nord", "Farine", 15000, 200, "0.600", 1),
        ("LOT-003", "Centre Sfax", "Huile", 6000, 180, "2.800", 1),
        ("LOT-004", "Centre Sfax", "Semoule", 8000, 90, "0.750", 0),
        ("LOT-005", "Centre Sousse", "Lait", 9000, -10, "1.100", 1),
        ("LOT-006", "Centre Sousse", "Riz", 7000, 400, "1.700", 1),
    ]:
        R[lot], _ = get_or_create(
            T["ressource"], {"id_lot": lot},
            {"centre_id": CD[centre], "type_ressource": typ, "quantite_totale_lot": qte,
             "date_peremption": (today + timedelta(days=jours)).isoformat(),
             "prix_achat_etat": prix, "conforme": conf})

    # =================================================================
    # 3. OPÉRATIONS LOGISTIQUES
    # =================================================================
    # Respecte les règles du modèle :
    #  - PLANIFIEE sans logisticien/centre = brouillon, non démarrable
    #  - EN_COURS / TERMINEE ont toujours un logisticien et un centre
    operations_data = [
        # jours, logisticien, centre, statut, itinéraire, lots
        (2, "logisticien_hedi", "Centre Tunis Nord", "PLANIFIEE",
         "Ariana -> Tunis Centre -> Ben Arous", ["LOT-001", "LOT-002"]),
        (5, "logisticien_rim", "Centre Sfax", "PLANIFIEE",
         "Sfax -> Gabès -> Médenine", ["LOT-003"]),
        (7, None, None, "PLANIFIEE",
         "Itinéraire à définir (brouillon)", []),
        (0, "logisticien_hedi", "Centre Tunis Nord", "EN_COURS",
         "Ariana -> Manouba -> Bizerte", ["LOT-001"]),
        (-1, "logisticien_rim", "Centre Sousse", "EN_COURS",
         "Sousse -> Monastir -> Mahdia", ["LOT-006"]),
        (-4, "logisticien_hedi", "Centre Sfax", "TERMINEE",
         "Sfax -> Kairouan -> Sousse", ["LOT-003", "LOT-004"]),
        (-8, "logisticien_rim", "Centre Sousse", "ANNULEE",
         "Sousse -> Nabeul -> Tunis", ["LOT-005"]),
    ]
    nb = 0
    for jours, log, centre, statut, iti, lots in operations_data:
        date = (today + timedelta(days=jours)).isoformat()
        row = cur.execute(
            f"SELECT id_operation FROM {T['operation']} WHERE itineraire_optimise = ? AND date_prevue = ?",
            (iti, date)).fetchone()
        if row:
            print(f"Opération déjà existante : {iti}")
            continue

        op_id = uuid.uuid4().hex  # Django stocke l'UUID en 32 caractères hexadécimaux
        insert(T["operation"], {
            "id_operation": op_id,
            "date_prevue": date,
            "logisticien_id": L[log] if log else None,
            "centre_depart_id": CD[centre] if centre else None,
            "statut_livraison": statut,
            "itineraire_optimise": iti,
        })
        for lot in lots:
            cur.execute(
                f"INSERT INTO {T['op_ressources']} (operationlogistique_id, ressourcesubventionnee_id) "
                "VALUES (?, ?)", (op_id, R[lot]))
        nb += 1
        print(f"Opération ajoutée : {statut:10} {iti}")

    conn.commit()
    print(f"\nINSERTION TERMINEE AVEC SUCCES ({nb} opération(s) ajoutée(s))")

except Exception as exc:
    conn.rollback()
    print("\nERREUR : aucune modification de cette transaction n'a été conservée.")
    print(exc)
    conn.close()
    raise SystemExit(1)

apres = counts()
print("\nNombre d'enregistrements avant et après :\n")
for k, t in T.items():
    print(f"{t:45} {avant[k]:>5} -> {apres[k]:>5}")

conn.close()
print("\nMot de passe des comptes créés : Test1234!")