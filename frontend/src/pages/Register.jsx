import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthCard from "../components/AuthCard.jsx";
import Erreurs from "../components/Erreurs.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../auth/context.js";
import { messagesErreur } from "../roles.js";
import { btnPrimary, input, label } from "../ui.js";

// Seuls ces deux rôles sont proposés à l'inscription ; Admin et Inspecteur sont créés par un administrateur.
const CHOIX = [
  ["COMMERCANT", "Commerçant", "Je gère un commerce et je demande des produits subventionnés."],
  ["GROSSISTE", "Grossiste", "Je traite les demandes d'allocation et livre les commerces."],
];

export default function Register() {
  const { user, register } = useAuth();
  const [f, setF] = useState({
    role: "COMMERCANT", username: "", email: "", first_name: "", last_name: "",
    telephone: "", password: "", password_confirm: "",
  });
  const [erreurs, setErreurs] = useState([]);
  const [envoi, setEnvoi] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurs([]);
    setEnvoi(true);
    try {
      await register(f);
    } catch (err) {
      setErreurs(err?.status === 429
        ? ["Trop d'inscriptions depuis cette connexion. Réessayez plus tard."]
        : messagesErreur(err));
      setEnvoi(false);
    }
  };

  return (
    <AuthCard
      wide
      title="Créer un compte"
      subtitle="Quelques informations suffisent pour commencer."
      footer={<>Déjà inscrit ? <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Se connecter</Link></>}
    >
      <form onSubmit={envoyer} className="mt-6 space-y-5">
        <fieldset>
          <legend className={label}>Je suis…</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {CHOIX.map(([code, titre, aide]) => (
              <label key={code}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                  f.role === code ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-200"
                }`}>
                <input type="radio" name="role" value={code} checked={f.role === code}
                  onChange={maj("role")} className="sr-only" />
                <span className="block font-bold text-slate-800">{titre}</span>
                <span className="mt-1 block text-xs text-slate-500">{aide}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="first_name">Prénom</label>
            <input id="first_name" autoComplete="given-name" className={`${input} mt-1`} value={f.first_name} onChange={maj("first_name")} />
          </div>
          <div>
            <label className={label} htmlFor="last_name">Nom</label>
            <input id="last_name" autoComplete="family-name" className={`${input} mt-1`} value={f.last_name} onChange={maj("last_name")} />
          </div>
          <div>
            <label className={label} htmlFor="username">Nom d'utilisateur *</label>
            <input id="username" required autoComplete="username" className={`${input} mt-1`} value={f.username} onChange={maj("username")} />
          </div>
          <div>
            <label className={label} htmlFor="telephone">Téléphone</label>
            <input id="telephone" type="tel" autoComplete="tel" className={`${input} mt-1`} value={f.telephone} onChange={maj("telephone")} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="email">E-mail *</label>
            <input id="email" type="email" required autoComplete="email" className={`${input} mt-1`} value={f.email} onChange={maj("email")} />
          </div>
          <div>
            <label className={label} htmlFor="password">Mot de passe *</label>
            <div className="mt-1"><PasswordInput id="password" required autoComplete="new-password" value={f.password} onChange={maj("password")} /></div>
          </div>
          <div>
            <label className={label} htmlFor="password_confirm">Confirmer le mot de passe *</label>
            <div className="mt-1"><PasswordInput id="password_confirm" required autoComplete="new-password" value={f.password_confirm} onChange={maj("password_confirm")} /></div>
          </div>
        </div>
        <p className="text-xs text-slate-400">8 caractères minimum, ni trop courant ni uniquement numérique.</p>

        <Erreurs messages={erreurs} />

        <button disabled={envoi} className={`${btnPrimary} flex w-full items-center justify-center gap-2`}>
          <UserPlus size={18} /> {envoi ? "Création…" : "Créer mon compte"}
        </button>
      </form>
    </AuthCard>
  );
}
