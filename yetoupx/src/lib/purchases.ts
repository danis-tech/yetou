import type { ApiPurchase } from "@/services/api";
import type { PurchasedItem } from "@/types";

const PAID_STATUSES = new Set(["success", "simulated"]);

export function isPaidPurchase(status?: string): boolean {
  return PAID_STATUSES.has((status || "success").toLowerCase());
}

export function mapApiPurchaseToItem(p: ApiPurchase): PurchasedItem {
  const media = p.media;
  const downloadUrl = media.stream_url || media.file_url || "";
  const img =
    media.preview_url ||
    media.thumbnail_url ||
    downloadUrl ||
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80";
  const status = (p.payment_status || "success").toLowerCase();

  return {
    id: p.id,
    mediaId: media.id,
    name: media.title,
    price: String(p.price),
    format: media.license_type || "—",
    img,
    downloadUrl,
    date: new Date(p.purchased_at).toLocaleDateString("fr-FR"),
    purchasedAt: p.purchased_at,
    type: media.type === "video" ? "video" : "photo",
    downloadCount: p.download_count,
    maxDownloads: p.max_downloads,
    paymentStatus: status,
    paymentMethod: p.payment_method,
    canDownload: isPaidPurchase(status),
  };
}

export function remainingDownloadsFor(item: PurchasedItem): number {
  return Math.max(0, item.maxDownloads - item.downloadCount);
}
