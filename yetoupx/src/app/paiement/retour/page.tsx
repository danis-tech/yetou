"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createPurchase, confirmFedapayPayment, checkPaymentStatus } from "@/services/api";
import { getApiUrl } from "@/lib/api-url";

function PaiementRetourContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setPlan } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre paiement...");
  const [returnTo, setReturnTo] = useState("/dashboard?tab=downloads");

  function readReturnTo(): string {
    try {
      const raw = localStorage.getItem("yetou_pending_purchase");
      if (raw) {
        const pending = JSON.parse(raw);
        if (typeof pending?.returnTo === "string" && pending.returnTo) return pending.returnTo;
      }
    } catch {
      /* ignore */
    }
    return "/dashboard?tab=downloads";
  }

  useEffect(() => {
    const ref = searchParams.get("ref");
    const fedapayStatus = searchParams.get("status");
    const transactionId = searchParams.get("id");
    const singpayStatus = searchParams.get("status");

    const rt = readReturnTo();
    setReturnTo(rt);

    // Retour FedaPay (carte) : ?ref=...&id=...&status=approved
    if (ref && transactionId && fedapayStatus === "approved") {
      handleFedapaySuccess(ref, transactionId, rt);
      return;
    }
    if (fedapayStatus === "canceled") {
      setStatus("error");
      setMessage("Paiement annulé. Vous pouvez réessayer.");
      return;
    }

    // Retour SingPay (mobile)
    if (singpayStatus === "success" && ref) {
      handleSingpaySuccess(ref, rt);
      return;
    }
    if (singpayStatus === "error") {
      handleSingpayError(ref, rt);
      return;
    }

    setStatus("error");
    setMessage("Paramètres de retour invalides.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleFedapaySuccess(reference: string, transactionId: string, rt: string) {
    try {
      const token = localStorage.getItem("yetou_token");
      if (!token) {
        setStatus("error");
        setMessage("Connectez-vous avec le même compte pour finaliser votre achat.");
        return;
      }

      const confirmed = await confirmFedapayPayment({ reference, transaction_id: transactionId });
      if (!confirmed.ok) {
        setStatus("error");
        setMessage(confirmed.error);
        return;
      }

      const pendingRaw = localStorage.getItem("yetou_pending_purchase");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
      if (pending?.plan) {
        try {
          const res = await fetch(`${getApiUrl()}/users/profile/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ plan: pending.plan }),
          });
          if (res.ok) setPlan(pending.plan);
        } catch {
          console.warn("callback: impossible de sync le plan Django.");
        }
      }

      localStorage.removeItem("yetou_pending_purchase");
      setStatus("success");
      setMessage("Paiement confirmé ! Votre achat est disponible dans le dashboard.");
      setTimeout(() => router.push(rt), 2000);
    } catch {
      setStatus("error");
      setMessage("Erreur lors de la validation du paiement.");
    }
  }

  async function handleSingpayError(reference: string | null, rt: string) {
    if (!reference) {
      setStatus("error");
      setMessage("Le paiement a échoué ou a été annulé. Vous pouvez réessayer.");
      return;
    }
    const result = await checkPaymentStatus(reference);
    setStatus("error");
    if (result.status === "success") {
      // Le webhook a confirmé le succès entre-temps malgré la redirection d'erreur.
      handleSingpaySuccess(reference, rt);
      return;
    }
    setMessage(
      result.status === "failed"
        ? result.message
        : "Le paiement a échoué ou a été annulé. Vous pouvez réessayer.",
    );
  }

  async function handleSingpaySuccess(reference: string, rt: string) {
    try {
      const pendingRaw = localStorage.getItem("yetou_pending_purchase");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

      if (!pending || pending.reference !== reference) {
        setStatus("success");
        setMessage("Paiement confirmé par SingPay. Si l'achat n'apparaît pas, contactez le support avec la référence : " + reference);
        setTimeout(() => router.push(rt), 3000);
        return;
      }

      const token = localStorage.getItem("yetou_token");
      if (!token) {
        setStatus("error");
        setMessage("Connectez-vous avec le même compte pour récupérer votre achat.");
        return;
      }

      if (pending.mediaId) {
        const purchase = await createPurchase(pending.mediaId, {
          payment_method: pending.paymentMethod || "",
          payment_reference: reference,
          payment_status: "success",
        });
        if (!purchase) {
          setStatus("error");
          setMessage(`Paiement reçu mais l'achat n'a pas pu être enregistré. Référence : ${reference}`);
          return;
        }
      }

      if (pending.plan) {
        try {
          const res = await fetch(`${getApiUrl()}/users/profile/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ plan: pending.plan }),
          });
          if (res.ok) setPlan(pending.plan);
        } catch {
          console.warn("callback: impossible de sync le plan Django.");
        }
      }

      localStorage.removeItem("yetou_pending_purchase");

      setStatus("success");
      setMessage("Paiement confirmé ! Votre achat est disponible dans le dashboard.");
      setTimeout(() => router.push(rt), 2000);
    } catch {
      setStatus("error");
      setMessage("Erreur lors de la validation du paiement.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px", gap: "20px",
    }}>
      {status === "loading" && (
        <>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            border: "3px solid #2A2A35", borderTopColor: "#C8371A",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#8A8A95", fontSize: "14px" }}>{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(34,197,94,0.12)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: "36px", color: "#22c55e" }}></i>
          </div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "22px", fontWeight: 700, color: "#F0EFEA" }}>
            Paiement réussi !
          </h2>
          <p style={{ color: "#8A8A95", fontSize: "14px", textAlign: "center", maxWidth: 420 }}>{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(200,55,26,0.12)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-x" style={{ fontSize: "36px", color: "#C8371A" }}></i>
          </div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: "22px", fontWeight: 700, color: "#F0EFEA" }}>
            Paiement non finalisé
          </h2>
          <p style={{ color: "#8A8A95", fontSize: "14px", textAlign: "center", maxWidth: 420 }}>{message}</p>
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
