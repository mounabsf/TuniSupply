export const STATUTS = {
  ACTIF: { label: "Actif", classes: "bg-success/10 text-success" },
  SUSPENDU: { label: "Suspendu", classes: "bg-danger/10 text-danger" },
  SOUS_SURVEILLANCE: { label: "Sous surveillance", classes: "	bg-[#fff4d6] text-[#a06a00]" },
  INACTIF: { label: "Inactif", classes: "bg-brun/10 text-brun/70" },
};

// Statuts qu'on peut choisir à la main (INACTIF est posé par l'archivage).
export const STATUTS_MODIFIABLES = ["ACTIF", "SUSPENDU", "SOUS_SURVEILLANCE"];

export default function StatutBadge({ statut }) {
  const { label, classes } = STATUTS[statut] ?? STATUTS.INACTIF;
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}
