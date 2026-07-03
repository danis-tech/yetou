"use client";

import type { BuyItem } from "@/types";
import { PAY_METHODS, isCardMethod, isMobileMethod, logoForPayMethod } from "@/lib/payment-methods";

interface BuyModalProps {
  item: BuyItem | null;
  activePayMethod: string;
  clientPhone: string;
  payLoading: boolean;
  onClose: () => void;
  onSelectMethod: (m: string) => void;
  onPhoneChange: (p: string) => void;
  onConfirm: () => void;
  airtelLogoSrc: string;
  moovLogoSrc: string;
}

export default function BuyModal({
  item,
  activePayMethod,
  clientPhone,
  payLoading,
  onClose,
  onSelectMethod,
  onPhoneChange,
  onConfirm,
  airtelLogoSrc,
  moovLogoSrc,
}: BuyModalProps) {
  if (!item) return null;

  return (
    <div className={`modal-bg ${item ? "open" : ""}`} id="modal-buy">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <i className="ti ti-x"></i>
        </button>
        <div className="modal-title">Finaliser l&apos;achat</div>
        <div className="modal-sub">{item.name}</div>
        {item.img && (
          <img className="modal-preview" src={item.img} alt="Aperçu média" />
        )}
        <div className="modal-row">
          <span className="modal-row-label">Média</span>
          <span className="modal-row-val">{item.name}</span>
        </div>
        <div className="modal-row">
          <span className="modal-row-label">Format</span>
          <span className="modal-row-val">{item.format}</span>
        </div>
        <div className="modal-row">
          <span className="modal-row-label">Licence</span>
          <span className="modal-row-val">Commerciale · Illimitée · Gabon</span>
        </div>
        <div className="modal-row">
          <span className="modal-row-label">Total</span>
          <span className="modal-total">{item.price} FCFA</span>
        </div>
        {isMobileMethod(activePayMethod) && (
          <div className="form-group" style={{ marginTop: "14px" }}>
            <label>Numéro de téléphone</label>
            <input
              type="tel"
              placeholder="Ex: 077 00 00 00"
              value={clientPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
        )}
        <div className="pay-methods">
          {PAY_METHODS.map((method) => (
            <div
              key={method.name}
              className={`pay-method ${activePayMethod === method.name ? "active" : ""} ${!method.available ? "disabled" : ""}`}
              onClick={() => method.available && onSelectMethod(method.name)}
              style={!method.available ? { opacity: 0.4, cursor: "not-allowed" } : {}}
            >
              <img
                src={logoForPayMethod(method.name, airtelLogoSrc, moovLogoSrc)}
                alt={method.name}
                className="pay-logo"
              />
              {method.name}
              {!method.available && (
                <span style={{ display: "block", fontSize: "9px", color: "#8A8A95", marginTop: "2px" }}>Bientôt</span>
              )}
            </div>
          ))}
        </div>
        {isCardMethod(activePayMethod) && (
          <p style={{ fontSize: "11px", color: "#8A8A95", margin: "0 0 12px", lineHeight: 1.4 }}>
            Formulaire carte sécurisé — saisissez votre numéro Visa ou Mastercard (sans compte crypto).
          </p>
        )}
        <button className="btn-pay" onClick={onConfirm} disabled={payLoading}>
          {payLoading ? (
            <>Traitement en cours...</>
          ) : (
            <>
              <i className="ti ti-lock"></i> Payer via {activePayMethod}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
