import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

// Fait « monter » un nombre de 0 à `cible` (animation de ~1 s).
export function useCountUp(cible, duree = 900) {
  const [valeur, setValeur] = useState(0);
  useEffect(() => {
    let raf;
    let debut;
    const pas = (t) => {
      debut ??= t;
      const p = Math.min(1, (t - debut) / duree);
      setValeur(Math.round(cible * (1 - Math.pow(1 - p, 3)))); // ralentit à l'arrivée
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);
  return valeur;
}

// Charge /api/dashboard/ et le rafraîchit chaque minute.
export function useDashboard() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState(false);
  const charger = useCallback(() => {
    api.get("/dashboard/").then((r) => { setD(r); setErreur(false); }).catch(() => setErreur(true));
  }, []);
  useEffect(() => {
    charger();
    const t = setInterval(charger, 60000);
    return () => clearInterval(t);
  }, [charger]);
  return { d, erreur, charger };
}
