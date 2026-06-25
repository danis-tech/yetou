"use client";

import { useState, useCallback } from "react";
import type { BuyItem, UserPlan } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface PaymentOptions {
  mediaId?: number | null;
  buyItem: BuyItem;
  method: string;
  phone: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export interface ExternalizeOptions {
  mediaId?: number | null;
  buyItem: BuyItem;
  method: string;
  onError?: (msg: string) => void;
}

/**
 * Hook centralisé pour le flux de paiement :
 * - pay() : USSD push via /api/paiement (SingPay 74/62)
 * - externalize() : lien de paiement via /api/paiement/ext (SingPay /ext)
 */
export function usePayment() {
  const { addPurchase, setPlan } = useAuth();
  const [loading, setLoading] = useState(false);

  // ── USSD Push ──────────────────────────────────────────────────────
  const pay = useCallback(async (opts: PaymentOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, phone, onSuccess, onError } = opts;

    const isMobile = method === "Airtel Money" || method === "Moov Money";
    if (isMobile && !phone) {
      onError?.("Veuillez entrer votre numéro de téléphone.");
      return false;
    }

    setLoading(true);
    try {
      const reference = `YETOU-${buyItem.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 20)}-${Date.now()}`;
      const singpayRes = await fetch("/api/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(String(buyItem.price).replace(/\D/g, "")),
          reference,
          client_msisdn: phone || "000000000",
          portefeuille: "",
          method,
        }),
      });

      const singpayData = await singpayRes.json();
      if (!singpayData.success) {
        onError?.(singpayData.message || "Erreur lors du paiement.");
        return false;
      }

      await createPurchaseAndSyncPlan(mediaId, buyItem, method, reference);
      addPurchase(buyItem);
      onSuccess?.();
      return true;
    } catch {
      onError?.("Erreur réseau. Veuillez réessayer.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [addPurchase, setPlan]);

  // ── Lien de paiement externalisé (SingPay /ext) ────────────────────
  const externalize = useCallback(async (opts: ExternalizeOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, onError } = opts;

    const reference = `YETOU-${buyItem.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 20)}-${Date.now()}`;

    setLoading(true);
    try {
      const res = await fetch("/api/paiement/ext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(String(buyItem.price).replace(/\D/g, "")),
          reference,
          method,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.link) {
        onError?.(data.message || "Erreur lors de la création du lien de paiement.");
        return false;
      }

      // Déterminer le plan si abonnement
      let plan: UserPlan | null = null;
      if (buyItem.name.includes("Abonnement Mensuel")) plan = "monthly";
      if (buyItem.name.includes("Abonnement Pro")) plan = "pro";

      // Stocker l'achat en attente pour le callback de retour
      localStorage.setItem("yetou_pending_purchase", JSON.stringify({
        reference,
        buyItem,
        mediaId: mediaId || null,
        plan,
        paymentMethod: method,
        timestamp: Date.now(),
      }));

      // Ouvrir le lien SingPay dans un nouvel onglet
      window.open(data.link, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      onError?.("Erreur réseau. Veuillez réessayer.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { pay, externalize, loading };
}

/** Crée l'achat Django + sync le plan si abonnement, après un paiement réussi. */
async function createPurchaseAndSyncPlan(
  mediaId: number | null | undefined,
  buyItem: BuyItem,
  paymentMethod?: string,
  paymentReference?: string,
  paymentStatus?: string,
) {
  const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;

  if (mediaId && token) {
    await fetch(`${API_URL}/purchases/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        media_id: mediaId,
        payment_method: paymentMethod || "",
        payment_reference: paymentReference || "",
        payment_status: paymentStatus || "success",
      }),
    }).catch(() => {});
  }

  const isMonthly = buyItem.name.includes("Abonnement Mensuel");
  const isPro = buyItem.name.includes("Abonnement Pro");
  if ((isMonthly || isPro) && token) {
    const newPlan: UserPlan = isPro ? "pro" : "monthly";
    await fetch(`${API_URL}/users/profile/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: newPlan }),
    }).catch(() => {});
  }
}
