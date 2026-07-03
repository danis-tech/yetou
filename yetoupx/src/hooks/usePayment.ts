"use client";

import { useState, useCallback } from "react";
import type { BuyItem, UserPlan } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { createPurchase, initiateFedapayPayment } from "@/services/api";
import { getApiUrl } from "@/lib/api-url";
import { CARD_METHODS, MOBILE_METHODS } from "@/lib/payment-methods";

function buildPaymentReference(): string {
  return `YETOU-${Date.now()}`;
}

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

export interface CheckoutOptions {
  mediaId?: number | null;
  buyItem: BuyItem;
  method: string;
  phone?: string;
  onLinkOpened?: () => void;
  onError?: (msg: string) => void;
}

/**
 * Paiement mobile (SingPay) ou carte (FedaPay).
 */
export function usePayment() {
  const { setPlan } = useAuth();
  const [loading, setLoading] = useState(false);

  const externalize = useCallback(async (opts: ExternalizeOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, onError } = opts;
    const reference = buildPaymentReference();

    setLoading(true);
    try {
      const res = await fetch("/api/paiement/ext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseAmount(buyItem.price),
          reference,
          method,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.link) {
        onError?.(data.message || data.error || "Erreur lors de la création du lien de paiement.");
        return false;
      }

      const finalRef = data.reference || reference;

      let plan: UserPlan | null = null;
      if (buyItem.name.includes("Abonnement Mensuel")) plan = "monthly";
      if (buyItem.name.includes("Abonnement Pro")) plan = "pro";

      localStorage.setItem(
        "yetou_pending_purchase",
        JSON.stringify({
          reference: finalRef,
          buyItem,
          mediaId: mediaId ?? null,
          plan,
          paymentMethod: method,
          timestamp: Date.now(),
        }),
      );

      window.open(data.link, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      onError?.("Erreur réseau. Vérifiez votre connexion et réessayez.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const payWithCard = useCallback(async (opts: CheckoutOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, onLinkOpened, onError } = opts;

    const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;
    if (!token) {
      onError?.("Connectez-vous pour payer par carte.");
      return false;
    }

    let plan: UserPlan | null = null;
    if (buyItem.name.includes("Abonnement Mensuel")) plan = "monthly";
    if (buyItem.name.includes("Abonnement Pro")) plan = "pro";

    setLoading(true);
    try {
      const result = await initiateFedapayPayment({
        media_id: mediaId ?? null,
        amount_fcfa: parseAmount(buyItem.price),
        method,
        plan: plan || undefined,
      });

      if (!result.ok) {
        onError?.(result.error);
        return false;
      }

      localStorage.setItem(
        "yetou_pending_purchase",
        JSON.stringify({
          reference: result.data.reference,
          transactionId: result.data.transaction_id,
          buyItem,
          mediaId: mediaId ?? null,
          plan,
          paymentMethod: method,
          provider: "fedapay",
          timestamp: Date.now(),
        }),
      );

      window.location.href = result.data.payment_url;
      onLinkOpened?.();
      return true;
    } catch {
      onError?.("Erreur réseau. Vérifiez votre connexion et réessayez.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Route vers FedaPay (carte) ou SingPay (mobile). */
  const checkout = useCallback(
    async (opts: CheckoutOptions): Promise<boolean> => {
      const { method, onLinkOpened, onError } = opts;

      if (CARD_METHODS.has(method)) {
        return payWithCard(opts);
      }

      if (!MOBILE_METHODS.has(method)) {
        onError?.("Méthode de paiement non supportée.");
        return false;
      }

      const ok = await externalize(opts);
      if (ok) onLinkOpened?.();
      return ok;
    },
    [externalize, payWithCard],
  );

  /** USSD direct (secours) — non utilisé par défaut. */
  const pay = useCallback(async (opts: PaymentOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, phone, onSuccess, onError } = opts;

    const isMobile = method === "Airtel Money" || method === "Moov Money";
    if (isMobile && !phone?.trim()) {
      onError?.("Veuillez entrer votre numéro de téléphone.");
      return false;
    }

    setLoading(true);
    try {
      const reference = buildPaymentReference();
      const res = await fetch("/api/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseAmount(buyItem.price),
          reference,
          client_msisdn: phone.trim(),
          portefeuille: "",
          method,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        onError?.(data.message || data.error || "Erreur lors du paiement SingPay.");
        return false;
      }

      const paymentStatus = data.confirmed ? "success" : "pending";
      const created = await createPurchaseAndSyncPlan(
        mediaId,
        buyItem,
        method,
        data.reference || reference,
        paymentStatus,
        setPlan,
      );

      if (!created.ok && mediaId) {
        onError?.("Paiement initié mais l'achat n'a pas pu être enregistré. Contactez le support.");
        return false;
      }

      onSuccess?.();
      return true;
    } catch {
      onError?.("Erreur réseau. Vérifiez votre connexion et réessayez.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [setPlan]);

  return { checkout, externalize, payWithCard, pay, loading };
}

function parseAmount(price: string): number {
  const n = parseInt(String(price).replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function createPurchaseAndSyncPlan(
  mediaId: number | null | undefined,
  buyItem: BuyItem,
  paymentMethod?: string,
  paymentReference?: string,
  paymentStatus?: string,
  setPlan?: (plan: UserPlan) => void,
): Promise<{ ok: boolean }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("yetou_token") : null;
  let purchaseOk = true;

  if (mediaId && token) {
    const purchase = await createPurchase(mediaId, {
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_status: paymentStatus || "pending",
    });
    purchaseOk = !!purchase;
  }

  const isMonthly = buyItem.name.includes("Abonnement Mensuel");
  const isPro = buyItem.name.includes("Abonnement Pro");
  if ((isMonthly || isPro) && token && paymentStatus === "success") {
    const newPlan: UserPlan = isPro ? "pro" : "monthly";
    try {
      const res = await fetch(`${getApiUrl()}/users/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) setPlan?.(newPlan);
    } catch {
      /* ignore */
    }
  }

  return { ok: purchaseOk };
}
