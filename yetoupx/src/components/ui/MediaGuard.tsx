"use client";

import { useEffect, useRef, useState } from "react";

// Zones où le clic droit est bloqué même sans <img> (images en arrière-plan CSS).
const PROTECTED_SELECTOR = "img, video, .photo-img, .video-thumb-img, .hero-plate, .detail-hero, [data-protected]";
const MESSAGE = "Les médias Pixia sont protégés. Achetez-les pour les télécharger en pleine qualité.";

/**
 * Dissuasion contre l'enregistrement des médias, sur tous les appareils :
 * clic droit et « Enregistrer l'image sous », glisser-déposer, Ctrl/Cmd+S.
 *
 * Ce n'est qu'une barrière d'usage : la protection réelle est côté serveur,
 * qui n'envoie au navigateur que des aperçus réduits et filigranés.
 */
export default function MediaGuard() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const warn = () => {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 3200);
    };
    const isProtected = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest(PROTECTED_SELECTOR);

    const onContextMenu = (e: MouseEvent) => {
      if (isProtected(e.target)) { e.preventDefault(); warn(); }
    };
    const onDragStart = (e: DragEvent) => {
      if (isProtected(e.target)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); warn(); }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={`media-guard-toast ${visible ? "is-visible" : ""}`} role="status" aria-live="polite">
      <i className="ti ti-lock" aria-hidden="true"></i>
      {MESSAGE}
    </div>
  );
}
