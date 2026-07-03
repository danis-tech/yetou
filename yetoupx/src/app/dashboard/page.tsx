"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMedia, getCachedMedia } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { usePhotoFilter, useVideoFilter } from "@/hooks/useMediaFilter";
import { buildSearchIndex } from "@/hooks/useMediaSearch";
import type { BuyItem, PurchasedItem, UserPlan, PlanLimits, Photo, Video } from "@/types";
import { PLANS } from "@/types";
import PhotoGrid from "@/components/photos/PhotoGrid";
import VideoGrid from "@/components/videos/VideoGrid";
import BuyModal from "@/components/modals/BuyModal";
import Toast from "@/components/ui/Toast";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import WelcomeTab from "@/components/dashboard/WelcomeTab";
import DashboardCatalogueNav from "@/components/dashboard/DashboardCatalogueNav";
import type { DashboardTab } from "@/components/dashboard/DashboardBottomNav";
import { fetchDashboardSummary, markNotificationRead, markAllNotificationsRead } from "@/services/api";
import type { DashboardSummary, ApiPurchase } from "@/services/api";
import { filterPhotosBySearch, filterVideosBySearch } from "@/hooks/useMediaSearch";
import airtelLogo from "@/logo/airtel.png";
import moovLogo from "@/logo/moov.png";

import { usePurchases } from "@/hooks/usePurchases";
import { getApiUrl } from "@/lib/api-url";

const VALID_TABS = new Set<DashboardTab>(["home", "downloads", "catalogue", "plan", "account", "payments"]);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const { toast, toastVisible, toastError, showToast } = useToast();
  const { checkout, loading: payLoading } = usePayment();
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [catalogueSearch, setCatalogueSearch] = useState("");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && VALID_TABS.has(tab as DashboardTab)) {
      setActiveTab(tab as DashboardTab);
    }
  }, []);

  const [purchasesRefresh, setPurchasesRefresh] = useState(0);
  const { paidPurchases, allRaw, loading: loadingPurchases, downloadPurchase, remainingDownloads, refresh: refreshPurchases } =
    usePurchases(!!isLoggedIn, purchasesRefresh);

  const loadDashboardSummary = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoadingDashboard(true);
    try {
      const data = await fetchDashboardSummary();
      if (data) setDashboardSummary(data);
    } finally {
      setLoadingDashboard(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadDashboardSummary();
  }, [loadDashboardSummary, purchasesRefresh]);

  const handleMarkNotificationRead = useCallback(async (id: number) => {
    const ok = await markNotificationRead(id);
    if (ok) {
      setDashboardSummary((prev) => {
        if (!prev) return prev;
        const notifications = prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        const unread = notifications.filter((n) => !n.read).length;
        return {
          ...prev,
          notifications,
          stats: { ...prev.stats, unread_notifications: unread },
        };
      });
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    const ok = await markAllNotificationsRead();
    if (ok) {
      setDashboardSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          stats: { ...prev.stats, unread_notifications: 0 },
        };
      });
    }
  }, []);

  // Catalogue state
  const [catalogueTab, setCatalogueTab] = useState<"photos" | "videos">("photos");
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  useEffect(() => {
    const cachedP = getCachedMedia("photo");
    const cachedV = getCachedMedia("video");
    if (cachedP?.length) {
      setAllPhotos(cachedP.map((m) => ({
        id: m.id, title: m.title, details: `${m.quality_display} · ${m.resolution || m.file_size_display} · ${m.category_display}`,
        format: m.license_type, price: `${m.price} FCFA`,
        img: m.preview_url || m.thumbnail_url || m.stream_url || m.file_url,
        pcat: m.category, pres: m.quality.toLowerCase(), downloads: m.downloads,
        searchIndex: buildSearchIndex(m.title, m.category_display, m.category, m.quality, m.resolution, m.province, m.city),
      })));
    }
    if (cachedV?.length) {
      setAllVideos(cachedV.map((m) => ({
        id: m.id, title: m.title, details: `Vidéo ${m.duration || "0:30"} · ${m.quality_display}`,
        format: "MP4", duration: m.duration || "0:30", price: `${m.price} FCFA`,
        img: m.preview_url || m.thumbnail_url || "",
        videoUrl: m.stream_url || m.file_url,
        vcat: m.category, vdur: m.duration?.includes("1:") ? "60" : "30", downloads: m.downloads,
        searchIndex: buildSearchIndex(m.title, m.category_display, m.category, m.quality, m.duration, m.province, m.city),
      })));
    }
    if (cachedP?.length && cachedV?.length) setCatalogueLoading(false);

    Promise.all([fetchMedia("photo"), fetchMedia("video")]).then(([p, v]) => {
      setAllPhotos(p.map((m) => ({
        id: m.id, title: m.title, details: `${m.quality_display} · ${m.resolution || m.file_size_display} · ${m.category_display}`,
        format: m.license_type, price: `${m.price} FCFA`,
        img: m.preview_url || m.thumbnail_url || m.stream_url || m.file_url,
        pcat: m.category, pres: m.quality.toLowerCase(), downloads: m.downloads,
        searchIndex: buildSearchIndex(m.title, m.category_display, m.category, m.quality, m.resolution, m.province, m.city),
      })));
      setAllVideos(v.map((m) => ({
        id: m.id, title: m.title, details: `Vidéo ${m.duration || "0:30"} · ${m.quality_display}`,
        format: "MP4", duration: m.duration || "0:30", price: `${m.price} FCFA`,
        img: m.preview_url || m.thumbnail_url || "",
        videoUrl: m.stream_url || m.file_url,
        vcat: m.category, vdur: m.duration?.includes("1:") ? "60" : "30", downloads: m.downloads,
        searchIndex: buildSearchIndex(m.title, m.category_display, m.category, m.quality, m.duration, m.province, m.city),
      })));
    }).catch(() => {}).finally(() => setCatalogueLoading(false));
  }, []);

  const photos = usePhotoFilter(allPhotos);
  const videos = useVideoFilter(allVideos);
  const cataloguePhotos = filterPhotosBySearch(photos.filtered, catalogueSearch);
  const catalogueVideos = filterVideosBySearch(videos.filtered, catalogueSearch);

  // Buy modal
  const [buyItem, setBuyItem] = useState<BuyItem | null>(null);
  const [activePayMethod, setActivePayMethod] = useState("Airtel Money");
  const [clientPhone, setClientPhone] = useState("");

  const openBuy = useCallback((name: string, price: string, format: string, img: string, type: "photo" | "video" = "photo", mediaId?: number) => {
    setBuyItem({ name, price, format, img, _type: type, mediaId });
    setActivePayMethod("Airtel Money");
    setClientPhone("");
  }, []);

  const confirmPay = useCallback(async () => {
    if (!buyItem) return;
    const ok = await checkout({
      buyItem,
      mediaId: buyItem.mediaId,
      method: activePayMethod,
      onLinkOpened: () => {
        showToast(
          activePayMethod === "Visa" || activePayMethod === "Mastercard"
            ? "Redirection vers le paiement sécurisé par carte…"
            : "Finalisez le paiement dans l'onglet SingPay. Votre achat apparaîtra après confirmation.",
        );
      },
      onError: (msg) => showToast(msg, true),
    });

    if (ok) setBuyItem(null);
  }, [buyItem, activePayMethod, checkout, showToast, loadDashboardSummary, refreshPurchases]);

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
    <div className="dash-shell">
      <MobileHeader
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={() => { logout(); router.push("/"); }}
        activeTab={activeTab}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="dash-sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="dash-layout">
        {/* Sidebar */}
        <Sidebar
          user={user}
          plan={plan}
          activeTab={activeTab}
          purchasesCount={paidPurchases.length}
          open={sidebarOpen}
          onSelectTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          onLogout={() => { logout(); router.push("/"); }}
          router={router}
        />

        {/* Main */}
        <div className="dash-main">
          {activeTab === "home" && (
            <WelcomeTab
              userName={user.name}
              plan={plan}
              userPlan={user.plan}
              summary={dashboardSummary}
              loading={loadingDashboard}
              onRefresh={loadDashboardSummary}
              onSelectTab={setActiveTab}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}
          {activeTab === "downloads" && (
            <PurchasesTab
              purchases={paidPurchases}
              loading={loadingPurchases}
              router={router}
              onDownload={downloadPurchase}
              remainingDownloads={remainingDownloads}
              onError={(msg) => showToast(msg, true)}
              onGoCatalogue={() => setActiveTab("catalogue")}
            />
          )}
          {activeTab === "catalogue" && (
            <CatalogueTab catalogueTab={catalogueTab} setCatalogueTab={setCatalogueTab} photos={photos} videos={videos}
              cataloguePhotos={cataloguePhotos} catalogueVideos={catalogueVideos}
              searchQuery={catalogueSearch} onSearchChange={setCatalogueSearch}
              loading={catalogueLoading}
              onBuy={openBuy} onContextCapture={longPressCaptureToast}
              onGoTarifs={() => setActiveTab("plan")} />
          )}
          {activeTab === "plan" && <PlanTab user={user} plan={plan} router={router} />}
          {activeTab === "account" && (
            <AccountTab user={user} createdAt={dashboardSummary?.user?.created_at} />
          )}
          {activeTab === "payments" && <PaiementsTab rawPurchases={allRaw} loading={loadingPurchases} />}
        </div>
      </div>

      <BuyModal item={buyItem} activePayMethod={activePayMethod} clientPhone={clientPhone} payLoading={payLoading}
        onClose={() => setBuyItem(null)} onSelectMethod={setActivePayMethod} onPhoneChange={setClientPhone}
        onConfirm={confirmPay} airtelLogoSrc={airtelLogo.src} moovLogoSrc={moovLogo.src} />
      <Toast message={toast} visible={toastVisible} isError={toastError} />

      {/* Navigation bas de page (mobile / tablette) */}
      <DashboardBottomNav
        activeTab={activeTab}
        purchasesCount={paidPurchases.length}
        unreadNotifications={dashboardSummary?.stats.unread_notifications ?? 0}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

/* ─── Mobile Header ─── */
function MobileHeader({ sidebarOpen, onToggle, onLogout, activeTab }: {
  sidebarOpen: boolean; onToggle: () => void; onLogout: () => void; activeTab: string;
}) {
  const labels: Record<string, string> = {
    home: "Accueil",
    downloads: "Mes achats", payments: "Paiements", catalogue: "Catalogue",
    plan: "Abonnement", account: "Compte",
  };
  return (
    <div className="dash-mobile-header">
      <button type="button" className="dash-mobile-header-btn" onClick={onToggle} aria-label="Menu">
        <i className={`ti ${sidebarOpen ? "ti-x" : "ti-menu-2"}`}></i>
      </button>
      <span className="dash-mobile-header-title">{labels[activeTab] || "Dashboard"}</span>
      <button type="button" className="dash-mobile-header-btn dash-mobile-header-btn--muted" onClick={onLogout} aria-label="Déconnexion">
        <i className="ti ti-logout"></i>
      </button>
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
    { key: "home" as const, icon: "ti-home", label: "Accueil" },
    { key: "downloads" as const, icon: "ti-shopping-bag", label: "Mes achats", count: purchasesCount },
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

/* ─── Achats Tab (paiement confirmé → téléchargement séparé) ─── */
function PurchasesTab({ purchases, loading, router, onDownload, remainingDownloads, onError, onGoCatalogue }: {
  purchases: PurchasedItem[];
  loading: boolean;
  router: ReturnType<typeof useRouter>;
  onDownload: (item: PurchasedItem) => Promise<string>;
  remainingDownloads: (item: PurchasedItem) => number;
  onError: (msg: string) => void;
  onGoCatalogue: () => void;
}) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const neverDownloaded = purchases.filter((p) => p.downloadCount === 0).length;

  const handleDownload = async (item: PurchasedItem) => {
    if (!item.canDownload) {
      onError("Le téléchargement n'est disponible qu'après confirmation du paiement.");
      return;
    }
    setDownloadingId(item.id);
    try {
      const url = await onDownload(item);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur de téléchargement.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div className="dash-loading"><i className="ti ti-loader dash-loading-icon"></i><p>Chargement...</p></div>;
  }

  return (
    <div className="dash-tab">
      <h2 className="dash-h2">Mes achats</h2>
      <p className="dash-sub">
        {purchases.length} achat{purchases.length > 1 ? "s" : ""} confirmé{purchases.length > 1 ? "s" : ""}
        {neverDownloaded > 0 ? ` · ${neverDownloaded} jamais téléchargé${neverDownloaded > 1 ? "s" : ""}` : ""}
      </p>

      <div className="dash-purchase-notice">
        <i className="ti ti-info-circle" />
        <p>
          <strong>Achat ≠ téléchargement.</strong> Un paiement réussi ajoute le média ici. Vous pouvez le télécharger ensuite,
          selon les limites de votre plan ({purchases[0]?.maxDownloads === 999 ? "illimité" : "quota par média"}).
        </p>
      </div>

      {purchases.length > 0 ? (
        <div className="dash-dl-list">
          {purchases.map((item) => {
            const rem = remainingDownloads(item);
            const exhausted = rem <= 0;
            const neverDl = item.downloadCount === 0;
            const isDownloading = downloadingId === item.id;
            return (
              <div key={item.id} className={`dash-dl-card${exhausted ? " dash-dl-card--exhausted" : ""}`}>
                <div className="dash-dl-thumb" style={{ backgroundImage: `url(${item.img})` }} />
                <div className="dash-dl-info">
                  <div className="dash-dl-meta">
                    <span className={`dash-dl-type ${item.type}`}>{item.type === "video" ? "Vidéo" : "Photo"}</span>
                    <span className="dash-dl-date">Acheté le {item.date}</span>
                    {neverDl ? (
                      <span className="dash-purchase-badge dash-purchase-badge--new">Jamais téléchargé</span>
                    ) : (
                      <span className="dash-purchase-badge dash-purchase-badge--ok">Téléchargé {item.downloadCount}×</span>
                    )}
                  </div>
                  <div className="dash-dl-title">{item.name}</div>
                  <div className="dash-dl-desc">{item.format} · {item.price} FCFA · Paiement confirmé</div>
                  <div className="dash-dl-progress">
                    <div className="dash-dl-progress-bar">
                      <div style={{ width: `${item.maxDownloads > 0 ? (item.downloadCount / item.maxDownloads) * 100 : 0}%`, background: exhausted ? "#C8371A" : "#22c55e" }} />
                    </div>
                    <span className={exhausted ? "dash-dl-progress--warn" : ""}>
                      {exhausted ? "Quota épuisé" : `${item.downloadCount}/${item.maxDownloads} téléch.`}
                      {!exhausted && rem > 0 ? ` · ${rem} restant${rem > 1 ? "s" : ""}` : ""}
                    </span>
                  </div>
                </div>
                <div className="dash-dl-actions">
                  <span className="dash-dl-price">{item.price} <small>FCFA</small></span>
                  <button
                    className="btn-buy-sm dash-dl-btn"
                    disabled={exhausted || isDownloading || !item.canDownload}
                    onClick={() => handleDownload(item)}
                  >
                    <i className={`ti ${isDownloading ? "ti-loader dash-spin" : "ti-download"}`} />
                    {isDownloading ? "..." : exhausted ? "Quota épuisé" : "Télécharger"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dash-empty">
          <i className="ti ti-shopping-bag dash-empty-icon"></i>
          <p>Aucun achat confirmé pour le moment.</p>
          <p className="dash-empty-hint">Les paiements en attente apparaissent dans l&apos;onglet Paiements.</p>
          <button type="button" className="btn-primary" onClick={onGoCatalogue}>Parcourir le catalogue</button>
        </div>
      )}
    </div>
  );
}

/* ─── Catalogue Tab ─── */
function CatalogueTab({ catalogueTab, setCatalogueTab, photos, videos, cataloguePhotos, catalogueVideos, searchQuery, onSearchChange, loading, onBuy, onContextCapture, onGoTarifs }: {
  catalogueTab: "photos" | "videos"; setCatalogueTab: (t: "photos" | "videos") => void;
  photos: ReturnType<typeof usePhotoFilter>; videos: ReturnType<typeof useVideoFilter>;
  cataloguePhotos: ReturnType<typeof filterPhotosBySearch>; catalogueVideos: ReturnType<typeof filterVideosBySearch>;
  searchQuery: string; onSearchChange: (q: string) => void;
  loading: boolean;
  onBuy: (n: string, p: string, f: string, img: string, t: "photo" | "video", mediaId?: number) => void; onContextCapture: () => void;
  onGoTarifs: () => void;
}) {
  if (loading) {
    return <div className="dash-loading"><i className="ti ti-loader dash-loading-icon"></i><p>Chargement du catalogue...</p></div>;
  }

  return (
    <div className="dash-tab dash-tab--catalogue">
      <h2 className="dash-h2">Catalogue</h2>
      <p className="dash-sub dash-sub--flush">Parcourez et achetez des médias depuis votre espace</p>

      <DashboardCatalogueNav
        catalogueTab={catalogueTab}
        photosCount={cataloguePhotos.length}
        videosCount={catalogueVideos.length}
        searchQuery={searchQuery}
        onTabChange={setCatalogueTab}
        onSearchChange={onSearchChange}
        onGoTarifs={onGoTarifs}
      />

      <div className="dash-catalogue-content">
        {catalogueTab === "photos" ? (
          <PhotoGrid photos={cataloguePhotos} activePCat={photos.activePCat} activePRes={photos.activePRes} pSort={photos.pSort}
            onSetPCat={photos.setActivePCat} onSetPRes={photos.setActivePRes} onSetPSort={photos.setPSort}
            onBuy={(n, p, f, img, id) => onBuy(n, p, f, img, "photo", id)} onContextCapture={onContextCapture} onGoTarifs={onGoTarifs} />
        ) : (
          <VideoGrid videos={catalogueVideos} activeVCat={videos.activeVCat} activeVDur={videos.activeVDur} vSort={videos.vSort}
            onSetVCat={videos.setActiveVCat} onSetVDur={videos.setActiveVDur} onSetVSort={videos.setVSort}
            onBuy={(n, p, f, img, id) => onBuy(n, p, f, img, "video", id)} onContextCapture={onContextCapture} onGoTarifs={onGoTarifs} />
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
    <div className="dash-tab">
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
function AccountTab({ user, createdAt }: { user: { name: string; email: string; plan: UserPlan }; createdAt?: string }) {
  const { toast, toastVisible, toastError, showToast } = useToast();
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Le nom ne peut pas être vide.", true); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("yetou_token");
      const res = await fetch(`${getApiUrl()}/users/profile/`, {
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
    <div className="dash-tab">
      <h2 className="dash-h2">Mon compte</h2>
      <p className="dash-sub">Modifiez vos informations personnelles</p>
      <div className="dash-account-card">
        <div className="form-group">
          <label>Nom complet</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </div>
        <div className="form-group">
          <label>Adresse email</label>
          <input type="email" defaultValue={user.email} readOnly />
          <span className="field-hint">
            L&apos;email ne peut pas être modifié. Contactez le support pour tout changement.
          </span>
        </div>
        <div className="form-group">
          <label>Abonnement</label>
          <input type="text" defaultValue={PLANS[user.plan].name} readOnly />
        </div>
        <div className="form-group">
          <label>Date d&apos;inscription</label>
          <input
            type="text"
            defaultValue={createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : "—"}
            readOnly
          />
        </div>
        <button
          className="btn-auth"
          onClick={handleSave}
          disabled={saving || name === user.name}
        >
          {saving ? "Enregistrement..." : saved ? <><i className="ti ti-check"></i> Enregistré !</> : "Enregistrer les modifications"}
        </button>
        <div className="dash-account-info">
          <i className="ti ti-info-circle"></i>
          <p>Gérez votre compte et votre abonnement. Contact : contact@bestaerogroup.com</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Paiements Tab ─── */
function PaiementsTab({ rawPurchases, loading }: { rawPurchases: ApiPurchase[]; loading: boolean }) {
  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      success: { cls: "dash-payment-status--success", label: "Réussi" },
      failed: { cls: "dash-payment-status--failed", label: "Échoué" },
      simulated: { cls: "dash-payment-status--simulated", label: "Test" },
      pending: { cls: "dash-payment-status--pending", label: "En attente" },
    };
    const s = map[status] || { cls: "dash-payment-status--default", label: status || "—" };
    return <span className={`dash-payment-status ${s.cls}`}>{s.label}</span>;
  };

  if (loading) {
    return <div className="dash-loading"><i className="ti ti-loader dash-loading-icon"></i><p>Chargement...</p></div>;
  }

  return (
    <div className="dash-tab">
      <h2 className="dash-h2">Historique des paiements</h2>
      <p className="dash-sub">
        {rawPurchases.length} transaction{rawPurchases.length > 1 ? "s" : ""} · seuls les paiements confirmés débloquent le téléchargement
      </p>
      {rawPurchases.length > 0 ? (
        <div className="dash-payment-list">
          {rawPurchases.map((p) => (
            <div key={p.id} className="dash-payment-card">
              <div
                className="dash-payment-thumb"
                style={(p.media.preview_url || p.media.thumbnail_url || p.media.file_url) ? { backgroundImage: `url(${p.media.preview_url || p.media.thumbnail_url || p.media.file_url})` } : undefined}
              />
              <div className="dash-payment-info">
                <div className="dash-payment-title">{p.media.title}</div>
                <div className="dash-payment-meta">
                  {p.payment_method || "—"} · {new Date(p.purchased_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {p.payment_reference && <div className="dash-payment-ref">Ref: {p.payment_reference}</div>}
              </div>
              <div className="dash-payment-side">
                <span className="dash-payment-amount">{p.price.toLocaleString("fr-FR")} <small>FCFA</small></span>
                {statusBadge(p.payment_status || "success")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-empty">
          <i className="ti ti-credit-card-off dash-empty-icon"></i>
          <p>Aucun paiement pour le moment.</p>
          <button className="btn-primary" onClick={() => window.location.href = "/"}>Parcourir le catalogue</button>
        </div>
      )}
    </div>
  );
}
