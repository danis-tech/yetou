"use client";

import Image from "next/image";

interface PlansGridProps {
  onSelectPlan: (plan: string) => void;
  onBrowse: () => void;
}

export default function PlansGrid({ onSelectPlan, onBrowse }: PlansGridProps) {
  return (
    <div className="plans-grid">
      <div className="plan">
        <div className="plan-icon"><i className="ti ti-photo"></i></div>
        <div className="plan-name">Achat à l&apos;unité</div>
        <div className="plan-price">dès 1 500 <sub>FCFA</sub></div>
        <div className="plan-usd">Sans abonnement · Sans engagement</div>
        <div className="plan-divider"></div>
        <ul className="plan-feats">
          <li><i className="ti ti-check"></i>Photo HD 1080p — 1 500 FCFA</li>
          <li><i className="ti ti-check"></i>Photo 4K — 3 000 FCFA</li>
          <li><i className="ti ti-check"></i>Vidéo 30 sec — 5 000 FCFA</li>
          <li><i className="ti ti-check"></i>Vidéo 1 min — 10 000 FCFA</li>
          <li><i className="ti ti-check"></i>Licence commerciale incluse</li>
          <li><i className="ti ti-check"></i>Téléchargement immédiat</li>
          <li className="off"><i className="ti ti-x"></i>Accès illimité</li>
        </ul>
        <button className="plan-cta outline" onClick={onBrowse}>Parcourir le catalogue</button>
      </div>

      <div className="plan featured">
        <div className="plan-badge">⭐ Le plus populaire</div>
        <div className="plan-icon"><i className="ti ti-crown"></i></div>
        <div className="plan-name">Abonnement mensuel</div>
        <div className="plan-price">15 000 <sub>FCFA/mois</sub></div>
        <div className="plan-usd">~$25.00 par mois · Créatifs actifs</div>
        <div className="plan-divider"></div>
        <ul className="plan-feats">
          <li><i className="ti ti-check"></i>Téléchargements illimités</li>
          <li><i className="ti ti-check"></i>Photos HD &amp; 4K</li>
          <li><i className="ti ti-check"></i>Licence commerciale</li>
          <li><i className="ti ti-check"></i>Accès aux nouveautés en priorité</li>
          <li><i className="ti ti-check"></i>Historique &amp; factures</li>
          <li className="off"><i className="ti ti-x"></i>Vidéos 4K incluses</li>
          <li className="off"><i className="ti ti-x"></i>Facture entreprise</li>
        </ul>
        <button className="plan-cta solid" onClick={() => onSelectPlan("monthly")}>Commencer maintenant</button>
      </div>

      <div className="plan">
        <div className="plan-icon"><i className="ti ti-building"></i></div>
        <div className="plan-name">Abonnement professionnel</div>
        <div className="plan-price">50 000 <sub>FCFA/mois</sub></div>
        <div className="plan-usd">~$85.00 par mois · PME &amp; Agences</div>
        <div className="plan-divider"></div>
        <ul className="plan-feats">
          <li><i className="ti ti-check"></i>Photos HD &amp; 4K illimitées</li>
          <li><i className="ti ti-check"></i>Vidéos 4K incluses</li>
          <li><i className="ti ti-check"></i>Licence commerciale étendue</li>
          <li><i className="ti ti-check"></i>Facture entreprise / ONG</li>
          <li><i className="ti ti-check"></i>Support prioritaire</li>
          <li><i className="ti ti-check"></i>Téléchargements RAW inclus</li>
          <li><i className="ti ti-check"></i>Accès API (en développement)</li>
        </ul>
        <button className="plan-cta outline" onClick={() => onSelectPlan("pro")}>Contacter l&apos;équipe</button>
      </div>
    </div>
  );
}
