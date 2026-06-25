"use client";

import { useRouter } from "next/navigation";
import type { Photo } from "@/types";

interface PhotoCardProps {
  photo: Photo;
  idx: number;
  onBuy: (name: string, price: string, format: string, img: string) => void;
  onContextCapture: () => void;
}

export default function PhotoCard({ photo, idx, onBuy, onContextCapture }: PhotoCardProps) {
  const router = useRouter();

  return (
    <div
      className="photo-item"
      style={{ animationDelay: `${idx * 0.04}s` }}
      onClick={() => router.push(`/photo/${photo.id}`)}
      onContextMenu={(e) => { e.preventDefault(); onContextCapture(); }}
    >
      <div className="photo-inner">
        <div
          className="photo-img"
          style={{ backgroundImage: `url(${photo.img.replace("1600", "700").replace("1200", "900")})` }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div className={`photo-tag ${photo.pres === "4k" ? "k4" : ""}`}>
        {photo.pres === "4k" ? "4K" : "HD"}
      </div>
      <div className="photo-overlay">
        <div className="photo-info-title">{photo.title}</div>
        <div className="photo-info-sub">
          {photo.details.split("·").slice(1).join("·").trim()}
          <span style={{ marginLeft: "12px", color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>
            <i className="ti ti-download" style={{ fontSize: "10px" }}></i> {photo.downloads}
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
              onBuy(photo.title, photo.price.replace(" FCFA", ""), photo.format, photo.img);
            }}
          >
            Acheter
          </button>
        </div>
      </div>
    </div>
  );
}
