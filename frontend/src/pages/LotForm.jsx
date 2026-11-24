import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

// Suggestions pour le champ « Type de ressource » (on peut aussi taper autre chose)
const TYPES = ["Farine", "Semoule", "Huile végétale", "Sucre", "Lait"];

const VIDE = {
  centre: "",
  id_lot: "",
  type_ressource: "",
  quantite_totale_lot: "",
  prix_achat_etat: "",
  date_peremption: "",
  conforme: true,
};

function Champ({ label, erreur, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold">{label}</label>
      <div className="mt-1">{children}</div>
      {erreur && <p className="mt-1 text-xs text-rose-600">{erreur}</p>}
    </div>
  );
}

export default function LotForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [f, setF] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/ressources/centres/").then(setCentres);
    if (id) {
      api.get(`/ressources/lots/${id}/`).then((l) =>
        setF({
          centre: l.centre,
          id_lot: l.id_lot,
          type_ressource: l.type_ressource,
          quantite_totale_lot: l.quantite_totale_lot,
          prix_achat_etat: l.prix_achat_etat,
          date_peremption: l.date_peremption,
          conforme: l.conforme,
        })
      );
    }
  }, [id]);

  const maj = (champ) => (e) =>
    setF({ ...f, [champ]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurs({});
    setErreur("");
    try {
      if (id) await api.put(`/ressources/lots/${id}/`, f);
      else await api.post("/ressources/lots/", f);
      navigate("/ressources", {
        state: { message: id ? "Le lot a bien été modifié." : "Le lot a bien été ajouté." },
      });
    } catch (err) {
      // DRF renvoie { champ: ["message"] } pour les erreurs de validation
      const parChamp = {};
      for (const [cle, val] of Object.entries(err || {})) {
        if (cle !== "detail" && cle !== "non_field_errors") parChamp[cle] = [].concat(val).join(" ");
      }
      setErreurs(parChamp);
      setErreur(err?.detail || [].concat(err?.non_field_errors || []).join(" ") ||
        (Object.keys(parChamp).length ? "" : "Vérifiez les champs du formulaire."));
    }
  };

  // Valeur d'achat totale du lot, recalculée à chaque frappe
  const quantiteNum = parseFloat(f.quantite_totale_lot);
  const prixNum = parseFloat(f.prix_achat_etat);
  const valeur = Number.isFinite(quantiteNum) && Number.isFinite(prixNum) ? quantiteNum * prixNum : null;

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">
        {id ? `Modifier le lot #${id}` : "Ajouter un lot de ressources"}
      </h1>

      <div className="mt-6 space-y-4">
        <Champ label="Centre de distribution" erreur={erreurs.centre}>
          <select required className={input} value={f.centre} onChange={maj("centre")}>
            <option value="">-- Choisir --</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </Champ>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Type de ressource" erreur={erreurs.type_ressource}>
            <input required list="types-ressources" maxLength={100} className={input} value={f.type_ressource} onChange={maj("type_ressource")} placeholder="Ex. Farine" />
            <datalist id="types-ressources">
              {TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Champ>
          <Champ label="Numéro de lot" erreur={erreurs.id_lot}>
            <input required maxLength={50} className={input} value={f.id_lot} onChange={maj("id_lot")} placeholder="Ex. TUN-F-001" />
          </Champ>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Quantité totale du lot" erreur={erreurs.quantite_totale_lot}>
            <input required type="number" min="0.01" step="0.01" className={input} value={f.quantite_totale_lot} onChange={maj("quantite_totale_lot")} />
          </Champ>
          <Champ label="Prix d'achat unitaire (DT)" erreur={erreurs.prix_achat_etat}>
            <input required type="number" min="0" step="0.001" className={input} value={f.prix_achat_etat} onChange={maj("prix_achat_etat")} />
          </Champ>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Valeur d'achat du lot</p>
            <p className="text-xs text-slate-500">Quantité × prix d'achat</p>
          </div>
          <p className="font-serif text-2xl font-bold tabular-nums text-emerald-700">
            {valeur === null
              ? "—"
              : `${valeur.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`}
          </p>
        </div>

        <Champ label="Date de péremption" erreur={erreurs.date_peremption}>
          <input required type="date" className={input} value={f.date_peremption} onChange={maj("date_peremption")} />
        </Champ>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={f.conforme} onChange={maj("conforme")} className="h-4 w-4 accent-emerald-600" />
          Lot conforme aux normes
        </label>
      </div>

      {erreur && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/ressources" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Annuler</Link>
        <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700">
          Enregistrer
        </button>
      </div>
    </form>
  );
}