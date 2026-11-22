import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import Erreurs from "../components/Erreurs.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../auth/context.js";
import { api } from "../api.js";
import { ROLE_BADGES, ROLE_LABELS, messagesErreur } from "../roles.js";
import { btnPrimary, input, label } from "../ui.js";

function Succes({ texte }) {
  return texte ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{texte}</p> : null;
}

export default function Profil() {
  const { user, setUser } = useAuth();

  // ----- informations personnelles -----
  const [f, setF] = useState({
    first_name: user.first_name, last_name: user.last_name, email: user.email, telephone: user.telephone,
  });
  const [errInfos, setErrInfos] = useState([]);
  const [okInfos, setOkInfos] = useState("");

  const enregistrer = async (e) => {
    e.preventDefault();
    setErrInfos([]); setOkInfos("");
    try {
      setUser(await api.patch("/auth/me/", f));
      setOkInfos("Informations enregistrées.");
    } catch (err) {
      setErrInfos(messagesErreur(err));
    }
  };

  // ----- mot de passe -----
  const vide = { old_password: "", new_password: "", new_password_confirm: "" };
  const [mdp, setMdp] = useState(vide);
  const [errMdp, setErrMdp] = useState([]);
  const [okMdp, setOkMdp] = useState("");

  const changerMdp = async (e) => {
    e.preventDefault();
    setErrMdp([]); setOkMdp("");
    try {
      await api.post("/auth/password/", mdp);
      setMdp(vide);
      setOkMdp("Mot de passe modifié.");
    } catch (err) {
      setErrMdp(messagesErreur(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800">Mon profil</h1>
        <p className="text-slate-500">Gérez vos informations et votre mot de passe.</p>
      </div>

      <form onSubmit={enregistrer} className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Informations personnelles</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGES[user.role]}`}>{ROLE_LABELS[user.role]}</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nom d'utilisateur</label>
            <input disabled className={`${input} mt-1`} value={user.username} />
          </div>
          <div>
            <label className={label} htmlFor="first_name">Prénom</label>
            <input id="first_name" className={`${input} mt-1`} value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="last_name">Nom</label>
            <input id="last_name" className={`${input} mt-1`} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="email">E-mail</label>
            <input id="email" type="email" className={`${input} mt-1`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="telephone">Téléphone</label>
            <input id="telephone" type="tel" className={`${input} mt-1`} value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} />
          </div>
        </div>

        <Erreurs messages={errInfos} />
        <Succes texte={okInfos} />
        <div className="mt-6 flex justify-end">
          <button className={`${btnPrimary} inline-flex items-center gap-2`}><Save size={17} /> Enregistrer</button>
        </div>
      </form>

      <form onSubmit={changerMdp} className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><KeyRound size={18} className="text-emerald-600" /> Changer le mot de passe</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className={label} htmlFor="old_password">Mot de passe actuel</label>
            <div className="mt-1"><PasswordInput id="old_password" required autoComplete="current-password" value={mdp.old_password} onChange={(e) => setMdp({ ...mdp, old_password: e.target.value })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="new_password">Nouveau mot de passe</label>
              <div className="mt-1"><PasswordInput id="new_password" required autoComplete="new-password" value={mdp.new_password} onChange={(e) => setMdp({ ...mdp, new_password: e.target.value })} /></div>
            </div>
            <div>
              <label className={label} htmlFor="new_password_confirm">Confirmation</label>
              <div className="mt-1"><PasswordInput id="new_password_confirm" required autoComplete="new-password" value={mdp.new_password_confirm} onChange={(e) => setMdp({ ...mdp, new_password_confirm: e.target.value })} /></div>
            </div>
          </div>
        </div>
        <Erreurs messages={errMdp} />
        <Succes texte={okMdp} />
        <div className="mt-6 flex justify-end">
          <button className={btnPrimary}>Modifier le mot de passe</button>
        </div>
      </form>
    </div>
  );
}
