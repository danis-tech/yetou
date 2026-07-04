import { getApiUrl } from "@/lib/api-url";

export interface MediaListParams {
  type: "photo" | "video";
  category?: string;
  resolution?: string;
  duration?: string;
  search?: string;
  sort?: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 48;
const UNFILTERED_PAGE_SIZE = 100;
const CACHE_TTL_MS = 8_000;
const listCache = new Map<string, { ts: number; data: { items: ApiMedia[]; count: number } }>();
const inflight = new Map<string, Promise<{ items: ApiMedia[]; count: number }>>();

/** Vrai si recherche ou filtre catégorie / résolution / durée actifs (le tri seul ne restreint pas). */
export function hasMediaListFilters(params: MediaListParams): boolean {
  return !!(
    (params.category && params.category !== "all") ||
    (params.resolution && params.resolution !== "all") ||
    (params.duration && params.duration !== "all") ||
    params.search?.trim()
  );
}

export function buildMediaListQuery(params: MediaListParams): string {
  const p = new URLSearchParams();
  p.set("type", params.type);
  p.set("page_size", String(params.pageSize ?? DEFAULT_PAGE_SIZE));
  if (params.category && params.category !== "all") p.set("category", params.category);
  if (params.resolution && params.resolution !== "all") p.set("resolution", params.resolution);
  if (params.duration && params.duration !== "all") p.set("duration", params.duration);
  if (params.search?.trim()) p.set("search", params.search.trim());
  if (params.sort) p.set("sort", params.sort);
  return p.toString();
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
  likes_count: number;
  is_liked: boolean;
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

export interface ApiQuality {
  slug: string;
  name: string;
}

export interface ApiPricingRow {
  quality: string;
  quality_display: string;
  price: number;
  description: string;
}

export interface ApiPricingTable {
  qualities: ApiQuality[];
  pricing: { photo: ApiPricingRow[]; video: ApiPricingRow[] };
}

let pricingCache: { ts: number; data: ApiPricingTable } | null = null;
let pricingInflight: Promise<ApiPricingTable> | null = null;
const PRICING_CACHE_TTL_MS = 60_000;

/** Grille tarifaire dynamique (qualités + prix par type/qualité), avec cache court. */
export async function fetchPricing(): Promise<ApiPricingTable> {
  if (pricingCache && Date.now() - pricingCache.ts < PRICING_CACHE_TTL_MS) {
    return pricingCache.data;
  }
  if (pricingInflight) return pricingInflight;

  pricingInflight = (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/pricing/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiPricingTable = await res.json();
      pricingCache = { ts: Date.now(), data };
      return data;
    } finally {
      pricingInflight = null;
    }
  })();

  return pricingInflight;
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

async function fetchMediaPage(
  path: string,
  signal?: AbortSignal,
): Promise<{ items: ApiMedia[]; count: number }> {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const apiBase = getApiUrl();
  const url = path.startsWith("http") ? path : `${apiBase}${apiPath}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;

  let res = token
    ? await authFetch(apiPath, { signal })
    : await fetch(url, { signal });

  // JWT expiré/invalide : la liste publique reste accessible sans auth
  if ((res.status === 401 || res.status === 403) && token) {
    res = await fetch(url, { signal });
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  if (Array.isArray(data)) {
    return { items: data as ApiMedia[], count: data.length };
  }

  return {
    items: (data.results || []) as ApiMedia[],
    count: typeof data.count === "number" ? data.count : (data.results?.length ?? 0),
  };
}

/** Charge toutes les pages lorsqu'aucun filtre ni recherche n'est actif. */
async function fetchAllMediaListPages(
  query: string,
  signal?: AbortSignal,
): Promise<{ items: ApiMedia[]; count: number }> {
  const items: ApiMedia[] = [];
  let count = 0;
  let page = 1;

  while (true) {
    const path = `/media/?${query}&page=${page}`;
    const { items: pageItems, count: total } = await fetchMediaPage(path, signal);
    count = total;
    items.push(...pageItems);
    if (pageItems.length === 0 || items.length >= total) break;
    page += 1;
  }

  return { items, count };
}

export async function fetchMediaList(
  params: MediaListParams,
  signal?: AbortSignal,
): Promise<{ items: ApiMedia[]; count: number }> {
  const unfiltered = !hasMediaListFilters(params);
  const listParams: MediaListParams = unfiltered
    ? { ...params, pageSize: UNFILTERED_PAGE_SIZE }
    : { ...params, pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE };
  const query = buildMediaListQuery(listParams);
  const cacheKey = unfiltered ? `all:${query}` : query;

  const cached = listCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const promise = (unfiltered
    ? fetchAllMediaListPages(query, signal)
    : fetchMediaPage(`/media/?${query}`, signal)
  )
    .then((data) => {
      listCache.set(cacheKey, { ts: Date.now(), data });
      return data;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise);
  return promise;
}

/** Médias similaires — une seule page légère. */
export async function fetchMedia(type?: "photo" | "video", category?: string): Promise<ApiMedia[]> {
  if (!type) return [];
  const { items } = await fetchMediaList({ type, category, sort: "recent", pageSize: 8 });
  return items;
}

export async function fetchMediaById(id: number): Promise<ApiMedia | null> {
  try {
    const apiBase = getApiUrl();
    const url = `${apiBase}/media/${id}/`;
    const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;

    let res = token ? await authFetch(`/media/${id}/`) : await fetch(url);
    if ((res.status === 401 || res.status === 403) && token) {
      res = await fetch(url);
    }

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function toggleMediaLike(
  mediaId: number,
): Promise<{ likes_count: number; is_liked: boolean } | null> {
  const res = await authFetch(`/media/${mediaId}/like/`, { method: "POST" });
  if (!res.ok) return null;
  return res.json();
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
