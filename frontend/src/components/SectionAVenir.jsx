import { Hammer } from "lucide-react";
import { PREVU } from "../dashboardPrevu.js";

// Aperçu en pointillés d'un module en développement : mêmes emplacements que la vraie section.
export default function SectionAVenir({ module: m }) {
  const prevu = PREVU[m.key] ?? { kpis: [], graphiques: [] };
  return (
    <section className="opacity-90">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${m.tone.bg} ${m.tone.text}`}><m.icon size={20} /></span>
        <h2 className="text-2xl font-extrabold text-slate-800">{m.title}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          <Hammer size={13} /> En développement · {m.owner}
        </span>
      </div>
      <p className="mt-1 text-slate-500">
        Ces indicateurs s'afficheront automatiquement dès que les données du module seront branchées.
      </p>

      {prevu.kpis.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {prevu.kpis.map((k) => (
            <div key={k} className="rounded-2xl border-2 border-dashed border-slate-200 p-5">
              <p className="text-3xl font-extrabold text-slate-300">—</p>
              <p className="text-sm font-semibold text-slate-400">{k}</p>
            </div>
          ))}
        </div>
      )}

      {prevu.graphiques.length > 0 && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {prevu.graphiques.map((g, i) => (
            <div key={g} className="rounded-3xl border-2 border-dashed border-slate-200 p-6">
              <h3 className="text-base font-extrabold text-slate-400">{g}</h3>
              {/* silhouette décorative du futur graphique */}
              <svg viewBox="0 0 200 60" className="mt-4 h-24 w-full text-slate-200" preserveAspectRatio="none" aria-hidden="true">
                {i % 2 === 0
                  ? [14, 30, 22, 44, 36, 50, 28].map((h, k) => <rect key={k} x={k * 28 + 4} y={60 - h} width="18" height={h} rx="4" fill="currentColor" />)
                  : <polyline points="0,48 30,38 60,42 95,22 130,30 165,12 200,18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              <p className="mt-2 text-xs text-slate-400">En attente des données du module</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
