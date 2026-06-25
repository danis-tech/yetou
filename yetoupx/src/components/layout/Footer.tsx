"use client";

import type { Tab } from "@/types";

interface FooterProps {
  onSwitchTab: (tab: Tab) => void;
  onSetPhotoCat: (cat: string) => void;
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function Footer({ onSwitchTab, onSetPhotoCat, onOpenAuth }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-logo">
            yé<em>tou</em>
          </div>
          <p className="footer-desc">
            Plateforme de vente de médias aériens HD &amp; 4K,<br />
            développée par Best Aero Drone · Libreville, Gabon.<br />
            Paysages, culture, nature et événements gabonais<br />
            capturés par drone professionnel.
          </p>
        </div>
        <div className="footer-col">
          <h4>Catalogue</h4>
          <a onClick={() => { onSwitchTab("photos"); onSetPhotoCat("paysages"); }}>Paysages</a>
          <a onClick={() => { onSwitchTab("photos"); onSetPhotoCat("nature"); }}>Nature &amp; fleuves</a>
          <a onClick={() => { onSwitchTab("photos"); onSetPhotoCat("culture"); }}>Culture</a>
          <a onClick={() => { onSwitchTab("photos"); onSetPhotoCat("events"); }}>Événements</a>
          <a onClick={() => onSwitchTab("videos")}>Vidéos 4K</a>
        </div>
        <div className="footer-col">
          <h4>Compte</h4>
          <a onClick={() => onOpenAuth("register")}>Créer un compte</a>
          <a onClick={() => onOpenAuth("login")}>Se connecter</a>
          <a onClick={() => onSwitchTab("tarifs")}>Abonnements</a>
          <a>Mes téléchargements</a>
          <a>Mes factures</a>
        </div>
        <div className="footer-col">
          <h4>Contact</h4>
          <a>contact@bestaerogroup.com</a>
          <a>Libreville, Gabon</a>
          <a>+241 XX XX XX XX</a>
          <a>Conditions d&apos;utilisation</a>
          <a>Politique de confidentialité</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Best Aero Drone · Tous droits réservés · Gabon</span>
        <span>yétou — Plateforme de médias aériens HD</span>
      </div>
    </footer>
  );
}
