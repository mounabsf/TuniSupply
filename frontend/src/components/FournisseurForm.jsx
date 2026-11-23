import { useState } from "react";
import { ApiError, createFournisseur } from "../api/fournisseurs";

const inputClasses =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brun placeholder:text-brun/40 " +
  "focus:outline-none focus:ring-2 focus:ring-rouille/25";

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-brun">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}

export default function FournisseurForm({ onSaved, onCancel }) {
  const [values, setValues] = useState({ nom: "", zone_couverte: "", capacite_livraison: "" });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  const border = (name) => (errors[name] ? "border-danger" : "border-brun/20 focus:border-rouille");

  function validate() {
    const e = {};
    if (!values.nom.trim()) e.nom = "Saisissez le nom du fournisseur.";
    if (!values.zone_couverte.trim()) e.zone_couverte = "Saisissez la zone couverte.";
    if (!(Number(values.capacite_livraison) > 0)) e.capacite_livraison = "Saisissez une capacité supérieure à 0.";
    return e;
  }

  async function submit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setGlobalError("");
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const created = await createFournisseur({
        nom: values.nom.trim(),
        zone_couverte: values.zone_couverte.trim(),
        capacite_livraison: values.capacite_livraison,
      });
      onSaved(created);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        // Erreurs de validation du serializer, champ par champ.
        const fromApi = {};
        for (const key of ["nom", "zone_couverte", "capacite_livraison"]) {
          if (err.fields[key]) fromApi[key] = err.fields[key][0];
        }
        setErrors(fromApi);
      }
      setGlobalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="font-display text-2xl font-bold text-brun">Nouveau fournisseur</h2>

      <div className="mt-6 space-y-5">
        <Field label="Nom" error={errors.nom}>
          <input name="nom" value={values.nom} onChange={change} placeholder="Ex. Grossiste Sfax Distribution"
                 className={`${inputClasses} ${border("nom")}`} />
        </Field>
        <Field label="Zone couverte" error={errors.zone_couverte}>
          <input name="zone_couverte" value={values.zone_couverte} onChange={change} placeholder="Ex. Sfax, Mahdia"
                 className={`${inputClasses} ${border("zone_couverte")}`} />
        </Field>
        <Field label="Capacité de livraison" error={errors.capacite_livraison}>
          <input name="capacite_livraison" type="number" min="0" step="0.01" inputMode="decimal"
                 value={values.capacite_livraison} onChange={change} placeholder="Quantité"
                 className={`${inputClasses} ${border("capacite_livraison")}`} />
        </Field>
      </div>

      {globalError && !Object.keys(errors).length && (
        <p role="alert" className="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{globalError}</p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button type="button" onClick={onCancel}
                className="rounded-lg border border-brun/20 bg-white px-5 py-2.5 text-sm font-medium text-brun hover:bg-cream">
          Annuler
        </button>
        <button type="submit" disabled={saving}
                className="rounded-lg bg-rouille px-5 py-2.5 text-sm font-semibold text-white hover:bg-rouille-dark disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
