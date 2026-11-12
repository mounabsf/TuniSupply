import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api } from "../api.js";

export default function Regroupement() {
  const [lignes, setLignes] = useState([]);
  useEffect(() => { api.get("/regroupement/").then(setLignes); }, []);

  const zones = lignes.reduce((acc, l) => {
    (acc[l.zone] ||= { gouvernorat: l.gouvernorat, items: [] }).items.push(l);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-800">Regroupement par zone</h1>
      <p className="text-slate-500">Demandes en attente consolidées par zone et par produit.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {Object.keys(zones).length === 0 && (
          <p className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow md:col-span-2">Rien à regrouper.</p>
        )}
        {Object.entries(zones).map(([zone, { gouvernorat, items }]) => (
          <div key={zone} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex items-center gap-2">
              <MapPin className="text-emerald-600" size={20} />
              <h3 className="font-bold text-slate-800">{zone}</h3>
              <span className="text-xs text-slate-400">{gouvernorat}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((l) => (
                <li key={l.produit_nom} className="flex justify-between rounded-xl bg-emerald-50 px-4 py-2 text-sm">
                  <span className="font-semibold text-emerald-800">{l.produit_nom}</span>
                  <span className="text-emerald-700">{Number(l.total)} · {l.nb} demande(s)</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}