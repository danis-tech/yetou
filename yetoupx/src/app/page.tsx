"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Tab, AuthTab, BuyItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { usePurchases } from "@/hooks/usePurchases";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useLongPressGuard } from "@/hooks/useLongPressGuard";
import { usePhotoFilters, useVideoFilters } from "@/hooks/useMediaFilter";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerMediaList } from "@/hooks/useServerMediaList";
import { useMediaLikes } from "@/hooks/useMediaLikes";
import { mapApiMediaToPhoto, mapApiMediaToVideo } from "@/lib/media-mapper";

import Navbar from "@/components/layout/Navbar";
import MobileMenu from "@/components/layout/MobileMenu";
import Footer from "@/components/layout/Footer";
import SectionTabs from "@/components/layout/SectionTabs";
import StatsBar from "@/components/layout/StatsBar";
import Hero from "@/components/hero/Hero";
import PhotoGrid from "@/components/photos/PhotoGrid";
import VideoGrid from "@/components/videos/VideoGrid";
import TarifsPanel from "@/components/tarifs/TarifsPanel";
import BuyModal from "@/components/modals/BuyModal";
import AuthModal from "@/components/modals/AuthModal";
import DownloadsModal from "@/components/modals/DownloadsModal";
import Toast from "@/components/ui/Toast";
import MediaGridSkeleton from "@/components/ui/MediaGridSkeleton";
import PayFooter from "@/components/payment/PayFooter";

import airtelLogo from "../logo/airtel.png";
import moovLogo from "../logo/moov.png";
import googleLogo from "../logo/google.jpg";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { toast, toastVisible, toastError, showToast } = useToast();
  const { isLoggedIn } = useAuth();
  const [purchasesRefresh, setPurchasesRefresh] = useState(0);
  const { paidPurchases, downloadPurchase, remainingDownloads } = usePurchases(isLoggedIn, purchasesRefresh);
  const { checkout, loading: payLoading } = usePayment();

  const longPressCaptureToast = useCallback(() => {
    showToast("Capture interdite. Ce média est protégé par Gabon Pixel.", true);
  }, [showToast]);

  useLongPressGuard(longPressCaptureToast);

  const photos = usePhotoFilters();
  const videos = useVideoFilters();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const photoQuery = useMemo(() => ({
    type: "photo" as const,
    category: photos.activePCat,
    resolution: photos.activePRes,
    search: debouncedSearch,
    sort: photos.pSort,
  }), [photos.activePCat, photos.activePRes, debouncedSearch, photos.pSort]);

  const videoQuery = useMemo(() => ({
    type: "video" as const,
    category: videos.activeVCat,
    duration: videos.activeVDur,
    resolution: videos.activeVRes,
    search: debouncedSearch,
    sort: videos.vSort,
  }), [videos.activeVCat, videos.activeVDur, videos.activeVRes, debouncedSearch, videos.vSort]);

  const { items: filteredPhotos, count: photoCount, loading: photosLoading, refreshing: photosRefreshing } = useServerMediaList({
    params: photoQuery,
    mapItem: mapApiMediaToPhoto,
  });

  const { items: filteredVideos, count: videoCount, loading: videosLoading, refreshing: videosRefreshing } = useServerMediaList({
    params: videoQuery,
    mapItem: mapApiMediaToVideo,
  });

  const [buyItem, setBuyItem] = useState<BuyItem | null>(null);
  const [activePayMethod, setActivePayMethod] = useState("Airtel Money");
  const [clientPhone, setClientPhone] = useState("");
  const [showDownloads, setShowDownloads] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");

  const anyOpen = !!buyItem || authOpen || showDownloads;
  useBodyScrollLock(anyOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBuyItem(null);
        setAuthOpen(false);
        setShowDownloads(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickFilter = (kw: string) => {
    if (kw === "4K") photos.setActivePRes("4k");
    setSearchQuery(kw);
    switchTab("photos");
  };

  const openBuy = (name: string, price: string, format: string, img: string, type: "photo" | "video" = "photo", mediaId?: number) => {
    setBuyItem({ name, price, format, img, _type: type, mediaId });
    setActivePayMethod("Airtel Money");
    setClientPhone("");
  };

  const confirmPay = async () => {
    if (!buyItem) return;
    if (!isLoggedIn) {
      setAuthOpen(true);
      setAuthTab("login");
      return;
    }
    const ok = await checkout({
      buyItem,
      mediaId: buyItem.mediaId,
      method: activePayMethod,
      onLinkOpened: () => showToast(
        activePayMethod === "Visa" || activePayMethod === "Mastercard"
          ? "Redirection vers le paiement sécurisé par carte…"
          : "Finalisez le paiement dans l'onglet SingPay.",
      ),
      onError: (msg) => showToast(msg, true),
    });

    if (ok) setBuyItem(null);
  };

  const selectPlan = (plan: string) => {
    if (plan === "monthly") {
      openBuy("Abonnement Mensuel", "15 000", "15 000 FCFA/mois", "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop");
    } else if (plan === "pro") {
      openBuy("Abonnement Pro", "50 000", "50 000 FCFA/mois", "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop");
    }
  };

  const openAuth = (tab: AuthTab) => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const { toggleLike, loadingId: likeLoadingId } = useMediaLikes(
    () => { setAuthTab("login"); setAuthOpen(true); },
    (msg) => showToast(msg, true),
  );

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim() && activeTab === "tarifs") {
      setActiveTab("photos");
    }
  }, [activeTab]);

  const handleHeroSearch = useCallback(() => {
    if (searchQuery.trim()) {
      switchTab("photos");
    }
  }, [searchQuery]);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        onSwitchTab={switchTab}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchOpen={mobileSearchOpen}
        onSearchOpenChange={(open) => {
          setMobileSearchOpen(open);
          if (open) setMobileMenuOpen(false);
        }}
        onShowDownloads={() => setShowDownloads(true)}
        onOpenAuth={openAuth}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => {
          setMobileMenuOpen((o) => !o);
          setMobileSearchOpen(false);
        }}
      />

      <MobileMenu
        open={mobileMenuOpen}
        onSwitchTab={switchTab}
        onOpenAuth={openAuth}
      />

      <Hero
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onQuickFilter={quickFilter}
        onSearch={handleHeroSearch}
      />

      <StatsBar photoCount={photoCount} videoCount={videoCount} />

      <SectionTabs
        activeTab={activeTab}
        onSwitchTab={switchTab}
        photoCount={photoCount}
        videoCount={videoCount}
      />

      <div className={`panel ${activeTab === "photos" ? "active" : ""}`}>
        <div className="content">
          {photosLoading && filteredPhotos.length === 0 ? (
            <MediaGridSkeleton type="photo" count={8} />
          ) : (
            <PhotoGrid
              photos={filteredPhotos}
              resultCount={photoCount}
              refreshing={photosRefreshing}
              activePCat={photos.activePCat}
              activePRes={photos.activePRes}
              pSort={photos.pSort}
              onSetPCat={(cat) => { photos.setActivePCat(cat); setSearchQuery(""); }}
              onSetPRes={(res) => { photos.setActivePRes(res); setSearchQuery(""); }}
              onSetPSort={photos.setPSort}
              onBuy={(name, price, format, img, id) => openBuy(name, price, format, img, "photo", id)}
              onContextCapture={longPressCaptureToast}
              onGoTarifs={() => switchTab("tarifs")}
              onToggleLike={toggleLike}
              likeLoadingId={likeLoadingId}
            />
          )}
        </div>
      </div>

      <div className={`panel ${activeTab === "videos" ? "active" : ""}`}>
        <div className="content">
          {videosLoading && filteredVideos.length === 0 ? (
            <MediaGridSkeleton type="video" count={6} />
          ) : (
            <VideoGrid
              videos={filteredVideos}
              resultCount={videoCount}
              refreshing={videosRefreshing}
              activeVCat={videos.activeVCat}
              activeVDur={videos.activeVDur}
              activeVRes={videos.activeVRes}
              vSort={videos.vSort}
              onSetVCat={(cat) => { videos.setActiveVCat(cat); setSearchQuery(""); }}
              onSetVDur={(dur) => { videos.setActiveVDur(dur); setSearchQuery(""); }}
              onSetVRes={(res) => { videos.setActiveVRes(res); setSearchQuery(""); }}
              onSetVSort={videos.setVSort}
              onBuy={(name, price, format, img, id) => openBuy(name, price, format, img, "video", id)}
              onContextCapture={longPressCaptureToast}
              onGoTarifs={() => switchTab("tarifs")}
              onToggleLike={toggleLike}
              likeLoadingId={likeLoadingId}
            />
          )}
        </div>
      </div>

      <div className={`panel ${activeTab === "tarifs" ? "active" : ""}`}>
        <TarifsPanel
          onSelectPlan={selectPlan}
          onBrowse={() => switchTab("photos")}
        />
      </div>

      <PayFooter airtelLogoSrc={airtelLogo.src} moovLogoSrc={moovLogo.src} />

      <Footer
        onSwitchTab={switchTab}
        onSetPhotoCat={(cat) => { photos.setActivePCat(cat); switchTab("photos"); }}
        onOpenAuth={openAuth}
      />

      <BuyModal
        item={buyItem}
        activePayMethod={activePayMethod}
        clientPhone={clientPhone}
        payLoading={payLoading}
        onClose={() => setBuyItem(null)}
        onSelectMethod={setActivePayMethod}
        onPhoneChange={setClientPhone}
        onConfirm={confirmPay}
        airtelLogoSrc={airtelLogo.src}
        moovLogoSrc={moovLogo.src}
      />

      <AuthModal
        open={authOpen}
        authTab={authTab}
        onClose={() => setAuthOpen(false)}
        onSwitchTab={setAuthTab}
        googleLogoSrc={googleLogo.src}
        showToast={showToast}
      />

      <DownloadsModal
        open={showDownloads}
        items={paidPurchases}
        onClose={() => setShowDownloads(false)}
        onDownload={downloadPurchase}
        remainingDownloads={remainingDownloads}
        onError={(msg) => showToast(msg, true)}
      />

      <Toast message={toast} visible={toastVisible} isError={toastError} />
    </>
  );
}
