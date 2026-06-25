"use client";

import type { Photo } from "@/types";
import PhotoCard from "./PhotoCard";
import PhotoFilters from "./PhotoFilters";

interface PhotoGridProps {
  photos: Photo[];
  activePCat: string;
  activePRes: string;
  pSort: string;
  onSetPCat: (cat: string) => void;
  onSetPRes: (res: string) => void;
  onSetPSort: (sort: string) => void;
  onBuy: (name: string, price: string, format: string, img: string) => void;
  onContextCapture: () => void;
  onGoTarifs: () => void;
}

export default function PhotoGrid({
  photos,
  activePCat,
  activePRes,
  pSort,
  onSetPCat,
  onSetPRes,
  onSetPSort,
  onBuy,
  onContextCapture,
  onGoTarifs,
}: PhotoGridProps) {
  return (
    <div>
      <PhotoFilters
        activePCat={activePCat}
        activePRes={activePRes}
        pSort={pSort}
        onSetPCat={onSetPCat}
        onSetPRes={onSetPRes}
        onSetPSort={onSetPSort}
      />
      <div className="section-hd">
        <h2>
          Photos disponibles{" "}
          <span style={{ fontSize: "13px", color: "#8A8A95", fontWeight: 400 }}>
            ({photos.length} résultats)
          </span>
        </h2>
        <span onClick={onGoTarifs}>Voir les tarifs →</span>
      </div>
      <div className="photo-grid">
        {photos.map((photo, idx) => (
          <PhotoCard
            key={idx}
            photo={photo}
            idx={idx}
            onBuy={onBuy}
            onContextCapture={onContextCapture}
          />
        ))}
      </div>
      {photos.length === 0 && (
        <div className="no-results" style={{ display: "block" }}>
          <i className="ti ti-photo-off"></i>
          <p>Aucune photo ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
