import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Champ({ label, erreur, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold">{label}</label>
      <div className="mt-1">{children}</div>
      {erreur && <p className="mt-1 text-xs text-rose-600">{erreur}</p>}
    </div>
  );
}

export default function FournisseurForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", zone_couverte: "", capacite_livraison: "" });
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (event) => setForm((current) => ({ ...current, [champ]: event.target.value }));

  const envoyer = async (event) => {
    event.preventDefault();
    setErreurs({});
    setErreur("");
    setEnvoi(true);
    try {
      await api.post("/fournisseurs/", form);
      navigate("/fournisseurs");
    } catch (err) {
      const parChamp = {};
      for (const [cle, valeur] of Object.entries(err || {})) {
        if (cle !== "detail" && cle !== "non_field_errors") parChamp[cle] = [].concat(valeur).join(" ");
      }
      setErreurs(parChamp);
      setErreur(err?.detail || [].concat(err?.non_field_errors || []).join(" ") ||
        (Object.keys(parChamp).length ? "" : "Vérifiez les champs du formulaire."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">Ajouter un fournisseur</h1>
      <p className="mt-2 text-sm text-slate-500">Le nouveau fournisseur sera créé avec le statut « Actif ».</p>

      <div className="mt-6 space-y-4">
        <Champ label="Nom du fournisseur" erreur={erreurs.nom}>
          <input required maxLength={150} className={input} value={form.nom} onChange={maj("nom")} />
        </Champ>
        <Champ label="Zone couverte" erreur={erreurs.zone_couverte}>
          <input required maxLength={150} className={input} value={form.zone_couverte} onChange={maj("zone_couverte")} placeholder="Ex. Sfax, Sousse" />
        </Champ>
        <Champ label="Capacité de livraison" erreur={erreurs.capacite_livraison}>
          <input required type="number" min="0.01" step="0.01" className={input} value={form.capacite_livraison} onChange={maj("capacite_livraison")} />
        </Champ>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/fournisseurs" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</Link>
        <button disabled={envoi} className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-60">
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
