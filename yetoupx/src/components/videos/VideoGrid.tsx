"use client";

import type { Video } from "@/types";
import VideoCard from "./VideoCard";
import VideoFilters from "./VideoFilters";

interface VideoGridProps {
  videos: Video[];
  activeVCat: string;
  activeVDur: string;
  vSort: string;
  onSetVCat: (cat: string) => void;
  onSetVDur: (dur: string) => void;
  onSetVSort: (sort: string) => void;
  onBuy: (name: string, price: string, format: string, img: string) => void;
  onContextCapture: () => void;
  onGoTarifs: () => void;
}

export default function VideoGrid({
  videos,
  activeVCat,
  activeVDur,
  vSort,
  onSetVCat,
  onSetVDur,
  onSetVSort,
  onBuy,
  onContextCapture,
  onGoTarifs,
}: VideoGridProps) {
  return (
    <div>
      <VideoFilters
        activeVCat={activeVCat}
        activeVDur={activeVDur}
        vSort={vSort}
        onSetVCat={onSetVCat}
        onSetVDur={onSetVDur}
        onSetVSort={onSetVSort}
      />
      <div className="section-hd">
        <h2>
          Vidéos disponibles{" "}
          <span style={{ fontSize: "13px", color: "#8A8A95", fontWeight: 400 }}>
            ({videos.length} résultats)
          </span>
        </h2>
        <span onClick={onGoTarifs}>Voir les tarifs →</span>
      </div>
      <div className="video-grid">
        {videos.map((video, idx) => (
          <VideoCard
            key={idx}
            video={video}
            idx={idx}
            onBuy={onBuy}
            onContextCapture={onContextCapture}
          />
        ))}
      </div>
      {videos.length === 0 && (
        <div className="no-results" style={{ display: "block" }}>
          <i className="ti ti-video-off"></i>
          <p>Aucune vidéo ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
