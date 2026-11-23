import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, Pencil, Play, Plus, Route, X } from "lucide-react";
import { api } from "../api.js";

const STATUTS = [
  ["", "Toutes"],
  ["PLANIFIEE", "Planifiées"],
  ["EN_COURS", "En cours"],
  ["TERMINEE", "Terminées"],
  ["ANNULEE", "Annulées"],
];

const BADGES = {
  PLANIFIEE: "bg-sky-100 text-sky-700",
  EN_COURS: "bg-amber-100 text-amber-700",
  TERMINEE: "bg-emerald-100 text-emerald-700",
  ANNULEE: "bg-slate-200 text-slate-600",
};

const formaterDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR") : "—";

export default function Operations() {
  const [operations, setOperations] = useState([]);
  const [filtre, setFiltre] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    const query = filtre ? `?statut=${encodeURIComponent(filtre)}` : "";
    return api.get(`/operations/${query}`)
      .then((liste) => {
        setOperations(liste);
        setErreur("");
      })
      .catch(() => setErreur("Impossible de charger les opérations logistiques."));
  }, [filtre]);

  useEffect(() => {
    charger();
  }, [charger]);

  const changerStatut = async (operation, action, confirmation) => {
    if (!window.confirm(confirmation)) return;
    setErreur("");
    try {
      await api.post(`/operations/${operation.id}/${action}/`);
      await charger();
    } catch (err) {
      setErreur(err.detail || "Impossible de modifier le statut de cette opération.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Opérations logistiques</h1>
          <p className="text-slate-500">Planifiez et suivez les opérations de livraison.</p>
        </div>
        <Link to="/logistique/nouvelle" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <Plus size={18} /> Planifier une opération
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

      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-6 space-y-4">
        {operations.length === 0 && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400">
            Aucune opération pour ce statut.
          </p>
        )}
        {operations.map((operation) => (
          <article key={operation.id} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Opération · {operation.id.slice(0, 8)}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CalendarDays size={16} /> {formaterDate(operation.date_prevue)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGES[operation.statut_livraison]}`}>
                {operation.statut_label}
              </span>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <Route size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="whitespace-pre-wrap text-sm text-slate-700">{operation.itineraire_optimise}</p>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p><span className="font-semibold">Logisticien :</span> {operation.logisticien_nom || "Non assigné"}</p>
              <p><span className="font-semibold">Dépôt :</span> {operation.depot_rattachement || "Non précisé"}</p>
              <p><span className="font-semibold">Centre de départ :</span> {operation.centre_depart_nom || "Non défini"}</p>
            </div>

            {operation.ressources_detail.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lots transportés</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {operation.ressources_detail.map((resource) => (
                    <span key={resource.id} className="rounded-xl bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                      {resource.id_lot} · {resource.type_ressource}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(operation.peut_modifier || operation.peut_annuler || operation.peut_demarrer || operation.peut_terminer) && (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {operation.peut_modifier && (
                  <Link to={`/logistique/${operation.id}/modifier`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    <Pencil size={14} /> Modifier
                  </Link>
                )}
                {operation.peut_annuler && (
                  <button
                    onClick={() => changerStatut(
                      operation,
                      "annuler",
                      `Annuler l’opération du ${formaterDate(operation.date_prevue)} ?`,
                    )}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    <X size={14} /> Annuler
                  </button>
                )}
                {operation.peut_demarrer && (
                  <button
                    onClick={() => changerStatut(operation, "demarrer", "Démarrer cette opération logistique ?")}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    <Play size={14} /> Démarrer
                  </button>
                )}
                {operation.peut_terminer && (
                  <button
                    onClick={() => changerStatut(operation, "terminer", "Confirmer la fin de cette opération ?")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Check size={14} /> Terminer
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
