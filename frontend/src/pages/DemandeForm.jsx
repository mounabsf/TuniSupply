import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export default function DemandeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commerces, setCommerces] = useState([]);
  const [produits, setProduits] = useState([]);
  const [commerce, setCommerce] = useState("");
  const [lignes, setLignes] = useState([{ produit: "", quantite_demandee: "" }]);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/commerces/").then(setCommerces);
    api.get("/produits/").then(setProduits);
    if (id) {
      api.get(`/demandes/${id}/`).then((d) => {
        setCommerce(d.commerce);
        setLignes(d.lignes.map((l) => ({ produit: l.produit, quantite_demandee: l.quantite_demandee })));
      });
    }
  }, [id]);

  const majLigne = (i, champ, valeur) =>
    setLignes(lignes.map((l, idx) => (idx === i ? { ...l, [champ]: valeur } : l)));

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur("");
    const data = {
      commerce,
      lignes: lignes.filter((l) => l.produit && l.quantite_demandee),
    };
    try {
      if (id) await api.put(`/demandes/${id}/`, data);
      else await api.post("/demandes/", data);
      navigate("/demandes");
    } catch (err) {
      setErreur(err.detail || "Vérifiez les champs du formulaire.");
    }
  };

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">
        {id ? `Modifier la demande #${id}` : "Nouvelle demande d'allocation"}
      </h1>

      <label className="mt-6 block text-sm font-semibold">Commerce</label>
      <select required className={`${input} mt-1`} value={commerce} onChange={(e) => setCommerce(e.target.value)}>
        <option value="">-- Choisir --</option>
        {commerces.map((c) => (
          <option key={c.id} value={c.id}>{c.nom_boutique} ({c.zone_nom})</option>
        ))}
      </select>

      <h2 className="mt-8 font-bold text-emerald-700">Produits demandés</h2>
      <div className="mt-3 space-y-3">
        {lignes.map((l, i) => (
          <div key={i} className="flex gap-3">
            <select className={input} value={l.produit} onChange={(e) => majLigne(i, "produit", e.target.value)}>
              <option value="">Produit</option>
              {produits.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            <input
              type="number" min="0.01" step="0.01" placeholder="Quantité"
              className={`${input} w-40`} value={l.quantite_demandee}
              onChange={(e) => majLigne(i, "quantite_demandee", e.target.value)}
            />
            <button type="button" onClick={() => setLignes(lignes.filter((_, idx) => idx !== i))}
              className="rounded-xl bg-rose-50 px-3 text-rose-500 hover:bg-rose-100">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setLignes([...lignes, { produit: "", quantite_demandee: "" }])}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <Plus size={16} /> Ajouter un produit
      </button>

      {erreur && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/demandes" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</Link>
        <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700">
          Enregistrer
        </button>
      </div>
    </form>
  );
}