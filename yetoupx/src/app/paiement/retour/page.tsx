"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPayment } from "@/services/api";
import { PENDING_PAYMENT_KEY } from "@/hooks/usePayment";
import type { UserPlan } from "@/types";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

function readPending(): { reference: string; returnTo: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (typeof pending?.reference !== "string" || !pending.reference) return null;
    const returnTo = typeof pending.returnTo === "string" && pending.returnTo.startsWith("/") && !pending.returnTo.startsWith("//")
      ? pending.returnTo
      : "/dashboard?tab=downloads";
    return { reference: pending.reference, returnTo };
  } catch {
    return null;
  }
}

/**
 * Retour du formulaire carte MyPVit. Le paramètre ?status= de l'URL n'est
 * qu'indicatif : le résultat affiché vient toujours du serveur, qui a vérifié
 * le paiement auprès de MyPVit.
 */
function PaiementRetourContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setPlan } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre paiement...");
  const [returnTo, setReturnTo] = useState("/dashboard?tab=downloads");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const pending = readPending();
      const reference = pending?.reference || searchParams.get("ref") || "";
      setReturnTo(pending?.returnTo || "/dashboard?tab=downloads");

      if (!reference) {
        setStatus("error");
        setMessage("Aucun paiement en cours. Consultez l'onglet Paiements de votre tableau de bord.");
        return;
      }
      if (!localStorage.getItem("pixia_token")) {
        setStatus("error");
        setMessage("Connectez-vous avec le même compte pour vérifier votre paiement.");
        return;
      }

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (!cancelled && Date.now() < deadline) {
        const payment = await fetchPayment(reference);
        if (cancelled) return;
        if (payment?.status === "success") {
          localStorage.removeItem(PENDING_PAYMENT_KEY);
          if (payment.plan) setPlan(payment.user_plan as UserPlan);
          setStatus("success");
          setMessage("Paiement confirmé ! Votre achat est disponible dans le dashboard.");
          setTimeout(() => router.push(payment.plan ? "/dashboard?tab=plan" : "/dashboard?tab=downloads"), 2000);
          return;
        }
        if (payment?.status === "failed") {
          localStorage.removeItem(PENDING_PAYMENT_KEY);
          setStatus("error");
          setMessage(payment.message || "Le paiement a échoué ou a été annulé. Vous pouvez réessayer.");
          return;
        }
        if (!payment) {
          setStatus("error");
          setMessage(`Paiement introuvable. Contactez le support avec la référence : ${reference}`);
          return;
        }
        setMessage("Confirmation du paiement en cours auprès de la banque...");
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!cancelled) {
        setStatus("error");
        setMessage(
          "Le paiement est toujours en attente de confirmation. Vous serez notifié dès sa validation. " +
            `Référence : ${reference}`,
        );
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px", gap: "20px",
    }}>
      {status === "loading" && (
        <>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            border: "3px solid var(--contour)", borderTopColor: "var(--river)",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "var(--ink-2)", fontSize: "14px" }}>{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(47,125,79,0.12)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: "36px", color: "var(--ok)" }}></i>
          </div>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "22px", fontWeight: 700, color: "var(--ink)" }}>
            Paiement réussi !
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: "14px", textAlign: "center", maxWidth: 420 }}>{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(179,65,46,0.10)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-x" style={{ fontSize: "36px", color: "var(--danger)" }}></i>
          </div>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "22px", fontWeight: 700, color: "var(--ink)" }}>
            Paiement non finalisé
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: "14px", textAlign: "center", maxWidth: 420 }}>{message}</p>
          <button
            className="btn-primary"
            onClick={() => router.push(returnTo)}
            style={{ marginTop: "8px", padding: "10px 24px" }}
          >
            Retour
          </button>
        </>
      )}
    </div>
  );
}

export default function PaiementRetourPage() {
  return (
    <Suspense fallback={null}>
      <PaiementRetourContent />
    </Suspense>
  );
}
