"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchMediaById, fetchMedia } from "@/services/api";
import type { ApiMedia } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/ui/Toast";
import airtelLogo from "@/logo/airtel.png";
import moovLogo from "@/logo/moov.png";

const PAY_METHODS = [
  { name: "Airtel Money", logo: "", available: true },
  { name: "Moov Money", logo: "", available: true },
  { name: "Visa", logo: "/visa.svg", available: false },
  { name: "Mastercard", logo: "/mastercard.svg", available: false },
];

export default function PhotoDetailPage({ params }: { params: Promise<{ index: string }> }) {
  const router = useRouter();
  const { index } = use(params);
  const id = parseInt(index);
  const [media, setMedia] = useState<ApiMedia | null>(null);
  const [related, setRelated] = useState<ApiMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediaById(id).then((m) => {
      if (m) {
        setMedia(m);
        fetchMedia("photo", m.category).then((all) => setRelated(all.filter((p) => p.id !== m.id).slice(0, 4)));
      }
      setLoading(false);
    });
  }, [id]);

  const { toast, toastVisible, toastError, showToast } = useToast();
  const { isLoggedIn } = useAuth();
  const { externalize, loading: payLoading } = usePayment();

  const [activePayMethod, setActivePayMethod] = useState("Airtel Money");
  const [clientPhone, setClientPhone] = useState("");
  const [purchased, setPurchased] = useState(false);

  const handleBuy = useCallback(async () => {
    if (!media) return;
    if (!isLoggedIn) {
      showToast("Connectez-vous pour effectuer un achat.", true);
      return;
    }
    const isMobileMoney = activePayMethod === "Airtel Money" || activePayMethod === "Moov Money";
    if (isMobileMoney && !clientPhone) {
      showToast("Veuillez entrer votre numéro de téléphone.", true); return;
    }
    setPurchased(true);
    await externalize({
      mediaId: media.id,
      buyItem: { name: media.title, price: String(media.price), format: media.license_type, img: media.file_url, _type: "photo" },
      method: activePayMethod,
      onError: (msg) => showToast(msg, true),
    });
  }, [media, activePayMethod, clientPhone, externalize, showToast]);

  const logoSrc = (m: string) => m === "Airtel Money" ? airtelLogo.src : m === "Moov Money" ? moovLogo.src : m === "Visa" ? "/visa.svg" : "/mastercard.svg";

  if (loading) return <Loader />;
  if (!media) return <NotFound router={router} />;

  const display = {
    title: media.title,
    desc: media.description || `Photo ${media.quality_display} capturée au Gabon.`,
    details: `${media.quality_display} · ${media.resolution || media.file_size_display} · ${media.category_display}`,
    format: media.license_type,
    price: media.price,
    priceStr: `${media.price.toLocaleString("fr-FR")} FCFA`,
    img: media.file_url,
    province: media.province || "Gabon",
    city: media.city || "",
    camera: media.camera_model || "DJI Mavic 3 Pro",
    resolution: media.resolution || (media.quality === "4K" ? "8 000 × 5 333 px" : "6 000 × 4 000 px"),
    width: media.width, height: media.height,
    downloads: media.downloads,
    latitude: media.latitude, longitude: media.longitude, altitude: media.altitude,
    lens: media.lens, focal: media.focal_length, aperture: media.aperture, iso: media.iso, shutter: media.shutter_speed,
    tags: media.tags, season: media.season, weather: media.weather,
    captureDate: media.capture_date, captureTime: media.capture_time,
    is4k: media.quality === "4K",
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <div className="detail-topbar">
        <button className="detail-topbar-back" onClick={() => router.push("/")}><i className="ti ti-arrow-left"></i></button>
        <div className="detail-topbar-title">
          <h1>{display.title}</h1>
          <div className="detail-topbar-sub">{display.details}</div>
        </div>
        <div className="detail-topbar-price">{display.priceStr}</div>
      </div>

      <div className="detail-hero">
        <div className="detail-hero-inner">
          <img src={display.img} alt={display.title} style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", display: "block" }} onContextMenu={(e) => { e.preventDefault(); showToast("Capture interdite.", true); }} />
          {!purchased && <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 20, background: "rgba(200,55,26,0.9)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "5px 14px", borderRadius: "8px" }}><i className="ti ti-eye" style={{ marginRight: "5px" }}></i>PRÉVISUALISATION</div>}
          {!purchased && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}><span style={{ fontFamily: "Sora, sans-serif", fontSize: "3rem", fontWeight: 700, color: "rgba(255,255,255,0.1)", letterSpacing: "0.3em", transform: "rotate(-15deg)" }}>yétou</span></div>}
          {!purchased && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", padding: "20px 16px 10px", textAlign: "center" }}><p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>Achetez cette photo pour la télécharger sans filigrane</p></div>}
          {purchased && <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 20, background: "rgba(34,197,94,0.9)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "5px 14px", borderRadius: "8px" }}><i className="ti ti-circle-check" style={{ marginRight: "5px" }}></i>ACHETÉE</div>}
          <div style={{ position: "absolute", top: "12px", left: purchased ? "auto" : "12px", right: purchased ? "12px" : "auto", background: display.is4k ? "rgba(200,55,26,0.95)" : "rgba(20,20,26,0.85)", backdropFilter: "blur(6px)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "4px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>{display.is4k ? "4K" : "HD 1080p"}</div>
        </div>
      </div>

      <div className="detail-body">
        <div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: "24px", fontWeight: 700, color: "#F0EFEA", marginBottom: "8px" }}>{display.title}</h1>
          <p style={{ fontSize: "14px", color: "#8A8A95", lineHeight: 1.6, marginBottom: "24px" }}>{display.desc}</p>
          <div className="detail-info-cards">
            {[
              { icon: "ti ti-camera", label: "Résolution", value: display.resolution },
              { icon: "ti ti-file", label: "Licence", value: display.format },
              { icon: "ti ti-drone", label: "Drone", value: display.camera },
              { icon: "ti ti-map-pin", label: "Province", value: display.province },
              { icon: "ti ti-download", label: "Téléchargements", value: String(display.downloads) },
              { icon: "ti ti-shield-check", label: "Licence", value: "Commerciale · Illimitée" },
            ].map((c, i) => (
              <div key={i} className="detail-info-card">
                <div className="detail-info-card-icon"><i className={c.icon}></i><span className="detail-info-card-label">{c.label}</span></div>
                <div className="detail-info-card-value">{c.value}</div>
              </div>
            ))}
          </div>
          {(display.lens || display.focal || display.aperture || display.iso || display.shutter) && (
            <div className="detail-info-block">
              <h3>Équipement & Prise de vue</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px", fontSize: "13px", color: "#8A8A95" }}>
                {display.lens && <div>Objectif : <span style={{ color: "#F0EFEA" }}>{display.lens}</span></div>}
                {display.focal && <div>Focale : <span style={{ color: "#F0EFEA" }}>{display.focal}</span></div>}
                {display.aperture && <div>Ouverture : <span style={{ color: "#F0EFEA" }}>{display.aperture}</span></div>}
                {display.iso && <div>ISO : <span style={{ color: "#F0EFEA" }}>{display.iso}</span></div>}
                {display.shutter && <div>Obturation : <span style={{ color: "#F0EFEA" }}>{display.shutter}</span></div>}
                {display.altitude && <div>Altitude : <span style={{ color: "#F0EFEA" }}>{display.altitude} m</span></div>}
              </div>
            </div>
          )}
          {(display.tags || display.season || display.weather) && (
            <div className="detail-info-block">
              <h3>Conditions</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {display.tags && (display.tags).split(",").map((t, i) => <span key={i} style={{ background: "rgba(200,55,26,0.1)", color: "#C8371A", fontSize: "11px", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(200,55,26,0.2)" }}>{t.trim()}</span>)}
                {display.season && <span style={{ background: "#0A0A0F", color: "#8A8A95", fontSize: "11px", padding: "4px 10px", borderRadius: "8px", border: "1px solid #2A2A35" }}>{display.season}</span>}
                {display.weather && <span style={{ background: "#0A0A0F", color: "#8A8A95", fontSize: "11px", padding: "4px 10px", borderRadius: "8px", border: "1px solid #2A2A35" }}>{display.weather}</span>}
              </div>
            </div>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <div className="detail-sidebar-sticky">
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: "28px", fontWeight: 700, color: "#F0EFEA" }}>{display.priceStr}</div>
              <div style={{ fontSize: "12px", color: "#8A8A95", marginTop: "4px" }}>Paiement sécurisé</div>
            </div>
            <div className="form-group"><label>Numéro de téléphone</label><input type="tel" placeholder="Ex: 077 00 00 00" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
            <div style={{ margin: "16px 0" }}><div style={{ fontSize: "12px", color: "#F0EFEA", fontWeight: 500, marginBottom: "8px" }}>Méthode de paiement</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {PAY_METHODS.map((m) => (
                  <button key={m.name} onClick={() => m.available && setActivePayMethod(m.name)} disabled={!m.available}
                    style={{ padding: "10px 8px", borderRadius: "8px", border: "1.5px solid", borderColor: activePayMethod === m.name && m.available ? "#C8371A" : "#2A2A35", background: activePayMethod === m.name && m.available ? "#C8371A" : "#0A0A0F", color: m.available ? (activePayMethod === m.name ? "#fff" : "#8A8A95") : "#5A5A65", cursor: m.available ? "pointer" : "not-allowed", fontSize: "11px", fontWeight: 600, textAlign: "center", opacity: m.available ? 1 : 0.45 }}>
                    <img src={logoSrc(m.name)} alt={m.name} style={{ display: "block", height: "22px", margin: "0 auto 4px", objectFit: "contain", opacity: m.available ? 1 : 0.5 }} />{m.name}{!m.available && <span style={{ display: "block", fontSize: "9px", marginTop: "2px" }}>Bientôt</span>}
                  </button>
                ))}
              </div>
            </div>
            {purchased ? (
              <div style={{ textAlign: "center", padding: "16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "32px", color: "#22c55e", display: "block", marginBottom: "8px" }}></i>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: "14px", fontWeight: 600, color: "#22c55e", marginBottom: "8px" }}>Paiement réussi !</div>
              </div>
            ) : (
              <button className="btn-pay" onClick={handleBuy} disabled={payLoading} style={{ width: "100%" }}>
                {payLoading ? "Traitement..." : <><i className="ti ti-lock"></i> Payer via {activePayMethod}</>}
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "12px", fontSize: "11px", color: "#8A8A95" }}>
              <i className="ti ti-shield-check" style={{ color: "#22c55e" }}></i> Paiement 100% sécurisé
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && <div className="detail-related">
        <h2>Photos similaires</h2>
        <div className="detail-related-grid">
          {related.map((m) => (
            <div key={m.id} onClick={() => router.push(`/photo/${m.id}`)}
              style={{ background: "#14141A", border: "1px solid #2A2A35", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(200,55,26,0.5)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#2A2A35"; el.style.transform = "translateY(0)"; }}>
              <div style={{ width: "100%", aspectRatio: "4/3", backgroundImage: `url(${m.file_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: "12px", fontWeight: 600, color: "#F0EFEA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: "#8A8A95", marginTop: "4px" }}>{m.quality_display} · {m.price.toLocaleString("fr-FR")} FCFA</div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      <Toast message={toast} visible={toastVisible} isError={toastError} />
    </div>
  );
}

function Loader() {
  return <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #2A2A35", borderTopColor: "#C8371A", animation: "spin 0.8s linear infinite" }} />
    <p style={{ color: "#8A8A95" }}>Chargement...</p>
  </div>;
}

function NotFound({ router }: { router: ReturnType<typeof useRouter> }) {
  return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
    <i className="ti ti-photo-off" style={{ fontSize: "48px", color: "#8A8A95" }}></i>
    <p style={{ color: "#F0EFEA" }}>Photo introuvable.</p>
    <button className="btn-primary" onClick={() => router.push("/")}>Retour</button>
  </div>;
}
