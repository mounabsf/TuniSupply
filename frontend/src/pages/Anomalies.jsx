import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, MapPin, Plus } from "lucide-react";
import { api } from "../api.js";
import { TYPES, TYPE_BADGES, formatDate } from "../anomaliesConfig.js";

export default function Anomalies() {
  const [signalements, setSignalements] = useState([]);
  const [filtre, setFiltre] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api
      .get(`/signalements/${filtre ? `?type=${filtre}` : ""}`)
      .then(setSignalements)
      .catch(() => setErreur("Impossible de charger les signalements."));
  }, [filtre]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Anomalies signalées</h1>
          <p className="text-slate-500">Signalements enregistrés par les inspecteurs sur le terrain.</p>
        </div>
        <Link to="/anomalies/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <Plus size={18} /> Nouveau signalement
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TYPES.map(([code, label]) => (
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
        {signalements.length === 0 && !erreur && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow">Aucun signalement pour le moment.</p>
        )}
        {signalements.map((s) => (
          <div key={s.id} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signalement #{s.id}</p>
                <h3 className="text-lg font-bold text-slate-800">{s.commerce_nom || "Commerce non précisé"}</h3>
                {s.zone_nom && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin size={14} /> {s.zone_nom} · {s.gouvernorat}
                  </p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_BADGES[s.type_anomalie]}`}>
                {s.type_label}
              </span>
            </div>

            <p className="mt-3 text-slate-600">{s.description}</p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <span>
                {formatDate(s.date_signalement)}
                {s.inspecteur_nom && <> · par {s.inspecteur_nom}</>}
              </span>
              <Link to={`/anomalies/liees/${s.id}`} className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700">
                <Link2 size={15} /> Anomalies liées
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
