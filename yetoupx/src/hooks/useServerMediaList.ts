"use client";

import { useState, useEffect, useRef } from "react";
import { fetchMediaList, type MediaListParams, type ApiMedia } from "@/services/api";

interface UseServerMediaListOptions<T> {
  params: MediaListParams;
  mapItem: (item: ApiMedia) => T;
  enabled?: boolean;
}

export function useServerMediaList<T>({
  params,
  mapItem,
  enabled = true,
}: UseServerMediaListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const mapRef = useRef(mapItem);
  const hasLoadedRef = useRef(false);
  mapRef.current = mapItem;

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let cancelled = false;

    if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);

    fetchMediaList(params, controller.signal)
      .then(({ items: raw, count: total }) => {
        if (cancelled) return;
        setItems(raw.map(mapRef.current));
        setCount(total);
        hasLoadedRef.current = true;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        if (!hasLoadedRef.current) {
          setItems([]);
          setCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [paramsKey, enabled]);

  return { items, count, loading, refreshing, error };
}
