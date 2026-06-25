"use client";

import { useEffect } from "react";
import type { Photo } from "@/types";

interface LightboxModalProps {
  photo: Photo | null;
  onClose: () => void;
  onBuy: (name: string, price: string, format: string, img: string) => void;
  onCaptureToast: () => void;
}

export default function LightboxModal({ photo, onClose, onBuy, onCaptureToast }: LightboxModalProps) {
  if (!photo) return null;

  return (
    <div className="lightbox-modal" style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(8px)",
          background: "rgba(10,10,15,0.85)",
        }}
        onClick={onClose}
      ></div>
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "16px",
        }}
      >
        <div
          style={{
            position: "relative",
            minWidth: "120px",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lb-img"
            style={{
              backgroundImage: `url(${photo.img})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              width: "95vw",
              height: "90vh",
              maxWidth: "1200px",
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
            onContextMenu={(e) => { e.preventDefault(); onCaptureToast(); }}
            ref={(el) => {
              if (el) {
                const img = new Image();
                img.onload = () => { el.style.opacity = "1"; };
                img.src = photo.img;
              }
            }}
          />
          <div
            style={{
              position: "absolute",
              color: "#8A8A95",
              fontSize: "14px",
              pointerEvents: "none",
            }}
          >
            <i
              className="ti ti-loader"
              style={{ animation: "spin 1s linear infinite", display: "inline-block" }}
            ></i>
          </div>
          <div
            className="lb-watermark"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          ></div>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              zIndex: 20,
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8A8A95",
              background: "rgba(20,20,26,0.9)",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            <i className="ti ti-x"></i>
          </button>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "1rem",
              right: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontFamily: "Sora,sans-serif", fontWeight: 600, color: "#fff", fontSize: "14px" }}>
                {photo.title}
              </h3>
              <p style={{ color: "#8A8A95", fontSize: "12px" }}>{photo.details}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "18px", color: "#fff" }}>
                {photo.price}
              </div>
              <button
                onClick={() => {
                  onClose();
                  setTimeout(
                    () => onBuy(photo.title, photo.price.replace(" FCFA", ""), photo.format, photo.img),
                    300
                  );
                }}
                style={{
                  padding: "8px 16px",
                  background: "#C8371A",
                  color: "#fff",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <i className="ti ti-shopping-cart"></i> Acheter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
