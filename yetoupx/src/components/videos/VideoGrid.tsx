"use client";

import type { Video } from "@/types";
import VideoCard from "./VideoCard";
import VideoFilters from "./VideoFilters";
import MediaCarouselRows from "@/components/ui/MediaCarouselRows";

interface VideoGridProps {
  videos: Video[];
  resultCount?: number;
  refreshing?: boolean;
  activeVCat: string;
  activeVDur: string;
  activeVRes: string;
  vSort: string;
  onSetVCat: (cat: string) => void;
  onSetVDur: (dur: string) => void;
  onSetVRes: (res: string) => void;
  onSetVSort: (sort: import("@/hooks/useMediaFilter").MediaSortKey) => void;
  onBuy: (name: string, price: string, format: string, img: string, mediaId?: number) => void;
  onContextCapture: () => void;
  onGoTarifs: () => void;
  onToggleLike: (mediaId: number, onUpdate: (likes: number, isLiked: boolean) => void) => void;
  likeLoadingId?: number | null;
}

export default function VideoGrid({
  videos,
  resultCount,
  refreshing,
  activeVCat,
  activeVDur,
  activeVRes,
  vSort,
  onSetVCat,
  onSetVDur,
  onSetVRes,
  onSetVSort,
  onBuy,
  onContextCapture,
  onGoTarifs,
  onToggleLike,
  likeLoadingId,
}: VideoGridProps) {
  return (
    <div className={refreshing ? "media-grid--refreshing" : undefined}>
      <VideoFilters
        activeVCat={activeVCat}
        activeVDur={activeVDur}
        activeVRes={activeVRes}
        vSort={vSort}
        onSetVCat={onSetVCat}
        onSetVDur={onSetVDur}
        onSetVRes={onSetVRes}
        onSetVSort={onSetVSort}
      />
      <div className="section-hd">
        <h2>
          Vidéos disponibles{" "}
          <span style={{ fontSize: "13px", color: "#8A8A95", fontWeight: 400 }}>
            ({resultCount ?? videos.length} résultats)
          </span>
        </h2>
        <span onClick={onGoTarifs}>Voir les tarifs →</span>
      </div>
      <MediaCarouselRows
        items={videos}
        variant="video"
        getKey={(video) => video.id}
        renderItem={(video, idx, carousel) => (
          <VideoCard
            video={video}
            idx={idx}
            onBuy={onBuy}
            onContextCapture={onContextCapture}
            onToggleLike={onToggleLike}
            likeLoading={likeLoadingId === video.id}
            carousel={carousel}
          />
        )}
      />
      {videos.length === 0 && (
        <div className="no-results" style={{ display: "block" }}>
          <i className="ti ti-video-off"></i>
          <p>Aucune vidéo ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
