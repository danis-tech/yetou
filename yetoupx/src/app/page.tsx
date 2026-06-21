"use client";

import { useState, useEffect, useCallback } from "react";
import { photosData, videosData, type Photo, type Video } from "./data";
import airtelLogo from "../logo/airtel.png";
import moovLogo from "../logo/moov.png";
import googleLogo from "../logo/google.jpg";

type Tab = "photos" | "videos" | "tarifs";
type AuthTab = "login" | "register";

interface BuyItem {
  name: string;
  price: string;
  format: string;
  img: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Photo filters
  const [activePCat, setActivePCat] = useState("all");
  const [activePRes, setActivePRes] = useState("all");
  const [pSort, setPSort] = useState("recent");

  // Video filters
  const [activeVCat, setActiveVCat] = useState("all");
  const [activeVDur, setActiveVDur] = useState("all");
  const [vSort, setVSort] = useState("recent");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Video Preview
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Buy Modal
  const [buyItem, setBuyItem] = useState<BuyItem | null>(null);
  const [activePayMethod, setActivePayMethod] = useState("Airtel Money");
  const [isPaid, setIsPaid] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Auth Modal
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");

  // Toast
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // ─── Show Toast ───
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  }, []);

  // ─── ESC Key ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxPhoto(null);
        setPreviewVideo(null);
        setBuyItem(null);
        setAuthOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ─── Lock body scroll ───
  useEffect(() => {
    const anyOpen = lightboxPhoto || previewVideo || buyItem || authOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxPhoto, previewVideo, buyItem, authOpen]);

  // ─── Tab switching ───
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Photo filtering ───
  const getFilteredPhotos = (): Photo[] => {
    let list = [...photosData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.pcat.toLowerCase().includes(q) ||
          p.pres.toLowerCase().includes(q)
      );
    } else {
      if (activePCat !== "all") list = list.filter((p) => p.pcat === activePCat);
      if (activePRes !== "all") list = list.filter((p) => p.pres === activePRes);
    }

    list.sort((a, b) => {
      const pa = parseInt(a.price.replace(/\D/g, ""));
      const pb = parseInt(b.price.replace(/\D/g, ""));
      if (pSort === "price-asc") return pa - pb;
      if (pSort === "price-desc") return pb - pa;
      return 0;
    });

    return list;
  };

  // ─── Video filtering ───
  const getFilteredVideos = (): Video[] => {
    let list = [...videosData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.vcat.toLowerCase().includes(q) ||
          v.vdur.toLowerCase().includes(q) ||
          q === "4k"
      );
    } else {
      if (activeVCat !== "all") list = list.filter((v) => v.vcat === activeVCat);
      if (activeVDur !== "all") list = list.filter((v) => v.vdur === activeVDur);
    }

    list.sort((a, b) => {
      const pa = parseInt(a.price.replace(/\D/g, ""));
      const pb = parseInt(b.price.replace(/\D/g, ""));
      if (vSort === "price-asc") return pa - pb;
      if (vSort === "price-desc") return pb - pa;
      return 0;
    });

    return list;
  };

  // ─── Quick filter from hero tags ───
  const quickFilter = (kw: string) => {
    setSearchQuery(kw);
    switchTab("photos");
  };

  // ─── Buy modal ───
  const openBuy = (name: string, price: string, format: string, img: string) => {
    setBuyItem({ name, price, format, img });
    setActivePayMethod("Airtel Money");
    setClientPhone("");
    setPayLoading(false);
  };

  const confirmPay = async () => {
    if (!buyItem) return;

    const isMobileMoney = activePayMethod === "Airtel Money" || activePayMethod === "Moov Money";

    if (isMobileMoney && !clientPhone) {
      showToast("Veuillez entrer votre numéro de téléphone.");
      return;
    }

    setPayLoading(true);

    try {
      const res = await fetch("/api/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(buyItem.price.replace(/\D/g, "")),
          reference: `YETOU-${buyItem.name.slice(0, 20)}-${Date.now()}`,
          client_msisdn: clientPhone || "000000000",
          portefeuille: "",
          method: activePayMethod,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBuyItem(null);
        showToast(data.message || "Paiement initié avec succès !");
        setIsPaid(true);
      } else {
        showToast(data.message || "Erreur lors du paiement.");
      }
    } catch {
      showToast("Erreur réseau. Veuillez réessayer.");
    } finally {
      setPayLoading(false);
    }
  };

  // ─── Plan selection ───
  const selectPlan = (plan: string) => {
    if (plan === "monthly") {
      openBuy("Abonnement Mensuel", "15 000", "15 000 FCFA/mois", "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop");
    } else if (plan === "pro") {
      openBuy("Abonnement Pro", "50 000", "50 000 FCFA/mois", "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop");
    }
  };

  const filteredPhotos = getFilteredPhotos();
  const filteredVideos = getFilteredVideos();

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">yé<em>tou</em><span>by Best Aero Drone · Gabon</span></div>

        <div className="nav-tabs">
          <button className={`nav-tab ${activeTab === "photos" ? "active" : ""}`} onClick={() => switchTab("photos")}>
            <i className="ti ti-photo"></i> Photos
          </button>
          <button className={`nav-tab ${activeTab === "videos" ? "active" : ""}`} onClick={() => switchTab("videos")}>
            <i className="ti ti-video"></i> Vidéos
          </button>
          <button className={`nav-tab ${activeTab === "tarifs" ? "active" : ""}`} onClick={() => switchTab("tarifs")}>
            <i className="ti ti-tag"></i> Tarifs
          </button>
        </div>

        <div className="nav-search">
          <i className="ti ti-search"></i>
          <input
            type="text"
            id="nav-search-input"
            placeholder="Paysages, Libreville, fleuves…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="nav-right">
          <button className="btn-ghost" onClick={() => { setAuthOpen(true); setAuthTab("login"); }}>Connexion</button>
          <button className="btn-primary" onClick={() => { setAuthOpen(true); setAuthTab("register"); }}>
            <i className="ti ti-user-plus"></i>
            <span className="nav-primary-text">Créer un compte</span>
          </button>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <i className="ti ti-menu-2"></i>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div id="mobileMenu" className={mobileMenuOpen ? "open" : ""}>
        <a onClick={() => switchTab("photos")}>Photos</a>
        <a onClick={() => switchTab("videos")}>Vidéos</a>
        <a onClick={() => switchTab("tarifs")}>Tarifs</a>
        <a onClick={() => { setAuthOpen(true); setAuthTab("login"); setMobileMenuOpen(false); }}>Connexion</a>
        <a onClick={() => { setAuthOpen(true); setAuthTab("register"); setMobileMenuOpen(false); }}>Créer un compte</a>
      </div>

      {/* HERO */}
      <section className="hero hex-bg">
        <div className="hero-gradient"></div>
        <img
          className="hero-bg"
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=80&fit=crop"
          alt="Vue aérienne drone Gabon"
        />
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="animate-fade-in">
            <div className="hero-eyebrow"><i className="ti ti-drone"></i> Médias professionnels — <strong>Gabon</strong></div>
            <h1>Le Gabon en <em>HD </em><br /></h1>
            <p>Images et vidéos haute définition — paysages, culture, nature, événements gabonais</p>
          </div>
          <div className="animate-fade-in delay-100">
            <div className="hero-search">
              <div className="hero-search-field">
                <i className="ti ti-search"></i>
                <input
                  type="text"
                  id="hero-search-input"
                  placeholder="Rechercher : Libreville, Ogooué, forêt équatoriale, fête nationale…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button onClick={() => switchTab("photos")}>Rechercher</button>
            </div>
          </div>
          <div className="animate-fade-in delay-200 hero-tags">
            <span className="hero-tag" onClick={() => quickFilter("paysages")}>Paysages</span>
            <span className="hero-tag" onClick={() => quickFilter("libreville")}>Libreville</span>
            <span className="hero-tag" onClick={() => quickFilter("ogooué")}>Ogooué</span>
            <span className="hero-tag" onClick={() => quickFilter("forêt")}>Forêt équatoriale</span>
            <span className="hero-tag" onClick={() => quickFilter("culture")}>Culture &amp; traditions</span>
            <span className="hero-tag" onClick={() => quickFilter("côte")}>Côte atlantique</span>
            <span className="hero-tag" onClick={() => quickFilter("4K")}>4K uniquement</span>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-icon"><i className="ti ti-photo"></i></div>
          <div>
            <div className="stat-num">{filteredPhotos.length}</div>
            <div className="stat-lbl">Photos disponibles</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon"><i className="ti ti-video"></i></div>
          <div>
            <div className="stat-num">{filteredVideos.length}</div>
            <div className="stat-lbl">Vidéos disponibles</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon"><i className="ti ti-map-pin"></i></div>
          <div>
            <div className="stat-num">9</div>
            <div className="stat-lbl">Provinces du Gabon</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon"><i className="ti ti-shield-check"></i></div>
          <div>
            <div className="stat-num">100%</div>
            <div className="stat-lbl">Droits commerciaux inclus</div>
          </div>
        </div>
      </div>

      {/* ACTIVITY TICKER */}
      <div className="activity-bar">
        <div className="activity-item"><div className="activity-dot"></div>ag***lib a acheté une photo il y a 4 min</div>
        <div className="activity-item"><div className="activity-dot"></div>me***gab s&apos;est abonné il y a 11 min</div>
        <div className="activity-item"><div className="activity-dot"></div>pr***bvl a téléchargé une vidéo 4K il y a 18 min</div>
        <div className="activity-secure"><i className="ti ti-lock"></i> Paiements sécurisés — Airtel Money · Moov Money · Visa · SyncPay</div>
      </div>

      {/* SECTION TABS */}
      <div className="section-tabs">
        <div className={`stab ${activeTab === "photos" ? "active" : ""}`} onClick={() => switchTab("photos")}>
          <i className="ti ti-photo"></i> Photos <span className="badge">{filteredPhotos.length}</span>
        </div>
        <div className={`stab ${activeTab === "videos" ? "active" : ""}`} onClick={() => switchTab("videos")}>
          <i className="ti ti-video"></i> Vidéos <span className="badge">{filteredVideos.length}</span>
        </div>
        <div className={`stab ${activeTab === "tarifs" ? "active" : ""}`} onClick={() => switchTab("tarifs")}>
          <i className="ti ti-tag"></i> Tarifs &amp; abonnements
        </div>
      </div>

      {/* PANEL PHOTOS */}
      <div className={`panel ${activeTab === "photos" ? "active" : ""}`} id="panel-photos">
        <div className="content">
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-label">Catégorie :</span>
              {["all","paysages","nature","culture","events","archi"].map((cat) => (
                <button
                  key={cat}
                  className={`chip ${activePCat === cat ? "active" : ""}`}
                  onClick={() => { setActivePCat(cat); setSearchQuery(""); }}
                >
                  {cat === "all" ? "Toutes" : cat === "nature" ? "Nature & fleuves" : cat === "events" ? "Événements" : cat === "archi" ? "Architecture" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div className="filter-sep"></div>
            <div className="filter-group">
              <span className="filter-label">Résolution :</span>
              {["all","hd","4k"].map((res) => (
                <button
                  key={res}
                  className={`chip ${activePRes === res ? "active" : ""}`}
                  onClick={() => { setActivePRes(res); setSearchQuery(""); }}
                >
                  {res === "all" ? "Toutes" : res === "hd" ? "HD 1080p — 1 500 FCFA" : "4K — 3 000 FCFA"}
                </button>
              ))}
            </div>
            <select className="sort-select" value={pSort} onChange={(e) => setPSort(e.target.value)}>
              <option value="recent">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          <div className="section-hd">
            <h2>Photos disponibles <span style={{fontSize:"13px",color:"#8A8A95",fontWeight:400}}>({filteredPhotos.length} résultats)</span></h2>
            <span onClick={() => switchTab("tarifs")}>Voir les tarifs →</span>
          </div>

          <div className="photo-grid" id="photo-grid">
            {filteredPhotos.map((photo, idx) => (
              <div
                key={idx}
                className="photo-item"
                style={{ animationDelay: `${idx * 0.06}s` }}
                onClick={() => setLightboxPhoto(photo)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.img.replace("1600","700").replace("1200","900")} alt={photo.title} loading="lazy" />
                <div className={`photo-tag ${photo.pres === "4k" ? "k4" : ""}`}>{photo.pres === "4k" ? "4K" : "HD"}</div>
                <div className="watermark-sm">yétou</div>
                <div className="photo-overlay">
                  <div className="photo-info-title">{photo.title}</div>
                  <div className="photo-info-sub">{photo.details.split("·").slice(1).join("·").trim()}</div>
                  <div className="photo-action">
                    <div className="photo-price">{photo.price.replace(" FCFA","")} <small>FCFA</small></div>
                    <button
                      className="btn-buy-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBuy(photo.title, photo.price.replace(" FCFA",""), photo.format, photo.img);
                      }}
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPhotos.length === 0 && (
            <div className="no-results" style={{display:"block"}}>
              <i className="ti ti-photo-off"></i>
              <p>Aucune photo ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL VIDÉOS */}
      <div className={`panel ${activeTab === "videos" ? "active" : ""}`} id="panel-videos">
        <div className="content">
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-label">Catégorie :</span>
              {["all","paysages","nature","events","archi","culture"].map((cat) => (
                <button
                  key={cat}
                  className={`chip ${activeVCat === cat ? "active" : ""}`}
                  onClick={() => { setActiveVCat(cat); setSearchQuery(""); }}
                >
                  {cat === "all" ? "Toutes" : cat === "events" ? "Événements" : cat === "archi" ? "Architecture" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div className="filter-sep"></div>
            <div className="filter-group">
              <span className="filter-label">Durée :</span>
              {["all","30","60"].map((dur) => (
                <button
                  key={dur}
                  className={`chip ${activeVDur === dur ? "active" : ""}`}
                  onClick={() => { setActiveVDur(dur); setSearchQuery(""); }}
                >
                  {dur === "all" ? "Toutes" : dur === "30" ? "30 sec — 5 000 FCFA" : "1 min — 10 000 FCFA"}
                </button>
              ))}
            </div>
            <select className="sort-select" value={vSort} onChange={(e) => setVSort(e.target.value)}>
              <option value="recent">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          <div className="section-hd">
            <h2>Vidéos disponibles <span style={{fontSize:"13px",color:"#8A8A95",fontWeight:400}}>({filteredVideos.length} résultats)</span></h2>
            <span onClick={() => switchTab("tarifs")}>Voir les tarifs →</span>
          </div>

          <div className="video-grid" id="video-grid">
            {filteredVideos.map((video, idx) => (
              <div key={idx} className="video-card" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="video-thumb" onClick={() => setPreviewVideo(video)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.img} alt={video.title} loading="lazy" />
                  <div className="watermark-sm">yétou</div>
                  <div className="video-play"><i className="ti ti-player-play"></i></div>
                  <div className="video-res">4K</div>
                  <div className="video-dur">{video.duration}</div>
                </div>
                <div className="video-body">
                  <div className="video-title">{video.title}</div>
                  <div className="video-sub">{video.details}</div>
                  <div className="video-footer">
                    <div className="video-price">{video.price.replace(" FCFA","")} <small>FCFA</small></div>
                    <button
                      className="btn-buy"
                      onClick={() => openBuy(video.title, video.price.replace(" FCFA",""), video.format, video.img)}
                    >
                      <i className="ti ti-download"></i> Acheter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVideos.length === 0 && (
            <div className="no-results" style={{display:"block"}}>
              <i className="ti ti-video-off"></i>
              <p>Aucune vidéo ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL TARIFS */}
      <div className={`panel ${activeTab === "tarifs" ? "active" : ""}`} id="panel-tarifs">
        <div className="tarifs-wrap">
          <div className="tarifs-header">
            <h2>Tarifs &amp; abonnements</h2>
            <p>Prix adaptés au marché gabonais — paiement sécurisé via Airtel Money, Moov Money, Visa, Mastercard, SyncPay</p>
          </div>

          <div className="plans-grid">
            <div className="plan">
              <div className="plan-icon"><i className="ti ti-photo"></i></div>
              <div className="plan-name">Achat à l&apos;unité</div>
              <div className="plan-price">dès 1 500 <sub>FCFA</sub></div>
              <div className="plan-usd">Sans abonnement · Sans engagement</div>
              <div className="plan-divider"></div>
              <ul className="plan-feats">
                <li><i className="ti ti-check"></i>Photo HD 1080p — 1 500 FCFA</li>
                <li><i className="ti ti-check"></i>Photo 4K — 3 000 FCFA</li>
                <li><i className="ti ti-check"></i>Vidéo 30 sec — 5 000 FCFA</li>
                <li><i className="ti ti-check"></i>Vidéo 1 min — 10 000 FCFA</li>
                <li><i className="ti ti-check"></i>Licence commerciale incluse</li>
                <li><i className="ti ti-check"></i>Téléchargement immédiat</li>
                <li className="off"><i className="ti ti-x"></i>Accès illimité</li>
              </ul>
              <button className="plan-cta outline" onClick={() => switchTab("photos")}>Parcourir le catalogue</button>
            </div>

            <div className="plan featured">
              <div className="plan-badge">⭐ Le plus populaire</div>
              <div className="plan-icon"><i className="ti ti-crown"></i></div>
              <div className="plan-name">Abonnement mensuel</div>
              <div className="plan-price">15 000 <sub>FCFA/mois</sub></div>
              <div className="plan-usd">~$25.00 par mois · Créatifs actifs</div>
              <div className="plan-divider"></div>
              <ul className="plan-feats">
                <li><i className="ti ti-check"></i>Téléchargements illimités</li>
                <li><i className="ti ti-check"></i>Photos HD &amp; 4K</li>
                <li><i className="ti ti-check"></i>Licence commerciale</li>
                <li><i className="ti ti-check"></i>Accès aux nouveautés en priorité</li>
                <li><i className="ti ti-check"></i>Historique &amp; factures</li>
                <li className="off"><i className="ti ti-x"></i>Vidéos 4K incluses</li>
                <li className="off"><i className="ti ti-x"></i>Facture entreprise</li>
              </ul>
              <button className="plan-cta solid" onClick={() => selectPlan("monthly")}>Commencer maintenant</button>
            </div>

            <div className="plan">
              <div className="plan-icon"><i className="ti ti-building"></i></div>
              <div className="plan-name">Abonnement professionnel</div>
              <div className="plan-price">50 000 <sub>FCFA/mois</sub></div>
              <div className="plan-usd">~$85.00 par mois · PME &amp; Agences</div>
              <div className="plan-divider"></div>
              <ul className="plan-feats">
                <li><i className="ti ti-check"></i>Photos HD &amp; 4K illimitées</li>
                <li><i className="ti ti-check"></i>Vidéos 4K incluses</li>
                <li><i className="ti ti-check"></i>Licence commerciale étendue</li>
                <li><i className="ti ti-check"></i>Facture entreprise / ONG</li>
                <li><i className="ti ti-check"></i>Support prioritaire</li>
                <li><i className="ti ti-check"></i>Téléchargements RAW inclus</li>
                <li><i className="ti ti-check"></i>Accès API (en développement)</li>
              </ul>
              <button className="plan-cta outline" onClick={() => selectPlan("pro")}>Contacter l&apos;équipe</button>
            </div>
          </div>

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
              <div className="unit-type"><i className="ti ti-photo"></i><div><div className="unit-type-name">Photo HD 1080p</div><div className="unit-type-desc">6 000 × 4 000 px · JPEG</div></div></div>
              <div className="unit-fcfa">1 500 FCFA</div><div className="unit-usd">~$2.50</div><div className="unit-target">Particuliers</div>
            </div>
            <div className="unit-row">
              <div className="unit-type"><i className="ti ti-photo"></i><div><div className="unit-type-name">Photo 4K</div><div className="unit-type-desc">8 000 × 5 333 px · RAW + JPEG</div></div></div>
              <div className="unit-fcfa">3 000 FCFA</div><div className="unit-usd">~$5.00</div><div className="unit-target">Professionnels</div>
            </div>
            <div className="unit-row">
              <div className="unit-type"><i className="ti ti-video"></i><div><div className="unit-type-name">Vidéo drone — 30 secondes</div><div className="unit-type-desc">4K UHD · MP4 · H.264</div></div></div>
              <div className="unit-fcfa">5 000 FCFA</div><div className="unit-usd">~$8.50</div><div className="unit-target">Agences / Médias</div>
            </div>
            <div className="unit-row">
              <div className="unit-type"><i className="ti ti-video"></i><div><div className="unit-type-name">Vidéo drone — 1 minute</div><div className="unit-type-desc">4K UHD · MP4 · H.264</div></div></div>
              <div className="unit-fcfa">10 000 FCFA</div><div className="unit-usd">~$17.00</div><div className="unit-target">Entreprises</div>
            </div>
            <div className="unit-row highlight">
              <div className="unit-type"><i className="ti ti-star" style={{color:"#C8371A"}}></i><div><div className="unit-type-name" style={{color:"#C8371A"}}>Abonnement mensuel</div><div className="unit-type-desc">Photos illimitées HD &amp; 4K</div></div></div>
              <div className="unit-fcfa">15 000 FCFA</div><div className="unit-usd">~$25.00</div><div className="unit-target">Créatifs actifs</div>
            </div>
            <div className="unit-row highlight">
              <div className="unit-type"><i className="ti ti-crown" style={{color:"#C8371A"}}></i><div><div className="unit-type-name" style={{color:"#C8371A"}}>Abonnement professionnel</div><div className="unit-type-desc">Photos + Vidéos illimitées</div></div></div>
              <div className="unit-fcfa">50 000 FCFA</div><div className="unit-usd">~$85.00</div><div className="unit-target">PME / Agences</div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT FOOTER BAR */}
      <div className="pay-footer">
        <span className="pay-footer-label">Paiements acceptés</span>
        <div className="pay-chip"><img src={airtelLogo.src} alt="Airtel Money" className="pay-logo" /> Airtel Money</div>
        <div className="pay-chip"><img src={moovLogo.src} alt="Moov Money" className="pay-logo" /> Moov Money</div>
        <div className="pay-chip"><img src="/visa.svg" alt="Visa" className="pay-logo" /> Visa</div>
        <div className="pay-chip"><img src="/mastercard.svg" alt="Mastercard" className="pay-logo" /> Mastercard</div>
        <div className="pay-footer-secure"><i className="ti ti-lock"></i> Paiements 100% sécurisés · Téléchargement immédiat après validation</div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">yé<em>tou</em></div>
            <p className="footer-desc">
              Plateforme de vente de médias aériens HD &amp; 4K,<br />
              développée par Best Aero Drone · Libreville, Gabon.<br />
              Paysages, culture, nature et événements gabonais<br />
              capturés par drone professionnel.
            </p>
          </div>
          <div className="footer-col">
            <h4>Catalogue</h4>
            <a onClick={() => { switchTab("photos"); setActivePCat("paysages"); }}>Paysages</a>
            <a onClick={() => { switchTab("photos"); setActivePCat("nature"); }}>Nature &amp; fleuves</a>
            <a onClick={() => { switchTab("photos"); setActivePCat("culture"); }}>Culture</a>
            <a onClick={() => { switchTab("photos"); setActivePCat("events"); }}>Événements</a>
            <a onClick={() => switchTab("videos")}>Vidéos 4K</a>
          </div>
          <div className="footer-col">
            <h4>Compte</h4>
            <a onClick={() => { setAuthOpen(true); setAuthTab("register"); }}>Créer un compte</a>
            <a onClick={() => { setAuthOpen(true); setAuthTab("login"); }}>Se connecter</a>
            <a onClick={() => switchTab("tarifs")}>Abonnements</a>
            <a>Mes téléchargements</a>
            <a>Mes factures</a>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a>contact@bestaerogroup.com</a>
            <a>Libreville, Gabon</a>
            <a>+241 XX XX XX XX</a>
            <a>Conditions d&apos;utilisation</a>
            <a>Politique de confidentialité</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Best Aero Drone · Tous droits réservés · Gabon</span>
          <span>yétou — Plateforme de médias aériens HD</span>
        </div>
      </footer>

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div className="lightbox-modal" style={{position:"fixed",inset:0,zIndex:100}}>
          <div
            style={{position:"absolute",inset:0,backdropFilter:"blur(8px)",background:"rgba(10,10,15,0.85)"}}
            onClick={() => setLightboxPhoto(null)}
          ></div>
          <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"16px"}}>
            <div style={{position:"relative"}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxPhoto.img} alt={lightboxPhoto.title} className="lb-img" />
              <div className="lb-watermark" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}></div>
              <button
                onClick={() => setLightboxPhoto(null)}
                style={{position:"absolute",top:"1rem",right:"1rem",zIndex:20,width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",color:"#8A8A95",background:"rgba(20,20,26,0.9)",borderRadius:"50%",border:"none",cursor:"pointer",fontSize:"18px"}}
              >
                <i className="ti ti-x"></i>
              </button>
              <div style={{position:"absolute",bottom:"1rem",left:"1rem",right:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:600,color:"#fff",fontSize:"14px"}}>{lightboxPhoto.title}</h3>
                  <p style={{color:"#8A8A95",fontSize:"12px"}}>{lightboxPhoto.details}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"18px",color:"#fff"}}>{lightboxPhoto.price}</div>
                  <button
                    onClick={() => {
                      setLightboxPhoto(null);
                      setTimeout(() => openBuy(lightboxPhoto.title, lightboxPhoto.price.replace(" FCFA",""), lightboxPhoto.format, lightboxPhoto.img), 300);
                    }}
                    style={{padding:"8px 16px",background:"#C8371A",color:"#fff",borderRadius:"8px",border:"none",fontSize:"13px",fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}
                  >
                    <i className="ti ti-shopping-cart"></i> Acheter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {previewVideo && (
        <div className="video-preview-modal" style={{position:"fixed",inset:0,zIndex:100}}>
          <div
            style={{position:"absolute",inset:0,backdropFilter:"blur(8px)",background:"rgba(10,10,15,0.85)"}}
            onClick={() => setPreviewVideo(null)}
          ></div>
          <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"16px"}}>
            <div style={{background:"#14141A",border:"1px solid #2A2A35",borderRadius:"16px",maxWidth:"896px",width:"100%",maxHeight:"90vh",overflow:"hidden",margin:"0 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid #2A2A35"}}>
                <h3 style={{fontFamily:"Sora,sans-serif",fontWeight:600,color:"#fff",fontSize:"14px"}}>{previewVideo.title}</h3>
                <button
                  onClick={() => setPreviewVideo(null)}
                  style={{width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",color:"#8A8A95",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div style={{position:"relative",background:"black"}}>
                <video
                  key={previewVideo.videoUrl}
                  style={{width:"100%",maxHeight:"50vh",objectFit:"contain"}}
                  controls
                  playsInline
                  muted
                  loop
                  autoPlay
                >
                  <source src={previewVideo.videoUrl} type="video/mp4" />
                </video>
                <div className="watermark-overlay" style={{position:"absolute"}}></div>
                {!isPaid && (
                  <div className="video-locked-overlay">
                    <div className="lock-icon"><i className="ti ti-lock" style={{color:"#C8371A",fontSize:"20px"}}></i></div>
                    <p style={{color:"#fff",fontWeight:500,marginBottom:"4px"}}>Téléchargement verrouillé</p>
                    <p>Achetez cette vidéo pour la télécharger en qualité originale.</p>
                    <button
                      className="buy-btn"
                      onClick={() => {
                        const v = previewVideo;
                        setPreviewVideo(null);
                        setTimeout(() => openBuy(v.title, v.price.replace(" FCFA",""), v.format, v.img), 300);
                      }}
                    >
                      <i className="ti ti-shopping-cart" style={{marginRight:"6px"}}></i>Acheter maintenant
                    </button>
                  </div>
                )}
              </div>
              <div style={{padding:"16px 24px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",gap:"8px",flexWrap:"wrap"}}>
                  <div>
                    <p style={{color:"#8A8A95",fontSize:"13px",marginBottom:"4px"}}>{previewVideo.details}</p>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"11px",background:"#14141A",border:"1px solid #2A2A35",padding:"2px 8px",borderRadius:"4px",color:"#8A8A95"}}>{previewVideo.format}</span>
                      <span style={{fontSize:"11px",background:"#14141A",border:"1px solid #2A2A35",padding:"2px 8px",borderRadius:"4px",color:"#8A8A95"}}>{previewVideo.duration}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,fontSize:"22px",color:"#fff"}}>{previewVideo.price}</div>
                    <p style={{color:"#8A8A95",fontSize:"11px"}}>Paiement sécurisé</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:"12px"}}>
                  <button
                    onClick={() => {
                      const v = previewVideo;
                      setPreviewVideo(null);
                      setTimeout(() => openBuy(v.title, v.price.replace(" FCFA",""), v.format, v.img), 300);
                    }}
                    style={{flex:1,padding:"12px",background:"#C8371A",color:"#fff",borderRadius:"8px",border:"none",fontSize:"13px",fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}
                  >
                    <i className="ti ti-shopping-cart"></i> Acheter maintenant
                  </button>
                  <button style={{padding:"12px 16px",border:"1px solid #2A2A35",color:"#8A8A95",borderRadius:"8px",background:"transparent",cursor:"pointer",fontSize:"16px"}}>
                    <i className="ti ti-heart"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      <div className={`modal-bg ${buyItem ? "open" : ""}`} id="modal-buy">
        <div className="modal">
          <button className="modal-close" onClick={() => setBuyItem(null)}><i className="ti ti-x"></i></button>
          <div className="modal-title">Finaliser l&apos;achat</div>
          <div className="modal-sub">{buyItem?.name}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {buyItem?.img && <img className="modal-preview" src={buyItem.img} alt="Aperçu média" />}
          <div className="modal-row"><span className="modal-row-label">Média</span><span className="modal-row-val">{buyItem?.name}</span></div>
          <div className="modal-row"><span className="modal-row-label">Format</span><span className="modal-row-val">{buyItem?.format}</span></div>
          <div className="modal-row"><span className="modal-row-label">Licence</span><span className="modal-row-val">Commerciale · Illimitée · Gabon</span></div>
          <div className="modal-row"><span className="modal-row-label">Total</span><span className="modal-total">{buyItem?.price} FCFA</span></div>
          {(activePayMethod === "Airtel Money" || activePayMethod === "Moov Money") && (
            <div className="form-group" style={{marginTop:"14px"}}>
              <label>Numéro de téléphone</label>
              <input
                type="tel"
                placeholder="Ex: 077 00 00 00"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          )}
          <div className="pay-methods">
            {[
              { name: "Airtel Money", logo: airtelLogo.src },
              { name: "Moov Money", logo: moovLogo.src },
              { name: "Visa", logo: "/visa.svg" },
              { name: "Mastercard", logo: "/mastercard.svg" },
            ].map((method) => (
              <div
                key={method.name}
                className={`pay-method ${activePayMethod === method.name ? "active" : ""}`}
                onClick={() => setActivePayMethod(method.name)}
              >
                <img src={method.logo} alt={method.name} className="pay-logo" />
                {method.name}
              </div>
            ))}
          </div>
          <button className="btn-pay" onClick={confirmPay} disabled={payLoading}>
            {payLoading ? (
              <>Traitement en cours...</>
            ) : (
              <><i className="ti ti-lock"></i> Payer via {activePayMethod}</>
            )}
          </button>
        </div>
      </div>

      {/* AUTH MODAL */}
      <div className={`modal-bg ${authOpen ? "open" : ""}`} id="modal-auth">
        <div className="modal">
          <button className="modal-close" onClick={() => setAuthOpen(false)}><i className="ti ti-x"></i></button>
          <div className="auth-tabs">
            <div className={`auth-tab ${authTab === "login" ? "active" : ""}`} onClick={() => setAuthTab("login")}>Connexion</div>
            <div className={`auth-tab ${authTab === "register" ? "active" : ""}`} onClick={() => setAuthTab("register")}>Créer un compte</div>
          </div>

          {authTab === "login" && (
            <div>
              <div className="form-group"><label>Adresse email</label><input type="email" placeholder="votre@email.com" /></div>
              <div className="form-group"><label>Mot de passe</label><input type="password" placeholder="••••••••" /></div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
                <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"#8A8A95"}}>
                  <input type="checkbox" style={{width:"16px",height:"16px"}} /> Se souvenir de moi
                </label>
                <a style={{color:"#C8371A",fontSize:"12px",cursor:"pointer"}}>Mot de passe oublié ?</a>
              </div>
              <button className="btn-auth" onClick={() => { setAuthOpen(false); showToast("Connexion simulée avec succès"); }}>Se connecter</button>
              <div className="auth-sep">— ou —</div>
              <button style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"10px",border:"1px solid #2A2A35",borderRadius:"8px",background:"transparent",color:"#F0EFEA",width:"100%",cursor:"pointer",fontSize:"13px"}}>
                <img src={googleLogo.src} alt="Google" style={{width:"18px",height:"18px"}} /> Continuer avec Google
              </button>
            </div>
          )}

          {authTab === "register" && (
            <div>
              <div className="form-group"><label>Nom complet</label><input type="text" placeholder="Votre nom" /></div>
              <div className="form-group"><label>Adresse email</label><input type="email" placeholder="votre@email.com" /></div>
              <div className="form-group"><label>Mot de passe</label><input type="password" placeholder="8 caractères minimum" /></div>
              <div className="form-group"><label>Confirmer le mot de passe</label><input type="password" placeholder="••••••••" /></div>
              <label style={{display:"flex",alignItems:"flex-start",gap:"8px",cursor:"pointer",fontSize:"12px",color:"#8A8A95",marginBottom:"16px"}}>
                <input type="checkbox" style={{width:"16px",height:"16px",marginTop:"2px"}} />
                <span>J&apos;accepte les <a style={{color:"#C8371A"}}>conditions d&apos;utilisation</a> et la <a style={{color:"#C8371A"}}>politique de confidentialité</a></span>
              </label>
              <button className="btn-auth" onClick={() => { setAuthOpen(false); showToast("Compte créé avec succès ! Bienvenue sur yétou."); }}>Créer mon compte</button>
              <div className="auth-sep">— ou —</div>
              <button style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"10px",border:"1px solid #2A2A35",borderRadius:"8px",background:"transparent",color:"#F0EFEA",width:"100%",cursor:"pointer",fontSize:"13px"}}>
                <img src={googleLogo.src} alt="Google" style={{width:"18px",height:"18px"}} /> S&apos;inscrire avec Google
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast ${toastVisible ? "show" : ""}`} id="toast">
        <i className="ti ti-circle-check"></i>
        <span>{toast}</span>
      </div>
    </>
  );
}
