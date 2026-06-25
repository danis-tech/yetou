"use client";
import { useEffect, useRef } from "react";

export function useLongPressGuard(onCapture: () => void) {
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let guardEl: HTMLElement | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement;
      if (!el.classList.contains("photo-img") && !el.classList.contains("video-thumb-img")) return;
      guardEl = el;
      timer = setTimeout(() => {
        if (guardEl) {
          guardEl.style.pointerEvents = "none";
          setTimeout(() => { if (guardEl) guardEl.style.pointerEvents = ""; }, 200);
        }
        onCaptureRef.current();
        navigator?.vibrate?.([50]);
      }, 500);
    };

    const clear = () => { if (timer) { clearTimeout(timer); timer = null; guardEl = null; } };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", clear);
    document.addEventListener("touchmove", clear);
    document.addEventListener("touchcancel", clear);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", clear);
      document.removeEventListener("touchmove", clear);
      document.removeEventListener("touchcancel", clear);
    };
  }, []);
}
