import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Erreurs from "../components/Erreurs.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../auth/context.js";
import { api } from "../api.js";
import { ROLES, messagesErreur } from "../roles.js";
import { btnGhost, btnPrimary, input, label } from "../ui.js";

const VIDE = {
  username: "", email: "", first_name: "", last_name: "", telephone: "",
  role: "COMMERCANT", is_active: true, password: "",
};

export default function CompteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: moi, setUser } = useAuth();
  const [f, setF] = useState(VIDE);
  const [charge, setCharge] = useState(!id); // false tant que le compte à modifier n'est pas chargé
  const [erreurs, setErreurs] = useState([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/comptes/${id}/`)
      .then((c) => { setF({ ...VIDE, ...c, password: "" }); setCharge(true); })
      .catch((e) => setErreurs(messagesErreur(e)));
  }, [id]);

  const soi = Boolean(id) && Number(id) === moi.id; // garde-fous : on ne se rétrograde / désactive pas soi-même
  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurs([]);
    setEnvoi(true);
    const data = {
      username: f.username, email: f.email, first_name: f.first_name, last_name: f.last_name,
      telephone: f.telephone, role: f.role, is_active: f.is_active,
    };
    if (f.password) data.password = f.password; // vide en modification = mot de passe inchangé
    try {
      if (id) {
        const resultat = await api.patch(`/comptes/${id}/`, data);
        if (soi) setUser(resultat); // met à jour le nom affiché dans la barre du haut
      } else {
        await api.post("/comptes/", data);
      }
      navigate("/comptes");
    } catch (err) {
      setErreurs(messagesErreur(err));
      setEnvoi(false);
    }
  };

  if (!charge) {
    return erreurs.length ? <Erreurs messages={erreurs} /> : <p className="text-slate-400">Chargement…</p>;
  }

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">
        {id ? `Modifier le compte @${f.username}` : "Nouveau compte"}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="first_name">Prénom</label>
          <input id="first_name" className={`${input} mt-1`} value={f.first_name} onChange={maj("first_name")} />
        </div>
        <div>
          <label className={label} htmlFor="last_name">Nom</label>
          <input id="last_name" className={`${input} mt-1`} value={f.last_name} onChange={maj("last_name")} />
        </div>
        <div>
          <label className={label} htmlFor="username">Nom d'utilisateur *</label>
          <input id="username" required className={`${input} mt-1`} value={f.username} onChange={maj("username")} />
        </div>
        <div>
          <label className={label} htmlFor="telephone">Téléphone</label>
          <input id="telephone" type="tel" className={`${input} mt-1`} value={f.telephone} onChange={maj("telephone")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="email">E-mail</label>
          <input id="email" type="email" className={`${input} mt-1`} value={f.email} onChange={maj("email")} />
        </div>
        <div>
          <label className={label} htmlFor="role">Rôle *</label>
          <select id="role" className={`${input} mt-1`} value={f.role} onChange={maj("role")} disabled={soi}>
            {ROLES.map(([code, nom]) => <option key={code} value={code}>{nom}</option>)}
          </select>
          {soi && <p className="mt-1 text-xs text-slate-400">Vous ne pouvez pas changer votre propre rôle.</p>}
        </div>
        <div>
          <label className={label} htmlFor="password">{id ? "Nouveau mot de passe" : "Mot de passe *"}</label>
          <div className="mt-1">
            <PasswordInput id="password" required={!id} autoComplete="new-password" value={f.password} onChange={maj("password")}
              placeholder={id ? "Laisser vide pour ne pas changer" : ""} />
          </div>
        </div>
      </div>

      <label className={`mt-6 flex items-center gap-3 ${soi ? "opacity-60" : "cursor-pointer"}`}>
        <input type="checkbox" checked={f.is_active} disabled={soi}
          onChange={(e) => setF({ ...f, is_active: e.target.checked })}
          className="h-5 w-5 rounded accent-emerald-600" />
        <span className="text-sm font-semibold text-slate-700">Compte actif (peut se connecter)</span>
      </label>

      <Erreurs messages={erreurs} />

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/comptes" className={btnGhost}>Annuler</Link>
        <button disabled={envoi} className={btnPrimary}>{envoi ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}
