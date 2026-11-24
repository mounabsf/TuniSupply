import { Link } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, BellRing, CircleCheck, ClipboardList, TriangleAlert, Users } from "lucide-react";
import { ALERTES_ACTIVE } from "../anomaliesConfig.js";
import imageHome from "../assets/brown_h.jpg";
import { Anneau, Barres, Courbes, Jauge, Mini, Nombre, Tuiles } from "../components/charts.jsx";
import { COULEURS } from "../couleurs.js";
import SectionAVenir from "../components/SectionAVenir.jsx";
import SectionModule from "../components/SectionModule.jsx";
import { modules, visibleModules } from "../modules.js";
import { useAuth } from "../auth/context.js";
import { useDashboard } from "../hooks.js";
import { ROLE_LABELS } from "../roles.js";

const COULEUR_STATUT = {
  EN_ATTENTE: COULEURS.dore, ACCEPTEE: COULEURS.terracotta, LIVREE: COULEURS.olive,
  REFUSEE: COULEURS.brique, ANNULEE: COULEURS.sable,
};
const COULEUR_TYPE = {
  PRIX_ABUSIF: COULEURS.brique, STOCKAGE_EXCESSIF: COULEURS.dore,
  PRODUIT_PERIME: COULEURS.terracotta, AUTRE: COULEURS.sable,
};
const NIVEAU = {
  FAIBLE: ["Faible", "bg-sky-100 text-sky-700"],
  MOYENNE: ["Moyenne", "bg-amber-100 text-amber-700"],
  ELEVEE: ["Élevée", "bg-emerald-100 text-emerald-700"],
  CRITIQUE: ["Critique", "bg-rose-100 text-rose-700"],
};

const salutation = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
};

function Carte({ titre, sous, className = "", children }) {
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 ${className}`}>
      <h2 className="text-lg font-extrabold text-slate-800">{titre}</h2>
      {sous && <p className="text-sm text-slate-400">{sous}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Kpi({ icone: Icone, titre, valeur, suffixe, detail, serie, couleur, teinte }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${teinte}`}><Icone size={21} /></span>
        {serie && <div className="w-24"><Mini data={serie} couleur={couleur} /></div>}
      </div>
      <p className="mt-4 text-4xl font-extrabold text-slate-800"><Nombre valeur={valeur} suffixe={suffixe} /></p>
      <p className="text-sm font-semibold text-slate-500">{titre}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function Squelette() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-72 rounded-[2rem] bg-slate-100" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-3xl bg-slate-100" />)}
      </div>
      <div className="h-72 rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function Statistiques() {
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
  if (!d) return <Squelette />;

  const k = d.kpis;
  const perso = d.portee === "personnelle";
  const dates = d.demandes_par_jour.map((j) => j.date);
  const sDem = d.demandes_par_jour.map((j) => j.n);
  const sAno = d.anomalies_par_jour.map((j) => j.n);
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const raccourcis = visibleModules(user).filter((m) => m.ready);
  // modules pas encore livrés et sans statistiques : un aperçu en pointillés réserve leur place
  const aVenir = modules.filter((m) => !m.ready && !d.sections.some((s) => s.cle === m.key));

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft size={16} /> Retour à la vue d'ensemble
      </Link>

      {/* ===== Bandeau : salutation + pouls de la distribution ===== */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-700 to-brand-dark p-8 text-white shadow-2xl lg:p-10">
        <img src={imageHome} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/70 to-emerald-900/30" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_17rem]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              {perso ? "Vue de vos commerces" : "Vue nationale"} · {ROLE_LABELS[user.role]}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight lg:text-5xl">
              {salutation()}, {user.first_name || user.username}
            </h1>
            <p className="mt-1 capitalize text-emerald-100/80">{aujourdhui}</p>
            <p className="mt-4 max-w-xl text-emerald-50">
              {k.en_attente > 0
                ? `${k.en_attente} demande${k.en_attente > 1 ? "s" : ""} en attente de traitement`
                : "Aucune demande en attente"}
              {k.alertes_urgentes > 0 && ` · ${k.alertes_urgentes} alerte${k.alertes_urgentes > 1 ? "s" : ""} urgente${k.alertes_urgentes > 1 ? "s" : ""} cette semaine`}.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/demandes/nouvelle" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5">
                Nouvelle demande <ArrowRight size={17} />
              </Link>
              <Link to="/anomalies/nouveau" className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 font-bold backdrop-blur-md transition hover:bg-white/20">
                Signaler une anomalie
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-emerald-100/80">Pouls de la distribution</p>
            <Jauge score={d.sante} />
          </div>
        </div>
      </section>

      {/* ===== Indicateurs clés ===== */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icone={ClipboardList} titre="Demandes d'allocation" valeur={k.demandes} detail={`${k.en_attente} en attente`}
          serie={sDem} couleur={COULEURS.terracotta} teinte="bg-emerald-50 text-emerald-600" />
        <Kpi icone={CircleCheck} titre="Taux de traitement" valeur={k.taux_traitement} suffixe=" %" detail="des demandes ne sont plus en attente"
          teinte="bg-sky-100 text-sky-700" />
        <Kpi icone={TriangleAlert} titre="Anomalies signalées" valeur={k.anomalies} detail={`${k.anomalies_7j} sur les 7 derniers jours`}
          serie={sAno} couleur={COULEURS.brique} teinte="bg-rose-50 text-rose-500" />
        <Kpi icone={BellRing} titre="Alertes urgentes" valeur={k.alertes_urgentes} detail="élevées ou critiques, 7 derniers jours"
          teinte="bg-amber-100 text-amber-700" />
      </div>

      {/* ===== Évolution + répartition ===== */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Carte titre="Activité sur 14 jours" sous="Nouvelles demandes et anomalies signalées par jour" className="xl:col-span-2">
          <div className="mb-3 flex gap-5 text-sm">
            <span className="flex items-center gap-2 text-slate-600"><i className="h-1 w-5 rounded" style={{ background: COULEURS.terracotta }} /> Demandes</span>
            <span className="flex items-center gap-2 text-slate-600"><i className="h-1 w-5 rounded" style={{ background: COULEURS.brique }} /> Anomalies</span>
          </div>
          <Courbes dates={dates} series={[
            { nom: "Demandes", data: sDem, couleur: COULEURS.terracotta },
            { nom: "Anomalies", data: sAno, couleur: COULEURS.brique },
          ]} />
        </Carte>
        <Carte titre="Statut des demandes" sous="Répartition actuelle">
          <Anneau legende="Demandes" centre="demandes"
            parts={d.demandes_par_statut.map((s) => ({ label: s.label, value: s.n, color: COULEUR_STATUT[s.code] }))} />
        </Carte>
      </div>

      {/* ===== Zones, anomalies, alertes ===== */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Carte titre="Chaleur par zone" sous="Plus la tuile est foncée, plus la zone est active" className="xl:col-span-2">
          {d.zones.length ? <Tuiles zones={d.zones} /> : (
            <p className="py-8 text-center text-slate-400">Aucune activité par zone pour le moment.</p>
          )}
        </Carte>
        <div className="space-y-6">
          <Carte titre="Types d'anomalies">
            <Barres items={d.anomalies_par_type.map((t) => ({ label: t.label, value: t.n, color: COULEUR_TYPE[t.code] }))} />
          </Carte>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Carte titre="Alertes récentes" className={d.comptes ? "xl:col-span-2" : "xl:col-span-3"}
          sous={ALERTES_ACTIVE
            ? <Link to="/anomalies/alertes" className="font-semibold text-emerald-600 hover:text-emerald-700">Voir toutes les alertes →</Link>
            : <span title="Fonctionnalité prévue au sprint suivant" className="cursor-not-allowed font-semibold text-slate-300">Voir toutes les alertes · sprint suivant</span>}>
          {d.alertes_recentes.length ? (
            <ul className="divide-y divide-slate-100">
              {d.alertes_recentes.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${NIVEAU[a.niveau][1]}`}>{NIVEAU[a.niveau][0]}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{a.message}</span>
                  <span className="text-xs text-slate-400">{a.zone} · {new Date(a.date).toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-center text-slate-400">Aucune alerte : tout est calme.</p>}
        </Carte>

        {d.comptes && (
          <Carte titre="Utilisateurs actifs" sous={<Link to="/comptes" className="font-semibold text-emerald-600 hover:text-emerald-700">Gérer les comptes →</Link>}>
            <p className="mb-4 flex items-center gap-2 text-3xl font-extrabold text-slate-800">
              <Users size={26} className="text-emerald-600" /> <Nombre valeur={d.comptes.actifs} />
            </p>
            <Barres items={d.comptes.par_role.map((r) => ({ label: r.label, value: r.n, color: COULEURS.chocolat }))} />
          </Carte>
        )}
      </div>

      {/* ===== Un bloc par module (reçu du serveur : commerces, produits, et tout module qui s'enregistre) ===== */}
      {d.sections.map((s) => <SectionModule key={s.cle} section={s} />)}

      {aVenir.map((m) => <SectionAVenir key={m.key} module={m} />)}

      {/* ===== Accès rapide aux modules ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800"><Activity size={20} className="text-emerald-600" /> Accès rapide</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {raccourcis.map((m) => (
            <Link key={m.key} to={m.base}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-md shadow-slate-200/60 transition hover:-translate-y-0.5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${m.tone.grad} text-white`}><m.icon size={18} /></span>
              {m.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
