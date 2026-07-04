"use client";

import type { MediaSortKey } from "@/hooks/useMediaFilter";
import { usePricing, formatFcfa } from "@/hooks/usePricing";

interface PhotoFiltersProps {
  activePCat: string;
  activePRes: string;
  pSort: string;
  onSetPCat: (cat: string) => void;
  onSetPRes: (res: string) => void;
  onSetPSort: (sort: MediaSortKey) => void;
}

export default function PhotoFilters({
  activePCat,
  activePRes,
  pSort,
  onSetPCat,
  onSetPRes,
  onSetPSort,
}: PhotoFiltersProps) {
  const cats = ["all", "paysages", "nature", "culture", "events", "archi"];
  const catLabels: Record<string, string> = {
    all: "Toutes",
    nature: "Nature & fleuves",
    events: "Événements",
    archi: "Architecture",
  };

  const { pricing } = usePricing();
  const reses = ["all", ...pricing.pricing.photo.map((r) => r.quality)];
  const resLabels: Record<string, string> = { all: "Toutes" };
  pricing.pricing.photo.forEach((r) => {
    resLabels[r.quality] = `${r.quality_display} — ${formatFcfa(r.price)}`;
  });

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">Catégorie :</span>
        {cats.map((cat) => (
          <button
            key={cat}
            className={`chip ${activePCat === cat ? "active" : ""}`}
            onClick={() => onSetPCat(cat)}
          >
            {catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div className="filter-sep"></div>
      <div className="filter-group">
        <span className="filter-label">Résolution :</span>
        {reses.map((res) => (
          <button
            key={res}
            className={`chip ${activePRes === res ? "active" : ""}`}
            onClick={() => onSetPRes(res)}
          >
            {resLabels[res]}
          </button>
        ))}
      </div>
      <select className="sort-select" value={pSort} onChange={(e) => onSetPSort(e.target.value as MediaSortKey)}>
        <option value="recent">Plus récents</option>
        <option value="popular">Plus aimés</option>
        <option value="price-asc">Prix croissant</option>
        <option value="price-desc">Prix décroissant</option>
      </select>
    </div>
  );
}
