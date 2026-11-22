import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Pencil, Power, Search, Trash2, UserPlus } from "lucide-react";
import Erreurs from "../components/Erreurs.jsx";
import { useAuth } from "../auth/context.js";
import { api } from "../api.js";
import { ROLES, ROLE_BADGES, ROLE_LABELS, initiales, messagesErreur, nomComplet } from "../roles.js";
import { input } from "../ui.js";

const ETATS = [["", "Tous"], ["true", "Actifs"], ["false", "Désactivés"]];

const puce = (actif) =>
  `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
    actif ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"
  }`;

export default function Comptes() {
  const { user: moi } = useAuth();
  const [comptes, setComptes] = useState(null); // null = chargement
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [actif, setActif] = useState("");
  const [version, setVersion] = useState(0); // incrémenté pour recharger après une action
  const [erreurs, setErreurs] = useState([]);
  const [aSupprimer, setASupprimer] = useState(null); // compte en attente de confirmation

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    if (actif) params.set("actif", actif);
    const t = setTimeout(() => {
      api.get(`/comptes/?${params}`).then(setComptes).catch((e) => setErreurs(messagesErreur(e)));
    }, 250); // petite attente pendant la frappe
    return () => clearTimeout(t);
  }, [q, role, actif, version]);

  const agir = async (action) => {
    setErreurs([]);
    try {
      await action();
      setVersion((v) => v + 1);
    } catch (e) {
      setErreurs(messagesErreur(e));
    }
  };

  const basculer = (c) =>
    agir(() => api.patch(`/comptes/${c.id}/`, { is_active: !c.is_active }));

  const confirmerSuppression = async () => {
    const c = aSupprimer;
    setASupprimer(null);
    await agir(() => api.delete(`/comptes/${c.id}/`));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Gestion des comptes</h1>
          <p className="text-slate-500">Créez, modifiez, désactivez ou supprimez les comptes utilisateurs.</p>
        </div>
        <Link to="/comptes/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <UserPlus size={18} /> Nouveau compte
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className={`${input} pl-10`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setRole("")} className={puce(role === "")}>Tous les rôles</button>
          {ROLES.map(([code, nom]) => (
            <button key={code} onClick={() => setRole(code)} className={puce(role === code)}>{nom}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {ETATS.map(([code, nom]) => (
            <button key={code} onClick={() => setActif(code)} className={puce(actif === code)}>{nom}</button>
          ))}
        </div>
      </div>

      <Erreurs messages={erreurs} />

      <div className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-lg shadow-slate-200/60">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-4">Utilisateur</th>
              <th className="px-4 py-4">Rôle</th>
              <th className="px-4 py-4">Statut</th>
              <th className="px-4 py-4">Dernière connexion</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comptes === null && (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400">Chargement…</td></tr>
            )}
            {comptes?.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun compte ne correspond.</td></tr>
            )}
            {comptes?.map((c) => {
              const soi = c.id === moi.id;
              return (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                        {initiales(c)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          {nomComplet(c)} {soi && <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">VOUS</span>}
                        </p>
                        <p className="truncate text-xs text-slate-400">@{c.username}{c.email && ` · ${c.email}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGES[c.role]}`}>{ROLE_LABELS[c.role]}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {c.is_active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {c.last_login ? new Date(c.last_login).toLocaleString("fr-FR") : "Jamais"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`/comptes/${c.id}/modifier`} title="Modifier"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Pencil size={15} />
                      </Link>
                      <button onClick={() => basculer(c)} disabled={soi}
                        title={soi ? "Vous ne pouvez pas désactiver votre compte" : c.is_active ? "Désactiver" : "Réactiver"}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40">
                        <Power size={15} />
                      </button>
                      <button onClick={() => setASupprimer(c)} disabled={soi}
                        title={soi ? "Vous ne pouvez pas supprimer votre compte" : "Supprimer"}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {aSupprimer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 px-4" onClick={() => setASupprimer(null)}>
          <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle size={28} />
            </div>
            <h2 className="mt-4 text-center text-xl font-extrabold text-slate-800">Supprimer cet utilisateur ?</h2>
            <p className="mt-2 text-center text-slate-500">
              Voulez-vous vraiment supprimer <strong className="text-slate-800">{nomComplet(aSupprimer)}</strong> (@{aSupprimer.username}) ?
              Cette action est <strong>irréversible</strong>. Pour simplement bloquer l'accès, utilisez plutôt « Désactiver ».
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <button autoFocus onClick={() => setASupprimer(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={confirmerSuppression}
                className="rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700">
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
