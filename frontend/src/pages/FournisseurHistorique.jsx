import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { api } from "../api.js";

const fmtDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR") : "—";

export default function FournisseurHistorique() {
  const { id } = useParams();
  const [fournisseur, setFournisseur] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    Promise.all([
      api.get(`/fournisseurs/${id}/`),
      api.get(`/fournisseurs/${id}/livraisons/`),
    ])
      .then(([details, historique]) => {
        if (!actif) return;
        setFournisseur(details);
        setLivraisons(historique);
      })
      .catch((err) => {
        if (actif) setErreur(err.detail || "Impossible de charger l'historique des livraisons.");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => { actif = false; };
  }, [id]);

  return (
    <div>
      <Link to="/fournisseurs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700">
        <ArrowLeft size={16} /> Retour aux fournisseurs
      </Link>

      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}
      {chargement ? (
        <p className="mt-6 rounded-3xl bg-white p-10 text-center text-slate-400">Chargement de l'historique…</p>
      ) : fournisseur && (
        <>
          <div className="mt-5">
            <h1 className="text-3xl font-extrabold text-slate-800">Livraisons · {fournisseur.nom}</h1>
            <p className="mt-1 text-slate-500">Zone couverte : {fournisseur.zone_couverte}</p>
          </div>

          <div className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-lg shadow-slate-200/60">
            {livraisons.length === 0 ? (
              <p className="p-10 text-center text-slate-400">Aucune livraison enregistrée pour ce fournisseur.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 text-right font-semibold">Quantité livrée</th>
                    <th className="px-5 py-4 font-semibold">Conformité</th>
                    <th className="px-5 py-4 font-semibold">Ponctualité</th>
                  </tr>
                </thead>
                <tbody>
                  {livraisons.map((livraison) => (
                    <tr key={livraison.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4 text-slate-700">{fmtDate(livraison.date_livraison)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800">{Number(livraison.quantite_livree).toLocaleString("fr-FR")}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 ${livraison.conforme ? "text-emerald-700" : "text-rose-600"}`}>
                          {livraison.conforme ? <Check size={15} /> : <X size={15} />}
                          {livraison.conforme ? "Conforme" : "Non conforme"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 ${livraison.ponctuel ? "text-emerald-700" : "text-rose-600"}`}>
                          {livraison.ponctuel ? <Check size={15} /> : <X size={15} />}
                          {livraison.ponctuel ? "À l'heure" : "En retard"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
