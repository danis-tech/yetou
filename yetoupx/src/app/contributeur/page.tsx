"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import SubmitForm from "@/components/contributors/SubmitForm";
import { fetchNotifications, markAllNotificationsRead, type ApiNotification } from "@/services/api";
import {
  CONTRIBUTOR_NOTIFICATION_TYPES, fetchContributorMe, fetchMyContributions, fetchMyEarnings, fetchMyPayouts,
  fetchPayoutProof, fetchProgramConfig, requestPayout, updateContributorProfile, withdrawContribution,
  type ContributionMedia, type ContributorMe, type Earning, type Payout, type ProgramConfig,
} from "@/services/contributors";

type Tab = "activite" | "medias" | "proposer" | "gains" | "retraits" | "profil";
const TABS: { key: Tab; label: string }[] = [
  { key: "activite", label: "Activité" },
  { key: "medias", label: "Mes médias" },
  { key: "proposer", label: "Proposer un média" },
  { key: "gains", label: "Gains" },
  { key: "retraits", label: "Retraits" },
  { key: "profil", label: "Profil et paiement" },
];

const fetchAll = () => Promise.all([
  fetchContributorMe(), fetchMyContributions(), fetchMyEarnings(), fetchMyPayouts(), fetchNotifications(),
]);

const fcfa = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} FCFA`);
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

function ContributorSpace() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoggedIn, isLoading } = useAuth();
  const { toast, toastVisible, toastError, showToast } = useToast();
  const initialTab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "activite") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [me, setMe] = useState<ContributorMe | null>(null);
  const [config, setConfig] = useState<ProgramConfig | null>(null);
  const [medias, setMedias] = useState<ContributionMedia[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [activity, setActivity] = useState<ApiNotification[]>([]);

  const apply = useCallback(([m, list, e, p, n]: Awaited<ReturnType<typeof fetchAll>>) => {
    if (m.ok) setMe(m.data);
    if (list.ok) setMedias(list.data);
    if (e.ok) setEarnings(e.data);
    if (p.ok) setPayouts(p.data);
    if (n) setActivity(n.results.filter((x) => CONTRIBUTOR_NOTIFICATION_TYPES.has(x.notification_type)));
  }, []);
  const reload = useCallback(() => fetchAll().then(apply), [apply]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/contribuer"); return; }
    fetchProgramConfig().then(setConfig);
    fetchAll().then(apply);
  }, [isLoading, isLoggedIn, apply, router]);

  useEffect(() => {
    if (me && !me.is_contributor) router.replace("/contribuer#rejoindre");
  }, [me, router]);

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(`/contributeur?tab=${t}`, { scroll: false });
  };

  if (!me?.is_contributor || !me.profile || !me.balance) {
    return <div className="ctb-page"><p className="ctb-loading">Chargement de votre espace…</p></div>;
  }
  const { profile, balance } = me;
  const pending = me.media_counts?.pending ?? 0;
  const unread = activity.filter((a) => !a.read).length;

  return (
    <div className="ctb-page">
      <header className="ctb-topbar">
        <Link href="/" className="logo">Pixia</Link>
        <nav>
          <Link href="/">Catalogue</Link>
          <Link href="/dashboard">Espace client</Link>
        </nav>
      </header>

      <main className="ctb-main ctb-space">
        <div className="ctb-space-head">
          <div>
            <h1>{profile.display_name}</h1>
            <p>Espace contributeur{profile.status === "suspended" && <strong className="ctb-error"> · compte suspendu</strong>}</p>
          </div>
          <dl className="ctb-balance">
            <div><dt>Disponible</dt><dd className="is-main">{fcfa(balance.available)}</dd></div>
            <div><dt>Retrait en cours</dt><dd>{fcfa(balance.pending_payout)}</dd></div>
            <div><dt>Déjà versé</dt><dd>{fcfa(balance.paid_out)}</dd></div>
            <div><dt>En attente d&apos;examen</dt><dd>{pending} média{pending > 1 ? "s" : ""}</dd></div>
          </dl>
        </div>

        <div className="ctb-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-active" : ""} onClick={() => switchTab(t.key)}>
              {t.label}
              {t.key === "activite" && unread > 0 && <span className="ctb-tab-count">{unread}</span>}
            </button>
          ))}
        </div>

        {tab === "activite" && (
          <ActivityList items={activity} onMarkAllRead={async () => { await markAllNotificationsRead(); reload(); }}
            onOpen={(url) => { const t = new URL(url, window.location.origin).searchParams.get("tab"); if (t) switchTab(t as Tab); }} />
        )}
        {tab === "medias" && (
          <MediaList medias={medias} onPropose={() => switchTab("proposer")} onWithdrawn={reload} showToast={showToast} />
        )}
        {tab === "proposer" && (config
          ? <SubmitForm config={config} showToast={showToast} onSubmitted={() => { reload(); switchTab("medias"); }} />
          : <p className="ctb-loading">Chargement des règles…</p>)}
        {tab === "gains" && <EarningList earnings={earnings} />}
        {tab === "retraits" && (
          <PayoutPanel payouts={payouts} available={balance.available} minPayout={config?.min_payout ?? 0}
            hasPhone={!!profile.payout_phone} phone={`${profile.payout_operator} ${profile.payout_phone}`}
            onRequested={reload} showToast={showToast} onGoProfile={() => switchTab("profil")} />
        )}
        {tab === "profil" && <ProfileForm profile={profile} onSaved={reload} showToast={showToast} />}
      </main>
      <Toast message={toast} visible={toastVisible} isError={toastError} />
    </div>
  );
}

function MediaList({ medias, onPropose, onWithdrawn, showToast }: {
  medias: ContributionMedia[]; onPropose: () => void; onWithdrawn: () => void; showToast: (m: string, e?: boolean) => void;
}) {
  if (!medias.length) {
    return (
      <div className="ctb-empty">
        <p>Vous n&apos;avez encore envoyé aucun média.</p>
        <button className="btn-primary" onClick={onPropose}>Proposer mon premier média</button>
      </div>
    );
  }
  const withdraw = async (m: ContributionMedia) => {
    if (!window.confirm(`Retirer « ${m.title} » ?`)) return;
    const r = await withdrawContribution(m.id);
    if (r.ok) { showToast("Média retiré."); onWithdrawn(); } else showToast(r.error, true);
  };
  return (
    <ul className="ctb-media-list">
      {medias.map((m) => (
        <li key={m.id}>
          <div className="ctb-media-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.preview_url ? <img src={m.preview_url} alt="" /> : <i className={`ti ${m.type === "video" ? "ti-video" : "ti-photo"}`} aria-hidden="true"></i>}
          </div>
          <div className="ctb-media-body">
            <strong>{m.title}</strong>
            <span>
              {m.type === "video" ? "Vidéo" : "Photo"} {m.quality}, envoyé le {date(m.submitted_at)}
            </span>
            <span>
              {m.payout_mode === "buyout"
                ? (m.buyout_amount ? `Rachat direct : ${fcfa(m.buyout_amount)}` : "Rachat direct, montant fixé à l'examen")
                : `Partage des ventes, prix ${fcfa(m.contributor_price)} : ${m.sales} vente${m.sales > 1 ? "s" : ""}, ${fcfa(m.earned)} gagnés`}
            </span>
            {m.status === "rejected" && <span className="ctb-error">Motif du refus : {m.rejection_reason}</span>}
          </div>
          <div className="ctb-media-side">
            <span className={`ctb-status ctb-status--${m.status}`}>{m.status_display}</span>
            {(m.status === "pending" || m.status === "rejected") && (
              <button className="ctb-link" onClick={() => withdraw(m)}>Retirer</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  contribution_submitted: "ti-upload", contribution_approved: "ti-circle-check", contribution_rejected: "ti-circle-x",
  contributor_earning: "ti-coin", payout_requested: "ti-clock", payout_paid: "ti-cash", payout_proof: "ti-receipt",
  payout_rejected: "ti-alert-triangle",
};

function ActivityList({ items, onMarkAllRead, onOpen }: {
  items: ApiNotification[]; onMarkAllRead: () => void; onOpen: (url: string) => void;
}) {
  if (!items.length) {
    return <div className="ctb-empty"><p>Rien de nouveau. Vous verrez ici chaque étape : envoi, validation, ventes et retraits.</p></div>;
  }
  return (
    <div className="ctb-activity">
      {items.some((i) => !i.read) && <button className="ctb-link ctb-link--ink" onClick={onMarkAllRead}>Tout marquer comme lu</button>}
      <ul>
        {items.map((n) => (
          <li key={n.id} className={n.read ? "" : "is-unread"}>
            <i className={`ti ${ACTIVITY_ICONS[n.notification_type] || "ti-bell"}`} aria-hidden="true"></i>
            <div>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</small>
            </div>
            {n.action_url && <button className="ctb-link ctb-link--ink" onClick={() => onOpen(n.action_url)}>Voir</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EarningList({ earnings }: { earnings: Earning[] }) {
  if (!earnings.length) return <div className="ctb-empty"><p>Aucun gain pour l&apos;instant. Ils apparaîtront ici à chaque vente ou rachat.</p></div>;
  return (
    <table className="ctb-table">
      <thead><tr><th>Date</th><th>Média</th><th>Type</th><th className="num">Base</th><th className="num">Pour vous</th></tr></thead>
      <tbody>
        {earnings.map((e) => (
          <tr key={e.id}>
            <td>{date(e.created_at)}</td>
            <td>{e.media_title || "—"}</td>
            <td>{e.kind_display}{e.kind === "sale_share" && ` (Pixia ${e.commission_percent} %)`}</td>
            <td className="num">{fcfa(e.gross_amount)}</td>
            <td className="num"><strong>{fcfa(e.amount)}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayoutPanel({ payouts, available, minPayout, hasPhone, phone, onRequested, showToast, onGoProfile }: {
  payouts: Payout[]; available: number; minPayout: number; hasPhone: boolean; phone: string;
  onRequested: () => void; showToast: (m: string, e?: boolean) => void; onGoProfile: () => void;
}) {
  const [amount, setAmount] = useState(String(available));
  const openProof = async (id: number) => {
    // Fenêtre ouverte tout de suite (sinon bloquée comme pop-up), puis dirigée
    // vers le lien signé une fois obtenu.
    const win = window.open("", "_blank");
    const r = await fetchPayoutProof(id);
    if (r.ok && win) { win.location.href = r.data.url; return; }
    win?.close();
    showToast(r.ok ? "Autorisez l'ouverture de fenêtres pour voir la preuve." : r.error, true);
  };
  const [sending, setSending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const r = await requestPayout(parseInt(amount, 10) || 0);
    setSending(false);
    if (!r.ok) { showToast(r.error, true); return; }
    showToast("Demande envoyée. Vous serez notifié dès le versement.");
    onRequested();
  };
  return (
    <div className="ctb-payouts">
      {hasPhone ? (
        <form className="ctb-form ctb-payout-form" onSubmit={submit}>
          <label>
            Montant à retirer (FCFA)
            <input type="number" inputMode="numeric" min={minPayout} max={available} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <small className="ctb-hint">Versé sur {phone}. Minimum {fcfa(minPayout)}, disponible {fcfa(available)}.</small>
          </label>
          <button className="btn-primary" type="submit" disabled={sending || available < minPayout}>
            {sending ? "Envoi…" : "Demander le retrait"}
          </button>
        </form>
      ) : (
        <div className="ctb-empty">
          <p>Renseignez votre numéro Mobile Money pour pouvoir retirer vos gains.</p>
          <button className="btn-primary" onClick={onGoProfile}>Ajouter mon numéro</button>
        </div>
      )}
      {payouts.length > 0 && (
        <table className="ctb-table">
          <thead><tr><th>Demandé le</th><th className="num">Montant</th><th>Vers</th><th>Statut</th><th>Détail</th><th>Preuve</th></tr></thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{date(p.created_at)}</td>
                <td className="num">{fcfa(p.amount)}</td>
                <td>{p.operator} {p.phone}</td>
                <td><span className={`ctb-status ctb-status--${p.status}`}>{p.status_display}</span></td>
                <td>
                  {p.status === "paid" ? `Versé le ${date(p.processed_at)}, réf. ${p.transaction_reference}` : p.admin_note || "—"}
                </td>
                <td>
                  {p.has_proof
                    ? <button className="ctb-link ctb-link--ink" onClick={() => openProof(p.id)}>Voir la preuve</button>
                    : p.status === "paid" ? <span className="ctb-muted">Bientôt disponible</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProfileForm({ profile, onSaved, showToast }: {
  profile: NonNullable<ContributorMe["profile"]>; onSaved: () => void; showToast: (m: string, e?: boolean) => void;
}) {
  const [form, setForm] = useState({
    display_name: profile.display_name, bio: profile.bio,
    payout_operator: profile.payout_operator || "Airtel Money", payout_phone: profile.payout_phone,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await updateContributorProfile(form);
    if (!r.ok) { setErrors(r.errors || {}); showToast(r.error, true); return; }
    setErrors({});
    showToast("Profil enregistré.");
    onSaved();
  };
  return (
    <form className="ctb-form" onSubmit={save} noValidate>
      <label>
        Nom affiché sur vos médias
        <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} aria-invalid={!!errors.display_name} />
        {errors.display_name && <small className="ctb-error">{errors.display_name}</small>}
      </label>
      <label>
        Présentation
        <textarea rows={3} maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </label>
      <div className="ctb-form-row">
        <label>
          Opérateur Mobile Money
          <select value={form.payout_operator} onChange={(e) => setForm({ ...form, payout_operator: e.target.value })}>
            <option>Airtel Money</option>
            <option>Moov Money</option>
          </select>
        </label>
        <label>
          Numéro qui reçoit vos gains
          <input type="tel" value={form.payout_phone} onChange={(e) => setForm({ ...form, payout_phone: e.target.value })} aria-invalid={!!errors.payout_phone} />
          {errors.payout_phone && <small className="ctb-error">{errors.payout_phone}</small>}
        </label>
      </div>
      <button className="btn-primary" type="submit">Enregistrer</button>
    </form>
  );
}

export default function ContributeurPage() {
  return (
    <Suspense fallback={null}>
      <ContributorSpace />
    </Suspense>
  );
}
