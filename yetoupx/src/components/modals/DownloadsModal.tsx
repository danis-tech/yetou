"use client";

import { useState } from "react";
import type { PurchasedItem } from "@/types";

interface DownloadsModalProps {
  open: boolean;
  items: PurchasedItem[];
  onClose: () => void;
  onDownload: (item: PurchasedItem) => Promise<string>;
  remainingDownloads: (item: PurchasedItem) => number;
  onError?: (msg: string) => void;
}

export default function DownloadsModal({ open, items, onClose, onDownload, remainingDownloads, onError }: DownloadsModalProps) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  if (!open) return null;

  const handleDownload = async (item: PurchasedItem) => {
    setDownloadingId(item.id);
    try {
      const url = await onDownload(item);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Erreur de téléchargement.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={`modal-bg ${open ? "open" : ""}`} id="modal-downloads">
      <div className="modal" style={{ maxWidth: "560px" }}>
        <button className="modal-close" onClick={onClose}>
          <i className="ti ti-x"></i>
        </button>
        <div className="modal-title">Mes achats</div>
        <div className="modal-sub">
          {items.length} achat{items.length > 1 ? "s" : ""} confirmé{items.length > 1 ? "s" : ""} · téléchargez quand vous voulez
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
          {items.map((item) => {
            const remaining = remainingDownloads(item);
            const exhausted = remaining <= 0;
            const isDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  background: "#0A0A0F",
                  border: "1px solid #2A2A35",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  opacity: exhausted ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "56px",
                    borderRadius: "6px",
                    flexShrink: 0,
                    backgroundImage: `url(${item.img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Sora,sans-serif",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#F0EFEA",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8A8A95", marginTop: "2px" }}>
                    {item.format} · Acheté le {item.date}
                  </div>
                  <div style={{ fontSize: "10px", color: exhausted ? "#C8371A" : "#8A8A95", marginTop: "2px" }}>
                    {item.downloadCount === 0
                      ? "Jamais téléchargé"
                      : exhausted
                        ? "Téléchargements épuisés"
                        : `${item.downloadCount}/${item.maxDownloads} téléch. · ${remaining} restant${remaining > 1 ? "s" : ""}`}
                  </div>
                </div>
                <button
                  className="btn-buy-sm"
                  disabled={exhausted || isDownloading || !item.canDownload}
                  onClick={() => handleDownload(item)}
                  style={{
                    textDecoration: "none", whiteSpace: "nowrap",
                    opacity: exhausted || !item.canDownload ? 0.4 : 1,
                    cursor: exhausted || !item.canDownload ? "not-allowed" : "pointer",
                  }}
                >
                  <i className={`ti ${isDownloading ? "ti-loader" : "ti-download"}`} />
                  {isDownloading ? "..." : exhausted ? "Limite" : "Télécharger"}
                </button>
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8A8A95" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}></i>
              Aucun achat confirmé pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
