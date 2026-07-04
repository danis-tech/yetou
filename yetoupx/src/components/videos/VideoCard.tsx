"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Video } from "@/types";
import LikeButton from "@/components/ui/LikeButton";

interface VideoCardProps {
  video: Video;
  idx: number;
  onBuy: (name: string, price: string, format: string, img: string, mediaId?: number) => void;
  onContextCapture: () => void;
  onToggleLike: (mediaId: number, onUpdate: (likes: number, isLiked: boolean) => void) => void;
  likeLoading?: boolean;
  carousel?: boolean;
}

export default function VideoCard({ video, idx, onBuy, onContextCapture, onToggleLike, likeLoading, carousel }: VideoCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const thumbSrc = video.img?.trim() || "";
  const [thumbLoaded, setThumbLoaded] = useState(!thumbSrc);
  const [likes, setLikes] = useState(video.likes);
  const [isLiked, setIsLiked] = useState(video.isLiked);
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

  const handleLike = () => {
    onToggleLike(video.id, (newLikes, newIsLiked) => {
      setLikes(newLikes);
      setIsLiked(newIsLiked);
    });
  };

  return (
    <div
      className={`video-card${carousel ? " video-card--carousel" : ""}`}
      style={carousel ? undefined : { animationDelay: `${idx * 0.08}s` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => { e.preventDefault(); onContextCapture(); }}
    >
      <div className="video-card-inner">
        <div className="video-thumb" onClick={() => router.push(`/video/${video.id}`)}>
          {!thumbLoaded && (
            <div className="media-skeleton media-skeleton-video" style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <div className="media-skeleton-shimmer" />
            </div>
          )}
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={video.title}
              loading="lazy"
              decoding="async"
              className="video-thumb-img"
              style={{ opacity: thumbLoaded ? 1 : 0, transition: "opacity 0.35s ease" }}
              onLoad={() => setThumbLoaded(true)}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="video-thumb-img video-thumb-img--placeholder" aria-hidden="true" />
          )}
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
          <div className="video-res">{video.vres}</div>
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
              <span className="video-genre video-genre--stats">
                <LikeButton likes={likes} isLiked={isLiked} loading={likeLoading} onToggle={handleLike} />
                <span className="video-stat">
                  <i className="ti ti-download" />
                  {video.downloads}
                </span>
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
                onBuy(video.title, video.price.replace(" FCFA", ""), video.format, video.img, video.id);
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
