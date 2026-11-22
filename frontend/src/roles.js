export const ROLES = [
  ["ADMIN", "Administrateur"],
  ["COMMERCANT", "Commerçant"],
  ["GROSSISTE", "Grossiste"],
  ["INSPECTEUR", "Inspecteur"],
];
export const ROLE_LABELS = Object.fromEntries(ROLES);

export const ROLE_BADGES = {
  ADMIN: "bg-rose-100 text-rose-700",
  COMMERCANT: "bg-amber-100 text-amber-700",
  GROSSISTE: "bg-sky-100 text-sky-700",
  INSPECTEUR: "bg-emerald-100 text-emerald-700",
};

const CHAMPS = {
  username: "Nom d'utilisateur",
  email: "E-mail",
  password: "Mot de passe",
  password_confirm: "Confirmation",
  old_password: "Mot de passe actuel",
  new_password: "Nouveau mot de passe",
  new_password_confirm: "Confirmation",
  first_name: "Prénom",
  last_name: "Nom",
  telephone: "Téléphone",
  role: "Rôle",
};

// Transforme une erreur de l'API (detail ou erreurs par champ) en liste de phrases.
export function messagesErreur(err) {
  if (err instanceof Error) return ["Serveur injoignable. Réessayez dans un instant."];
  if (typeof err?.detail === "string") return [err.detail];
  const out = [];
  for (const [champ, val] of Object.entries(err || {})) {
    if (champ === "status") continue;
    const texte = Array.isArray(val) ? val.join(" ") : typeof val === "string" ? val : "";
    if (texte) out.push(champ === "non_field_errors" ? texte : `${CHAMPS[champ] ?? champ} : ${texte}`);
  }
  return out.length ? out : ["Vérifiez les champs du formulaire."];
}

export const initiales = (u) =>
  (((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")) || u.username.slice(0, 2)).toUpperCase();

export const nomComplet = (u) => `${u.first_name} ${u.last_name}`.trim() || u.username;
