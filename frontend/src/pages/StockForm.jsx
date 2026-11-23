import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/context.js";

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function messageErreur(error) {
  return error?.detail || Object.values(error || {}).flat()[0] || "Vérifiez les champs du formulaire.";
}

export default function StockForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commerces, setCommerces] = useState([]);
  const [produits, setProduits] = useState([]);
  const [form, setForm] = useState({ commerce: "", produit: "", quantite: "0", seuil_critique: "0" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let active = true;
    async function charger() {
      try {
        const [commerceItems, produitItems, stock] = await Promise.all([
          api.get("/commerces/"),
          api.get("/produits/"),
          id ? api.get(`/stocks/${id}/`) : Promise.resolve(null),
        ]);
        const visibles = user?.role === "COMMERCANT"
          ? commerceItems.filter((item) => item.commercant_id === user.id)
          : commerceItems;
        if (!active) return;
        setCommerces(visibles);
        setProduits(produitItems);
        setForm(stock ? {
          commerce: String(stock.commerce),
          produit: String(stock.produit),
          quantite: String(stock.quantite),
          seuil_critique: String(stock.seuil_critique),
        } : {
          commerce: searchParams.get("commerce") || (visibles.length === 1 ? String(visibles[0].id) : ""),
          produit: "",
          quantite: "0",
          seuil_critique: "0",
        });
      } catch (error) {
        if (active) setErreur(messageErreur(error));
      } finally {
        if (active) setChargement(false);
      }
    }
    charger();
    return () => { active = false; };
  }, [id, searchParams, user]);

  function modifier(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function enregistrer(event) {
    event.preventDefault();
    setErreur("");
    setEnvoi(true);
    const data = {
      commerce: Number(form.commerce),
      produit: Number(form.produit),
      quantite: Number(form.quantite),
      seuil_critique: Number(form.seuil_critique),
    };
    try {
      if (id) await api.put(`/stocks/${id}/`, data);
      else await api.post("/stocks/", data);
      navigate("/stocks");
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) return <p className="py-10 text-center text-slate-500">Chargement du formulaire…</p>;

  return (
    <form onSubmit={enregistrer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">{id ? "Modifier un stock" : "Ajouter un produit au stock"}</h1>
      <p className="mt-1 text-sm text-slate-500">Renseignez le commerce, le produit, la quantité et le seuil critique.</p>

      <label className="mt-6 block text-sm font-semibold text-slate-700">
        Commerce
        <select required name="commerce" value={form.commerce} onChange={modifier} className={input}>
          <option value="">Choisir un commerce</option>
          {commerces.map((commerce) => (
            <option key={commerce.id} value={commerce.id}>{commerce.nom_boutique}</option>
          ))}
        </select>
      </label>

      <label className="mt-5 block text-sm font-semibold text-slate-700">
        Produit
        <select required name="produit" value={form.produit} onChange={modifier} className={input}>
          <option value="">Choisir un produit</option>
          {produits.map((produit) => (
            <option key={produit.id} value={produit.id}>{produit.nom}</option>
          ))}
        </select>
      </label>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Quantité
          <input required min="0" step="1" type="number" name="quantite" value={form.quantite}
            onChange={modifier} className={input} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Seuil critique
          <input required min="0" step="1" type="number" name="seuil_critique" value={form.seuil_critique}
            onChange={modifier} className={input} />
        </label>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{erreur}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/stocks" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</Link>
        <button disabled={envoi || commerces.length === 0 || produits.length === 0}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {envoi ? "Enregistrement…" : id ? "Enregistrer" : "Ajouter au stock"}
        </button>
      </div>
    </form>
  );
}
