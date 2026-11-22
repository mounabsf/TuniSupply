import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import AuthCard from "../components/AuthCard.jsx";
import Erreurs from "../components/Erreurs.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../auth/context.js";
import { messagesErreur } from "../roles.js";
import { btnPrimary, input, label } from "../ui.js";

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreurs, setErreurs] = useState([]);
  const [envoi, setEnvoi] = useState(false);

  // déjà connecté (ou connexion réussie) : retour à la page demandée, sinon l'accueil
  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurs([]);
    setEnvoi(true);
    try {
      await login(username, password);
    } catch (err) {
      setErreurs(err?.status === 429
        ? ["Trop de tentatives. Patientez une minute avant de réessayer."]
        : messagesErreur(err));
      setEnvoi(false);
    }
  };

  return (
    <AuthCard
      title="Connexion"
      subtitle="Accédez à votre espace TuniSupply AI."
      footer={<>Pas encore de compte ? <Link to="/inscription" className="font-semibold text-emerald-600 hover:text-emerald-700">Créer un compte</Link></>}
    >
      <form onSubmit={envoyer} className="mt-6 space-y-4">
        <div>
          <label className={label} htmlFor="username">Nom d'utilisateur ou e-mail</label>
          <input id="username" required autoFocus autoComplete="username" className={`${input} mt-1`}
            value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="password">Mot de passe</label>
          <div className="mt-1">
            <PasswordInput id="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        <Erreurs messages={erreurs} />

        <button disabled={envoi} className={`${btnPrimary} flex w-full items-center justify-center gap-2`}>
          <LogIn size={18} /> {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </AuthCard>
  );
}
