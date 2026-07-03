"use client";

interface DashboardCatalogueNavProps {
  catalogueTab: "photos" | "videos";
  photosCount: number;
  videosCount: number;
  searchQuery: string;
  onTabChange: (tab: "photos" | "videos") => void;
  onSearchChange: (query: string) => void;
  onGoTarifs: () => void;
}

export default function DashboardCatalogueNav({
  catalogueTab,
  photosCount,
  videosCount,
  searchQuery,
  onTabChange,
  onSearchChange,
  onGoTarifs,
}: DashboardCatalogueNavProps) {
  return (
    <div className="dash-catalogue-nav">
      <div className="dash-cat-tabs dash-cat-tabs--nav">
        <button
          type="button"
          className={`dash-cat-tab ${catalogueTab === "photos" ? "active" : ""}`}
          onClick={() => onTabChange("photos")}
        >
          <i className="ti ti-photo" /> Photos ({photosCount})
        </button>
        <button
          type="button"
          className={`dash-cat-tab ${catalogueTab === "videos" ? "active" : ""}`}
          onClick={() => onTabChange("videos")}
        >
          <i className="ti ti-video" /> Vidéos ({videosCount})
        </button>
      </div>

      <div className="dash-catalogue-toolbar">
        <div className="dash-catalogue-search">
          <i className="ti ti-search" />
          <input
            type="search"
            placeholder="Rechercher un média..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Rechercher dans le catalogue"
          />
          {searchQuery && (
            <button type="button" className="dash-catalogue-search-clear" onClick={() => onSearchChange("")} aria-label="Effacer">
              <i className="ti ti-x" />
            </button>
          )}
        </div>
        <button type="button" className="dash-catalogue-tarifs" onClick={onGoTarifs}>
          <i className="ti ti-tag" /> Tarifs
        </button>
      </div>
    </div>
  );
}
