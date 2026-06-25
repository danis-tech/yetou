"use client";

import PlansGrid from "./PlansGrid";
import UnitTable from "./UnitTable";

interface TarifsPanelProps {
  onSelectPlan: (plan: string) => void;
  onBrowse: () => void;
}

export default function TarifsPanel({ onSelectPlan, onBrowse }: TarifsPanelProps) {
  return (
    <div className="tarifs-wrap">
      <div className="tarifs-header">
        <h2>Tarifs &amp; abonnements</h2>
        <p>Prix adaptés au marché gabonais — paiement sécurisé via Airtel Money, Moov Money, Visa, Mastercard, SingPay</p>
      </div>
      <PlansGrid onSelectPlan={onSelectPlan} onBrowse={onBrowse} />
      <UnitTable />
    </div>
  );
}
