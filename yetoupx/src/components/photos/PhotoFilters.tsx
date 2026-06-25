"use client";

interface PhotoFiltersProps {
  activePCat: string;
  activePRes: string;
  pSort: string;
  onSetPCat: (cat: string) => void;
  onSetPRes: (res: string) => void;
  onSetPSort: (sort: string) => void;
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

  const reses = ["all", "hd", "4k"];
  const resLabels: Record<string, string> = {
    all: "Toutes",
    hd: "HD 1080p — 1 500 FCFA",
    "4k": "4K — 3 000 FCFA",
  };

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
      <select className="sort-select" value={pSort} onChange={(e) => onSetPSort(e.target.value)}>
        <option value="recent">Plus récents</option>
        <option value="price-asc">Prix croissant</option>
        <option value="price-desc">Prix décroissant</option>
      </select>
    </div>
  );
}
