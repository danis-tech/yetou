"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { type Tab } from "@/types";

interface NavbarProps {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  onShowDownloads,
  onOpenAuth,
  mobileMenuOpen,
  onToggleMobileMenu,
}: NavbarProps) {
  const router = useRouter();
  const { isLoggedIn, user, purchasedItems, logout } = useAuth();

  return (
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

      <div className="nav-search">
        <i className="ti ti-search"></i>
        <input
          type="text"
          placeholder="Paysages, Libreville, fleuves…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="nav-right">
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
  );
}
