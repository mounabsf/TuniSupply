// Constantes partagées par les pages du module « Anomalies & alertes »

export const TYPES = [
  ["", "Tous"],
  ["PRIX_ABUSIF", "Prix abusif"],
  ["STOCKAGE_EXCESSIF", "Stockage excessif"],
  ["PRODUIT_PERIME", "Produit périmé"],
  ["AUTRE", "Autre"],
];

export const TYPE_BADGES = {
  PRIX_ABUSIF: "bg-rose-100 text-rose-700",
  STOCKAGE_EXCESSIF: "bg-sky-100 text-sky-700",
  PRODUIT_PERIME: "bg-amber-100 text-amber-700",
  AUTRE: "bg-slate-200 text-slate-600",
};

export const URGENCES = [
  ["CRITIQUE", "Critique"],
  ["ELEVEE", "Élevée"],
  ["MOYENNE", "Moyenne"],
  ["FAIBLE", "Faible"],
];

export const URGENCE_BADGES = {
  CRITIQUE: "bg-rose-100 text-rose-700",
  ELEVEE: "bg-orange-100 text-orange-700",
  MOYENNE: "bg-amber-100 text-amber-700",
  FAIBLE: "bg-sky-100 text-sky-700",
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
