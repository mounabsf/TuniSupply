import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Boxes, Package, Pencil, Plus, Search, ShieldAlert, Trash2, TrendingUp, X } from "lucide-react";
import { api } from "../api.js";

// Mêmes styles que Demandes.jsx / DemandeForm.jsx
const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const btnPrimaire = "inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700";
const btnSecondaire = "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50";
const monnaie = new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 2 });

// message d'erreur lisible à partir de la réponse de l'API
const msg = (e) =>
  (typeof e?.detail === "string" && e.detail) ||
  Object.values(e || {}).flat().find((v) => typeof v === "string") ||
  "Une erreur est survenue. Veuillez réessayer.";

function Fenetre({ titre, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-300/60">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-800">{titre}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Champ({ label, className = "", children }) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}

function FormProduit({ produit, onClose, onSave }) {
  const [f, setF] = useState({
    name: produit?.name || "", sku: produit?.sku || "", category: produit?.category || "",
    unit_price: produit?.unit_price ?? "0.00", minimum_stock: produit?.minimum_stock ?? 0,
    initial_quantity: 0, description: produit?.description || "",
  });
  const [envoi, setEnvoi] = useState(false);
  const maj = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    const data = {
      name: f.name.trim(), sku: f.sku.trim(), category: f.category.trim(), description: f.description,
      unit_price: Number(f.unit_price), minimum_stock: Number(f.minimum_stock),
    };
    if (!produit) data.initial_quantity = Number(f.initial_quantity);
    await onSave(data, produit);
    setEnvoi(false);
  };

  return (
    <Fenetre titre={produit ? "Modifier le produit" : "Nouveau produit"} onClose={onClose}>
      <form onSubmit={envoyer} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Champ label="Nom du produit"><input name="name" required maxLength="160" className={input} value={f.name} onChange={maj} /></Champ>
        <Champ label="Référence (SKU)"><input name="sku" required maxLength="32" className={input} value={f.sku} onChange={maj} /></Champ>
        <Champ label="Catégorie"><input name="category" maxLength="80" className={input} value={f.category} onChange={maj} /></Champ>
        <Champ label="Prix unitaire (TND)"><input name="unit_price" type="number" min="0" step="0.01" required className={input} value={f.unit_price} onChange={maj} /></Champ>
        <Champ label="Seuil minimum"><input name="minimum_stock" type="number" min="0" step="1" required className={input} value={f.minimum_stock} onChange={maj} /></Champ>
        {!produit && (
          <Champ label="Stock initial"><input name="initial_quantity" type="number" min="0" step="1" required className={input} value={f.initial_quantity} onChange={maj} /></Champ>
        )}
        <Champ label="Description" className="sm:col-span-2">
          <textarea name="description" rows="3" className={input} value={f.description} onChange={maj} />
        </Champ>
        <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
          <button disabled={envoi} className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-60">
            {envoi ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}

const TYPES = [["in", "Entrée"], ["out", "Sortie"], ["adjustment", "Ajustement"]];

function FormMouvement({ produits, produit, onClose, onSave }) {
  const [f, setF] = useState({ product: produit?.id || produits[0]?.id || "", movement_type: "in", quantity: 1, reason: "" });
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    await onSave({ ...f, product: Number(f.product), quantity: Number(f.quantity) });
    setEnvoi(false);
  };

  return (
    <Fenetre titre="Enregistrer un mouvement" onClose={onClose}>
      {produits.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">Ajoutez d'abord un produit au catalogue.</p>
      ) : (
        <form onSubmit={envoyer} className="mt-6 space-y-4">
          <Champ label="Produit">
            <select required className={input} value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>
              {produits.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku} · stock : {p.quantity}</option>)}
            </select>
          </Champ>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(([code, label]) => (
              <button type="button" key={code} onClick={() => setF({ ...f, movement_type: code })}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${f.movement_type === code ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-50"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label={f.movement_type === "adjustment" ? "Variation (+ ou -)" : "Quantité"}>
              <input type="number" step="1" required className={input} value={f.quantity}
                min={f.movement_type === "adjustment" ? undefined : "1"}
                onChange={(e) => setF({ ...f, quantity: e.target.value })} />
            </Champ>
            <Champ label="Motif">
              <input maxLength="240" className={input} value={f.reason} placeholder="Ex. Réception fournisseur"
                onChange={(e) => setF({ ...f, reason: e.target.value })} />
            </Champ>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button disabled={envoi} className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-60">
              {envoi ? "Enregistrement..." : "Valider le mouvement"}
            </button>
          </div>
        </form>
      )}
    </Fenetre>
  );
}

function Stat({ icone: Icone, titre, valeur, detail, teinte }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${teinte}`}><Icone size={21} /></span>
      <p className="mt-4 text-3xl font-extrabold text-slate-800">{valeur}</p>
      <p className="text-sm font-semibold text-slate-500">{titre}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default function Stock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [produits, setProduits] = useState([]);
  const [tous, setTous] = useState([]);
  const [d, setD] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [niveau, setNiveau] = useState("all");
  const [categorie, setCategorie] = useState("all");
  const [fenetre, setFenetre] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = () => {
    const p = new URLSearchParams();
    if (recherche.trim()) p.set("search", recherche.trim());
    if (niveau !== "all") p.set("stock_status", niveau);
    if (categorie !== "all") p.set("category", categorie);
    const q = p.toString() ? `?${p}` : "";
    setChargement(true);
    setErreur("");
    Promise.all([api.get(`/stock/products/${q}`), api.get("/stock/products/"), api.get("/stock/dashboard/")])
      .then(([liste, toutes, dash]) => { setProduits(liste); setTous(toutes); setD(dash); })
      .catch((e) => setErreur(msg(e)))
      .finally(() => setChargement(false));
  };

  useEffect(() => { charger(); }, [recherche, niveau, categorie]); // eslint-disable-line

  // le lien « Nouveau produit » du menu (/stock/nouveau) ouvre le formulaire
  useEffect(() => {
    if (pathname.endsWith("/nouveau")) setFenetre({ type: "produit" });
  }, [pathname]);

  const fermer = () => {
    setFenetre(null);
    if (pathname.endsWith("/nouveau")) navigate("/stock", { replace: true });
  };

  const enregistrerProduit = async (data, produit) => {
    try {
      if (produit) await api.patch(`/stock/products/${produit.id}/`, data);
      else await api.post("/stock/products/", data);
      fermer();
      charger();
    } catch (e) { setErreur(msg(e)); }
  };

  const enregistrerMouvement = async (data) => {
    try {
      await api.post("/stock/movements/", data);
      fermer();
      charger();
    } catch (e) { setErreur(msg(e)); }
  };

  const supprimer = async (p) => {
    if (!window.confirm(`Retirer ${p.name} du catalogue ? L'historique est conservé.`)) return;
    try { await api.delete(`/stock/products/${p.id}/`); charger(); }
    catch (e) { setErreur(msg(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Stocks des commerces</h1>
          <p className="text-slate-500">Suivez vos produits, vos niveaux de stock et les mouvements récents.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setFenetre({ type: "mouvement" })} className={btnSecondaire}><ArrowLeftRight size={18} /> Mouvement</button>
          <button onClick={() => setFenetre({ type: "produit" })} className={btnPrimaire}><Plus size={18} /> Nouveau produit</button>
        </div>
      </div>

      {erreur && (
        <p className="mt-4 flex items-center justify-between rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">
          {erreur}
          <button onClick={charger} className="font-semibold underline">Réessayer</button>
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icone={Package} titre="Produits actifs" valeur={d?.total_products ?? "—"} detail={`${d?.category_count ?? 0} catégories`} teinte="bg-emerald-50 text-emerald-600" />
        <Stat icone={Boxes} titre="Unités en stock" valeur={d?.total_units ?? "—"} detail={`${d?.out_of_stock_products ?? 0} en rupture`} teinte="bg-sky-100 text-sky-700" />
        <Stat icone={ShieldAlert} titre="Alertes de stock" valeur={d?.low_stock_products ?? "—"} detail="Au seuil minimum ou en dessous" teinte="bg-amber-100 text-amber-700" />
        <Stat icone={TrendingUp} titre="Valeur du stock" valeur={d ? monnaie.format(Number(d.inventory_value)) : "—"} detail="Au prix unitaire" teinte="bg-rose-50 text-rose-500" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Rechercher un produit ou une référence..." value={recherche}
            onChange={(e) => setRecherche(e.target.value)} className={`${input} pl-11`} />
        </label>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={`${input} w-56`}>
          <option value="all">Toutes les catégories</option>
          {(d?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={`${input} w-48`}>
          <option value="all">Tous les niveaux</option>
          <option value="low">Stock bas</option>
          <option value="out">En rupture</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {!chargement && produits.length === 0 && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow">Aucun produit pour le moment.</p>
        )}
        {produits.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Package size={22} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{p.sku} · {p.category || "Non classé"}</p>
                <h3 className="truncate text-lg font-bold text-slate-800">{p.name}</h3>
                <p className="text-sm text-slate-400">{monnaie.format(Number(p.unit_price))} l'unité</p>
              </div>
            </div>

            <div className="text-sm">
              <p className="text-slate-400">Quantité</p>
              <p><span className="text-xl font-extrabold text-slate-800">{p.quantity}</span> <span className="text-slate-400">/ min. {p.minimum_stock}</span></p>
            </div>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              p.quantity === 0 ? "bg-rose-100 text-rose-700" : p.is_low_stock ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {p.quantity === 0 ? "Rupture" : p.is_low_stock ? "Stock bas" : "Disponible"}
            </span>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFenetre({ type: "mouvement", produit: p })}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                <ArrowLeftRight size={14} /> Mouvement
              </button>
              <button onClick={() => setFenetre({ type: "produit", produit: p })}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Pencil size={14} /> Modifier
              </button>
              <button onClick={() => supprimer(p)}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-100">
                <Trash2 size={14} /> Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      {fenetre?.type === "produit" && <FormProduit produit={fenetre.produit} onClose={fermer} onSave={enregistrerProduit} />}
      {fenetre?.type === "mouvement" && <FormMouvement produits={tous} produit={fenetre.produit} onClose={fermer} onSave={enregistrerMouvement} />}
    </div>
  );
}
