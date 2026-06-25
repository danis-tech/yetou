"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access && refresh) {
      localStorage.setItem("yetou_token", access);
      localStorage.setItem("yetou_refresh", refresh);

      const returnUrl = localStorage.getItem("yetou_return_url");
      localStorage.removeItem("yetou_return_url");
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
    } else {
      setError("Échec de l'authentification Google. Veuillez réessayer.");
      setTimeout(() => router.replace("/"), 3000);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <>
        <i className="ti ti-alert-triangle" style={{ fontSize: "40px", color: "#C8371A" }}></i>
        <p style={{ color: "#8A8A95", fontSize: "14px" }}>{error}</p>
      </>
    );
  }

  return (
    <>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        border: "3px solid #2A2A35", borderTopColor: "#C8371A",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#8A8A95", fontSize: "14px" }}>Connexion en cours...</p>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F", display: "flex",
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
