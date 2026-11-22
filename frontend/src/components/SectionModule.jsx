import { Nombre } from "./charts.jsx";
import Graphique from "./Graphique.jsx";

function CarteGraphique({ g }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
      <h3 className="text-base font-extrabold text-slate-800">{g.titre}</h3>
      <div className="mt-4"><Graphique g={g} /></div>
    </div>
  );
}

// Affiche une section envoyée par l'API : { titre, description, kpis[], graphiques[] }
export default function SectionModule({ section }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold text-slate-800">{section.titre}</h2>
      {section.description && <p className="text-slate-500">{section.description}</p>}

      {section.kpis.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {section.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-5 shadow-md shadow-slate-200/60">
              <p className="text-3xl font-extrabold text-slate-800"><Nombre valeur={k.valeur} suffixe={k.suffixe} /></p>
              <p className="text-sm font-semibold text-slate-500">{k.label}</p>
              {k.detail && <p className="mt-0.5 text-xs text-slate-400">{k.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {section.graphiques.length > 0 && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {section.graphiques.map((g) => <CarteGraphique key={g.titre} g={g} />)}
        </div>
      )}
    </section>
  );
}
