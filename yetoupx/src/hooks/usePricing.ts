"use client";

import { useEffect, useState } from "react";
import { fetchPricing, type ApiPricingTable } from "@/services/api";

const EMPTY_PRICING: ApiPricingTable = { qualities: [], pricing: { photo: [], video: [] } };

/** Grille tarifaire dynamique (qualités + prix) exposée par l'admin, avec cache partagé. */
export function usePricing() {
  const [pricing, setPricing] = useState<ApiPricingTable>(EMPTY_PRICING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((data) => { if (!cancelled) setPricing(data); })
      .catch(() => { /* on garde les valeurs par défaut si l'API est indisponible */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { pricing, loading };
}

export function formatFcfa(price: number): string {
  return `${price.toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;
}
