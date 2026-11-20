import { useEffect, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { api } from "../api.js";
import { TYPE_BADGES, URGENCES, URGENCE_BADGES, formatDate } from "../anomaliesConfig.js";

export default function Alertes() {
  const [alertes, setAlertes] = useState([]);
  const [resume, setResume] = useState({});
  const [filtre, setFiltre] = useState("");
  const [ouvertes, setOuvertes] = useState({});
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/alertes/resume/").then(setResume).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get(`/alertes/${filtre ? `?urgence=${filtre}` : ""}`)
      .then(setAlertes)
      .catch(() => setErreur("Impossible de charger les alertes."));
  }, [filtre]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-800">Alertes prioritaires</h1>
      <p className="text-slate-500">Les signalements d'une même zone sont regroupés en alertes, les plus urgentes en premier.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {URGENCES.map(([code, label]) => (
          <button
            key={code}
            onClick={() => setFiltre(filtre === code ? "" : code)}
            className={`rounded-3xl bg-white p-5 text-left shadow-lg shadow-slate-200/60 transition hover:-translate-y-0.5 ${
              filtre === code ? "ring-4 ring-emerald-200" : ""
            }`}
          >
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${URGENCE_BADGES[code]}`}>{label}</span>
            <p className="mt-3 text-3xl font-extrabold text-slate-800">{resume[code] ?? 0}</p>
            <p className="text-xs text-slate-400">alerte(s)</p>
          </button>
        ))}
      </div>

      {erreur && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-6 space-y-4">
        {alertes.length === 0 && !erreur && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow">Aucune alerte.</p>
        )}
        {alertes.map((a) => (
          <div key={a.id} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alerte #{a.id}</p>
                <h3 className="flex items-center gap-1 text-lg font-bold text-slate-800">
                  <MapPin size={18} className="text-emerald-600" /> {a.zone_nom}
                  <span className="text-sm font-normal text-slate-400">· {a.gouvernorat}</span>
                </h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${URGENCE_BADGES[a.niveau_urgence]}`}>
                {a.urgence_label}
              </span>
            </div>

            <p className="mt-3 text-slate-600">{a.message}</p>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <span>Créée le {formatDate(a.date_creation)}</span>
              <button
                onClick={() => setOuvertes({ ...ouvertes, [a.id]: !ouvertes[a.id] })}
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {a.nb_signalements} signalement(s)
                <ChevronDown size={16} className={`transition ${ouvertes[a.id] ? "rotate-180" : ""}`} />
              </button>
            </div>

            {ouvertes[a.id] && (
              <ul className="mt-4 space-y-2">
                {a.signalements.map((s) => (
                  <li key={s.id} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-emerald-800">{s.commerce_nom || "Commerce non précisé"}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_BADGES[s.type_anomalie]}`}>{s.type_label}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{s.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
