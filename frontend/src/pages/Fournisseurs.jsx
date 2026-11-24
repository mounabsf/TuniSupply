import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Building2, ClipboardList, Plus, RefreshCw } from "lucide-react";
import { api } from "../api.js";

const STATUTS = {
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  SOUS_SURVEILLANCE: "Sous surveillance",
  INACTIF: "Inactif",
};

const BADGES = {
  ACTIF: "bg-emerald-100 text-emerald-700",
  SUSPENDU: "bg-rose-100 text-rose-700",
  SOUS_SURVEILLANCE: "bg-amber-100 text-amber-700",
  INACTIF: "bg-slate-100 text-slate-500",
};

const input = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [archives, setArchives] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actionId, setActionId] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const liste = await api.get(`/fournisseurs/${archives ? "?archives=true" : ""}`);
      setFournisseurs(liste);
      setErreur("");
    } catch (err) {
      setErreur(err.detail || "Impossible de charger les fournisseurs.");
    } finally {
      setChargement(false);
    }
  }, [archives]);

  useEffect(() => {
    let actif = true;
    api.get(`/fournisseurs/${archives ? "?archives=true" : ""}`)
      .then((liste) => {
        if (!actif) return;
        setFournisseurs(liste);
        setErreur("");
      })
      .catch((err) => {
        if (actif) setErreur(err.detail || "Impossible de charger les fournisseurs.");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => { actif = false; };
  }, [archives]);

  const changerStatut = async (fournisseur, statut) => {
    setActionId(fournisseur.id);
    setErreur("");
    try {
      const maj = await api.put(`/fournisseurs/${fournisseur.id}/statut/`, { statut });
      setFournisseurs((liste) => liste.map((item) => item.id === maj.id ? maj : item));
    } catch (err) {
      setErreur(err.detail || "Impossible de modifier le statut du fournisseur.");
    } finally {
      setActionId(null);
    }
  };

  const archiver = async (fournisseur) => {
    if (!window.confirm(`Archiver ${fournisseur.nom} ? Son historique de livraisons sera conservé.`)) return;
    setActionId(fournisseur.id);
    setErreur("");
    try {
      await api.post(`/fournisseurs/${fournisseur.id}/archiver/`);
      await charger();
    } catch (err) {
      setErreur(err.detail || "Impossible d'archiver ce fournisseur.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Fournisseurs</h1>
          <p className="text-slate-500">Gérez les fournisseurs et consultez leur fiabilité et leurs livraisons.</p>
        </div>
        <Link to="/fournisseurs/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <Plus size={18} /> Ajouter un fournisseur
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setChargement(true);
            setArchives((value) => !value);
          }}
          aria-pressed={archives}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${archives ? "bg-slate-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {archives ? "Voir les fournisseurs actifs" : "Afficher les archives"}
        </button>
        <button onClick={charger} disabled={chargement} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-4 overflow-x-auto rounded-3xl bg-white shadow-lg shadow-slate-200/60">
        {chargement ? (
          <p className="p-10 text-center text-slate-400">Chargement des fournisseurs…</p>
        ) : fournisseurs.length === 0 ? (
          <p className="p-10 text-center text-slate-400">
            {archives ? "Aucun fournisseur archivé." : "Aucun fournisseur enregistré pour le moment."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4 font-semibold">Fournisseur</th>
                <th className="px-5 py-4 font-semibold">Zone couverte</th>
                <th className="px-5 py-4 text-right font-semibold">Capacité</th>
                <th className="px-5 py-4 font-semibold">Fiabilité</th>
                <th className="px-5 py-4 font-semibold">Statut</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4 font-bold text-slate-800">
                    <span className="inline-flex items-center gap-2"><Building2 size={16} className="text-slate-400" />{fournisseur.nom}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{fournisseur.zone_couverte}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-700">
                    {Number(fournisseur.capacite_livraison).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {fournisseur.score_fiabilite === null ? "Pas encore évalué" : `${fournisseur.score_fiabilite} %`}
                  </td>
                  <td className="px-5 py-4">
                    {fournisseur.est_archive ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGES[fournisseur.statut]}`}>{STATUTS[fournisseur.statut]} · Archivé</span>
                    ) : (
                      <select
                        aria-label={`Statut de ${fournisseur.nom}`}
                        className={`${input} ${BADGES[fournisseur.statut]}`}
                        value={fournisseur.statut}
                        disabled={actionId === fournisseur.id}
                        onChange={(event) => changerStatut(fournisseur, event.target.value)}
                      >
                        {Object.entries(STATUTS)
                          .filter(([code]) => code !== "INACTIF")
                          .map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`/fournisseurs/${fournisseur.id}/livraisons`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        <ClipboardList size={14} /> Livraisons
                      </Link>
                      {!fournisseur.est_archive && (
                        <button
                          onClick={() => archiver(fournisseur)}
                          disabled={actionId === fournisseur.id}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <Archive size={14} /> Archiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
