import { authFetch } from "@/services/api";
import { getApiUrl } from "@/lib/api-url";

export type PayoutMode = "revenue_share" | "buyout";

export interface ProgramConfig {
  accepting_submissions: boolean;
  commission_percent: number;
  contributor_percent: number;
  min_price: number;
  max_price: number;
  max_video_seconds: number;
  max_photo_size_mb: number;
  max_video_size_mb: number;
  min_payout: number;
  buyout_rates: { media_type: "photo" | "video"; quality: string; amount: number }[];
  max_buyout: { photo: number | null; video: number | null };
  photo_extensions: string[];
  video_extensions: string[];
  categories: { slug: string; name: string }[];
  qualities: { slug: string; name: string }[];
}

export interface ContributorProfile {
  display_name: string;
  bio: string;
  payout_operator: string;
  payout_phone: string;
  status: "active" | "suspended";
  created_at: string;
}

export interface Balance {
  earned: number;
  pending_payout: number;
  paid_out: number;
  available: number;
}

export interface ContributorMe {
  is_contributor: boolean;
  profile?: ContributorProfile;
  balance?: Balance;
  media_counts?: Record<string, number>;
}

export interface ContributionMedia {
  id: number;
  title: string;
  type: "photo" | "video";
  quality: string;
  category: string;
  status: "pending" | "published" | "rejected" | "draft" | "archived";
  status_display: string;
  payout_mode: PayoutMode;
  price: number;
  contributor_price: number | null;
  buyout_amount: number | null;
  rejection_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  preview_url: string;
  sales: number;
  earned: number;
}

export interface Earning {
  id: number;
  kind: "sale_share" | "buyout" | "adjustment";
  kind_display: string;
  media_title: string;
  gross_amount: number;
  commission_percent: number;
  amount: number;
  created_at: string;
}

export interface Payout {
  id: number;
  amount: number;
  operator: string;
  phone: string;
  status: "requested" | "paid" | "rejected";
  status_display: string;
  transaction_reference: string;
  admin_note: string;
  created_at: string;
  processed_at: string | null;
  has_proof: boolean;
  proof_uploaded_at: string | null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; errors?: Record<string, string> };

async function call<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await authFetch(path, options);
    if (res.status === 204) return { ok: true, data: undefined as T };
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const b = body as { error?: string; detail?: string; errors?: Record<string, string> };
      const first = b.errors ? Object.values(b.errors)[0] : "";
      return { ok: false, error: b.error || b.detail || first || "Une erreur est survenue.", errors: b.errors };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "Erreur réseau. Vérifiez votre connexion et réessayez." };
  }
}

export async function fetchProgramConfig(): Promise<ProgramConfig | null> {
  try {
    const res = await fetch(`${getApiUrl()}/contributors/config/`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export const fetchContributorMe = () => call<ContributorMe>("/contributors/me/");
export const joinProgram = (data: Record<string, unknown>) =>
  call<{ profile: ContributorProfile }>("/contributors/join/", { method: "POST", body: JSON.stringify(data) });
export const updateContributorProfile = (data: Record<string, unknown>) =>
  call<{ profile: ContributorProfile }>("/contributors/me/", { method: "PATCH", body: JSON.stringify(data) });
export const fetchMyContributions = () => call<ContributionMedia[]>("/contributors/media/");
export const withdrawContribution = (id: number) => call<void>(`/contributors/media/${id}/`, { method: "DELETE" });
export const fetchMyEarnings = () => call<Earning[]>("/contributors/earnings/");
export const fetchMyPayouts = () => call<Payout[]>("/contributors/payouts/");
/** Lien temporaire (5 min) vers la preuve de paiement d'un retrait. */
export const fetchPayoutProof = (id: number) => call<{ url: string }>(`/contributors/payouts/${id}/proof/`);

/** Notifications qui concernent l'activité de contributeur. */
export const CONTRIBUTOR_NOTIFICATION_TYPES = new Set([
  "contribution_submitted", "contribution_approved", "contribution_rejected", "contributor_earning",
  "payout_requested", "payout_paid", "payout_proof", "payout_rejected",
]);

export const requestPayout = (amount: number) =>
  call<{ id: number }>("/contributors/payouts/", { method: "POST", body: JSON.stringify({ amount }) });

/**
 * Envoie un média (multipart) avec suivi de progression — XHR plutôt que
 * fetch, qui ne donne pas la progression de l'envoi.
 */
export function submitContribution(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<ApiResult<ContributionMedia>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiUrl()}/contributors/media/`);
    const token = localStorage.getItem("pixia_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* réponse vide */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: body as unknown as ContributionMedia });
        return;
      }
      const errors = body.errors as Record<string, string> | undefined;
      const message = (body.error as string) || (body.detail as string) || (errors ? Object.values(errors)[0] : "")
        || (xhr.status === 413 ? "Fichier trop lourd pour le serveur." : "L'envoi a échoué.");
      resolve({ ok: false, error: message, errors });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Erreur réseau pendant l'envoi. Réessayez." });
    xhr.send(form);
  });
}

/** Lit la durée d'une vidéo et en extrait une image (≈1 s) pour la miniature. */
export function probeVideo(file: File): Promise<{ seconds: number; thumbnail: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    let seconds = 0;
    const done = (thumbnail: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ seconds, thumbnail });
    };
    video.onloadedmetadata = () => {
      seconds = Math.round(video.duration || 0);
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob), "image/jpeg", 0.85);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}
