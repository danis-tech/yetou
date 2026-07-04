"use client";

import { useMemo, Fragment, type ReactNode } from "react";
import { splitIntoRows, CAROUSEL_ROW_COUNT } from "@/lib/split-into-rows";
import CarouselRow from "@/components/ui/CarouselRow";

const ROW_DURATIONS = [90, 100, 95, 105];

interface MediaCarouselRowsProps<T> {
  items: T[];
  variant: "photo" | "video";
  renderItem: (item: T, idx: number, carousel: boolean) => ReactNode;
  getKey: (item: T) => string | number;
}

export default function MediaCarouselRows<T>({
  items,
  variant,
  renderItem,
  getKey,
}: MediaCarouselRowsProps<T>) {
  const rows = useMemo(
    () => splitIntoRows(items, CAROUSEL_ROW_COUNT),
    [items],
  );

  const keyFn = (item: T) => String(getKey(item));
  const gridClass = variant === "photo" ? "photo-grid" : "video-grid";

  return (
    <>
      <div className={`media-carousel-rows media-carousel-rows--${variant} media-list--desktop`}>
        {rows.map((rowItems, i) => (
          <CarouselRow
            key={i}
            items={rowItems}
            direction={i % 2 === 0 ? "right" : "left"}
            duration={ROW_DURATIONS[i] ?? 95}
            variant={variant}
            renderItem={(item, idx) => renderItem(item, idx, true)}
            getKey={keyFn}
          />
        ))}
      </div>
      <div className={`${gridClass} media-mobile-grid media-list--mobile`}>
        {items.map((item, idx) => (
          <Fragment key={keyFn(item)}>{renderItem(item, idx, false)}</Fragment>
        ))}
      </div>
    </>
  );
}
