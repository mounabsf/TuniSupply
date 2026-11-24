import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Check, Clock, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../api.js";

const ETATS = [
  ["", "Tous"],
  ["CONFORME", "Conformes"],
  ["NON_CONFORME", "Non conformes"],
  ["PERIME", "Périmés"],
];

const BADGES = {
  CONFORME: "bg-emerald-100 text-emerald-700",
  NON_CONFORME: "bg-amber-100 text-amber-700",
  PERIME: "bg-rose-100 text-rose-700",
};

const input = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR") : "—");
const fmtNombre = (n) => Number(n).toLocaleString("fr-FR");
const fmtPrix = (n) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;

// Nombre de jours avant la péremption (0 = aujourd'hui, négatif = déjà périmé, null = pas de date)
const joursAvantPeremption = (d) => {
  if (!d) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${d}T00:00:00`) - aujourdhui) / 86400000);
};

export default function Ressources() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [resume, setResume] = useState(null);
  const [centres, setCentres] = useState([]);
  const [etat, setEtat] = useState("");
  const [centre, setCentre] = useState("");
  const [erreur, setErreur] = useState("");
  const [majA, setMajA] = useState(null);
  const [succes, setSucces] = useState("");
  const [aSupprimer, setASupprimer] = useState(null);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(() => {
    const params = new URLSearchParams();
    if (etat) params.set("etat", etat);
    if (centre) params.set("centre", centre);
    const qs = params.toString();
    return Promise.all([
      api.get(`/ressources/lots/${qs ? `?${qs}` : ""}`),
      api.get("/ressources/lots/resume/"),
    ])
      .then(([listeLots, chiffres]) => {
        setLots(listeLots);
        setResume(chiffres);
        setMajA(new Date());
        setErreur("");
      })
      .catch(() => setErreur("Impossible de charger les ressources."));
  }, [etat, centre]);

  // Consultation en temps réel : rechargement automatique toutes les 10 secondes
  useEffect(() => {
    charger();
    const minuteur = setInterval(charger, 10000);
    return () => clearInterval(minuteur);
  }, [charger]);

  useEffect(() => {
    api.get("/ressources/centres/").then(setCentres).catch(() => {});
  }, []);

  // Message de succès envoyé par le formulaire (ajout / modification)
  useEffect(() => {
    const message = location.state?.message;
    if (message) {
      setSucces(message);
      navigate(location.pathname, { replace: true, state: null }); // ne pas le réafficher au rechargement
    }
  }, [location, navigate]);

  // Le message de succès disparaît tout seul après 4 secondes
  useEffect(() => {
    if (!succes) return;
    const minuteur = setTimeout(() => setSucces(""), 4000);
    return () => clearTimeout(minuteur);
  }, [succes]);

  // Échap ferme la fenêtre de confirmation
  useEffect(() => {
    if (!aSupprimer || suppression) return;
    const fermer = (e) => e.key === "Escape" && setASupprimer(null);
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [aSupprimer, suppression]);

  const confirmerSuppression = async () => {
    const lot = aSupprimer;
    setSuppression(true);
    try {
      await api.delete(`/ressources/lots/${lot.id}/`);
      setSucces(`Le lot ${lot.id_lot} a bien été supprimé.`);
      charger();
    } catch (e) {
      setErreur(e.detail || "Suppression impossible.");
    } finally {
      setSuppression(false);
      setASupprimer(null);
    }
  };

  const cartes = resume && [
    ["Lots en stock", resume.nb_lots, "text-slate-800"],
    ["Conformes", resume.nb_conformes, "text-emerald-700"],
    ["Non conformes", resume.nb_non_conformes, "text-amber-700"],
    ["Périmés", resume.nb_perimes, "text-rose-600"],
    ["Valeur du stock", fmtPrix(resume.valeur_totale), "text-slate-800"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Ressources des centres de distribution</h1>
          <p className="text-slate-500">Réserves subventionnées des dépôts régionaux, suivies en temps réel.</p>
        </div>
        <Link to="/ressources/nouveau" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700">
          <Plus size={18} /> Ajouter un lot
        </Link>
      </div>

      {cartes && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cartes.map(([label, valeur, couleur]) => (
            <div key={label} className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${couleur}`}>{valeur}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ETATS.map(([code, label]) => (
            <button
              key={code}
              onClick={() => setEtat(code)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                etat === code ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-emerald-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select className={input} value={centre} onChange={(e) => setCentre(e.target.value)}>
            <option value="">Tous les centres</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <button onClick={charger} title="Actualiser" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {majA && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Mise à jour automatique · dernière actualisation à {majA.toLocaleTimeString("fr-FR")}
        </p>
      )}

      {erreur && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{erreur}</p>}

      <div className="mt-4 overflow-x-auto rounded-3xl bg-white shadow-lg shadow-slate-200/60">
        {lots.length === 0 ? (
          <p className="p-10 text-center text-slate-400">Aucun lot pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4 font-semibold">Lot</th>
                <th className="px-5 py-4 font-semibold">Type de ressource</th>
                <th className="px-5 py-4 font-semibold">Centre</th>
                <th className="px-5 py-4 text-right font-semibold">Quantité</th>
                <th className="px-5 py-4 text-right font-semibold">Prix d'achat</th>
                <th className="px-5 py-4 font-semibold">Péremption</th>
                <th className="px-5 py-4 font-semibold">État</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => {
                const jours = joursAvantPeremption(l.date_peremption);
                const expireBientot = jours !== null && jours >= 0 && jours < 30;
                return (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{l.id_lot}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{l.type_ressource}</td>
                    <td className="px-5 py-4 text-slate-700">{l.centre_nom}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">{fmtNombre(l.quantite_totale_lot)}</td>
                    <td className="px-5 py-4 text-right text-slate-700">{fmtPrix(l.prix_achat_etat)}</td>
                    <td className="px-5 py-4 text-slate-700">
                      <p>{fmtDate(l.date_peremption)}</p>
                      {expireBientot && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <Clock size={12} />
                          Expire bientôt · {jours === 0 ? "aujourd'hui" : `J-${jours}`}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGES[l.etat]}`}>{l.etat_label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link to={`/ressources/${l.id}/modifier`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                          <Pencil size={14} /> Modifier
                        </Link>
                        <button onClick={() => setASupprimer(l)} className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-100">
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ============ FENÊTRE DE CONFIRMATION ============ */}
      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-brand-dark/50 p-4 backdrop-blur-sm"
          onClick={() => !suppression && setASupprimer(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-suppression"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 size={26} />
            </div>
            <h2 id="titre-suppression" className="mt-5 text-2xl font-extrabold text-slate-800">Supprimer ce lot ?</h2>
            <p className="mt-2 text-slate-500">
              Le lot <strong className="text-slate-800">{aSupprimer.id_lot}</strong> sera supprimé définitivement. Cette action est irréversible.
            </p>

            <div className="mt-4 space-y-1 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Type :</span> {aSupprimer.type_ressource}</p>
              <p><span className="font-semibold text-slate-800">Centre :</span> {aSupprimer.centre_nom}</p>
              <p><span className="font-semibold text-slate-800">Quantité :</span> {fmtNombre(aSupprimer.quantite_totale_lot)}</p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">État :</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${BADGES[aSupprimer.etat]}`}>{aSupprimer.etat_label}</span>
              </p>
            </div>

            {aSupprimer.etat === "CONFORME" && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Ce lot est conforme et n'est pas périmé. Êtes-vous sûre de vouloir le supprimer ?
              </p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                autoFocus
                onClick={() => setASupprimer(null)}
                disabled={suppression}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                disabled={suppression}
                className="rounded-xl bg-rose-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 disabled:opacity-60"
              >
                {suppression ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MESSAGE DE SUCCÈS ============ */}
      {succes && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-xl shadow-slate-200/60"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check size={18} />
          </span>
          <p className="text-sm font-semibold text-slate-800">{succes}</p>
        </div>
      )}
    </div>
  );
}