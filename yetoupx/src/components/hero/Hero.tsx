"use client";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickFilter: (kw: string) => void;
  onSearch: () => void;
}

const HERO_BG = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=80&fit=crop";

export default function Hero({ searchQuery, onSearchChange, onQuickFilter, onSearch }: HeroProps) {
  return (
    <section className="hero hex-bg">
      <div className="hero-gradient"></div>
      <img
        className="hero-bg"
        src={HERO_BG}
        alt="Vue aérienne drone Gabon"
      />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="animate-fade-in">
          <div className="hero-eyebrow">
            <i className="ti ti-drone"></i> Médias professionnels — <strong>Gabon</strong>
          </div>
          <h1>
            Le Gabon en <em>HD </em>
            <br />
          </h1>
          <p>Images et vidéos haute définition — paysages, culture, nature, événements gabonais</p>
        </div>
        <div className="animate-fade-in delay-100">
          <div className="hero-search">
            <div className="hero-search-field">
              <i className="ti ti-search"></i>
              <input
                type="text"
                placeholder="Rechercher : Libreville, Ogooué, forêt équatoriale, fête nationale…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <button onClick={onSearch}>Rechercher</button>
          </div>
        </div>
        <div className="animate-fade-in delay-200 hero-tags">
          <span className="hero-tag" onClick={() => onQuickFilter("paysages")}>Paysages</span>
          <span className="hero-tag" onClick={() => onQuickFilter("libreville")}>Libreville</span>
          <span className="hero-tag" onClick={() => onQuickFilter("ogooué")}>Ogooué</span>
          <span className="hero-tag" onClick={() => onQuickFilter("forêt")}>Forêt équatoriale</span>
          <span className="hero-tag" onClick={() => onQuickFilter("culture")}>Culture &amp; traditions</span>
          <span className="hero-tag" onClick={() => onQuickFilter("côte")}>Côte atlantique</span>
          <span className="hero-tag" onClick={() => onQuickFilter("4K")}>4K uniquement</span>
        </div>
      </div>
    </section>
  );
}
