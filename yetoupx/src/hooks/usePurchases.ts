"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPurchases, downloadPurchase as apiDownloadPurchase } from "@/services/api";
import type { ApiPurchase } from "@/services/api";
import type { PurchasedItem } from "@/types";
import { mapApiPurchaseToItem, isPaidPurchase, remainingDownloadsFor } from "@/lib/purchases";

export function usePurchases(isLoggedIn: boolean, refreshKey = 0) {
  const [allRaw, setAllRaw] = useState<ApiPurchase[]>([]);
  const [paidPurchases, setPaidPurchases] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setAllRaw([]);
      setPaidPurchases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPurchases();
      setAllRaw(data);
      setPaidPurchases(
        data.filter((p) => isPaidPurchase(p.payment_status)).map(mapApiPurchaseToItem),
      );
    } catch {
      setAllRaw([]);
      setPaidPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const downloadPurchase = useCallback(async (item: PurchasedItem): Promise<string> => {
    const result = await apiDownloadPurchase(item.id);
    if (!result?.url) throw new Error("URL de téléchargement indisponible.");

    setPaidPurchases((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, downloadCount: p.downloadCount + 1 } : p)),
    );
    setAllRaw((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, download_count: p.download_count + 1 } : p)),
    );

    return result.url;
  }, []);

  return {
    allRaw,
    paidPurchases,
    loading,
    refresh: load,
    downloadPurchase,
    remainingDownloads: remainingDownloadsFor,
  };
}
