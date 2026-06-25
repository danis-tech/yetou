"use client";

interface VideoFiltersProps {
  activeVCat: string;
  activeVDur: string;
  vSort: string;
  onSetVCat: (cat: string) => void;
  onSetVDur: (dur: string) => void;
  onSetVSort: (sort: string) => void;
}

export default function VideoFilters({
  activeVCat,
  activeVDur,
  vSort,
  onSetVCat,
  onSetVDur,
  onSetVSort,
}: VideoFiltersProps) {
  const cats = ["all", "paysages", "nature", "events", "archi", "culture"];
  const catLabels: Record<string, string> = {
    all: "Toutes",
    events: "Événements",
    archi: "Architecture",
  };

  const durs = ["all", "30", "60"];
  const durLabels: Record<string, string> = {
    all: "Toutes",
    "30": "30 sec — 5 000 FCFA",
    "60": "1 min — 10 000 FCFA",
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">Catégorie :</span>
        {cats.map((cat) => (
          <button
            key={cat}
            className={`chip ${activeVCat === cat ? "active" : ""}`}
            onClick={() => onSetVCat(cat)}
          >
            {catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div className="filter-sep"></div>
      <div className="filter-group">
        <span className="filter-label">Durée :</span>
        {durs.map((dur) => (
          <button
            key={dur}
            className={`chip ${activeVDur === dur ? "active" : ""}`}
            onClick={() => onSetVDur(dur)}
          >
            {durLabels[dur]}
          </button>
        ))}
      </div>
      <select className="sort-select" value={vSort} onChange={(e) => onSetVSort(e.target.value)}>
        <option value="recent">Plus récents</option>
        <option value="price-asc">Prix croissant</option>
        <option value="price-desc">Prix décroissant</option>
      </select>
    </div>
  );
}
