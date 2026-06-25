export default function UnitTable() {
  return (
    <div className="unit-table">
      <div className="unit-table-header">
        <h3>Grille tarifaire complète</h3>
        <p>Prix indicatifs en FCFA et USD (taux de référence BEAC : 1 USD = 600 FCFA)</p>
      </div>
      <div className="unit-row head">
        <span className="unit-type">Type de contenu</span>
        <span className="unit-fcfa">Prix FCFA</span>
        <span className="unit-usd">Prix USD</span>
        <span className="unit-target">Cible</span>
      </div>
      <div className="unit-row">
        <div className="unit-type">
          <i className="ti ti-photo"></i>
          <div>
            <div className="unit-type-name">Photo HD 1080p</div>
            <div className="unit-type-desc">6 000 × 4 000 px · JPEG</div>
          </div>
        </div>
        <div className="unit-fcfa">1 500 FCFA</div>
        <div className="unit-usd">~$2.50</div>
        <div className="unit-target">Particuliers</div>
      </div>
      <div className="unit-row">
        <div className="unit-type">
          <i className="ti ti-photo"></i>
          <div>
            <div className="unit-type-name">Photo 4K</div>
            <div className="unit-type-desc">8 000 × 5 333 px · RAW + JPEG</div>
          </div>
        </div>
        <div className="unit-fcfa">3 000 FCFA</div>
        <div className="unit-usd">~$5.00</div>
        <div className="unit-target">Professionnels</div>
      </div>
      <div className="unit-row">
        <div className="unit-type">
          <i className="ti ti-video"></i>
          <div>
            <div className="unit-type-name">Vidéo drone — 30 secondes</div>
            <div className="unit-type-desc">4K UHD · MP4 · H.264</div>
          </div>
        </div>
        <div className="unit-fcfa">5 000 FCFA</div>
        <div className="unit-usd">~$8.50</div>
        <div className="unit-target">Agences / Médias</div>
      </div>
      <div className="unit-row">
        <div className="unit-type">
          <i className="ti ti-video"></i>
          <div>
            <div className="unit-type-name">Vidéo drone — 1 minute</div>
            <div className="unit-type-desc">4K UHD · MP4 · H.264</div>
          </div>
        </div>
        <div className="unit-fcfa">10 000 FCFA</div>
        <div className="unit-usd">~$17.00</div>
        <div className="unit-target">Entreprises</div>
      </div>
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
