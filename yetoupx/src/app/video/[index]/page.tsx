"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchMediaById, fetchMedia } from "@/services/api";
import type { ApiMedia } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/ui/Toast";
import VideoPlayer from "@/components/ui/VideoPlayer";
import airtelLogo from "@/logo/airtel.png";
import moovLogo from "@/logo/moov.png";

const PAY_METHODS = [
  { name: "Airtel Money", logo: "", available: true },
  { name: "Moov Money", logo: "", available: true },
  { name: "Visa", logo: "/visa.svg", available: false },
  { name: "Mastercard", logo: "/mastercard.svg", available: false },
];

export default function VideoDetailPage({ params }: { params: Promise<{ index: string }> }) {
  const router = useRouter();
  const { index } = use(params);
  const id = parseInt(index);
  const [media, setMedia] = useState<ApiMedia | null>(null);
  const [related, setRelated] = useState<ApiMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediaById(id).then((m) => {
      if (m) { setMedia(m); fetchMedia("video", m.category).then((a) => setRelated(a.filter((p) => p.id !== m.id).slice(0, 4))); }
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
      buyItem: { name: media.title, price: String(media.price), format: media.license_type, img: media.file_url, _type: "video" },
      method: activePayMethod,
      onError: (msg) => showToast(msg, true),
    });
  }, [media, activePayMethod, clientPhone, externalize, showToast]);
  const logoSrc = (m: string) => m === "Airtel Money" ? airtelLogo.src : m === "Moov Money" ? moovLogo.src : m === "Visa" ? "/visa.svg" : "/mastercard.svg";

  if (loading) return <Loader />;
  if (!media) return <NotFound router={router} />;

  const d = {
    title: media.title, desc: media.description || `Vidéo ${media.quality_display} capturée au Gabon.`,
    quality: media.quality_display, duration: media.duration || "0:30",
    format: media.license_type, price: media.price,
    province: media.province || "Gabon", camera: media.camera_model || "DJI Mavic 3 Pro",
    codec: media.codec, frameRate: media.frame_rate, bitrate: media.bitrate,
    downloads: media.downloads, fileUrl: media.file_url,
    lens: media.lens, focal: media.focal_length, aperture: media.aperture, iso: media.iso, shutter: media.shutter_speed,
    altitude: media.altitude, tags: media.tags, season: media.season, weather: media.weather,
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <div className="detail-topbar">
        <button className="detail-topbar-back" onClick={() => router.push("/")}><i className="ti ti-arrow-left"></i></button>
        <div className="detail-topbar-title">
          <h1>{d.title}</h1>
          <div className="detail-topbar-sub">{d.quality} · {d.duration}</div>
        </div>
        <div className="detail-topbar-price">{d.price.toLocaleString("fr-FR")} FCFA</div>
      </div>

      <div className="detail-hero">
        <div className="detail-hero-inner">
          {purchased ? (
            <>
              <VideoPlayer key={d.fileUrl} src={d.fileUrl} />
              <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 22, background: "rgba(200,55,26,0.95)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "4px 12px", borderRadius: "6px" }}>4K UHD</div>
            </>
          ) : (
            <VideoPlayer key={d.fileUrl} src={d.fileUrl} preview autoPlay />
          )}
        </div>
      </div>

      <div className="detail-body">
        <div>
          <h1 style={{ fontFamily: "Sora", fontSize: "24px", fontWeight: 700, color: "#F0EFEA", marginBottom: "8px" }}>{d.title}</h1>
          <p style={{ color: "#8A8A95", lineHeight: 1.6, marginBottom: "24px" }}>{d.desc}</p>
          <div className="detail-info-cards">
            {[{ i: "ti-clock", l: "Durée", v: d.duration }, { i: "ti-video", l: "Qualité", v: d.quality }, { i: "ti-movie", l: "Codec", v: d.codec || "H.264" }, { i: "ti-camera", l: "FPS", v: d.frameRate || "30" }, { i: "ti-drone", l: "Drone", v: d.camera }, { i: "ti-map-pin", l: "Province", v: d.province }, { i: "ti-download", l: "Téléchargements", v: String(d.downloads) }, { i: "ti-shield-check", l: "Licence", v: "Commerciale" }].map((c, i) => (
              <div key={i} className="detail-info-card">
                <div className="detail-info-card-icon"><i className={c.i}></i><span className="detail-info-card-label">{c.l}</span></div>
                <div className="detail-info-card-value">{c.v}</div>
              </div>
            ))}
          </div>
          {(d.bitrate || d.lens) && <div className="detail-info-block">
            <h3>Détails techniques</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "8px", fontSize: "13px", color: "#8A8A95" }}>
              {d.bitrate && <div>Bitrate : <span style={{ color: "#F0EFEA" }}>{d.bitrate}</span></div>}
              {d.lens && <div>Objectif : <span style={{ color: "#F0EFEA" }}>{d.lens}</span></div>}
              {d.focal && <div>Focale : <span style={{ color: "#F0EFEA" }}>{d.focal}</span></div>}
              {d.aperture && <div>Ouverture : <span style={{ color: "#F0EFEA" }}>{d.aperture}</span></div>}
              {d.iso && <div>ISO : <span style={{ color: "#F0EFEA" }}>{d.iso}</span></div>}
              {d.shutter && <div>Obturation : <span style={{ color: "#F0EFEA" }}>{d.shutter}</span></div>}
              {d.altitude && <div>Altitude : <span style={{ color: "#F0EFEA" }}>{d.altitude} m</span></div>}
            </div>
          </div>}
        </div>
        <div style={{ position: "relative" }}>
          <div className="detail-sidebar-sticky">
            <div style={{ marginBottom: "20px" }}><div style={{ fontFamily: "Sora", fontSize: "28px", fontWeight: 700, color: "#F0EFEA" }}>{d.price.toLocaleString("fr-FR")} FCFA</div><div style={{ fontSize: "12px", color: "#8A8A95", marginTop: "4px" }}>Paiement sécurisé</div></div>
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
                <div style={{ fontFamily: "Sora", fontSize: "14px", fontWeight: 600, color: "#22c55e", marginBottom: "12px" }}>Paiement réussi !</div>
                <a href={d.fileUrl} download className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "10px 20px" }}><i className="ti ti-download"></i> Télécharger la vidéo</a>
              </div>
            ) : (
              <button className="btn-pay" onClick={handleBuy} disabled={payLoading} style={{ width: "100%" }}>{payLoading ? "Traitement..." : <><i className="ti ti-lock"></i> Payer via {activePayMethod}</>}</button>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && <div className="detail-related">
        <h2>Vidéos similaires</h2>
        <div className="detail-related-grid">
          {related.map((m) => (
            <div key={m.id} onClick={() => router.push(`/video/${m.id}`)} style={{ background: "#14141A", border: "1px solid #2A2A35", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(200,55,26,0.5)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#2A2A35"; el.style.transform = "translateY(0)"; }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: "100%", aspectRatio: "16/9", backgroundImage: `url(${m.file_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(200,55,26,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-player-play" style={{ color: "#fff", fontSize: "14px" }}></i></div>
                <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: "9px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px" }}>{m.duration || "0:30"}</div>
              </div>
              <div style={{ padding: "10px 14px" }}><div style={{ fontFamily: "Sora", fontSize: "12px", fontWeight: 600, color: "#F0EFEA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div><div style={{ fontSize: "11px", color: "#8A8A95", marginTop: "4px" }}>{m.quality_display} · {m.price.toLocaleString("fr-FR")} FCFA</div></div>
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
    <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #2A2A35", borderTopColor: "#C8371A", animation: "spin 0.8s linear infinite" }} /><p style={{ color: "#8A8A95" }}>Chargement...</p>
  </div>;
}

function NotFound({ router }: { router: ReturnType<typeof useRouter> }) {
  return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
    <i className="ti ti-video-off" style={{ fontSize: "48px", color: "#8A8A95" }}></i><p style={{ color: "#F0EFEA" }}>Vidéo introuvable.</p><button className="btn-primary" onClick={() => router.push("/")}>Retour</button>
  </div>;
}
