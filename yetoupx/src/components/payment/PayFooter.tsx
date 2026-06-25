"use client";

interface PayFooterProps {
  airtelLogoSrc: string;
  moovLogoSrc: string;
}

export default function PayFooter({ airtelLogoSrc, moovLogoSrc }: PayFooterProps) {
  return (
    <div className="pay-footer">
      <span className="pay-footer-label">Paiements acceptés</span>
      <div className="pay-chip">
        <img src={airtelLogoSrc} alt="Airtel Money" className="pay-logo" /> Airtel Money
      </div>
      <div className="pay-chip">
        <img src={moovLogoSrc} alt="Moov Money" className="pay-logo" /> Moov Money
      </div>
      <div className="pay-chip">
        <img src="/visa.svg" alt="Visa" className="pay-logo" /> Visa
      </div>
      <div className="pay-chip">
        <img src="/mastercard.svg" alt="Mastercard" className="pay-logo" /> Mastercard
      </div>
      <div className="pay-footer-secure">
        <i className="ti ti-lock"></i> Paiements 100% sécurisés · Téléchargement immédiat après validation
      </div>
    </div>
  );
}
