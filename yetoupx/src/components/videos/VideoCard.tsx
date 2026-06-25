"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Video } from "@/types";

interface VideoCardProps {
  video: Video;
  idx: number;
  onBuy: (name: string, price: string, format: string, img: string) => void;
  onContextCapture: () => void;
}

export default function VideoCard({ video, idx, onBuy, onContextCapture }: VideoCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    hoverTimer.current = setTimeout(() => {
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, []);

  return (
    <div
      className="video-card"
      style={{ animationDelay: `${idx * 0.08}s` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => { e.preventDefault(); onContextCapture(); }}
    >
      <div className="video-card-inner">
        <div className="video-thumb" onClick={() => router.push(`/video/${video.id}`)}>
          <div
            className="video-thumb-img"
            style={{ backgroundImage: `url(${video.img})` }}
            onContextMenu={(e) => e.preventDefault()}
          />
          {video.videoUrl && (
            <video
              ref={videoRef}
              src={video.videoUrl}
              muted
              playsInline
              loop
              preload="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.35s ease",
                zIndex: 4,
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
          <div className="watermark-sm">yétou</div>
          <div className="video-play"><i className="ti ti-player-play"></i></div>
          <div className="video-res">4K</div>
          <div className="video-dur">{video.duration}</div>
        </div>
        <div className="video-body">
          <div className="video-title">{video.title}</div>
          <div className="video-sub">{video.details}</div>
          <div className="video-expand">
            <div className="video-genres">
              <span className="video-genre">
                {video.vcat === "paysages" ? "Paysages" : video.vcat === "nature" ? "Nature" : video.vcat === "events" ? "Événements" : video.vcat === "archi" ? "Architecture" : "Culture"}
              </span>
              <span className="video-genre">
                {video.duration.includes("1:") ? "Long format" : "Court format"}
              </span>
              <span className="video-genre">
                <i className="ti ti-download"></i> {video.downloads}
              </span>
            </div>
          </div>
          <div className="video-footer">
            <div className="video-price">
              {video.price.replace(" FCFA", "")} <small>FCFA</small>
            </div>
            <button
              className="btn-buy"
              onClick={(e) => {
                e.stopPropagation();
                onBuy(video.title, video.price.replace(" FCFA", ""), video.format, video.img);
              }}
            >
              <i className="ti ti-download"></i> Acheter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
