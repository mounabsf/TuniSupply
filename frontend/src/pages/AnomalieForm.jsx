import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { TYPES } from "../anomaliesConfig.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export default function AnomalieForm() {
  const navigate = useNavigate();
  const { id } = useParams();            // présent : on MODIFIE le signalement #id
  const [commerces, setCommerces] = useState([]);
  const [commerce, setCommerce] = useState("");
  const [type, setType] = useState("PRIX_ABUSIF");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/commerces/").then(setCommerces).catch(() => setErreur("Impossible de charger les commerces."));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/signalements/${id}/`)
      .then((s) => {
        setType(s.type_anomalie);
        setCommerce(s.commerce ? String(s.commerce) : "");
        setDescription(s.description);
      })
      .catch(() => setErreur("Impossible de charger ce signalement."));
  }, [id]);

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur("");
    try {
      const data = { commerce: commerce || null, type_anomalie: type, description };
      if (id) await api.patch(`/signalements/${id}/`, data);
      else await api.post("/signalements/", data);
      navigate("/anomalies");
    } catch (err) {
      setErreur(err.description?.[0] || err.detail || "Vérifiez les champs du formulaire.");
    }
  };

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">{id ? `Modifier le signalement #${id}` : "Nouveau signalement"}</h1>
      <p className="mt-1 text-sm text-slate-500">Signalez un prix abusif, un stockage excessif ou un produit périmé.</p>

      <label className="mt-6 block text-sm font-semibold">Type d'anomalie</label>
      <select className={`${input} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.filter(([code]) => code).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>

      <label className="mt-5 block text-sm font-semibold">Commerce ciblé</label>
      <select className={`${input} mt-1`} value={commerce} onChange={(e) => setCommerce(e.target.value)}>
        <option value="">-- Aucun / inconnu --</option>
        {commerces.map((c) => (
          <option key={c.id} value={c.id}>{c.nom_boutique} ({c.zone_nom})</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-400">
        Une alerte de zone n'est générée que si un commerce est indiqué.
      </p>

      <label className="mt-5 block text-sm font-semibold">Description</label>
      <textarea
        required rows={5} className={`${input} mt-1`} value={description}
        placeholder="Décrivez précisément ce que vous avez constaté…"
        onChange={(e) => setDescription(e.target.value)}
      />

      {erreur && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/anomalies" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</Link>
        <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
