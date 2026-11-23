import { useEffect, useState } from "react";
import { listLivraisons } from "../api/fournisseurs";
import StatutBadge from "./StatutBadge";

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR");
const formatQuantite = (q) => Number(q).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function Etat({ ok, oui, non }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
      ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
      {ok ? oui : non}
    </span>
  );
}

export default function LivraisonsFournisseur({ fournisseur, onBack }) {
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let actif = true;
    setLoading(true);
    listLivraisons(fournisseur.id)
      .then((data) => actif && setLivraisons(data))
      .catch((err) => actif && setError(err.message))
      .finally(() => actif && setLoading(false));
    return () => { actif = false; };
  }, [fournisseur.id]);

  return (
    <div>
      <button onClick={onBack}
              className="mb-5 rounded-lg border border-brun/20 bg-white px-4 py-2 text-sm font-medium text-brun hover:bg-cream">
        Retour aux fournisseurs
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-brun">Livraisons de {fournisseur.nom}</h2>
          <p className="mt-1 text-sm text-brun/60">Historique des livraisons, de la plus récente à la plus ancienne.</p>
        </div>
        <div className="flex items-center gap-3">
          {fournisseur.score_fiabilite != null && (
            <span className="text-sm text-brun/70">Fiabilité : <strong className="text-brun">{fournisseur.score_fiabilite} %</strong></span>
          )}
          <StatutBadge statut={fournisseur.statut} />
        </div>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-brun/50">Chargement…</p>
        ) : livraisons.length === 0 ? (
          <p className="p-8 text-center text-sm text-brun/50">Aucune livraison enregistrée pour ce fournisseur.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brun/10 text-brun/60">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Quantité livrée</th>
                <th className="px-6 py-3 font-medium">Conformité</th>
                <th className="px-6 py-3 font-medium">Délai</th>
              </tr>
            </thead>
            <tbody>
              {livraisons.map((l) => (
                <tr key={l.id} className="border-b border-brun/5 last:border-0">
                  <td className="px-6 py-3.5 text-brun">{formatDate(l.date_livraison)}</td>
                  <td className="px-6 py-3.5 text-brun">{formatQuantite(l.quantite_livree)}</td>
                  <td className="px-6 py-3.5"><Etat ok={l.conforme} oui="Conforme" non="Non conforme" /></td>
                  <td className="px-6 py-3.5"><Etat ok={l.ponctuel} oui="À l'heure" non="En retard" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
