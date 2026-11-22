import { Anneau, Barres, Courbes } from "./charts.jsx";
import { COULEURS } from "../couleurs.js";

const CYCLE = [COULEURS.terracotta, COULEURS.chocolat, COULEURS.dore, COULEURS.olive, COULEURS.brique, COULEURS.sable];

// Dessine un graphique décrit par l'API : { type: "barres" | "anneau" | "courbe", ... } (sans cadre ni titre)
export default function Graphique({ g }) {
  const vide = <p className="py-8 text-center text-sm text-slate-400">Pas encore de données.</p>;
  if (g.type === "barres") {
    return g.items.length
      ? <Barres items={g.items.map((i, k) => ({ ...i, color: i.color || CYCLE[k % CYCLE.length] }))} />
      : vide;
  }
  if (g.type === "anneau") {
    return (
      <Anneau legende={g.titre} centre={g.centre || ""}
        parts={g.items.map((i, k) => ({ label: i.label, value: i.value, color: i.color || CYCLE[k % CYCLE.length] }))} />
    );
  }
  if (g.type === "courbe") {
    return (
      <Courbes dates={g.dates}
        series={g.series.map((s, k) => ({ ...s, couleur: s.couleur || CYCLE[k % CYCLE.length] }))} />
    );
  }
  return vide;
}
