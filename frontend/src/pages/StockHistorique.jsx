import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine } from "lucide-react";
import { api } from "../api.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const dateHeure = new Intl.DateTimeFormat("fr-TN", { dateStyle: "medium", timeStyle: "short" });

const TYPES = {
  in: { label: "Entrée", icone: ArrowDownToLine, badge: "bg-emerald-100 text-emerald-700" },
  out: { label: "Sortie", icone: ArrowUpFromLine, badge: "bg-rose-100 text-rose-700" },
  adjustment: { label: "Ajustement", icone: ArrowLeftRight, badge: "bg-sky-100 text-sky-700" },
};

export default function StockHistorique() {
  const [mouvements, setMouvements] = useState([]);
  const [produits, setProduits] = useState([]);
  const [produit, setProduit] = useState("all");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => { api.get("/stock/products/").then(setProduits).catch(() => {}); }, []);

  useEffect(() => {
    setChargement(true);
    setErreur("");
    api.get(`/stock/movements/${produit === "all" ? "" : `?product=${produit}`}`)
      .then(setMouvements)
      .catch(() => setErreur("Impossible de charger l'historique."))
      .finally(() => setChargement(false));
  }, [produit]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Historique des mouvements</h1>
          <p className="text-slate-500">Chaque entrée, sortie et ajustement enregistré.</p>
        </div>
        <select value={produit} onChange={(e) => setProduit(e.target.value)} className={`${input} w-72`}>
          <option value="all">Tous les produits</option>
          {produits.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
        </select>
      </div>

      {erreur && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-6 space-y-4">
        {!chargement && mouvements.length === 0 && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow">Aucun mouvement pour le moment.</p>
        )}
        {mouvements.map((m) => {
          const t = TYPES[m.movement_type] || TYPES.adjustment;
          const Icone = t.icone;
          const signe = m.movement_type === "out" ? "-" : m.quantity > 0 ? "+" : "";
          return (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.product_sku}</p>
                <h3 className="text-lg font-bold text-slate-800">{m.product_name}</h3>
                <p className="text-sm text-slate-400">{dateHeure.format(new Date(m.created_at))}{m.reason ? ` · ${m.reason}` : ""}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${t.badge}`}>
                <Icone size={14} /> {t.label}
              </span>
              <div className="text-sm">
                <p className="text-xl font-extrabold text-slate-800">{signe}{Math.abs(m.quantity)}</p>
                <p className="text-slate-400">stock après : {m.stock_after}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
