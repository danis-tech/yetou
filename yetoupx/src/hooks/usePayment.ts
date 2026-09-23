"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { BuyItem, UserPlan } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPayment, initiatePayment, type ApiPayment } from "@/services/api";
import { CARD_METHODS, MOBILE_METHODS } from "@/lib/payment-methods";

/** Clé localStorage du paiement carte en cours (relu par /paiement/retour). */
export const PENDING_PAYMENT_KEY = "pixia_pending_payment";

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export interface CheckoutOptions {
  mediaId?: number | null;
  buyItem: BuyItem;
  method: string;
  phone?: string;
  /** Paiement lancé : le client doit valider (PIN sur téléphone). */
  onPending?: (msg: string) => void;
  /** Paiement confirmé par le serveur (après vérification MyPVit). */
  onSuccess?: (payment: ApiPayment) => void;
  onError?: (msg: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Paiement MyPVit (Airtel Money, Moov Money, Visa/Mastercard).
 *
 * Le frontend ne décide jamais du succès d'un paiement : il initie la
 * transaction côté Django puis sonde son statut, que seul le serveur fait
 * passer à « success » après vérification auprès de MyPVit.
 */
export function usePayment() {
  const { setPlan } = useAuth();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Sonde le statut jusqu'à un état final (ou expiration du délai). */
  const waitForFinalStatus = useCallback(async (reference: string): Promise<ApiPayment | null> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline && mountedRef.current) {
      await sleep(POLL_INTERVAL_MS);
      const payment = await fetchPayment(reference);
      if (payment && payment.status !== "pending") return payment;
    }
    return null;
  }, []);

  const checkout = useCallback(async (opts: CheckoutOptions): Promise<boolean> => {
    const { mediaId, buyItem, method, phone, onPending, onSuccess, onError } = opts;

    const token = typeof window !== "undefined" ? localStorage.getItem("pixia_token") : null;
    if (!token) {
      onError?.("Connectez-vous pour effectuer un paiement.");
      return false;
    }
    if (!MOBILE_METHODS.has(method) && !CARD_METHODS.has(method)) {
      onError?.("Méthode de paiement non supportée.");
      return false;
    }
    if (!phone?.trim()) {
      onError?.("Veuillez entrer votre numéro de téléphone.");
      return false;
    }

    setLoading(true);
    try {
      const result = await initiatePayment({
        media_id: buyItem.plan ? null : (mediaId ?? buyItem.mediaId ?? null),
        plan: buyItem.plan,
        method,
        phone: phone.trim(),
      });
      if (!result.ok) {
        onError?.(result.error);
        return false;
      }
      const payment = result.data;

      // Carte : redirection vers le formulaire bancaire PVit, le résultat est
      // traité par /paiement/retour.
      if (payment.redirect_url) {
        localStorage.setItem(
          PENDING_PAYMENT_KEY,
          JSON.stringify({
            reference: payment.reference,
            returnTo: window.location.pathname + window.location.search,
            timestamp: Date.now(),
          }),
        );
        onPending?.("Redirection vers le paiement sécurisé par carte…");
        window.location.href = payment.redirect_url;
        return true;
      }

      // Mobile Money : push USSD sur le téléphone du client.
      onPending?.(payment.message || "Validez le paiement sur votre téléphone (code PIN).");
      const final = await waitForFinalStatus(payment.reference);
      if (!final) {
        if (mountedRef.current) {
          onError?.(
            "Paiement toujours en attente de confirmation. Vous serez notifié dès sa validation " +
              "(onglet Paiements du tableau de bord).",
          );
        }
        return false;
      }
      if (final.status === "failed") {
        onError?.(final.message || "Le paiement a échoué.");
        return false;
      }
      if (final.plan) setPlan(final.user_plan as UserPlan);
      onSuccess?.(final);
      return true;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [setPlan, waitForFinalStatus]);

  return { checkout, loading };
}
