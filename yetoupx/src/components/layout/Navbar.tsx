"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { type Tab } from "@/types";

interface NavbarProps {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  onShowDownloads: () => void;
  onOpenAuth: (tab: "login" | "register") => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export default function Navbar({
  activeTab,
  onSwitchTab,
  searchQuery,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  onShowDownloads,
  onOpenAuth,
  mobileMenuOpen,
  onToggleMobileMenu,
}: NavbarProps) {
  const router = useRouter();
  const { isLoggedIn, user, purchasedItems } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const toggleSearch = () => {
    onSearchOpenChange(!searchOpen);
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value.trim() && activeTab === "tarifs") {
      onSwitchTab("photos");
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">
          yé<em>tou</em>
          <span>by Best Aero Drone · Gabon</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "photos" ? "active" : ""}`}
            onClick={() => onSwitchTab("photos")}
          >
            <i className="ti ti-photo"></i> Photos
          </button>
          <button
            className={`nav-tab ${activeTab === "videos" ? "active" : ""}`}
            onClick={() => onSwitchTab("videos")}
          >
            <i className="ti ti-video"></i> Vidéos
          </button>
          <button
            className={`nav-tab ${activeTab === "tarifs" ? "active" : ""}`}
            onClick={() => onSwitchTab("tarifs")}
          >
            <i className="ti ti-tag"></i> Tarifs
          </button>
        </div>

        <div className="nav-right">
          <button
            type="button"
            className={`nav-search-toggle ${searchOpen ? "active" : ""}`}
            onClick={toggleSearch}
            aria-label={searchOpen ? "Fermer la recherche" : "Rechercher"}
            aria-expanded={searchOpen}
          >
            <i className={`ti ${searchOpen ? "ti-x" : "ti-search"}`}></i>
          </button>

          {isLoggedIn ? (
            <>
              <button
                className="btn-primary"
                onClick={() => router.push("/dashboard")}
                style={{ background: "rgba(200,55,26,0.12)", color: "#F0EFEA", border: "1px solid rgba(200,55,26,0.3)" }}
              >
                <i className="ti ti-user"></i>
                <span className="nav-primary-text">{user?.name}</span>
              </button>
              {purchasedItems.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={onShowDownloads}
                  style={{ background: "#22c55e" }}
                >
                  <i className="ti ti-download"></i>{" "}
                  <span className="nav-primary-text">Mes téléchargements ({purchasedItems.length})</span>
                </button>
              )}
            </>
          ) : (
            <>
              {purchasedItems.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={onShowDownloads}
                  style={{ background: "#22c55e" }}
                >
                  <i className="ti ti-download"></i>{" "}
                  <span className="nav-primary-text">Mes téléchargements ({purchasedItems.length})</span>
                </button>
              )}
              <button className="btn-ghost" onClick={() => onOpenAuth("login")}>
                Connexion
              </button>
              <button className="btn-primary" onClick={() => onOpenAuth("register")}>
                <i className="ti ti-user-plus"></i>
                <span className="nav-primary-text">Créer un compte</span>
              </button>
            </>
          )}
          <button className="mobile-menu-btn" onClick={onToggleMobileMenu}>
            <i className={`ti ${mobileMenuOpen ? "ti-x" : "ti-menu-2"}`}></i>
          </button>
        </div>
      </nav>

      <div className={`nav-search-mobile ${searchOpen ? "open" : ""}`}>
        <div className="nav-search-mobile-inner">
          <i className="ti ti-search"></i>
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Libreville, Ogooué, 4K, paysages…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSearchOpenChange(false);
                onSearchChange("");
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="nav-search-clear"
              onClick={() => onSearchChange("")}
              aria-label="Effacer"
            >
              <i className="ti ti-x"></i>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
