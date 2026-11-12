async function req(url, options = {}) {
  const res = await fetch("/api" + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw await res.json().catch(() => ({ detail: "Erreur serveur" }));
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (url) => req(url),
  post: (url, data) => req(url, { method: "POST", body: JSON.stringify(data) }),
  put: (url, data) => req(url, { method: "PUT", body: JSON.stringify(data) }),
};