"""
Insertion automatique des données de test dans la base SQLite de TuniSupply.
À placer à côté de manage.py.

Exécution :
    python insert_data.py                 (utilise db.sqlite3)
    python insert_data.py chemin/ma.db    (autre fichier de base)

- Les données existantes sont conservées, les doublons sont évités.
- Les noms de tables sont détectés automatiquement (selon les colonnes),
  donc le script marche même si les apps ne s'appellent pas comme prévu.
- Une seule transaction : en cas d'erreur, rien n'est enregistré.
- Mot de passe de tous les comptes créés : Test1234!
"""

import base64
import hashlib
import os
import sqlite3
import sys
from datetime import datetime, timedelta

# ---------------------------------------------------------------------
# Connexion
# ---------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
candidats = [
    sys.argv[1] if len(sys.argv) > 1 else None,
    os.path.join(BASE_DIR, "db.sqlite3"),
    os.path.join(BASE_DIR, "backend", "db.sqlite3"),
]
DB = next((c for c in candidats if c and os.path.exists(c)), None)
if not DB:
    raise SystemExit("Base introuvable. Lance : python insert_data.py chemin/vers/db.sqlite3")

print(f"Base utilisée : {DB}\n")

now_dt = datetime.now()
now = now_dt.strftime("%Y-%m-%d %H:%M:%S.%f")
today = now_dt.date()

conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = ON")
cur = conn.cursor()


# ---------------------------------------------------------------------
# Outils
# ---------------------------------------------------------------------
def columns(table):
    return {r[1] for r in cur.execute(f"PRAGMA table_info({table})")}


def find_table(required):
    """Trouve la table qui contient toutes les colonnes demandées."""
    for (name,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        if set(required) <= columns(name):
            return name
    raise SystemExit(f"Table introuvable (colonnes {required}). As-tu lancé 'python manage.py migrate' ?")


AUTO_DATES = ("cree_le", "modifie_le", "created_at", "updated_at", "date_demande",
              "date_signalement", "date_creation", "date_joined")


def insert(table, data):
    cols = columns(table)
    d = {k: v for k, v in data.items() if k in cols}
    for c in AUTO_DATES:
        if c in cols and c not in d:
            d[c] = now
    for c in ("actif", "is_active"):
        if c in cols and c not in d:
            d[c] = 1
    names = ", ".join(d)
    marks = ", ".join("?" for _ in d)
    cur.execute(f"INSERT INTO {table} ({names}) VALUES ({marks})", tuple(d.values()))
    return cur.lastrowid


def get_or_create(table, lookup, data=None):
    where = " AND ".join(f"{k} = ?" for k in lookup)
    row = cur.execute(f"SELECT id FROM {table} WHERE {where}", tuple(lookup.values())).fetchone()
    if row:
        return row[0], False
    return insert(table, {**lookup, **(data or {})}), True


def make_password(raw):
    """Hash compatible Django (PBKDF2-SHA256)."""
    iterations = 720000
    salt = base64.b64encode(os.urandom(9)).decode()[:12]
    h = hashlib.pbkdf2_hmac("sha256", raw.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(h).decode().strip()}"


# ---------------------------------------------------------------------
# Détection des tables
# ---------------------------------------------------------------------
T = {
    "user": "auth_user",
    "profil": find_table({"user_id", "role", "telephone"}),
    "zone": find_table({"nom", "gouvernorat"}),
    "produit": find_table({"nom", "prix_unitaire_legal"}),
    "commerce": find_table({"nom_boutique", "matricule_fiscale"}),
    "demande": find_table({"score_legitime", "statut", "commerce_id"}),
    "ligne": find_table({"quantite_demandee", "quantite_accordee"}),
    "stock": find_table({"seuil_critique", "commerce_id", "produit_id"}),
    "inspecteur": find_table({"badge_inspecteur"}),
    "signalement": find_table({"type_anomalie", "description"}),
    "alerte": find_table({"niveau_urgence", "message"}),
    "alerte_sig": find_table({"alerte_id", "signalementanomalie_id"}),
    "centre": find_table({"capacite_stockage", "nom"}),
    "ressource": find_table({"id_lot"}),
    "product": find_table({"sku", "minimum_stock"}),
    "mouvement": find_table({"movement_type", "stock_before"}),
}


def counts():
    return {k: cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for k, t in T.items()}


avant = counts()

try:
    # =================================================================
    # 1. UTILISATEURS + PROFILS
    # =================================================================
    users_data = [
        # username, prénom, nom, email, téléphone, rôle
        ("mouna", "Mouna", "Boussoffara", "mouna@gmail.com", "21600000", "COMMERCANT"),
        ("hanout_ali", "Ali", "Ben Salah", "ali.hanout@gmail.com", "21600001", "COMMERCANT"),
        ("hanout_sara", "Sara", "Trabelsi", "sara.hanout@gmail.com", "21600002", "COMMERCANT"),
        ("hanout_karim", "Karim", "Jlassi", "karim.hanout@gmail.com", "21600003", "COMMERCANT"),
        ("grossiste_nour", "Nour", "Gharbi", "nour.grossiste@gmail.com", "21600004", "GROSSISTE"),
        ("inspecteur_yessin", "Yessin", "Rebai", "yessin.inspecteur@gmail.com", "21600005", "INSPECTEUR"),
        ("inspecteur_amel", "Amel", "Mansouri", "amel.inspecteur@gmail.com", "21600006", "INSPECTEUR"),
    ]
    pwd = make_password("Test1234!")
    U = {}
    for username, fn, ln, email, tel, role in users_data:
        uid, created = get_or_create(
            T["user"], {"username": username},
            {"password": pwd, "is_superuser": 0, "first_name": fn, "last_name": ln,
             "email": email, "is_staff": 0, "is_active": 1})
        U[username] = uid
        get_or_create(T["profil"], {"user_id": uid}, {"role": role, "telephone": tel})
        print(("Utilisateur ajouté : " if created else "Utilisateur déjà existant : ") + username)

    # Le compte admin existant (s'il y en a un) peut aussi posséder des commerces
    row = cur.execute(f"SELECT id FROM {T['user']} WHERE username = 'admin'").fetchone()
    if row:
        U["admin"] = row[0]

    # =================================================================
    # 2. ZONES GÉOGRAPHIQUES
    # =================================================================
    zones_data = [
        ("Tunis Centre", "Tunis"),
        ("Ben Arous", "Ben Arous"),
        ("Sousse Ville", "Sousse"),
        ("Sfax Sud", "Sfax"),
        ("Nabeul Centre", "Nabeul"),
        ("Bizerte Nord", "Bizerte"),
    ]
    Z = {}
    for nom, gouv in zones_data:
        Z[nom], _ = get_or_create(T["zone"], {"nom": nom, "gouvernorat": gouv})
    print(f"Zones : {len(Z)}")

    # =================================================================
    # 3. PRODUITS (modèle demandes.Produit)
    # =================================================================
    produits_data = [
        ("Sucre", "1.200", 100), ("Farine", "0.800", 150), ("Huile", "3.500", 60),
        ("Semoule", "1.000", 120), ("Huile d'olive 1L", "12.000", 30),
        ("Lait", "1.400", 200), ("Riz", "2.200", 80), ("Pâtes", "0.900", 150),
    ]
    P = {}
    for nom, prix, plafond in produits_data:
        P[nom], _ = get_or_create(T["produit"], {"nom": nom},
                                  {"prix_unitaire_legal": prix, "plafond_ministere": plafond})
    print(f"Produits : {len(P)}")

    # =================================================================
    # 4. COMMERCES
    # =================================================================
    commerces_data = [
        # clé, propriétaire, nom boutique, matricule, adresse, zone
        ("c1", "mouna", "Hanout El Baraka", "1234567AAM000", "Avenue Habib Bourguiba", "Tunis Centre"),
        ("c2", "mouna", "Epicerie Ennasr", "1234568AAM001", "Rue de la Liberté", "Ben Arous"),
        ("c3", "hanout_ali", "Hanout Ali", "2234567BAM002", "Rue de la République", "Sousse Ville"),
        ("c4", "hanout_sara", "Alimentation Sara", "3234567CAM003", "Route de Gabès km 3", "Sfax Sud"),
        ("c5", "hanout_karim", "Superette Karim", "4234567DAM004", "Avenue de l'Indépendance", "Nabeul Centre"),
        ("c6", "hanout_ali", "Epicerie du Port", "5234567EAM005", "Rue du Port", "Bizerte Nord"),
    ]
    C = {}
    for key, owner, nom, mf, adr, zone in commerces_data:
        C[key], created = get_or_create(
            T["commerce"], {"nom_boutique": nom},
            {"commercant_id": U[owner], "matricule_fiscale": mf, "adresse": adr, "zone_id": Z[zone]})
        print(("Commerce ajouté : " if created else "Commerce déjà existant : ") + nom)

    # Si un compte admin existe, on lui donne aussi un commerce pour qu'il voie des données
    if "admin" in U:
        C["c7"], _ = get_or_create(
            T["commerce"], {"nom_boutique": "Hanout Admin"},
            {"commercant_id": U["admin"], "matricule_fiscale": "9999999ZAM009",
             "adresse": "Centre ville", "zone_id": Z["Tunis Centre"]})

    # =================================================================
    # 5. STOCKS DES COMMERCES  (ton module)
    # =================================================================
    stocks_data = [
        # commerce, produit, quantité, seuil critique
        ("c1", "Sucre", 120, 50), ("c1", "Farine", 30, 40), ("c1", "Huile", 15, 20),
        ("c1", "Semoule", 200, 60), ("c1", "Lait", 90, 50),
        ("c2", "Sucre", 45, 50), ("c2", "Riz", 70, 30), ("c2", "Pâtes", 110, 40),
        ("c2", "Huile d'olive 1L", 8, 10),
        ("c3", "Sucre", 300, 80), ("c3", "Farine", 250, 80), ("c3", "Lait", 20, 60),
        ("c4", "Huile", 5, 25), ("c4", "Semoule", 140, 50), ("c4", "Riz", 95, 30),
        ("c5", "Farine", 60, 60), ("c5", "Pâtes", 180, 50), ("c5", "Sucre", 75, 40),
        ("c6", "Lait", 150, 70), ("c6", "Huile d'olive 1L", 25, 10), ("c6", "Riz", 12, 30),
    ]
    n = 0
    for ckey, pnom, qte, seuil in stocks_data:
        _, created = get_or_create(
            T["stock"], {"commerce_id": C[ckey], "produit_id": P[pnom]},
            {"quantite": qte, "seuil_critique": seuil})
        n += created
    if "c7" in C:
        for pnom, qte, seuil in [("Sucre", 100, 40), ("Farine", 25, 30)]:
            get_or_create(T["stock"], {"commerce_id": C["c7"], "produit_id": P[pnom]},
                          {"quantite": qte, "seuil_critique": seuil})
    print(f"Stocks ajoutés : {n}")

    # =================================================================
    # 6. DEMANDES D'ALLOCATION + LIGNES
    # =================================================================
    demandes_data = [
        # commerce, commerçant, statut, score, [(produit, demandé, accordé)]
        ("c1", "mouna", "EN_ATTENTE", 72.5, [("Sucre", 80, 0), ("Farine", 50, 0)]),
        ("c1", "mouna", "ACCEPTEE", 88.0, [("Huile", 40, 40)]),
        ("c2", "mouna", "LIVREE", 91.0, [("Riz", 60, 60), ("Pâtes", 70, 70)]),
        ("c3", "hanout_ali", "REFUSEE", 25.0, [("Sucre", 500, 0)]),
        ("c4", "hanout_sara", "EN_ATTENTE", 64.0, [("Huile", 30, 0), ("Semoule", 40, 0)]),
        ("c5", "hanout_karim", "ACCEPTEE", 79.5, [("Farine", 100, 80)]),
        ("c6", "hanout_ali", "ANNULEE", 50.0, [("Lait", 120, 0)]),
    ]
    nd = 0
    for ckey, owner, statut, score, lignes in demandes_data:
        did, created = get_or_create(
            T["demande"], {"commerce_id": C[ckey], "commercant_id": U[owner], "statut": statut},
            {"grossiste_id": U["grossiste_nour"] if statut != "EN_ATTENTE" else None,
             "score_legitime": score})
        nd += created
        for pnom, dem, acc in lignes:
            get_or_create(T["ligne"], {"demande_id": did, "produit_id": P[pnom]},
                          {"quantite_demandee": dem, "quantite_accordee": acc})
    print(f"Demandes ajoutées : {nd}")

    # =================================================================
    # 7. INSPECTEURS, SIGNALEMENTS, ALERTES
    # =================================================================
    I = {}
    for username, badge, zone in [("inspecteur_yessin", "INSP-001", "Tunis"),
                                  ("inspecteur_amel", "INSP-002", "Sousse")]:
        I[username], _ = get_or_create(T["inspecteur"], {"badge_inspecteur": badge},
                                       {"user_id": U[username], "zone_intervention": zone})

    signalements_data = [
        ("inspecteur_yessin", "c1", "STOCKAGE_EXCESSIF", "Stock de semoule très supérieur aux besoins habituels."),
        ("inspecteur_yessin", "c2", "PRIX_ABUSIF", "Huile d'olive vendue au-dessus du prix légal."),
        ("inspecteur_amel", "c3", "STOCKAGE_EXCESSIF", "Quantités de sucre anormalement élevées."),
        ("inspecteur_amel", "c6", "PRODUIT_PERIME", "Lots de lait périmés en rayon."),
        ("inspecteur_yessin", "c4", "AUTRE", "Étiquetage des prix absent."),
    ]
    S = []
    for insp, ckey, typ, desc in signalements_data:
        sid, _ = get_or_create(T["signalement"], {"description": desc},
                               {"inspecteur_id": I[insp], "commerce_id": C[ckey], "type_anomalie": typ})
        S.append(sid)

    alertes_data = [
        ("Risque de stockage excessif à Tunis", "ELEVEE", "Tunis Centre", [S[0], S[1]]),
        ("Produits périmés détectés à Bizerte", "CRITIQUE", "Bizerte Nord", [S[3]]),
        ("Prix non conformes à Sousse", "MOYENNE", "Sousse Ville", [S[2]]),
    ]
    for msg, niveau, zone, sigs in alertes_data:
        aid, created = get_or_create(T["alerte"], {"message": msg},
                                     {"niveau_urgence": niveau, "zone_id": Z[zone]})
        if created:
            for sid in sigs:
                cur.execute(f"INSERT INTO {T['alerte_sig']} (alerte_id, signalementanomalie_id) VALUES (?, ?)",
                            (aid, sid))
    print("Inspecteurs, signalements et alertes : OK")

    # =================================================================
    # 8. CENTRES DE DISTRIBUTION + RESSOURCES SUBVENTIONNÉES
    # =================================================================
    centres_data = [
        ("Centre Tunis Nord", "Zone industrielle Ariana", 50000),
        ("Centre Sfax", "Route de Tunis km 8, Sfax", 35000),
        ("Centre Sousse", "Zone industrielle Sidi Abdelhamid", 28000),
    ]
    CD = {}
    for nom, adr, cap in centres_data:
        CD[nom], _ = get_or_create(T["centre"], {"nom": nom},
                                   {"adresse": adr, "capacite_stockage": cap})

    ressources_data = [
        # n° lot, centre, type, quantité, péremption (jours), prix achat, conforme
        ("LOT-001", "Centre Tunis Nord", "Sucre", 12000, 365, "0.900", 1),
        ("LOT-002", "Centre Tunis Nord", "Farine", 15000, 200, "0.600", 1),
        ("LOT-003", "Centre Sfax", "Huile", 6000, 180, "2.800", 1),
        ("LOT-004", "Centre Sfax", "Semoule", 8000, 90, "0.750", 0),
        ("LOT-005", "Centre Sousse", "Lait", 9000, -10, "1.100", 1),
        ("LOT-006", "Centre Sousse", "Riz", 7000, 400, "1.700", 1),
    ]
    for lot, centre, typ, qte, jours, prix, conf in ressources_data:
        get_or_create(T["ressource"], {"id_lot": lot},
                      {"centre_id": CD[centre], "type_ressource": typ, "quantite_totale_lot": qte,
                       "date_peremption": (today + timedelta(days=jours)).isoformat(),
                       "prix_achat_etat": prix, "conforme": conf})
    print("Centres et ressources : OK")

    # =================================================================
    # 9. PRODUCT + MOUVEMENTS DE STOCK (module du camarade)
    # =================================================================
    products_data = [
        ("SKU-001", "Sucre 1kg", "Épicerie", "Sucre blanc en poudre", "1.20", 500, 100),
        ("SKU-002", "Farine 1kg", "Épicerie", "Farine de blé", "0.80", 80, 100),
        ("SKU-003", "Huile 1L", "Huiles", "Huile végétale", "3.50", 300, 60),
        ("SKU-004", "Semoule 1kg", "Épicerie", "Semoule fine", "1.00", 40, 50),
    ]
    PR = {}
    for sku, name, cat, desc, prix, qte, mini in products_data:
        PR[sku], _ = get_or_create(T["product"], {"sku": sku},
                                   {"name": name, "category": cat, "description": desc,
                                    "unit_price": prix, "quantity": qte, "minimum_stock": mini})

    mouvements_data = [
        ("SKU-001", "in", 500, 0, 500, "Réception initiale"),
        ("SKU-002", "in", 150, 0, 150, "Réception initiale"),
        ("SKU-002", "out", -70, 150, 80, "Vente en gros"),
        ("SKU-003", "in", 300, 0, 300, "Réception initiale"),
        ("SKU-004", "in", 60, 0, 60, "Réception initiale"),
        ("SKU-004", "adjustment", -20, 60, 40, "Ajustement après inventaire"),
    ]
    for sku, typ, qte, avant_, apres_, motif in mouvements_data:
        get_or_create(T["mouvement"], {"product_id": PR[sku], "movement_type": typ, "reason": motif},
                      {"quantity": qte, "stock_before": avant_, "stock_after": apres_})
    print("Product et mouvements : OK")

    conn.commit()
    print("\n========================================")
    print("       INSERTION TERMINEE AVEC SUCCES")
    print("========================================")

except Exception as exc:
    conn.rollback()
    print("\nERREUR : aucune modification de cette transaction n'a été conservée.")
    print(exc)
    conn.close()
    raise SystemExit(1)


# ---------------------------------------------------------------------
# Résultats
# ---------------------------------------------------------------------
apres = counts()
print("\nNombre d'enregistrements avant et après :\n")
for k, t in T.items():
    print(f"{t:40} {avant[k]:>5} -> {apres[k]:>5}")

conn.close()
print("\nConnexion SQLite fermée.")
print("Mot de passe des comptes créés : Test1234!")
