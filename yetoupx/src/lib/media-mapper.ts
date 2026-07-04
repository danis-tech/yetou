import type { ApiMedia } from "@/services/api";
import type { Photo, Video } from "@/types";
import { buildSearchIndex } from "@/hooks/useMediaSearch";

/** Regroupe 720p / 1080p / HD sous le filtre « hd ». */
export function normalizePhotoResolution(quality: string): string {
  const q = quality.toLowerCase();
  if (q === "4k") return "4k";
  if (q === "hd" || q === "720" || q === "1080") return "hd";
  return q;
}

export function mapApiMediaToPhoto(m: ApiMedia): Photo {
  return {
    id: m.id,
    title: m.title,
    details: `${m.quality_display} · ${m.resolution || m.file_size_display || ""} · ${m.category_display || m.category}`,
    format: m.license_type || "Commerciale",
    price: `${m.price} FCFA`,
    img: m.preview_url || m.thumbnail_url || m.stream_url || m.file_url,
    pcat: m.category,
    pres: normalizePhotoResolution(m.quality),
    downloads: m.downloads,
    likes: m.likes_count ?? 0,
    isLiked: m.is_liked ?? false,
    createdAt: m.created_at,
    searchIndex: buildSearchIndex(
      m.title, m.category_display, m.category, m.quality, m.quality_display,
      m.resolution, m.province, m.city, m.tags, m.license_type,
    ),
  };
}

export function mapApiMediaToVideo(m: ApiMedia): Video {
  return {
    id: m.id,
    title: m.title,
    details: `Vidéo ${m.duration || "0:30"} · ${m.quality_display}`,
    format: "MP4",
    duration: m.duration || "0:30",
    price: `${m.price} FCFA`,
    img: m.preview_url || m.thumbnail_url || "",
    videoUrl: m.stream_url || m.file_url,
    vcat: m.category,
    vdur: m.duration?.includes("1:") ? "60" : "30",
    vres: m.quality,
    downloads: m.downloads,
    likes: m.likes_count ?? 0,
    isLiked: m.is_liked ?? false,
    createdAt: m.created_at,
    searchIndex: buildSearchIndex(
      m.title, m.category_display, m.category, m.quality, m.quality_display,
      m.duration, m.province, m.city, m.tags,
    ),
  };
}
