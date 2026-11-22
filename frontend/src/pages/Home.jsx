import { Link } from "react-router-dom";
import { ArrowRight, Hammer } from "lucide-react";
import imageHome from "../assets/brown_h.jpg";
import { Anneau, Barres, Courbes, Jauge } from "../components/charts.jsx";
import Graphique from "../components/Graphique.jsx";
import { COULEURS } from "../couleurs.js";
import { visibleModules } from "../modules.js";
import { useAuth } from "../auth/context.js";
import { useDashboard } from "../hooks.js";

const COULEUR_STATUT = {
  EN_ATTENTE: COULEURS.dore, ACCEPTEE: COULEURS.terracotta, LIVREE: COULEURS.olive,
  REFUSEE: COULEURS.brique, ANNULEE: COULEURS.sable,
};
const COULEUR_TYPE = {
  PRIX_ABUSIF: COULEURS.brique, STOCKAGE_EXCESSIF: COULEURS.dore,
  PRODUIT_PERIME: COULEURS.terracotta, AUTRE: COULEURS.sable,
};

// Cadre d'une carte-graphique : titre (+ icône du module) puis le graphique, rien d'autre.
function Carte({ titre, module: m, className = "", children }) {
  const contenu = (
    <>
      {m && <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.tone.grad} text-white`}><m.icon size={18} /></span>}
      <h2 className="text-base font-extrabold text-slate-800">{titre}</h2>
    </>
  );
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 ${className}`}>
      {m ? <Link to={m.base} className="flex items-center gap-3 hover:opacity-80">{contenu}</Link>
         : <div className="flex items-center gap-3">{contenu}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Aperçu en pointillés d'un module pas encore livré (remplacé automatiquement par son vrai graphique)
function Attente({ m }) {
  return (
    <section className="rounded-3xl border-2 border-dashed border-slate-200 p-6">
      <Link to={m.base} className="flex items-center gap-3 hover:opacity-80">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.tone.grad} text-white opacity-50`}><m.icon size={18} /></span>
        <h2 className="text-base font-extrabold text-slate-400">{m.title}</h2>
      </Link>
      <svg viewBox="0 0 200 60" className="mt-6 h-28 w-full text-slate-200" preserveAspectRatio="none" aria-hidden="true">
        {[14, 30, 22, 44, 36, 50, 28].map((h, k) => <rect key={k} x={k * 28 + 4} y={60 - h} width="18" height={h} rx="4" fill="currentColor" />)}
      </svg>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"><Hammer size={12} /> En développement</p>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { d, erreur, charger } = useDashboard();

  if (erreur && !d) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-lg shadow-slate-200/60">
        <p className="font-bold text-slate-800">Impossible de charger le tableau de bord.</p>
        <button onClick={charger} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Réessayer</button>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="grid animate-pulse gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-72 rounded-3xl bg-slate-100" />)}
      </div>
    );
  }

  const dates = d.demandes_par_jour.map((j) => j.date);

  // Le graphique de chaque module : ceux de l'app (demandes, anomalies, comptes) ou celui qu'un module
  // enregistre lui-même (premier graphique de sa section) ; sinon un aperçu « en développement ».
  const graphiqueDuModule = (m) => {
    if (m.key === "demandes")
      return (
        <Carte key={m.key} titre={m.title} module={m}>
          <Anneau legende="Demandes" centre="demandes"
            parts={d.demandes_par_statut.map((s) => ({ label: s.label, value: s.n, color: COULEUR_STATUT[s.code] }))} />
        </Carte>
      );
    if (m.key === "anomalies")
      return (
        <Carte key={m.key} titre={m.title} module={m}>
          <Barres items={d.anomalies_par_type.map((t) => ({ label: t.label, value: t.n, color: COULEUR_TYPE[t.code] }))} />
        </Carte>
      );
    if (m.key === "comptes")
      return d.comptes && (
        <Carte key={m.key} titre={m.title} module={m}>
          <Anneau legende="Utilisateurs" centre="actifs"
            parts={d.comptes.par_role.map((r, k) => ({ label: r.label, value: r.n, color: [COULEURS.brique, COULEURS.dore, COULEURS.olive, COULEURS.chocolat][k] }))} />
        </Carte>
      );
    const section = d.sections.find((s) => s.cle === m.key);
    if (section?.graphiques[0])
      return <Carte key={m.key} titre={m.title} module={m}><Graphique g={section.graphiques[0]} /></Carte>;
    return <Attente key={m.key} m={m} />;
  };

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil (d'origine) */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-teal-700 to-brand-dark p-10 text-white shadow-2xl lg:p-12">
        {/* Image d'arrière-plan */}
        <img src={imageHome} alt="Présentation TuniSupply" className="absolute inset-0 h-full w-full object-cover" />

        {/* Overlay pour garder le texte lisible */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-transparent" />

        {/* Contenu */}
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
            Plateforme nationale de distribution de proximité
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight lg:text-5xl">
            Bienvenue sur TuniSupply AI
          </h1>

          <p className="mt-4 text-emerald-50">
            Demandes, stocks, anomalies, logistique et intelligence artificielle :
            accédez à toutes les actions de la plateforme depuis cette page.
          </p>

          <Link
            to="/demandes"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5"
          >
            Commencer <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Carte titre="Activité sur 14 jours" className="sm:col-span-2">
          <Courbes dates={dates} series={[
            { nom: "Demandes", data: d.demandes_par_jour.map((j) => j.n), couleur: COULEURS.terracotta },
            { nom: "Anomalies", data: d.anomalies_par_jour.map((j) => j.n), couleur: COULEURS.brique },
          ]} />
        </Carte>
        <Carte titre="Pouls de la distribution"><Jauge score={d.sante} clair /></Carte>

        {visibleModules(user).map(graphiqueDuModule)}
      </div>
    </div>
  );
}