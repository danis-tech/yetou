"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function PaiementRetourPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addPurchase, setPlan } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre paiement...");

  useEffect(() => {
    const paymentStatus = searchParams.get("status");
    const reference = searchParams.get("ref");

    if (paymentStatus === "success" && reference) {
      handleSuccess(reference);
    } else if (paymentStatus === "error") {
      setStatus("error");
      setMessage("Le paiement a échoué ou a été annulé. Vous pouvez réessayer.");
    } else {
      setStatus("error");
      setMessage("Paramètres de retour invalides.");
    }
  }, []);

  async function handleSuccess(reference: string) {
    try {
      // Récupérer l'info de l'achat stockée pendant l'initiation du paiement
      const pendingRaw = localStorage.getItem("yetou_pending_purchase");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

      // Valider la référence
      if (!pending || pending.reference !== reference) {
        // Si pas de correspondance locale, on marque quand même succès
        // car le callback SingPay fait foi
        setStatus("success");
        setMessage("Paiement confirmé !");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      // Créer l'achat dans Django
      if (pending.mediaId) {
        const token = localStorage.getItem("yetou_token");
        if (token) {
          try {
            await fetch(`${API_URL}/purchases/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                media_id: pending.mediaId,
                payment_method: pending.paymentMethod || "",
                payment_reference: reference,
                payment_status: "success",
              }),
            });
          } catch {
            console.warn("callback: impossible de créer l'achat Django.");
          }
        }
      }

      // Sync plan si abonnement
      if (pending.plan) {
        const token = localStorage.getItem("yetou_token");
        if (token) {
          try {
            await fetch(`${API_URL}/users/profile/`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ plan: pending.plan }),
            });
          } catch {
            console.warn("callback: impossible de sync le plan Django.");
          }
        }
        setPlan(pending.plan);
      }

      // Ajouter au contexte local
      addPurchase(pending.buyItem);

      // Nettoyer
      localStorage.removeItem("yetou_pending_purchase");

      setStatus("success");
      setMessage("Paiement confirmé ! Redirection...");
      setTimeout(() => router.push("/"), 2000);
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
          <p style={{ color: "#8A8A95", fontSize: "14px", textAlign: "center" }}>{message}</p>
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
            Paiement annulé
          </h2>
          <p style={{ color: "#8A8A95", fontSize: "14px", textAlign: "center" }}>{message}</p>
          <button
            className="btn-primary"
            onClick={() => router.push("/")}
            style={{ marginTop: "8px", padding: "10px 24px" }}
          >
            Retour à l&apos;accueil
          </button>
        </>
      )}
    </div>
  );
}
