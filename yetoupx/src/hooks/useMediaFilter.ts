"use client";
import { useState, useMemo } from "react";
import type { Photo, Video } from "@/types";

export function usePhotoFilter(photos: Photo[]) {
  const [activePCat, setActivePCat] = useState("all");
  const [activePRes, setActivePRes] = useState("all");
  const [pSort, setPSort] = useState("recent");
  const [searchQuery] = useState("");

  const filtered = useMemo(() => {
    let list = [...photos];
    if (activePCat !== "all") list = list.filter((p) => p.pcat === activePCat);
    if (activePRes !== "all") list = list.filter((p) => p.pres === activePRes);
    list.sort((a, b) => {
      const pa = parseInt(a.price.replace(/\D/g, ""));
      const pb = parseInt(b.price.replace(/\D/g, ""));
      if (pSort === "price-asc") return pa - pb;
      if (pSort === "price-desc") return pb - pa;
      return 0;
    });
    return list;
  }, [photos, activePCat, activePRes, pSort]);

  return { filtered, activePCat, setActivePCat, activePRes, setActivePRes, pSort, setPSort };
}

export function useVideoFilter(videos: Video[]) {
  const [activeVCat, setActiveVCat] = useState("all");
  const [activeVDur, setActiveVDur] = useState("all");
  const [vSort, setVSort] = useState("recent");

  const filtered = useMemo(() => {
    let list = [...videos];
    if (activeVCat !== "all") list = list.filter((v) => v.vcat === activeVCat);
    if (activeVDur !== "all") list = list.filter((v) => v.vdur === activeVDur);
    list.sort((a, b) => {
      const pa = parseInt(a.price.replace(/\D/g, ""));
      const pb = parseInt(b.price.replace(/\D/g, ""));
      if (vSort === "price-asc") return pa - pb;
      if (vSort === "price-desc") return pb - pa;
      return 0;
    });
    return list;
  }, [videos, activeVCat, activeVDur, vSort]);

  return { filtered, activeVCat, setActiveVCat, activeVDur, setActiveVDur, vSort, setVSort };
}

export function useSearchFilter<T extends { title: string; [key: string]: unknown }>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] {
  return useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => String(item[field]).toLowerCase().includes(q))
    );
  }, [items, query, searchFields]);
}
