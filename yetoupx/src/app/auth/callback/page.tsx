"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeSession } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");
    const authError = searchParams.get("error");

    if (authError) {
      setError("Échec de l'authentification Google. Veuillez réessayer.");
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    if (!access || !refresh) {
      setError("Échec de l'authentification Google. Veuillez réessayer.");
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    completeSession(access, refresh).then((ok) => {
      if (!ok) {
        setError("Connexion Google réussie mais impossible de charger votre profil.");
        setTimeout(() => router.replace("/"), 3000);
        return;
      }

      const returnUrl = localStorage.getItem("pixia_return_url");
      localStorage.removeItem("pixia_return_url");
      try {
        if (returnUrl) {
          const url = new URL(returnUrl);
          if (url.origin === window.location.origin) {
            router.replace(url.pathname + url.search + url.hash);
            return;
          }
        }
      } catch {}
      router.replace("/dashboard");
    });
  }, [searchParams, router, completeSession]);

  if (error) {
    return (
      <>
        <i className="ti ti-alert-triangle" style={{ fontSize: "40px", color: "var(--danger)" }}></i>
        <p style={{ color: "var(--ink-2)", fontSize: "14px" }}>{error}</p>
      </>
    );
  }

  return (
    <>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        border: "3px solid var(--contour)", borderTopColor: "var(--river)",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "var(--ink-2)", fontSize: "14px" }}>Connexion en cours...</p>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px", gap: "16px",
    }}>
      <Suspense fallback={null}>
        <CallbackHandler />
      </Suspense>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
