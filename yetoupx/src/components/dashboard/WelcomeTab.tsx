"use client";

import type { DashboardSummary, ApiNotification } from "@/services/api";
import type { PlanLimits, UserPlan } from "@/types";
import { PLANS } from "@/types";

type DashboardTab = "home" | "downloads" | "catalogue" | "plan" | "account" | "payments";

interface WelcomeTabProps {
  userName: string;
  plan: PlanLimits;
  userPlan: UserPlan;
  summary: DashboardSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectTab: (tab: DashboardTab) => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}

const NOTIF_ICONS: Record<string, string> = {
  welcome: "ti-confetti",
  purchase_success: "ti-circle-check",
  purchase_failed: "ti-circle-x",
  payment_pending: "ti-clock",
  download_limit_warning: "ti-alert-triangle",
  plan_activated: "ti-crown",
  system: "ti-bell",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default function WelcomeTab({
  userName,
  plan,
  userPlan,
  summary,
  loading,
  onRefresh,
  onSelectTab,
  onMarkRead,
  onMarkAllRead,
}: WelcomeTabProps) {
  if (loading && !summary) {
    return (
      <div className="dash-loading">
        <i className="ti ti-loader dash-loading-icon" />
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  const stats = summary?.stats ?? { purchases_count: 0, total_spent: 0, unread_notifications: 0 };
  const notifications = summary?.notifications ?? [];
  const recent = summary?.recent_purchases ?? [];
  const createdAt = summary?.user?.created_at;

  const planFeatures = [
    { ok: true, label: "Téléchargements/média", value: plan.maxDownloads === -1 ? "Illimités" : `${plan.maxDownloads} max` },
    { ok: plan.photosHd, label: "Photos HD", value: plan.photosHd ? "Incluses" : "—" },
    { ok: plan.photos4k, label: "Photos 4K", value: plan.photos4k ? "Incluses" : "—" },
    { ok: plan.videos4k, label: "Vidéos 4K", value: plan.videos4k ? "Incluses" : "—" },
    { ok: plan.invoice, label: "Facture", value: plan.invoice ? "Incluse" : "—" },
    { ok: plan.supportPriority, label: "Support", value: plan.supportPriority ? "Prioritaire" : "Standard" },
  ];

  const handleNotifClick = (notif: ApiNotification) => {
    if (!notif.read) onMarkRead(notif.id);
    const tab = notif.action_url?.match(/tab=([a-z]+)/)?.[1] as DashboardTab | undefined;
    if (tab) onSelectTab(tab);
  };

  return (
    <div className="dash-tab dash-tab--home">
      <div className="dash-home-hero">
        <div>
          <h2 className="dash-h2">Bonjour, {userName.split(" ")[0]} 👋</h2>
          <p className="dash-sub dash-sub--flush">
            Bienvenue dans votre espace Gabon Pixel
            {createdAt ? ` · membre depuis ${new Date(createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` : ""}
          </p>
        </div>
        <button type="button" className="dash-home-refresh" onClick={onRefresh} aria-label="Actualiser">
          <i className={`ti ti-refresh ${loading ? "dash-spin" : ""}`} />
        </button>
      </div>

      <div className="dash-home-stats">
        <div className="dash-home-stat">
          <i className="ti ti-shopping-bag" />
          <div>
            <span className="dash-home-stat-val">{stats.purchases_count}</span>
            <span className="dash-home-stat-lbl">Achats</span>
          </div>
        </div>
        <div className="dash-home-stat">
          <i className="ti ti-cash" />
          <div>
            <span className="dash-home-stat-val">{stats.total_spent.toLocaleString("fr-FR")}</span>
            <span className="dash-home-stat-lbl">FCFA dépensés</span>
          </div>
        </div>
        <div className="dash-home-stat dash-home-stat--accent">
          <i className="ti ti-bell" />
          <div>
            <span className="dash-home-stat-val">{stats.unread_notifications}</span>
            <span className="dash-home-stat-lbl">Notifications</span>
          </div>
        </div>
      </div>

      <div className="dash-home-grid">
        <section className="dash-home-card dash-home-plan">
          <div className="dash-home-card-hd">
            <h3><i className="ti ti-crown" /> Votre plan</h3>
            {userPlan !== "none" && <span className="dash-home-badge">Actif</span>}
          </div>
          <div className="dash-home-plan-name">{plan.name}</div>
          <div className="dash-home-plan-price">{plan.price}</div>
          <p className="dash-home-plan-desc">{plan.description}</p>
          <ul className="dash-home-features">
            {planFeatures.map((f) => (
              <li key={f.label} className={f.ok ? "" : "muted"}>
                <i className={`ti ${f.ok ? "ti-check" : "ti-x"}`} />
                <span>{f.label}</span>
                <em>{f.value}</em>
              </li>
            ))}
          </ul>
          {userPlan === "none" && (
            <button type="button" className="btn-primary btn-sm dash-home-cta" onClick={() => onSelectTab("plan")}>
              Découvrir les abonnements
            </button>
          )}
        </section>

        <section className="dash-home-card dash-home-notifs">
          <div className="dash-home-card-hd">
            <h3><i className="ti ti-bell" /> Notifications</h3>
            {stats.unread_notifications > 0 && (
              <button type="button" className="dash-home-link" onClick={onMarkAllRead}>
                Tout marquer lu
              </button>
            )}
          </div>
          {notifications.length > 0 ? (
            <ul className="dash-notif-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`dash-notif-item${n.read ? "" : " unread"}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <span className="dash-notif-icon">
                      <i className={`ti ${NOTIF_ICONS[n.notification_type] || "ti-bell"}`} />
                    </span>
                    <span className="dash-notif-body">
                      <strong>{n.title}</strong>
                      <span>{n.body}</span>
                      <time>{timeAgo(n.created_at)}</time>
                    </span>
                    {!n.read && <span className="dash-notif-dot" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-home-empty">Aucune notification pour le moment.</p>
          )}
        </section>
      </div>

      <section className="dash-home-card dash-home-recent">
        <div className="dash-home-card-hd">
          <h3><i className="ti ti-history" /> Achats récents</h3>
          <button type="button" className="dash-home-link" onClick={() => onSelectTab("payments")}>
            Voir tout
          </button>
        </div>
        {recent.length > 0 ? (
          <ul className="dash-home-purchase-list">
            {recent.map((p) => (
              <li key={p.id} className="dash-home-purchase-item">
                <div
                  className="dash-home-purchase-thumb"
                  style={(p.media.preview_url || p.media.thumbnail_url || p.media.file_url) ? {
                    backgroundImage: `url(${p.media.preview_url || p.media.thumbnail_url || p.media.file_url})`,
                  } : undefined}
                />
                <div className="dash-home-purchase-info">
                  <strong>{p.media.title}</strong>
                  <span>{formatDate(p.purchased_at)} · {p.payment_method || "—"}</span>
                </div>
                <span className="dash-home-purchase-price">{p.price.toLocaleString("fr-FR")} FCFA</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dash-home-empty-block">
            <p>Vous n&apos;avez pas encore acheté de média.</p>
            <button type="button" className="btn-primary btn-sm" onClick={() => onSelectTab("catalogue")}>
              Parcourir le catalogue
            </button>
          </div>
        )}
      </section>

      <div className="dash-home-quick">
        <button type="button" onClick={() => onSelectTab("catalogue")}>
          <i className="ti ti-photo" /> Catalogue
        </button>
        <button type="button" onClick={() => onSelectTab("downloads")}>
          <i className="ti ti-download" /> Téléchargements
        </button>
        <button type="button" onClick={() => onSelectTab("payments")}>
          <i className="ti ti-credit-card" /> Paiements
        </button>
        <button type="button" onClick={() => onSelectTab("account")}>
          <i className="ti ti-user" /> Mon compte
        </button>
      </div>
    </div>
  );
}
