// Le cookie CSRF est posé par GET /api/auth/session/ (appelé au démarrage de l'application).
function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function req(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers["X-CSRFToken"] = csrfToken();

  const res = await fetch("/api" + url, { credentials: "same-origin", ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Erreur serveur" }));
    // session expirée : l'AuthProvider renvoie l'utilisateur vers /login
    if (res.status === 401) window.dispatchEvent(new Event("auth:expired"));
    throw { ...body, status: res.status };
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (url) => req(url),
  post: (url, data) => req(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: (url, data) => req(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: (url, data) => req(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (url) => req(url, { method: "DELETE" }),
};
