const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export async function fetchMedia(type?: "photo" | "video", category?: string): Promise<ApiMedia[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (category) params.set("category", category);

  try {
    const res = await fetch(`${API_URL}/media/?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || data;
  } catch {
    return [];
  }
}

export async function fetchMediaById(id: number): Promise<ApiMedia | null> {
  try {
    const res = await fetch(`${API_URL}/media/${id}/`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPurchases(): Promise<ApiPurchase[]> {
  const res = await authFetch("/purchases/");
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || data;
}

export async function createPurchase(mediaId: number): Promise<ApiPurchase | null> {
  const res = await authFetch("/purchases/", {
    method: "POST",
    body: JSON.stringify({ media_id: mediaId }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function downloadPurchase(purchaseId: number): Promise<{ url: string; remaining: number } | null> {
  const res = await authFetch(`/purchases/${purchaseId}/download/`, { method: "POST" });
  if (!res.ok) return null;
  return res.json();
}
