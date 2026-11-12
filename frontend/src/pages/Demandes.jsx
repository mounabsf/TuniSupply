import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { api } from "../api.js";

const STATUTS = [
  ["", "Toutes"],
  ["EN_ATTENTE", "En attente"],
  ["ACCEPTEE", "Acceptée"],
  ["REFUSEE", "Refusée"],
  ["LIVREE", "Livrée"],
  ["ANNULEE", "Annulée"],
];

const BADGES = {
  EN_ATTENTE: "bg-amber-100 text-amber-700",
  ACCEPTEE: "bg-sky-100 text-sky-700",
  REFUSEE: "bg-rose-100 text-rose-700",
  LIVREE: "bg-emerald-100 text-emerald-700",
  ANNULEE: "bg-slate-200 text-slate-600",
};

export default function Demandes() {
  const [demandes, setDemandes] = useState([]);
  const [filtre, setFiltre] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = () =>
    api.get(`/demandes/${filtre ? `?statut=${filtre}` : ""}`).then(setDemandes).catch(() => setErreur("Impossible de charger les demandes."));

  useEffect(() => { charger(); }, [filtre]);

  const changerStatut = async (id, action) => {
    if (!window.confirm(action === "cloturer" ? "Clôturer cette demande ?" : "Annuler cette demande ?")) return;
    try {
      await api.post(`/demandes/${id}/statut/`, { action });
      charger();
    } catch (e) {
      setErreur(e.detail || "Action impossible.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Demandes d'allocation</h1>
          <p className="text-slate-500">Suivez l'avancement de vos demandes.</p>
        </div>
        <Link to="/demandes/nouvelle" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <Plus size={18} /> Nouvelle demande
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUTS.map(([code, label]) => (
          <button
            key={code}
            onClick={() => setFiltre(code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filtre === code ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {erreur && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-6 space-y-4">
        {demandes.length === 0 && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow">Aucune demande pour le moment.</p>
        )}
        {demandes.map((d) => (
          <div key={d.id} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demande #{d.id}</p>
                <h3 className="text-lg font-bold text-slate-800">{d.commerce_nom}</h3>
                <p className="text-sm text-slate-400">{new Date(d.date_demande).toLocaleString("fr-FR")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGES[d.statut]}`}>{d.statut_label}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {d.lignes.map((l) => (
                <span key={l.id} className="rounded-xl bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                  {l.produit_nom} × {Number(l.quantite_demandee)}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="w-48">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Légitimité</span><span className="font-bold text-slate-600">{Number(d.score_legitime)}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${Number(d.score_legitime)}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {d.peut_modifier && (
                  <Link to={`/demandes/${d.id}/modifier`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    <Pencil size={14} /> Modifier
                  </Link>
                )}
                {!d.est_terminee && (
                  <>
                    <button onClick={() => changerStatut(d.id, "cloturer")} className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">Clôturer</button>
                    <button onClick={() => changerStatut(d.id, "annuler")} className="rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-100">Annuler</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}