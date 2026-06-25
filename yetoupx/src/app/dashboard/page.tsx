"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMedia } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { usePhotoFilter, useVideoFilter } from "@/hooks/useMediaFilter";
import type { BuyItem, PurchasedItem, UserPlan, PlanLimits, Photo, Video } from "@/types";
import { PLANS } from "@/types";
import PhotoGrid from "@/components/photos/PhotoGrid";
import VideoGrid from "@/components/videos/VideoGrid";
import BuyModal from "@/components/modals/BuyModal";
import Toast from "@/components/ui/Toast";
import airtelLogo from "@/logo/airtel.png";
import moovLogo from "@/logo/moov.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type DashboardTab = "downloads" | "catalogue" | "plan" | "account" | "payments";

interface ApiPurchase {
  id: number;
  media: { id: number; title: string; type: string; file_url: string; format: string; price: number };
  price: number;
  download_count: number;
  max_downloads: number;
  purchased_at: string;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout, downloadMedia, remainingDownloads } = useAuth();
  const { toast, toastVisible, toastError, showToast } = useToast();
  const { pay, externalize, loading: payLoading } = usePayment();
  const [activeTab, setActiveTab] = useState<DashboardTab>("downloads");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real purchases from Django
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [rawPurchases, setRawPurchases] = useState<ApiPurchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchasesRefresh, setPurchasesRefresh] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem("yetou_token");
    setLoadingPurchases(true);
    fetch(`${API_URL}/purchases/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.results) {
          setRawPurchases(data.results);
          const items: PurchasedItem[] = data.results.map((p: ApiPurchase) => ({
            name: p.media.title,
            price: String(p.price),
            format: p.media.format || "—",
            img: p.media.file_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80",
            downloadUrl: p.media.file_url || "",
            date: new Date(p.purchased_at).toLocaleDateString("fr-FR"),
            type: (p.media.type === "video" ? "video" : "photo") as "photo" | "video",
            downloadCount: p.download_count,
            maxDownloads: p.max_downloads,
          }));
          setPurchases(items);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPurchases(false));
  }, [isLoggedIn, purchasesRefresh]);

  // Catalogue state
  const [catalogueTab, setCatalogueTab] = useState<"photos" | "videos">("photos");
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMedia("photo"), fetchMedia("video")]).then(([p, v]) => {
      setAllPhotos(p.map((m) => ({
        id: m.id, title: m.title, details: `${m.quality_display} · ${m.resolution || m.file_size_display} · ${m.category_display}`,
        format: m.license_type, price: `${m.price} FCFA`, img: m.file_url,
        pcat: m.category, pres: m.quality.toLowerCase(), downloads: m.downloads,
      })));
      setAllVideos(v.map((m) => ({
        id: m.id, title: m.title, details: `Vidéo ${m.duration || "0:30"} · ${m.quality_display}`,
        format: "MP4", duration: m.duration || "0:30", price: `${m.price} FCFA`,
        img: m.file_url, videoUrl: m.file_url,
        vcat: m.category, vdur: m.duration?.includes("1:") ? "60" : "30", downloads: m.downloads,
      })));
    }).catch(() => {}).finally(() => setCatalogueLoading(false));
  }, []);

  const photos = usePhotoFilter(allPhotos);
  const videos = useVideoFilter(allVideos);

  // Buy modal
  const [buyItem, setBuyItem] = useState<BuyItem | null>(null);
  const [activePayMethod, setActivePayMethod] = useState("Airtel Money");
  const [clientPhone, setClientPhone] = useState("");

  const openBuy = useCallback((name: string, price: string, format: string, img: string, type: "photo" | "video" = "photo") => {
    setBuyItem({ name, price, format, img, _type: type });
    setActivePayMethod("Airtel Money");
    setClientPhone("");
  }, []);

  const confirmPay = useCallback(async () => {
    if (!buyItem) return;
    const isMobileMoney = activePayMethod === "Airtel Money" || activePayMethod === "Moov Money";
    if (isMobileMoney && !clientPhone) {
      showToast("Veuillez entrer votre numéro de téléphone.", true);
      return;
    }
    await externalize({
      buyItem,
      method: activePayMethod,
      onError: (msg) => showToast(msg, true),
    });
    setBuyItem(null);
    setPurchasesRefresh((c) => c + 1);
  }, [buyItem, activePayMethod, clientPhone, externalize, showToast]);

  const longPressCaptureToast = useCallback(() => {
    showToast("Capture interdite. Ce média est protégé par yétou.", true);
  }, [showToast]);

  if (isLoading || (!isLoggedIn && typeof window !== "undefined" && localStorage.getItem("yetou_token"))) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #2A2A35", borderTopColor: "#C8371A", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#8A8A95", fontSize: "14px" }}>Chargement de votre espace...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "16px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(200,55,26,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-lock" style={{ fontSize: "28px", color: "#C8371A" }}></i>
        </div>
        <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "20px", fontWeight: 700, color: "#F0EFEA" }}>Accès réservé</h2>
        <p style={{ color: "#8A8A95", fontSize: "14px", textAlign: "center", maxWidth: "400px" }}>Connectez-vous pour accéder à votre espace.</p>
        <button className="btn-primary" onClick={() => router.push("/")} style={{ padding: "10px 24px" }}>Retour à l&apos;accueil</button>
      </div>
    );
  }

  const plan = PLANS[user.plan];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
      {/* Mobile header */}
      <MobileHeader user={user} sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={() => { logout(); router.push("/"); }} activeTab={activeTab} />

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <Sidebar
          user={user}
          plan={plan}
          activeTab={activeTab}
          purchasesCount={purchases.length}
          open={sidebarOpen}
          onSelectTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          onLogout={() => { logout(); router.push("/"); }}
          router={router}
        />

        {/* Main */}
        <div style={{ flex: 1, padding: "clamp(16px,4vw,40px)", overflowY: "auto", minWidth: 0 }}>
          {activeTab === "downloads" && (
            <DownloadsTab purchases={purchases} loading={loadingPurchases} router={router} downloadMedia={downloadMedia} remainingDownloads={remainingDownloads} />
          )}
          {activeTab === "catalogue" && (
            <CatalogueTab catalogueTab={catalogueTab} setCatalogueTab={setCatalogueTab} photos={photos} videos={videos} loading={catalogueLoading}
              onBuy={(n, p, f, img, t) => openBuy(n, p, f, img, t)} onContextCapture={longPressCaptureToast} />
          )}
          {activeTab === "plan" && <PlanTab user={user} plan={plan} router={router} />}
          {activeTab === "account" && <AccountTab user={user} />}
          {activeTab === "payments" && <PaiementsTab rawPurchases={rawPurchases} loading={loadingPurchases} />}
        </div>
      </div>

      <BuyModal item={buyItem} activePayMethod={activePayMethod} clientPhone={clientPhone} payLoading={payLoading}
        onClose={() => setBuyItem(null)} onSelectMethod={setActivePayMethod} onPhoneChange={setClientPhone}
        onConfirm={confirmPay} airtelLogoSrc={airtelLogo.src} moovLogoSrc={moovLogo.src} />
      <Toast message={toast} visible={toastVisible} isError={toastError} />

      {/* Mobile bottom nav */}
      <MobileBottomNav activeTab={activeTab} purchasesCount={purchases.length} onSelectTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />
    </div>
  );
}

/* ─── Mobile Header ─── */
function MobileHeader({ user, sidebarOpen, onToggle, onLogout, activeTab }: {
  user: { name: string; email: string; plan: UserPlan };
  sidebarOpen: boolean; onToggle: () => void; onLogout: () => void; activeTab: string;
}) {
  const labels: Record<string, string> = { downloads: "Téléchargements", payments: "Paiements", catalogue: "Catalogue", plan: "Abonnement", account: "Compte" };
  return (
    <div className="dash-mobile-header">
      <button onClick={onToggle} style={{ background: "none", border: "none", color: "#F0EFEA", fontSize: "22px", padding: "8px" }}>
        <i className={`ti ${sidebarOpen ? "ti-x" : "ti-menu-2"}`}></i>
      </button>
      <span style={{ fontFamily: "Sora, sans-serif", fontSize: "14px", fontWeight: 600, color: "#F0EFEA" }}>
        {labels[activeTab] || "Dashboard"}
      </span>
      <button onClick={onLogout} style={{ background: "none", border: "none", color: "#8A8A95", fontSize: "18px", padding: "8px" }}>
        <i className="ti ti-logout"></i>
      </button>
    </div>
  );
}

/* ─── Mobile Bottom Nav ─── */
function MobileBottomNav({ activeTab, purchasesCount, onSelectTab }: {
  activeTab: string; purchasesCount: number; onSelectTab: (t: DashboardTab) => void;
}) {
  const items: { key: DashboardTab; icon: string; label: string; count?: number }[] = [
    { key: "downloads", icon: "ti-download", label: "Achats", count: purchasesCount },
    { key: "payments", icon: "ti-credit-card", label: "Paiements" },
    { key: "catalogue", icon: "ti-photo", label: "Catalogue" },
    { key: "plan", icon: "ti-crown", label: "Plan" },
    { key: "account", icon: "ti-user", label: "Compte" },
  ];
  return (
    <div className="dash-bottom-nav">
      {items.map((item) => (
        <button key={item.key} onClick={() => onSelectTab(item.key)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", color: activeTab === item.key ? "#C8371A" : "#8A8A95", fontSize: "10px", fontWeight: activeTab === item.key ? 600 : 400, padding: "6px 12px", cursor: "pointer", position: "relative" }}>
          <i className={`ti ${item.icon}`} style={{ fontSize: "20px" }}></i>
          <span>{item.label}</span>
          {item.count !== undefined && item.count > 0 && (
            <span style={{ position: "absolute", top: "2px", right: "2px", background: "#C8371A", color: "#fff", fontSize: "9px", fontWeight: 700, width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Sidebar ─── */
function Sidebar({ user, plan, activeTab, purchasesCount, open, onSelectTab, onLogout, router }: {
  user: { name: string; email: string; plan: UserPlan };
  plan: PlanLimits;
  activeTab: string; purchasesCount: number; open: boolean;
  onSelectTab: (t: DashboardTab) => void; onLogout: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const nav = [
    { key: "downloads" as const, icon: "ti-download", label: "Mes téléchargements", count: purchasesCount },
    { key: "payments" as const, icon: "ti-credit-card", label: "Paiements" },
    { key: "catalogue" as const, icon: "ti-photo", label: "Catalogue" },
    { key: "plan" as const, icon: "ti-crown", label: "Mon abonnement" },
    { key: "account" as const, icon: "ti-user", label: "Mon compte" },
  ];
  return (
    <nav className={`dash-sidebar ${open ? "open" : ""}`}>
      <div className="dash-sidebar-logo" onClick={() => router.push("/")}>
        yé<em>tou</em>
        <span>Espace client</span>
      </div>
      <div className="dash-sidebar-user">
        <div className="dash-sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
        <div className="dash-sidebar-name">{user.name}</div>
        <div className="dash-sidebar-email">{user.email}</div>
        <span className={`dash-sidebar-plan ${user.plan !== "none" ? "active" : ""}`}>{plan.name}</span>
      </div>
      <div className="dash-sidebar-nav">
        {nav.map((item) => (
          <button key={item.key} className={`dash-sidebar-item ${activeTab === item.key ? "active" : ""}`} onClick={() => onSelectTab(item.key)}>
            <i className={`ti ${item.icon}`}></i>
            <span>{item.label}</span>
            {item.count !== undefined && <span className="dash-sidebar-badge">{item.count}</span>}
          </button>
        ))}
      </div>
      <div className="dash-sidebar-footer">
        <button className="dash-sidebar-logout" onClick={onLogout}>
          <i className="ti ti-logout"></i> Déconnexion
        </button>
      </div>
    </nav>
  );
}

/* ─── Downloads Tab ─── */
function DownloadsTab({ purchases, loading, router, downloadMedia, remainingDownloads }: {
  purchases: PurchasedItem[]; loading: boolean;
  router: ReturnType<typeof useRouter>;
  downloadMedia: (i: number) => boolean;
  remainingDownloads: (item: PurchasedItem) => number;
}) {
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const handleDownload = (item: PurchasedItem, i: number) => {
    if (!downloadMedia(i)) return;
    linkRefs.current[i]?.click();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 20px", color: "#8A8A95" }}><i className="ti ti-loader" style={{ fontSize: "32px", animation: "spin 1s linear infinite", display: "inline-block" }}></i><p style={{ marginTop: "12px" }}>Chargement...</p></div>;
  }

  return (
    <div>
      <h2 className="dash-h2">Mes téléchargements</h2>
      <p className="dash-sub">{purchases.length} média{purchases.length > 1 ? "s" : ""} acheté{purchases.length > 1 ? "s" : ""}</p>
      {purchases.length > 0 ? (
        <div className="dash-dl-list">
          {purchases.map((item, i) => {
            const rem = remainingDownloads(item);
            const exhausted = rem <= 0;
            return (
              <div key={i} className="dash-dl-card" style={{ opacity: exhausted ? 0.6 : 1 }}>
                <div className="dash-dl-thumb" style={{ backgroundImage: `url(${item.img.replace("1600", "200").replace("1200", "200")})` }} />
                <div className="dash-dl-info">
                  <div className="dash-dl-meta">
                    <span className={`dash-dl-type ${item.type}`}>{item.type === "video" ? "Vidéo" : "Photo"}</span>
                    <span className="dash-dl-date">{item.date}</span>
                  </div>
                  <div className="dash-dl-title">{item.name}</div>
                  <div className="dash-dl-desc">{item.format} · {item.price} FCFA</div>
                  <div className="dash-dl-progress">
                    <div className="dash-dl-progress-bar"><div style={{ width: `${item.maxDownloads > 0 ? ((item.maxDownloads - rem) / item.maxDownloads) * 100 : 0}%`, background: exhausted ? "#C8371A" : "#22c55e" }} /></div>
                    <span style={{ color: exhausted ? "#C8371A" : "#8A8A95" }}>{exhausted ? "Épuisé" : `${rem} restant${rem > 1 ? "s" : ""}`}</span>
                  </div>
                </div>
                <div className="dash-dl-actions">
                  <span className="dash-dl-price">{item.price} <small>FCFA</small></span>
                  <button className="btn-buy-sm" disabled={exhausted} onClick={() => handleDownload(item, i)} style={{ opacity: exhausted ? 0.4 : 1, cursor: exhausted ? "not-allowed" : "pointer" }}>
                    <i className="ti ti-download"></i> {exhausted ? "Limite" : "Télécharger"}
                  </button>
                  <a ref={(el) => { linkRefs.current[i] = el; }} href={item.downloadUrl} download style={{ display: "none" }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dash-empty">
          <i className="ti ti-photo-off" style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}></i>
          <p>Aucun achat pour le moment.</p>
          <button className="btn-primary" onClick={() => router.push("/")}>Parcourir le catalogue</button>
        </div>
      )}
    </div>
  );
}

/* ─── Catalogue Tab ─── */
function CatalogueTab({ catalogueTab, setCatalogueTab, photos, videos, loading, onBuy, onContextCapture }: {
  catalogueTab: "photos" | "videos"; setCatalogueTab: (t: "photos" | "videos") => void;
  photos: ReturnType<typeof usePhotoFilter>; videos: ReturnType<typeof useVideoFilter>;
  loading: boolean;
  onBuy: (n: string, p: string, f: string, img: string, t: "photo" | "video") => void; onContextCapture: () => void;
}) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#8A8A95" }}>
        <i className="ti ti-loader" style={{ fontSize: "32px", animation: "spin 1s linear infinite", display: "inline-block" }}></i>
        <p style={{ marginTop: "12px" }}>Chargement du catalogue...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="dash-h2">Catalogue</h2>
      <p className="dash-sub">Parcourez et achetez des médias depuis votre espace</p>
      <div className="dash-cat-tabs">
        <button className={`dash-cat-tab ${catalogueTab === "photos" ? "active" : ""}`} onClick={() => setCatalogueTab("photos")}>
          <i className="ti ti-photo"></i> Photos ({photos.filtered.length})
        </button>
        <button className={`dash-cat-tab ${catalogueTab === "videos" ? "active" : ""}`} onClick={() => setCatalogueTab("videos")}>
          <i className="ti ti-video"></i> Vidéos ({videos.filtered.length})
        </button>
      </div>
      <div className="dash-catalogue-content">
        {catalogueTab === "photos" ? (
          <PhotoGrid photos={photos.filtered} activePCat={photos.activePCat} activePRes={photos.activePRes} pSort={photos.pSort}
            onSetPCat={photos.setActivePCat} onSetPRes={photos.setActivePRes} onSetPSort={photos.setPSort}
            onBuy={(n, p, f, img) => onBuy(n, p, f, img, "photo")} onContextCapture={onContextCapture} onGoTarifs={() => {}} />
        ) : (
          <VideoGrid videos={videos.filtered} activeVCat={videos.activeVCat} activeVDur={videos.activeVDur} vSort={videos.vSort}
            onSetVCat={videos.setActiveVCat} onSetVDur={videos.setActiveVDur} onSetVSort={videos.setVSort}
            onBuy={(n, p, f, img) => onBuy(n, p, f, img, "video")} onContextCapture={onContextCapture} onGoTarifs={() => {}} />
        )}
      </div>
    </div>
  );
}

/* ─── Plan Tab ─── */
function PlanTab({ user, plan, router }: { user: { name: string; plan: UserPlan }; plan: PlanLimits; router: ReturnType<typeof useRouter> }) {
  const unlim = plan.maxDownloads === -1;
  const all = (["none", "monthly", "pro"] as UserPlan[]).map((p) => ({ key: p, ...PLANS[p] }));
  return (
    <div>
      <h2 className="dash-h2">Mon abonnement</h2>
      <p className="dash-sub">Détails de votre abonnement et limites</p>
      <div className="dash-plan-card" style={{ borderColor: user.plan !== "none" ? "#C8371A" : "#2A2A35" }}>
        <div className="dash-plan-header">
          <div className={`dash-plan-icon ${user.plan}`}><i className={`ti ${user.plan === "pro" ? "ti-building" : user.plan === "monthly" ? "ti-crown" : "ti-photo"}`}></i></div>
          <div>
            <div className="dash-plan-name">{plan.name}</div>
            <div className="dash-plan-desc">{plan.description}</div>
          </div>
          <div className="dash-plan-price">{plan.price}</div>
        </div>
        <div className="dash-plan-features">
          <Feature icon="ti-download" label="Téléchargements/média" value={unlim ? "Illimités" : `${plan.maxDownloads} max`} ok />
          <Feature icon="ti-photo" label="Photos HD" value="Incluses" ok={plan.photosHd} />
          <Feature icon="ti-photo" label="Photos 4K" value="Incluses" ok={plan.photos4k} />
          <Feature icon="ti-video" label="Vidéos 4K" value={plan.videos4k ? "Incluses" : "Non"} ok={plan.videos4k} />
          <Feature icon="ti-file" label="RAW" value={plan.rawIncluded ? "Inclus" : "Non"} ok={plan.rawIncluded} />
          <Feature icon="ti-file-invoice" label="Facture" value={plan.invoice ? "Incluse" : "Non"} ok={plan.invoice} />
          <Feature icon="ti-headset" label="Support" value={plan.supportPriority ? "Prioritaire" : "Standard"} ok={plan.supportPriority} />
        </div>
      </div>
      <h3 className="dash-compare-title">Comparer les abonnements</h3>
      <div className="dash-compare-grid">
        {all.map((p) => (
          <div key={p.key} className={`dash-compare-card ${user.plan === p.key ? "active" : ""}`}>
            {user.plan === p.key && <div className="dash-compare-badge">ACTIF</div>}
            <div className="dash-compare-name">{p.name}</div>
            <div className="dash-compare-desc">{p.description}</div>
            <div className="dash-compare-price">{p.price}</div>
            <div className="dash-compare-list">
              <CompareRow label="Photos HD/4K" ok={p.photosHd} />
              <CompareRow label="Vidéos 4K" ok={p.videos4k} />
              <CompareRow label={`${p.maxDownloads === -1 ? "∞" : p.maxDownloads} téléch./média`} ok />
              <CompareRow label="RAW" ok={p.rawIncluded} />
              <CompareRow label="Facture" ok={p.invoice} />
              <CompareRow label="Support prioritaire" ok={p.supportPriority} />
            </div>
            {user.plan !== p.key && p.key !== "none" && <button className="btn-primary btn-sm" onClick={() => router.push("/")}>Choisir</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Feature({ icon, label, value, ok }: { icon: string; label: string; value: string; ok: boolean }) {
  return (
    <div className="dash-feature">
      <i className={`ti ${icon}`} style={{ color: ok ? "#22c55e" : "#3A3A45" }}></i>
      <div><div style={{ color: ok ? "#F0EFEA" : "#5A5A65" }}>{label}</div><div style={{ fontSize: "11px", color: ok ? "#8A8A95" : "#5A5A65" }}>{value}</div></div>
    </div>
  );
}

function CompareRow({ label, ok }: { label: string; ok: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}><i className={`ti ${ok ? "ti-check" : "ti-x"}`} style={{ color: ok ? "#22c55e" : "#3A3A45" }}></i><span style={{ color: ok ? "#F0EFEA" : "#5A5A65" }}>{label}</span></div>;
}

/* ─── Account Tab ─── */
function AccountTab({ user }: { user: { name: string; email: string; plan: UserPlan } }) {
  const { toast, toastVisible, toastError, showToast } = useToast();
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Le nom ne peut pas être vide.", true); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("yetou_token");
      const res = await fetch(`${API_URL}/users/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSaved(true);
        showToast("Profil mis à jour !");
        setTimeout(() => setSaved(false), 3000);
      } else {
        showToast("Erreur lors de la mise à jour.", true);
      }
    } catch { showToast("Erreur réseau.", true); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="dash-h2">Mon compte</h2>
      <p className="dash-sub">Modifiez vos informations personnelles</p>
      <div className="dash-account-card">
        <div className="form-group">
          <label>Nom complet</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </div>
        <div className="form-group">
          <label>Adresse email</label>
          <input type="email" defaultValue={user.email} readOnly style={{ opacity: 0.7 }} />
          <span style={{ fontSize: "10px", color: "#8A8A95", marginTop: "4px", display: "block" }}>
            L&apos;email ne peut pas être modifié. Contactez le support pour tout changement.
          </span>
        </div>
        <div className="form-group">
          <label>Abonnement</label>
          <input type="text" defaultValue={PLANS[user.plan].name} readOnly style={{ opacity: 0.7 }} />
        </div>
        <div className="form-group">
          <label>Date d&apos;inscription</label>
          <input type="text" defaultValue={new Date().toLocaleDateString("fr-FR")} readOnly style={{ opacity: 0.7 }} />
        </div>
        <button
          className="btn-auth"
          onClick={handleSave}
          disabled={saving || name === user.name}
          style={{
            marginTop: "8px", width: "100%", opacity: saving || name === user.name ? 0.6 : 1,
            cursor: saving || name === user.name ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Enregistrement..." : saved ? <><i className="ti ti-check"></i> Enregistré !</> : "Enregistrer les modifications"}
        </button>
        <div style={{ marginTop: "16px", padding: "14px", background: "#0A0A0F", border: "1px solid #2A2A35", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <i className="ti ti-info-circle" style={{ fontSize: "18px", color: "#C8371A", flexShrink: 0 }}></i>
          <div style={{ fontSize: "12px", color: "#8A8A95", lineHeight: 1.5 }}>Gérez votre compte et votre abonnement. Contact : contact@bestaerogroup.com</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Paiements Tab ─── */
function PaiementsTab({ rawPurchases, loading }: { rawPurchases: ApiPurchase[]; loading: boolean }) {
  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      success: { color: "#22c55e", label: "Réussi" },
      failed: { color: "#C8371A", label: "Échoué" },
      simulated: { color: "#f59e0b", label: "Test" },
      pending: { color: "#3b82f6", label: "En attente" },
    };
    const s = map[status] || { color: "#8A8A95", label: status || "—" };
    return (
      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#8A8A95" }}>
        <i className="ti ti-loader" style={{ fontSize: "32px", animation: "spin 1s linear infinite", display: "inline-block" }}></i>
        <p style={{ marginTop: "12px" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="dash-h2">Historique de paiement</h2>
      <p className="dash-sub">{rawPurchases.length} transaction{rawPurchases.length > 1 ? "s" : ""}</p>
      {rawPurchases.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rawPurchases.map((p) => (
            <div key={p.id} style={{ background: "#14141A", border: "1px solid #2A2A35", borderRadius: "10px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundImage: p.media.file_url ? `url(${p.media.file_url})` : "none", backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0, backgroundColor: p.media.file_url ? undefined : "#1A1A20" }} />
              <div style={{ flex: 1, minWidth: "160px" }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: "13px", fontWeight: 600, color: "#F0EFEA" }}>{p.media.title}</div>
                <div style={{ fontSize: "11px", color: "#8A8A95", marginTop: "3px" }}>
                  {p.payment_method || "—"} · {new Date(p.purchased_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {p.payment_reference && <div style={{ fontSize: "10px", color: "#5A5A65", marginTop: "2px" }}>Ref: {p.payment_reference}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: "16px", fontWeight: 700, color: "#F0EFEA" }}>{p.price.toLocaleString("fr-FR")} <small style={{ fontSize: "10px", fontWeight: 400, color: "#8A8A95" }}>FCFA</small></span>
                {statusBadge(p.payment_status || "success")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-empty">
          <i className="ti ti-credit-card-off" style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}></i>
          <p>Aucun paiement pour le moment.</p>
          <button className="btn-primary" onClick={() => window.location.href = "/"}>Parcourir le catalogue</button>
        </div>
      )}
    </div>
  );
}
