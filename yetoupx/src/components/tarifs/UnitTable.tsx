"use client";

import { usePricing, formatFcfa } from "@/hooks/usePricing";

const USD_RATE = 600;
const formatUsd = (fcfa: number) => `~$${(fcfa / USD_RATE).toFixed(2)}`;

export default function UnitTable() {
  const { pricing } = usePricing();

  return (
    <div className="unit-table">
      <div className="unit-table-header">
        <h3>Grille tarifaire complète</h3>
        <p>Prix indicatifs en FCFA et USD (taux de référence BEAC : 1 USD = {USD_RATE} FCFA)</p>
      </div>
      <div className="unit-row head">
        <span className="unit-type">Type de contenu</span>
        <span className="unit-fcfa">Prix FCFA</span>
        <span className="unit-usd">Prix USD</span>
        <span className="unit-target">Cible</span>
      </div>
      {pricing.pricing.photo.map((row) => (
        <div className="unit-row" key={`photo-${row.quality}`}>
          <div className="unit-type">
            <i className="ti ti-photo"></i>
            <div>
              <div className="unit-type-name">Photo {row.quality_display}</div>
              <div className="unit-type-desc">{row.description || "Licence commerciale incluse"}</div>
            </div>
          </div>
          <div className="unit-fcfa">{formatFcfa(row.price)}</div>
          <div className="unit-usd">{formatUsd(row.price)}</div>
          <div className="unit-target">{row.quality === "4K" ? "Professionnels" : "Particuliers"}</div>
        </div>
      ))}
      {pricing.pricing.video.map((row) => (
        <div className="unit-row" key={`video-${row.quality}`}>
          <div className="unit-type">
            <i className="ti ti-video"></i>
            <div>
              <div className="unit-type-name">Vidéo drone — {row.quality_display}</div>
              <div className="unit-type-desc">{row.description || "MP4 · H.264"}</div>
            </div>
          </div>
          <div className="unit-fcfa">{formatFcfa(row.price)}</div>
          <div className="unit-usd">{formatUsd(row.price)}</div>
          <div className="unit-target">{row.quality === "4K" ? "Entreprises" : "Agences / Médias"}</div>
        </div>
      ))}
      <div className="unit-row highlight">
        <div className="unit-type">
          <i className="ti ti-star" style={{ color: "#C8371A" }}></i>
          <div>
            <div className="unit-type-name" style={{ color: "#C8371A" }}>Abonnement mensuel</div>
            <div className="unit-type-desc">Photos illimitées HD &amp; 4K</div>
          </div>
        </div>
        <div className="unit-fcfa">15 000 FCFA</div>
        <div className="unit-usd">~$25.00</div>
        <div className="unit-target">Créatifs actifs</div>
      </div>
      <div className="unit-row highlight">
        <div className="unit-type">
          <i className="ti ti-crown" style={{ color: "#C8371A" }}></i>
          <div>
            <div className="unit-type-name" style={{ color: "#C8371A" }}>Abonnement professionnel</div>
            <div className="unit-type-desc">Photos + Vidéos illimitées</div>
          </div>
        </div>
        <div className="unit-fcfa">50 000 FCFA</div>
        <div className="unit-usd">~$85.00</div>
        <div className="unit-target">PME / Agences</div>
      </div>
    </div>
  );
}
