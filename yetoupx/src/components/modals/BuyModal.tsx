"use client";

import type { BuyItem } from "@/types";

const PAY_METHODS = [
  { name: "Airtel Money", logo: "", available: true },
  { name: "Moov Money", logo: "", available: true },
  { name: "Visa", logo: "/visa.svg", available: false },
  { name: "Mastercard", logo: "/mastercard.svg", available: false },
];

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

  const logoForMethod = (method: string) => {
    if (method === "Airtel Money") return airtelLogoSrc;
    if (method === "Moov Money") return moovLogoSrc;
    if (method === "Visa") return "/visa.svg";
    return "/mastercard.svg";
  };

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
        {(activePayMethod === "Airtel Money" || activePayMethod === "Moov Money") && (
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
              <img src={logoForMethod(method.name)} alt={method.name} className="pay-logo" />
              {method.name}
              {!method.available && <span style={{ display: "block", fontSize: "9px", color: "#8A8A95", marginTop: "2px" }}>Bientôt</span>}
            </div>
          ))}
        </div>
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
