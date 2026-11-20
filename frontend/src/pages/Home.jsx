import { Link } from "react-router-dom";
import { ArrowRight} from"lucide-react";
import imageHome from "../assets/brown_h.jpg";
import { visibleModules } from "../modules.js";
import { useAuth } from "../auth/context.js";
export default function Home() {
  const { user } = useAuth();
  return (
        <div className="space-y-10">
  
{/* Bandeau d'accueil */}
<section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-teal-700 to-brand-dark p-10 text-white shadow-2xl lg:p-12"> 

  {/* Image d'arrière-plan */}
  <img
    src={imageHome}
    alt="Présentation TuniSupply"
    className="absolute inset-0 h-full w-full object-cover"
  />

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


      {/* Tous les modules */}
      <section>
        <h2 className="text-2xl font-extrabold text-slate-800">Tous les modules</h2>
        <p className="text-slate-500">Choisissez un module pour accéder à ses actions.</p>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules(user).map((m) => (
            <div
              key={m.key}
              className="flex flex-col rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${m.tone.grad} text-white shadow-lg`}>
                  <m.icon size={24} />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    m.ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {m.ready ? "Disponible" : "En développement"}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-800">{m.title}</h3>
              <p className="text-xs font-semibold text-slate-400">Responsable : {m.owner}</p>
              <p className="mt-2 text-sm text-slate-500">{m.description}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {m.actions.map(({ label, icon: Icon, to }) => {
                  const inner = (
                    <>
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${m.tone.bg} ${m.tone.text}`}>
                        <Icon size={16} />
                      </span>
                      <span className="flex-1">{label}</span>
                      {to ? <ArrowRight size={15} className="text-slate-300" /> : <span className="text-xs text-slate-300">bientôt</span>}
                    </>
                  );
                  return (
                    <li key={label}>
                      {to ? (
                        <Link to={to} className="flex items-center gap-3 rounded-xl p-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl p-2 text-sm font-semibold text-slate-400">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <Link
                to={m.base}
                className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${m.tone.bg} ${m.tone.text} transition hover:brightness-95`}
              >
                Ouvrir le module <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}