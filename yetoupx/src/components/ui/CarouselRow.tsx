"use client";

import { useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { expandRowItemsForScroll } from "@/lib/split-into-rows";

interface CarouselRowProps<T> {
  items: T[];
  direction: "left" | "right";
  duration: number;
  variant: "photo" | "video";
  renderItem: (item: T, idx: number) => ReactNode;
  getKey: (item: T) => string;
}

export default function CarouselRow<T>({
  items,
  direction,
  duration,
  variant,
  renderItem,
  getKey,
}: CarouselRowProps<T>) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [loopItems, setLoopItems] = useState<T[]>(items);
  const [shouldScroll, setShouldScroll] = useState(items.length > 0);

  useLayoutEffect(() => {
    if (items.length === 0) {
      setLoopItems([]);
      setShouldScroll(false);
      return;
    }

    const measure = () => {
      const row = rowRef.current;
      const probe = measureRef.current;
      if (!row || !probe) return;

      const itemWidth = probe.offsetWidth;
      if (itemWidth <= 0) return;

      const gapPx = parseFloat(getComputedStyle(probe.parentElement ?? row).gap || "14") || 14;
      const expanded = expandRowItemsForScroll(items, row.clientWidth, itemWidth, gapPx);
      setLoopItems(expanded);
      setShouldScroll(true);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && rowRef.current) ro.observe(rowRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items, variant]);

  if (items.length === 0) return null;

  const renderSet = (suffix: string, hidden = false) => (
    <div className="carousel-set" aria-hidden={hidden || undefined}>
      {loopItems.map((item, idx) => (
        <div
          className={`carousel-item carousel-item--${variant}`}
          key={`${getKey(item)}-${suffix}-${idx}`}
        >
          {renderItem(item, idx)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="carousel-row" ref={rowRef}>
      <div className="carousel-measure" aria-hidden="true">
        <div ref={measureRef} className={`carousel-item carousel-item--${variant}`}>
          {renderItem(items[0], 0)}
        </div>
      </div>

      <div
        className={[
          "carousel-track",
          shouldScroll ? `carousel-track--${direction}` : "carousel-track--idle",
        ].join(" ")}
        style={shouldScroll ? { animationDuration: `${duration}s` } : undefined}
      >
        {renderSet("a")}
        {shouldScroll ? renderSet("b", true) : null}
      </div>
    </div>
  );
}
