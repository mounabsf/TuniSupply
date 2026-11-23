import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/context.js";

function messageErreur(error, fallback) {
  return error?.detail || Object.values(error || {}).flat()[0] || fallback;
}

export default function Stocks() {
  const { user } = useAuth();
  const [commerces, setCommerces] = useState([]);
  const [commerce, setCommerce] = useState("");
  const [stocks, setStocks] = useState([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(0);
  const peutModifier = ["ADMIN", "COMMERCANT"].includes(user?.role);

  useEffect(() => {
    api.get("/commerces/")
      .then((items) => {
        const visibles = user?.role === "COMMERCANT"
          ? items.filter((item) => item.commercant_id === user.id)
          : items;
        setCommerces(visibles);
      })
      .catch((error) => setErreur(messageErreur(error, "Impossible de charger les commerces.")));
  }, [user]);

  useEffect(() => {
    let active = true;
    api.get(`/stocks/${commerce ? `?commerce=${encodeURIComponent(commerce)}` : ""}`)
      .then((data) => {
        if (active) {
          setStocks(data);
          setErreur("");
        }
      })
      .catch((error) => {
        if (active) setErreur(messageErreur(error, "Impossible de charger les stocks."));
      })
      .finally(() => {
        if (active) setChargement(false);
      });
    return () => { active = false; };
  }, [commerce, actualisation]);

  async function supprimer(stock) {
    if (!window.confirm(`Supprimer le stock de ${stock.produit_nom} pour ${stock.commerce_nom} ?`)) return;
    setErreur("");
    try {
      await api.delete(`/stocks/${stock.id}/`);
      setActualisation((value) => value + 1);
    } catch (error) {
      setErreur(messageErreur(error, "Impossible de supprimer ce stock."));
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Stocks des commerces</h1>
          <p className="mt-1 text-slate-500">Consultez les quantités et repérez les seuils critiques.</p>
        </div>
        {peutModifier && (
          <Link to={`/stocks/nouveau${commerce ? `?commerce=${encodeURIComponent(commerce)}` : ""}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
            <Plus size={18} /> Ajouter au stock
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
        <label className="block max-w-md text-sm font-semibold text-slate-700">
          Filtrer par commerce
          <select value={commerce} onChange={(event) => setCommerce(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            {user?.role !== "COMMERCANT" && <option value="">Tous les commerces</option>}
            {commerces.map((item) => (
              <option key={item.id} value={item.id}>{item.nom_boutique}</option>
            ))}
          </select>
        </label>

        {erreur && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{erreur}</p>}
        {chargement ? (
          <p className="py-10 text-center text-slate-500">Chargement des stocks…</p>
        ) : stocks.length === 0 ? (
          <p className="py-10 text-center text-slate-500">Aucun produit en stock pour ce commerce.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Commerce</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Seuil critique</th>
                  <th className="px-4 py-3">État</th>
                  {peutModifier && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr key={stock.id} className={`border-b border-slate-100 ${stock.est_critique ? "bg-rose-50 text-rose-900" : ""}`}>
                    <td className="px-4 py-4 font-semibold">{stock.produit_nom}</td>
                    <td className="px-4 py-4">{stock.commerce_nom}</td>
                    <td className="px-4 py-4">{stock.quantite}</td>
                    <td className="px-4 py-4">{stock.seuil_critique}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${stock.est_critique ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {stock.est_critique ? "Seuil critique" : "Disponible"}
                      </span>
                    </td>
                    {peutModifier && (
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Link to={`/stocks/${stock.id}/modifier`} aria-label={`Modifier ${stock.produit_nom}`}
                            className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Pencil size={17} /></Link>
                          <button type="button" onClick={() => supprimer(stock)} aria-label={`Supprimer ${stock.produit_nom}`}
                            className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
