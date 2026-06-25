"use client";

import type { Video } from "@/types";

interface VideoPreviewModalProps {
  video: Video | null;
  onClose: () => void;
  onBuy: (name: string, price: string, format: string, img: string) => void;
}

export default function VideoPreviewModal({ video, onClose, onBuy }: VideoPreviewModalProps) {
  if (!video) return null;

  return (
    <div className="video-preview-modal" style={{ position: "fixed", inset: 0, zIndex: 100 }}>
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
            background: "#14141A",
            border: "1px solid #2A2A35",
            borderRadius: "16px",
            maxWidth: "896px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            margin: "0 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              borderBottom: "1px solid #2A2A35",
            }}
          >
            <h3 style={{ fontFamily: "Sora,sans-serif", fontWeight: 600, color: "#fff", fontSize: "14px" }}>
              {video.title}
            </h3>
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8A8A95",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              <i className="ti ti-x"></i>
            </button>
          </div>
          <div style={{ position: "relative", background: "black" }}>
            <video
              key={video.videoUrl}
              style={{ width: "100%", maxHeight: "50vh", objectFit: "contain" }}
              controls
              controlsList="nodownload"
              playsInline
              muted
              autoPlay
              onContextMenu={(e) => e.preventDefault()}
            >
              <source src={video.videoUrl} type="video/mp4" />
            </video>
            <div className="watermark-overlay" style={{ position: "absolute" }}></div>
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 20,
                background: "rgba(200,55,26,0.9)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: "6px",
              }}
            >
              <i className="ti ti-eye" style={{ marginRight: "4px" }}></i>PRÉVISUALISATION
            </div>
          </div>
          <div style={{ padding: "16px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ color: "#8A8A95", fontSize: "13px", marginBottom: "4px" }}>{video.details}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#14141A",
                      border: "1px solid #2A2A35",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "#8A8A95",
                    }}
                  >
                    {video.format}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#14141A",
                      border: "1px solid #2A2A35",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "#8A8A95",
                    }}
                  >
                    {video.duration}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "22px", color: "#fff" }}>
                  {video.price}
                </div>
                <p style={{ color: "#8A8A95", fontSize: "11px" }}>Paiement sécurisé</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  const v = video;
                  onClose();
                  setTimeout(
                    () => onBuy(v.title, v.price.replace(" FCFA", ""), v.format, v.img),
                    300
                  );
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#C8371A",
                  color: "#fff",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <i className="ti ti-shopping-cart"></i> Acheter maintenant
              </button>
              <button
                style={{
                  padding: "12px 16px",
                  border: "1px solid #2A2A35",
                  color: "#8A8A95",
                  borderRadius: "8px",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                <i className="ti ti-heart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
