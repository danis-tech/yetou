"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchMedia } from "@/services/api";
import type { Tab, AuthTab, BuyItem } from "@/types";
import type { Photo, Video } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { usePayment } from "@/hooks/usePayment";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useLongPressGuard } from "@/hooks/useLongPressGuard";
import { usePhotoFilter, useVideoFilter } from "@/hooks/useMediaFilter";

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
import PayFooter from "@/components/payment/PayFooter";

import airtelLogo from "../logo/airtel.png";
import moovLogo from "../logo/moov.png";
import googleLogo from "../logo/google.jpg";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { toast, toastVisible, toastError, showToast } = useToast();
  const { isLoggedIn, purchasedItems, downloadMedia, remainingDownloads } = useAuth();
  const { externalize, loading: payLoading } = usePayment();

  const longPressCaptureToast = useCallback(() => {
    showToast("Capture interdite. Ce média est protégé par yétou.", true);
  }, [showToast]);

  useLongPressGuard(longPressCaptureToast);

  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

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
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const photos = usePhotoFilter(allPhotos);
  const videos = useVideoFilter(allVideos);

  const searchPhoto = useCallback(
    (q: string) => {
      if (!q) return photos.filtered;
      const ql = q.toLowerCase();
      return photos.filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(ql) ||
          p.pcat.toLowerCase().includes(ql) ||
          p.pres.toLowerCase().includes(ql)
      );
    },
    [photos.filtered]
  );

  const searchVideo = useCallback(
    (q: string) => {
      if (!q) return videos.filtered;
      const ql = q.toLowerCase();
      return videos.filtered.filter(
        (v) =>
          v.title.toLowerCase().includes(ql) ||
          v.vcat.toLowerCase().includes(ql) ||
          v.vdur.toLowerCase().includes(ql) ||
          ql === "4k"
      );
    },
    [videos.filtered]
  );

  const filteredPhotos = searchQuery ? searchPhoto(searchQuery) : photos.filtered;
  const filteredVideos = searchQuery ? searchVideo(searchQuery) : videos.filtered;

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

  const openBuy = (name: string, price: string, format: string, img: string, type: "photo" | "video" = "photo") => {
    setBuyItem({ name, price, format, img, _type: type });
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

  return (
    <>
      <Navbar
        activeTab={activeTab}
        onSwitchTab={switchTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onShowDownloads={() => setShowDownloads(true)}
        onOpenAuth={openAuth}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <MobileMenu
        open={mobileMenuOpen}
        onSwitchTab={switchTab}
        onOpenAuth={openAuth}
      />

      <Hero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onQuickFilter={quickFilter}
        onSearch={() => switchTab("photos")}
      />

      <StatsBar photoCount={filteredPhotos.length} videoCount={filteredVideos.length} />

      <SectionTabs
        activeTab={activeTab}
        onSwitchTab={switchTab}
        photoCount={filteredPhotos.length}
        videoCount={filteredVideos.length}
      />

      <div className={`panel ${activeTab === "photos" ? "active" : ""}`}>
        <div className="content">
          <PhotoGrid
            photos={filteredPhotos}
            activePCat={photos.activePCat}
            activePRes={photos.activePRes}
            pSort={photos.pSort}
            onSetPCat={(cat) => { photos.setActivePCat(cat); setSearchQuery(""); }}
            onSetPRes={(res) => { photos.setActivePRes(res); setSearchQuery(""); }}
            onSetPSort={photos.setPSort}
            onBuy={(name, price, format, img) => openBuy(name, price, format, img, "photo")}
            onContextCapture={longPressCaptureToast}
            onGoTarifs={() => switchTab("tarifs")}
          />
        </div>
      </div>

      <div className={`panel ${activeTab === "videos" ? "active" : ""}`}>
        <div className="content">
          <VideoGrid
            videos={filteredVideos}
            activeVCat={videos.activeVCat}
            activeVDur={videos.activeVDur}
            vSort={videos.vSort}
            onSetVCat={(cat) => { videos.setActiveVCat(cat); setSearchQuery(""); }}
            onSetVDur={(dur) => { videos.setActiveVDur(dur); setSearchQuery(""); }}
            onSetVSort={videos.setVSort}
            onBuy={(name, price, format, img) => openBuy(name, price, format, img, "video")}
            onContextCapture={longPressCaptureToast}
            onGoTarifs={() => switchTab("tarifs")}
          />
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
        items={purchasedItems}
        onClose={() => setShowDownloads(false)}
        downloadMedia={downloadMedia}
        remainingDownloads={remainingDownloads}
      />

      <Toast message={toast} visible={toastVisible} isError={toastError} />
    </>
  );
}
