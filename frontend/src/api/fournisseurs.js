const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.fields = fields; // erreurs par champ renvoyées par DRF, ex. { nom: ["..."] }
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifiez que l'API est démarrée.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.detail ?? "Une erreur est survenue.", data ?? {});
  return data;
}

// 7.1 - enregistrer un fournisseur
export const createFournisseur = (payload) =>
  request("/fournisseurs/", { method: "POST", body: JSON.stringify(payload) });

export const listFournisseurs = (archives = false) =>
  request(`/fournisseurs/${archives ? "?archives=true" : ""}`);

// 7.2 - historique des livraisons
export const listLivraisons = (id) => request(`/fournisseurs/${id}/livraisons/`);

// 7.3 - modifier le statut
export const changerStatut = (id, statut) =>
  request(`/fournisseurs/${id}/statut/`, { method: "PUT", body: JSON.stringify({ statut }) });

// 7.4 - archiver
export const archiverFournisseur = (id) =>
  request(`/fournisseurs/${id}/archiver/`, { method: "POST" });
