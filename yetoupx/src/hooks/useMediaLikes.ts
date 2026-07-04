"use client";

import { useState, useCallback } from "react";
import { toggleMediaLike } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export function useMediaLikes(
  onAuthRequired?: () => void,
  onError?: (msg: string) => void,
) {
  const { isLoggedIn } = useAuth();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const toggleLike = useCallback(async (
    mediaId: number,
    onUpdate: (likes: number, isLiked: boolean) => void,
  ) => {
    if (!isLoggedIn) {
      onAuthRequired?.();
      return;
    }

    setLoadingId(mediaId);
    try {
      const result = await toggleMediaLike(mediaId);
      if (!result) {
        onError?.("Impossible de mettre à jour le like.");
        return;
      }
      onUpdate(result.likes_count, result.is_liked);
    } catch {
      onError?.("Erreur réseau lors du like.");
    } finally {
      setLoadingId(null);
    }
  }, [isLoggedIn, onAuthRequired, onError]);

  return { toggleLike, loadingId };
}
