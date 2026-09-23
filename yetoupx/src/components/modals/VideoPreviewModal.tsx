"use client";

import type { Video } from "@/types";

interface VideoPreviewModalProps {
  video: Video | null;
  onClose: () => void;
  onBuy: (name: string, price: string, format: string, img: string, mediaId?: number) => void;
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
          background: "rgba(238,241,236,0.85)",
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
            background: "var(--card)",
            border: "1px solid var(--contour)",
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
              borderBottom: "1px solid var(--contour)",
            }}
          >
            <h3 style={{ fontFamily: "var(--font)", fontWeight: 600, color: "var(--ink)", fontSize: "16px" }}>
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
                color: "var(--ink-2)",
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
              controlsList="nodownload noremoteplayback noplaybackrate"
              disableRemotePlayback
              disablePictureInPicture
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
                background: "rgba(47,111,115,0.9)",
                color: "#fff",
                fontSize: "12px",
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
                <p style={{ color: "var(--ink-2)", fontSize: "13px", marginBottom: "4px" }}>{video.details}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--card)",
                      border: "1px solid var(--contour)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "var(--ink-2)",
                    }}
                  >
                    {video.format}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--card)",
                      border: "1px solid var(--contour)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "var(--ink-2)",
                    }}
                  >
                    {video.duration}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: "22px", color: "var(--ink)" }}>
                  {video.price}
                </div>
                <p style={{ color: "var(--ink-2)", fontSize: "11px" }}>Paiement sécurisé</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  const v = video;
                  onClose();
                  setTimeout(
                    () => onBuy(v.title, v.price.replace(" FCFA", ""), v.format, v.img, v.id),
                    300
                  );
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "var(--river)",
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
                  border: "1px solid var(--contour)",
                  color: "var(--ink-2)",
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
