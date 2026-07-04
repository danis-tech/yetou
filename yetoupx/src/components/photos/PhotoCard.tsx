"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Photo } from "@/types";
import LikeButton from "@/components/ui/LikeButton";

interface PhotoCardProps {
  photo: Photo;
  idx: number;
  onBuy: (name: string, price: string, format: string, img: string, mediaId?: number) => void;
  onContextCapture: () => void;
  onToggleLike: (mediaId: number, onUpdate: (likes: number, isLiked: boolean) => void) => void;
  likeLoading?: boolean;
  carousel?: boolean;
}

export default function PhotoCard({ photo, idx, onBuy, onContextCapture, onToggleLike, likeLoading, carousel }: PhotoCardProps) {
  const router = useRouter();
  const imgSrc = photo.img?.trim() || "";
  const [imgLoaded, setImgLoaded] = useState(!imgSrc);
  const [likes, setLikes] = useState(photo.likes);
  const [isLiked, setIsLiked] = useState(photo.isLiked);

  const handleLike = () => {
    onToggleLike(photo.id, (newLikes, newIsLiked) => {
      setLikes(newLikes);
      setIsLiked(newIsLiked);
    });
  };

  return (
    <div
      className={`photo-item${carousel ? " photo-item--carousel" : ""}`}
      style={carousel ? undefined : { animationDelay: `${idx * 0.04}s` }}
      onClick={() => router.push(`/photo/${photo.id}`)}
      onContextMenu={(e) => { e.preventDefault(); onContextCapture(); }}
    >
      <div className="photo-inner">
        {!imgLoaded && imgSrc && (
          <div className="media-skeleton media-skeleton-photo" style={{ position: "absolute", inset: 0, borderRadius: 0 }}>
            <div className="media-skeleton-shimmer" />
          </div>
        )}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={photo.title}
            loading="lazy"
            decoding="async"
            className={`photo-img ${imgLoaded ? "photo-img--loaded" : "photo-img--loading"}`}
            onLoad={() => setImgLoaded(true)}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div className="photo-img photo-img--placeholder" aria-hidden="true" />
        )}
      </div>
      <div className={`photo-tag ${photo.pres === "4k" ? "k4" : ""}`}>
        {photo.pres === "4k" ? "4K" : "HD"}
      </div>
      <div className="photo-overlay">
        <div className="photo-info-title">{photo.title}</div>
        <div className="photo-info-sub">
          {photo.details.split("·").slice(1).join("·").trim()}
          <span className="photo-stats">
            <LikeButton likes={likes} isLiked={isLiked} loading={likeLoading} onToggle={handleLike} />
            <span className="photo-stat">
              <i className="ti ti-download" />
              {photo.downloads}
            </span>
          </span>
        </div>
        <div className="photo-action">
          <div className="photo-price">
            {photo.price.replace(" FCFA", "")} <small>FCFA</small>
          </div>
          <button
            className="btn-buy-sm"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(photo.title, photo.price.replace(" FCFA", ""), photo.format, photo.img, photo.id);
            }}
          >
            Acheter
          </button>
        </div>
      </div>
    </div>
  );
}
