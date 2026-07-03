import { getApiUrl } from "@/lib/api-url";

const MEDIA_CACHE_TTL_MS = 5 * 60 * 1000;
const MEDIA_CACHE_PREFIX = "yetou_media_";

function readMediaCache(key: string): ApiMedia[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${MEDIA_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: ApiMedia[] };
    if (Date.now() - ts > MEDIA_CACHE_TTL_MS) {
      sessionStorage.removeItem(`${MEDIA_CACHE_PREFIX}${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeMediaCache(key: string, data: ApiMedia[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${MEDIA_CACHE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota dépassé — ignorer */
  }
}

export interface ApiMedia {
  id: number;
  title: string;
  description: string;
  type: "photo" | "video";
  type_display: string;
  quality: string;
  quality_display: string;
  category: string;
  category_display: string;
  status: string;
  file_url: string;
  preview_url: string;
  thumbnail_url: string;
  stream_url: string;
  file_size_display: string;
  price: number;
  license_type: string;
  width: number | null;
  height: number | null;
  resolution: string;
  duration: string;
  frame_rate: string;
  codec: string;
  bitrate: string;
  province: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  camera_model: string;
  lens: string;
  focal_length: string;
  aperture: string;
  iso: string;
  shutter_speed: string;
  tags: string;
  season: string;
  weather: string;
  capture_date: string | null;
  capture_time: string | null;
  downloads: number;
  views: number;
  created_at: string;
}

export interface ApiPurchase {
  id: number;
  media: ApiMedia;
  price: number;
  download_count: number;
  max_downloads: number;
  purchased_at: string;
  payment_method?: string;
  payment_reference?: string;
  payment_status?: string;
}

export interface ApiNotification {
  id: number;
  notification_type: string;
  title: string;
  body: string;
  read: boolean;
  action_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardSummary {
  user: {
    id: number;
    email: string;
    name: string;
    plan: string;
    created_at: string;
  };
  stats: {
    purchases_count: number;
    total_spent: number;
    unread_notifications: number;
  };
  recent_purchases: ApiPurchase[];
  notifications: ApiNotification[];
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${getApiUrl()}${path}`, { ...options, headers });
}

async function fetchAllPages(path: string): Promise<unknown[]> {
  const items: unknown[] = [];
  const apiBase = getApiUrl();
  let url: string | null = `${apiBase}${path}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data)) return data;
    items.push(...(data.results || []));

    const next = data.next as string | null;
    if (!next) {
      url = null;
      continue;
    }
    // Normaliser la pagination Django vers notre base API
    try {
      const parsed = new URL(next);
      url = `${apiBase}${parsed.pathname.replace(/^\/api/, "")}${parsed.search}`;
    } catch {
      url = next.startsWith("/") ? `${apiBase.replace(/\/api$/, "")}${next}` : next;
    }
  }

  return items;
}

export async function fetchMedia(type?: "photo" | "video", category?: string): Promise<ApiMedia[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  const query = params.toString();
  const path = query ? `/media/?${query}` : "/media/";
  const cacheKey = query || "all";

  try {
    const items = (await fetchAllPages(path)) as ApiMedia[];
    if (items.length > 0) writeMediaCache(cacheKey, items);
    return items;
  } catch {
    return readMediaCache(cacheKey) || [];
  }
}

/** Retourne le cache sessionStorage immédiatement (affichage instantané). */
export function getCachedMedia(type?: "photo" | "video", category?: string): ApiMedia[] | null {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  const query = params.toString();
  return readMediaCache(query || "all");
}

export async function fetchMediaById(id: number): Promise<ApiMedia | null> {
  try {
    const res = await fetch(`${getApiUrl()}/media/${id}/`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function authFetchAllPages(path: string): Promise<unknown[]> {
  const items: unknown[] = [];
  let nextPath: string | null = path.startsWith("/") ? path : `/${path}`;

  while (nextPath) {
    const res = await authFetch(nextPath);
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data)) return data;
    items.push(...(data.results || []));

    const next = data.next as string | null;
    if (!next) {
      nextPath = null;
      continue;
    }
    try {
      const parsed = new URL(next);
      nextPath = `${parsed.pathname.replace(/^\/api/, "")}${parsed.search}`;
    } catch {
      nextPath = null;
    }
  }

  return items;
}

export async function fetchPurchases(): Promise<ApiPurchase[]> {
  try {
    return (await authFetchAllPages("/purchases/")) as ApiPurchase[];
  } catch {
    return [];
  }
}

export async function createPurchase(
  mediaId: number,
  options?: { payment_method?: string; payment_reference?: string; payment_status?: string },
): Promise<ApiPurchase | null> {
  const res = await authFetch("/purchases/", {
    method: "POST",
    body: JSON.stringify({
      media_id: mediaId,
      payment_method: options?.payment_method || "",
      payment_reference: options?.payment_reference || "",
      payment_status: options?.payment_status || "success",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function downloadPurchase(
  purchaseId: number,
): Promise<{ url: string; remaining: number; message?: string } | null> {
  const res = await authFetch(`/purchases/${purchaseId}/download/`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Téléchargement refusé.");
  }
  return res.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  const res = await authFetch("/users/dashboard/");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchNotifications(): Promise<{ count: number; unread_count: number; results: ApiNotification[] } | null> {
  const res = await authFetch("/notifications/");
  if (!res.ok) return null;
  return res.json();
}

export async function markNotificationRead(id: number): Promise<boolean> {
  const res = await authFetch(`/notifications/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ read: true }),
  });
  return res.ok;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await authFetch("/notifications/mark-all-read/", { method: "POST" });
  return res.ok;
}

export interface FedapayInitiateResult {
  payment_url: string;
  reference: string;
  transaction_id?: string;
  amount_fcfa?: number;
}

export async function initiateFedapayPayment(data: {
  media_id?: number | null;
  amount_fcfa: number;
  method: string;
  plan?: string;
}): Promise<{ ok: true; data: FedapayInitiateResult } | { ok: false; error: string }> {
  const res = await authFetch("/payments/fedapay/initiate/", {
    method: "POST",
    body: JSON.stringify({
      media_id: data.media_id ?? null,
      amount_fcfa: data.amount_fcfa,
      method: data.method,
      plan: data.plan || "",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: string; message?: string };
    return { ok: false, error: err.error || err.message || "Erreur paiement carte." };
  }
  return { ok: true, data: body as FedapayInitiateResult };
}

export async function confirmFedapayPayment(data: {
  reference: string;
  transaction_id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/payments/fedapay/confirm/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: string; message?: string };
    return { ok: false, error: err.error || err.message || "Confirmation impossible." };
  }
  return { ok: true };
}

export async function fetchCardPaymentStatus(): Promise<{ enabled: boolean; provider: string | null }> {
  try {
    const res = await fetch(`${getApiUrl()}/payments/card/status/`);
    if (!res.ok) return { enabled: false, provider: null };
    return res.json();
  } catch {
    return { enabled: false, provider: null };
  }
}
