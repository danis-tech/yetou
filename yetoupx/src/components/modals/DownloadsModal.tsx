"use client";

import { useRef } from "react";
import type { PurchasedItem } from "@/types";

interface DownloadsModalProps {
  open: boolean;
  items: PurchasedItem[];
  onClose: () => void;
  downloadMedia: (index: number) => boolean;
  remainingDownloads: (item: PurchasedItem) => number;
}

export default function DownloadsModal({ open, items, onClose, downloadMedia, remainingDownloads }: DownloadsModalProps) {
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  if (!open) return null;

  const handleDownload = (item: PurchasedItem, index: number) => {
    const allowed = downloadMedia(index);
    if (!allowed) return;
    const link = linkRefs.current[index];
    if (link) link.click();
  };

  return (
    <div className={`modal-bg ${open ? "open" : ""}`} id="modal-downloads">
      <div className="modal" style={{ maxWidth: "560px" }}>
        <button className="modal-close" onClick={onClose}>
          <i className="ti ti-x"></i>
        </button>
        <div className="modal-title">Mes téléchargements</div>
        <div className="modal-sub">
          {items.length} média{items.length > 1 ? "s" : ""} acheté{items.length > 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
          {items.map((item, i) => {
            const remaining = remainingDownloads(item);
            const exhausted = remaining <= 0;

            return (
              <div
                key={i}
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
                    {item.format} · {item.date}
                  </div>
                  <div style={{ fontSize: "10px", color: exhausted ? "#C8371A" : "#8A8A95", marginTop: "2px" }}>
                    {exhausted ? "Téléchargements épuisés" : `${remaining} téléchargement${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
                  </div>
                </div>
                <button
                  className="btn-buy-sm"
                  disabled={exhausted}
                  onClick={() => handleDownload(item, i)}
                  style={{
                    textDecoration: "none", whiteSpace: "nowrap",
                    opacity: exhausted ? 0.4 : 1, cursor: exhausted ? "not-allowed" : "pointer",
                  }}
                >
                  <i className="ti ti-download"></i> {exhausted ? "Limite" : "Télécharger"}
                </button>
                <a
                  ref={(el) => { linkRefs.current[i] = el; }}
                  href={item.downloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "none" }}
                />
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8A8A95" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}></i>
              Aucun achat pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
