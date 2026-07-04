"use client";

import type { Photo } from "@/types";
import PhotoCard from "./PhotoCard";
import PhotoFilters from "./PhotoFilters";
import MediaCarouselRows from "@/components/ui/MediaCarouselRows";

interface PhotoGridProps {
  photos: Photo[];
  resultCount?: number;
  refreshing?: boolean;
  activePCat: string;
  activePRes: string;
  pSort: string;
  onSetPCat: (cat: string) => void;
  onSetPRes: (res: string) => void;
  onSetPSort: (sort: import("@/hooks/useMediaFilter").MediaSortKey) => void;
  onBuy: (name: string, price: string, format: string, img: string, mediaId?: number) => void;
  onContextCapture: () => void;
  onGoTarifs: () => void;
  onToggleLike: (mediaId: number, onUpdate: (likes: number, isLiked: boolean) => void) => void;
  likeLoadingId?: number | null;
}

export default function PhotoGrid({
  photos,
  resultCount,
  refreshing,
  activePCat,
  activePRes,
  pSort,
  onSetPCat,
  onSetPRes,
  onSetPSort,
  onBuy,
  onContextCapture,
  onGoTarifs,
  onToggleLike,
  likeLoadingId,
}: PhotoGridProps) {
  return (
    <div className={refreshing ? "media-grid--refreshing" : undefined}>
      <PhotoFilters
        activePCat={activePCat}
        activePRes={activePRes}
        pSort={pSort}
        onSetPCat={onSetPCat}
        onSetPRes={onSetPRes}
        onSetPSort={onSetPSort}
      />
      <div className="section-hd">
        <h2>
          Photos disponibles{" "}
          <span style={{ fontSize: "13px", color: "#8A8A95", fontWeight: 400 }}>
            ({resultCount ?? photos.length} résultats)
          </span>
        </h2>
        <span onClick={onGoTarifs}>Voir les tarifs →</span>
      </div>
      <MediaCarouselRows
        items={photos}
        variant="photo"
        getKey={(photo) => photo.id}
        renderItem={(photo, idx, carousel) => (
          <PhotoCard
            photo={photo}
            idx={idx}
            onBuy={onBuy}
            onContextCapture={onContextCapture}
            onToggleLike={onToggleLike}
            likeLoading={likeLoadingId === photo.id}
            carousel={carousel}
          />
        )}
      />
      {photos.length === 0 && (
        <div className="no-results" style={{ display: "block" }}>
          <i className="ti ti-photo-off"></i>
          <p>
            {activePCat === "all" && activePRes === "all"
              ? "Aucune photo disponible pour le moment."
              : "Aucune photo ne correspond à votre recherche."}
          </p>
        </div>
      )}
    </div>
  );
}
