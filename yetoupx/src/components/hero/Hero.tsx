"use client";

import { useEffect, useState } from "react";
import type { Photo } from "@/types";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickFilter: (kw: string) => void;
  onSearch: () => void;
  /** Prises de vue du catalogue qui défilent sur la planche. */
  slides?: Photo[];
}

const SLIDE_MS = 5000;

const QUICK_PLACES: { label: string; keyword: string }[] = [
  { label: "Libreville", keyword: "libreville" },
  { label: "Ogooué", keyword: "ogooué" },
  { label: "Forêt équatoriale", keyword: "forêt" },
  { label: "Côte atlantique", keyword: "côte" },
  { label: "Paysages", keyword: "paysages" },
];

// Courbes de niveau tracées une fois au chargement (voir .hero-contours).
const CONTOURS = [
  "M-40 120 C 160 40, 300 180, 520 110 S 860 20, 1100 120 S 1400 200, 1560 90",
  "M-40 190 C 180 110, 320 250, 540 180 S 880 90, 1120 190 S 1400 270, 1560 160",
  "M-40 270 C 150 200, 340 330, 560 250 S 900 170, 1140 260 S 1420 340, 1560 240",
  "M-40 360 C 200 290, 360 420, 600 340 S 920 250, 1160 350 S 1420 430, 1560 330",
  "M-40 450 C 170 390, 380 510, 620 430 S 940 340, 1180 440 S 1440 520, 1560 420",
  "M-40 540 C 210 480, 400 600, 640 520 S 960 430, 1200 530 S 1450 600, 1560 510",
];

// Point où la balise se pose sur chaque vue, et direction de la dérive « drone ».
const BEACONS = [
  { left: "58%", top: "44%", drift: "drift-a" },
  { left: "34%", top: "58%", drift: "drift-b" },
  { left: "66%", top: "36%", drift: "drift-c" },
  { left: "46%", top: "62%", drift: "drift-a" },
  { left: "72%", top: "54%", drift: "drift-b" },
  { left: "40%", top: "40%", drift: "drift-c" },
];

export default function Hero({ searchQuery, onSearchChange, onQuickFilter, onSearch, slides = [] }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const active = count ? index % count : 0;

  // Avance d'une vue toutes les 5 s (en pause au survol ou au focus clavier).
  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, count, paused]);

  const current = slides[active];

  return (
    <section className="hero-wrap">
      <svg className="hero-contours" viewBox="0 0 1520 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {CONTOURS.map((d) => <path key={d} d={d} />)}
      </svg>

      <div className="hero">
        <div className="hero-content">
          <h1>Notre Gabon, vu du ciel.</h1>
          <p>
            Photos et vidéos aériennes de nos neuf provinces, de l&apos;Estuaire à la Nyanga.
            Achat à l&apos;unité, en HD ou 4K, avec licence commerciale.
          </p>

          <div className="hero-search-desktop">
            <form
              className="hero-search"
              role="search"
              onSubmit={(e) => { e.preventDefault(); onSearch(); }}
            >
              <div className="hero-search-field">
                <i className="ti ti-search" aria-hidden="true"></i>
                <input
                  type="search"
                  enterKeyHint="search"
                  aria-label="Rechercher un lieu ou un sujet"
                  placeholder="Un lieu, un fleuve, un sujet…"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
              <button type="submit">Rechercher</button>
            </form>
          </div>

          <div className="hero-tags">
            <span className="hero-tags-label">Essayez</span>
            {QUICK_PLACES.map((p) => (
              <button key={p.keyword} type="button" className="hero-tag" onClick={() => onQuickFilter(p.keyword)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {current && (
          <figure
            className="hero-plate"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-roledescription="carrousel"
            aria-label="Prises de vue du catalogue"
          >
            <div className="hero-plate-frame">
              {slides.map((s, i) => {
                // Seules la vue précédente (qui s'efface), l'active et la suivante
                // (préchargée) sont montées : 20 vues ne pèsent pas au chargement.
                const near = i === active || i === (active + 1) % count || i === (active - 1 + count) % count;
                return near && (
                <img
                  key={s.id}
                  src={s.img}
                  alt={i === active ? s.title : ""}
                  aria-hidden={i !== active}
                  draggable={false}
                  className={`hero-slide ${BEACONS[i % BEACONS.length].drift} ${i === active ? "is-active" : ""}`}
                />
                );
              })}
              <div className="watermark-overlay" aria-hidden="true"></div>
              <span
                key={`beacon-${active}`}
                className="hero-plate-beacon"
                style={{ left: BEACONS[active % BEACONS.length].left, top: BEACONS[active % BEACONS.length].top }}
                aria-hidden="true"
              ></span>
              {count > 1 && (
                <span
                  key={`progress-${active}-${paused}`}
                  className={`hero-plate-progress ${paused ? "is-paused" : ""}`}
                  aria-hidden="true"
                ></span>
              )}
            </div>

            <figcaption>
              <span key={`caption-${active}`} className="hero-plate-caption">
                <strong>{current.title}</strong>
                <span>{current.pres === "4k" ? "4K" : "HD"}, <em>{current.price}</em></span>
              </span>
              {count > 1 && (
                <span className="hero-plate-nav">
                  <button type="button" aria-label="Vue précédente" onClick={() => setIndex((active - 1 + count) % count)}>
                    <i className="ti ti-chevron-left" aria-hidden="true"></i>
                  </button>
                  <span className="hero-plate-count" aria-live="polite">
                    <strong>{active + 1}</strong> / {count}
                  </span>
                  <button type="button" aria-label="Vue suivante" onClick={() => setIndex((active + 1) % count)}>
                    <i className="ti ti-chevron-right" aria-hidden="true"></i>
                  </button>
                </span>
              )}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
