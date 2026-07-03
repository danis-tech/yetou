"use client";

export type DashboardTab = "home" | "downloads" | "catalogue" | "plan" | "account" | "payments";

interface DashboardBottomNavProps {
  activeTab: DashboardTab;
  purchasesCount: number;
  unreadNotifications?: number;
  onSelectTab: (tab: DashboardTab) => void;
}

const ITEMS: { key: DashboardTab; icon: string; label: string; showBadge?: "purchases" | "notifications" }[] = [
  { key: "home", icon: "ti-home", label: "Accueil", showBadge: "notifications" },
  { key: "catalogue", icon: "ti-photo", label: "Catalogue" },
  { key: "downloads", icon: "ti-download", label: "Achats", showBadge: "purchases" },
  { key: "plan", icon: "ti-crown", label: "Plan" },
  { key: "account", icon: "ti-user", label: "Compte" },
];

export default function DashboardBottomNav({ activeTab, purchasesCount, unreadNotifications = 0, onSelectTab }: DashboardBottomNavProps) {
  return (
    <nav className="dash-bottom-nav" aria-label="Navigation dashboard">
      {ITEMS.map((item) => {
        const active = activeTab === item.key;
        const badge = item.showBadge === "purchases" && purchasesCount > 0
          ? purchasesCount
          : item.showBadge === "notifications" && unreadNotifications > 0
            ? unreadNotifications
            : 0;
        return (
          <button
            key={item.key}
            type="button"
            className={`dash-bottom-nav-item ${active ? "active" : ""}`}
            onClick={() => onSelectTab(item.key)}
            aria-current={active ? "page" : undefined}
          >
            <span className="dash-bottom-nav-icon-wrap">
              <i className={`ti ${item.icon}`} />
              {badge > 0 && <span className="dash-bottom-nav-badge">{badge > 9 ? "9+" : badge}</span>}
            </span>
            <span className="dash-bottom-nav-label">{item.label}</span>
            {active && <span className="dash-bottom-nav-indicator" />}
          </button>
        );
      })}
    </nav>
  );
}
