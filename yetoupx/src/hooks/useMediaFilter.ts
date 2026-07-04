"use client";

import { useState } from "react";

export type MediaSortKey = "recent" | "popular" | "price-asc" | "price-desc";

/** État UI des filtres photos (requête API déclenchée ailleurs). */
export function usePhotoFilters() {
  const [activePCat, setActivePCat] = useState("all");
  const [activePRes, setActivePRes] = useState("all");
  const [pSort, setPSort] = useState<MediaSortKey>("recent");
  return { activePCat, setActivePCat, activePRes, setActivePRes, pSort, setPSort };
}

/** État UI des filtres vidéos (requête API déclenchée ailleurs). */
export function useVideoFilters() {
  const [activeVCat, setActiveVCat] = useState("all");
  const [activeVDur, setActiveVDur] = useState("all");
  const [activeVRes, setActiveVRes] = useState("all");
  const [vSort, setVSort] = useState<MediaSortKey>("recent");
  return {
    activeVCat, setActiveVCat,
    activeVDur, setActiveVDur,
    activeVRes, setActiveVRes,
    vSort, setVSort,
  };
}
