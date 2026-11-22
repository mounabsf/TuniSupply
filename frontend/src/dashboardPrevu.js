// Indicateurs prévus pour chaque module PAS ENCORE livré (clé = clé du module dans modules.js).
// Ils s'affichent en pointillés sur le tableau de bord ; dès que le module enregistre sa vraie section
// (voir dashboard/registry.py), celle-ci remplace automatiquement cet aperçu.
export const PREVU = {
  stocks: {
    kpis: ["Produits en rupture", "Stock moyen par commerce", "Commerces en alerte stock", "Couverture (jours)"],
    graphiques: ["Stock par produit", "Niveau de stock par zone"],
  },
  ressources: {
    kpis: ["Centres actifs", "Capacité totale", "Taux de remplissage", "Centres saturés"],
    graphiques: ["Capacité par centre", "Remplissage par gouvernorat"],
  },
  logistique: {
    kpis: ["Livraisons en cours", "Livraisons du jour", "Délai moyen", "Livraisons à temps"],
    graphiques: ["Livraisons sur 14 jours", "Statut des opérations"],
  },
  intelligence: {
    kpis: ["Zones à risque", "Pénuries prédites", "Fiabilité du modèle", "Anomalies détectées par l'IA"],
    graphiques: ["Risque par zone", "Tendance prédite"],
  },
};
