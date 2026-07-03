import { useMemo } from "react";
import type { Photo, Video } from "@/types";

/** Construit un index de recherche normalisé (une seule passe à l'import). */
export function buildSearchIndex(...parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p != null && String(p).trim())
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesSearch(searchIndex: string, query: string): boolean {
  const q = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  return terms.every((term) => searchIndex.includes(term));
}

export function useMediaSearch<T extends { searchIndex: string }>(
  items: T[],
  query: string,
): T[] {
  return useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((item) => matchesSearch(item.searchIndex, q));
  }, [items, query]);
}

export function filterPhotosBySearch(photos: Photo[], query: string): Photo[] {
  const q = query.trim();
  if (!q) return photos;
  return photos.filter((p) => matchesSearch(p.searchIndex, q));
}

export function filterVideosBySearch(videos: Video[], query: string): Video[] {
  const q = query.trim();
  if (!q) return videos;
  return videos.filter((v) => matchesSearch(v.searchIndex, q));
}
