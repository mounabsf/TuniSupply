import { useEffect, useState } from "react";
import { useCountUp } from "../hooks.js";
import { COULEURS } from "../couleurs.js";

export function Nombre({ valeur, suffixe = "" }) {
  const v = useCountUp(valeur);
  return <>{v}{suffixe}</>;
}

// ---------- Jauge « pouls de la distribution » ----------
export function Jauge({ score, clair = false }) {
  const [affiche, setAffiche] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAffiche(score), 150); // déclenche l'animation CSS
    return () => clearTimeout(t);
  }, [score]);

  const R = 78, C = 2 * Math.PI * R, ARC = C * 0.75;
  const [texte, couleur] =
    score >= 80 ? ["Distribution fluide", COULEURS.olive]
    : score >= 60 ? ["À surveiller", COULEURS.dore]
    : ["Situation tendue", COULEURS.brique];
  const anneau = (longueur, stroke, extra = {}) => (
    <circle cx="100" cy="100" r={R} fill="none" strokeWidth="16" strokeLinecap="round"
      stroke={stroke} strokeDasharray={`${longueur} ${C}`} transform="rotate(135 100 100)" {...extra} />
  );
  return (
    <div className="text-center">
      <svg viewBox="0 0 200 175" className="mx-auto w-full max-w-[15rem]" role="img" aria-label={`Indice de santé : ${score} sur 100`}>
        {anneau(ARC, clair ? "#f4eedd" : "rgba(255,255,255,0.15)")}
        {anneau(ARC * (affiche / 100), couleur, { style: { transition: "stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)" } })}
        <text x="100" y="105" textAnchor="middle" fontSize="44" fontWeight="800" fill={clair ? "#33291e" : "#fff"}><Nombre valeur={score} /></text>
        <text x="100" y="128" textAnchor="middle" fontSize="11" fill={clair ? "#ac9d7d" : "rgba(255,255,255,0.6)"}>sur 100</text>
      </svg>
      <p className={`-mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${clair ? "bg-slate-100 text-slate-700" : "bg-white/10 text-white"}`}>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: couleur }} /> {texte}
      </p>
    </div>
  );
}

// ---------- Mini courbe (dans les cartes KPI) ----------
export function Mini({ data, couleur = COULEURS.terracotta }) {
  const W = 100, H = 28, max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 3 - (v / max) * (H - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------- Courbes sur 14 jours (aire + ligne) ----------
export function Courbes({ series, dates }) {
  const W = 640, H = 230, PX = 34, PT = 14, PB = 28;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const haut = Math.max(4, max);                       // l'axe ne descend pas sous 4 graduations
  const x = (i) => PX + (i / (dates.length - 1)) * (W - PX - 10);
  const y = (v) => PT + (1 - v / haut) * (H - PT - PB);
  const ligne = (d) => d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const jour = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution sur 14 jours">
      <defs>
        {series.map((s, k) => (
          <linearGradient key={k} id={`aire${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.couleur} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.couleur} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0, 1, 2, 3, 4].map((g) => {
        const v = (haut / 4) * g;
        return (
          <g key={g}>
            <line x1={PX} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#e8dfc7" strokeDasharray="3 4" />
            <text x={PX - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#ac9d7d">{Math.round(v)}</text>
          </g>
        );
      })}
      {dates.map((d, i) => (i % 3 === 0 || i === dates.length - 1) && (
        <text key={d} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#ac9d7d">{jour(d)}</text>
      ))}
      {series.map((s, k) => (
        <g key={s.nom}>
          <path d={`${ligne(s.data)} L${x(s.data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#aire${k})`} />
          <path d={ligne(s.data)} fill="none" stroke={s.couleur} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {s.data.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === s.data.length - 1 ? 4.5 : 8}
              fill={i === s.data.length - 1 ? s.couleur : "transparent"}>
              <title>{`${s.nom} — ${jour(dates[i])} : ${v}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

// ---------- Anneau (répartition) ----------
export function Anneau({ parts, centre, legende }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let cumul = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0" role="img" aria-label={`${legende} : ${total}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f4eedd" strokeWidth="18" />
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="18"
              strokeDasharray={`${Math.max(len - 2, 0.5)} ${C}`} strokeDashoffset={-cumul} transform="rotate(-90 70 70)">
              <title>{`${p.label} : ${p.value}`}</title>
            </circle>
          );
          cumul += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="#33291e">{total}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#ac9d7d">{centre}</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            <span className="w-24">{p.label}</span>
            <span className="font-bold text-slate-800">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Barres horizontales ----------
export function Barres({ items }) {
  const [pret, setPret] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPret(true), 100); return () => clearTimeout(t); }, []);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold text-slate-600">{i.label}</span>
            <span className="font-bold text-slate-800">{i.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: pret ? `${(i.value / max) * 100}%` : "0%", background: i.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- Mosaïque de zones : plus la tuile est chaude, plus la zone est active ----------
export function Tuiles({ zones }) {
  const max = Math.max(1, ...zones.map((z) => z.demandes + z.anomalies));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {zones.map((z) => {
        const i = (z.demandes + z.anomalies) / max;
        const sombre = i > 0.5;
        return (
          <div key={`${z.zone}-${z.gouvernorat}`} title={`${z.zone} : ${z.demandes} demande(s), ${z.anomalies} anomalie(s)`}
            className="rounded-2xl p-3 transition hover:-translate-y-0.5"
            style={{ background: `rgba(210,100,47,${0.1 + i * 0.8})`, color: sombre ? "#fff" : "#483c2e" }}>
            <p className="truncate text-sm font-bold">{z.zone}</p>
            <p className="truncate text-[11px] opacity-70">{z.gouvernorat}</p>
            <p className="mt-2 text-xs font-semibold">
              {z.demandes} dem. · {z.anomalies} anom.
            </p>
          </div>
        );
      })}
    </div>
  );
}
