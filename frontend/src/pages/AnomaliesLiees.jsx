import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { TYPE_BADGES, formatDate } from "../anomaliesConfig.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Carte({ s, motifs }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signalement #{s.id}</p>
          <h3 className="text-lg font-bold text-slate-800">{s.commerce_nom || "Commerce non précisé"}</h3>
          {s.zone_nom && <p className="text-sm text-slate-500">{s.zone_nom} · {s.gouvernorat}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_BADGES[s.type_anomalie]}`}>{s.type_label}</span>
      </div>
      <p className="mt-3 text-slate-600">{s.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>{formatDate(s.date_signalement)}</span>
        {motifs?.map((m) => (
          <span key={m} className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">{m}</span>
        ))}
      </div>
    </div>
  );
}

export default function AnomaliesLiees() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tous, setTous] = useState([]);
  const [detail, setDetail] = useState(null); // { courant, liees } du signalement choisi
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/signalements/").then(setTous).catch(() => setErreur("Impossible de charger les signalements."));
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.get(`/signalements/${id}/`), api.get(`/signalements/${id}/liees/`)])
      .then(([courant, liees]) => setDetail({ courant, liees }))
      .catch(() => setErreur("Signalement introuvable."));
  }, [id]);

  // on n'affiche le détail que s'il correspond bien au signalement choisi
  const courant = id && detail && String(detail.courant.id) === id ? detail.courant : null;
  const liees = courant ? detail.liees : [];

  // pourquoi deux signalements sont-ils liés ?
  const motifs = (s) => {
    const m = [];
    if (courant && s.alertes.some((a) => courant.alertes.includes(a))) m.push("Même alerte");
    if (courant && s.commerce && s.commerce === courant.commerce) m.push("Même commerce");
    return m;
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-800">Anomalies liées</h1>
      <p className="text-slate-500">Retrouvez les signalements regroupés dans la même alerte ou visant le même commerce.</p>

      <label className="mt-6 block text-sm font-semibold">Choisir un signalement</label>
      <select className={`${input} mt-1 max-w-xl`} value={id || ""} onChange={(e) => navigate(e.target.value ? `/anomalies/liees/${e.target.value}` : "/anomalies/liees")}>
        <option value="">-- Choisir --</option>
        {tous.map((s) => (
          <option key={s.id} value={s.id}>
            #{s.id} · {s.type_label} · {s.commerce_nom || "sans commerce"}
          </option>
        ))}
      </select>

      {erreur && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      {courant && (
        <div className="mt-6 space-y-4">
          <Carte s={courant} />
          <h2 className="pt-2 font-bold text-emerald-700">{liees.length} anomalie(s) liée(s)</h2>
          {liees.length === 0 && (
            <p className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow">Aucune anomalie liée.</p>
          )}
          {liees.map((s) => <Carte key={s.id} s={s} motifs={motifs(s)} />)}
        </div>
      )}
    </div>
  );
}
