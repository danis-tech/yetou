"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import AuthModal from "@/components/modals/AuthModal";
import googleLogo from "@/logo/google.jpg";
import type { AuthTab } from "@/types";
import { fetchContributorMe, fetchProgramConfig, joinProgram, type ProgramConfig } from "@/services/contributors";

const fcfa = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} FCFA`);
const duration = (s: number) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;

export default function ContribuerPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, user } = useAuth();
  const { toast, toastVisible, toastError, showToast } = useToast();
  const [config, setConfig] = useState<ProgramConfig | null>(null);
  const [isContributor, setIsContributor] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("register");
  const [form, setForm] = useState({ display_name: "", bio: "", payout_operator: "Airtel Money", payout_phone: "", accept_terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProgramConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchContributorMe().then((r) => {
      if (r.ok) setIsContributor(r.data.is_contributor);
    });
  }, [isLoggedIn]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await joinProgram(form);
    setSaving(false);
    if (!r.ok) {
      setErrors(r.errors || {});
      showToast(r.error, true);
      return;
    }
    showToast("Profil contributeur créé. Vous pouvez envoyer vos premiers médias.");
    router.push("/contributeur?tab=proposer");
  };

  const openAuth = (tab: AuthTab) => { setAuthTab(tab); setAuthOpen(true); };
  const photoMax = config?.max_buyout.photo;
  const videoMax = config?.max_buyout.video;

  return (
    <div className="ctb-page">
      <header className="ctb-topbar">
        <Link href="/" className="logo">Pixia</Link>
        <nav>
          <Link href="/">Catalogue</Link>
          {isLoggedIn && isContributor && <Link href="/contributeur" className="btn-primary">Mon espace contributeur</Link>}
        </nav>
      </header>

      <section className="ctb-hero hex-bg">
        <div className="ctb-hero-inner">
          <h1>Vendez vos images du Gabon sur Pixia.</h1>
          <p>
            Photographes, vidéastes, pilotes de drone : proposez vos prises de vue. Notre équipe vérifie
            chaque média avant publication, puis vous êtes payé sur votre Mobile Money.
          </p>
          <p className="ctb-note">
            Les médias publiés portent votre nom : ils sont présentés comme ceux d&apos;un contributeur, pas de Pixia.
          </p>
        </div>
      </section>

      <main className="ctb-main">
        <section>
          <h2>Comment ça marche</h2>
          <ol className="ctb-steps">
            <li><strong>Créez votre profil contributeur</strong><span>Le nom affiché sur vos médias et le numéro Mobile Money qui recevra vos gains.</span></li>
            <li><strong>Envoyez vos photos et vidéos</strong><span>Pour chaque média, choisissez comment être payé.</span></li>
            <li><strong>Notre équipe juge la qualité</strong><span>Netteté, exposition, cadrage, résolution réelle. Un média refusé vous est signalé avec le motif.</span></li>
            <li><strong>Demandez votre retrait</strong><span>Depuis votre espace, dès que votre solde atteint {fcfa(config?.min_payout)}. L&apos;équipe valide et envoie l&apos;argent.</span></li>
          </ol>
        </section>

        <section>
          <h2>Deux façons d&apos;être payé</h2>
          <p className="ctb-lead">Vous choisissez pour chaque média, au moment de l&apos;envoi.</p>
          <div className="ctb-modes">
            <article className="ctb-mode">
              <h3>Partage des ventes</h3>
              <p className="ctb-mode-figure"><strong>{config?.contributor_percent ?? 70} %</strong> pour vous à chaque vente</p>
              <ul>
                <li>Vous fixez le prix, entre {fcfa(config?.min_price)} et {fcfa(config?.max_price)}.</li>
                <li>Pixia garde {config?.commission_percent ?? 30} % pour l&apos;hébergement, le paiement et la promotion.</li>
                <li>Vous gagnez à chaque achat, aussi longtemps que le média est en ligne.</li>
              </ul>
            </article>
            <article className="ctb-mode">
              <h3>Rachat direct</h3>
              <p className="ctb-mode-figure">Payé <strong>dès la validation</strong></p>
              <ul>
                <li>Jusqu&apos;à {fcfa(photoMax)} par photo et {fcfa(videoMax)} par vidéo, pour la qualité maximale.</li>
                <li>Le montant dépend de la qualité retenue par notre équipe lors de l&apos;examen.</li>
                <li>Le média devient celui de Pixia : vous ne touchez plus rien sur ses ventes.</li>
              </ul>
            </article>
          </div>
        </section>

        <section>
          <h2>Ce que nous acceptons</h2>
          <dl className="ctb-rules">
            <div><dt>Photos</dt><dd>{config?.photo_extensions.join(", ").toUpperCase() || "JPG, PNG, WEBP"}, {config?.max_photo_size_mb ?? 25} Mo maximum</dd></div>
            <div><dt>Vidéos</dt><dd>{config?.video_extensions.join(", ").toUpperCase() || "MP4, MOV, WEBM"}, {config?.max_video_size_mb ?? 500} Mo et {duration(config?.max_video_seconds ?? 90)} maximum</dd></div>
            <div><dt>Qualité</dt><dd>Jugée par l&apos;équipe Pixia. La qualité que vous indiquez peut être revue à l&apos;examen.</dd></div>
            <div><dt>Droits</dt><dd>Vous devez être l&apos;auteur des images et avoir le droit de les vendre.</dd></div>
          </dl>
        </section>

        <section className="ctb-join" id="rejoindre">
          <h2>Devenir contributeur</h2>
          {!isLoading && !isLoggedIn && (
            <div className="ctb-join-auth">
              <p>Un compte Pixia est nécessaire pour proposer des médias et recevoir vos gains.</p>
              <div>
                <button className="btn-primary" onClick={() => openAuth("register")}>Créer un compte</button>
                <button className="btn-ghost" onClick={() => openAuth("login")}>J&apos;ai déjà un compte</button>
              </div>
            </div>
          )}
          {isLoggedIn && isContributor && (
            <div className="ctb-join-auth">
              <p>Vous êtes déjà contributeur.</p>
              <Link href="/contributeur" className="btn-primary">Aller à mon espace contributeur</Link>
            </div>
          )}
          {isLoggedIn && !isContributor && (
            <form className="ctb-form" onSubmit={join} noValidate>
              <label>
                Nom affiché sur vos médias
                <input value={form.display_name} placeholder={user?.name || "Studio Nyanga"}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} aria-invalid={!!errors.display_name} />
                {errors.display_name && <small className="ctb-error">{errors.display_name}</small>}
              </label>
              <label>
                Présentation <em>(facultatif)</em>
                <textarea rows={3} maxLength={600} value={form.bio} placeholder="Pilote de drone basé à Port-Gentil, spécialisé en littoral."
                  onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
                  Numéro qui recevra vos gains
                  <input type="tel" inputMode="tel" value={form.payout_phone} placeholder="077 00 00 00"
                    onChange={(e) => setForm({ ...form, payout_phone: e.target.value })} aria-invalid={!!errors.payout_phone} />
                  {errors.payout_phone && <small className="ctb-error">{errors.payout_phone}</small>}
                </label>
              </div>
              <label className="ctb-check">
                <input type="checkbox" checked={form.accept_terms} onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} />
                <span>
                  J&apos;accepte la{" "}
                  <a href="/charte-contributeurs" target="_blank" rel="noopener" className="ctb-inline-link">charte des contributeurs</a> :
                  je suis l&apos;auteur des médias envoyés, j&apos;ai le droit de les vendre, et j&apos;accepte que chaque média
                  soit examiné avant publication.
                </span>
              </label>
              {errors.accept_terms && <small className="ctb-error">{errors.accept_terms}</small>}
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Création…" : "Créer mon profil contributeur"}
              </button>
            </form>
          )}
        </section>
      </main>

      <Toast message={toast} visible={toastVisible} isError={toastError} />
      <AuthModal open={authOpen} authTab={authTab} onClose={() => setAuthOpen(false)} onSwitchTab={setAuthTab}
        googleLogoSrc={googleLogo.src} showToast={showToast} />
    </div>
  );
}
