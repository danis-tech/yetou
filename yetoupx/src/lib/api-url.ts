/** URL de l'API Django côté navigateur (appels directs, CORS activé sur Django). */
export function getApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_DJANGO_URL?.replace(/\/$/, "") + "/api" ||
    "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");
}

/**
 * URL de base Django pour les redirections OAuth (toujours absolue).
 * Ex. http://127.0.0.1:8000
 */
export function getDjangoUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_DJANGO_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";
  if (explicit) return explicit.replace(/\/$/, "");

  const api = getApiUrl();
  if (api.startsWith("http")) return api.replace(/\/api\/?$/, "");

  return "http://127.0.0.1:8000";
}

/** URL API Django pour les Route Handlers Next.js (appels serveur → serveur). */
export function getServerDjangoApiUrl(): string {
  const base = (process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  return `${base}/api`;
}
