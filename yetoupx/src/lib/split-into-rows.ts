export const CAROUSEL_ROW_COUNT = 4;

/** Répartit les médias en 4 lignes uniques (round-robin, sans doublon entre lignes). */
export function splitIntoRows<T>(items: T[], rowCount = CAROUSEL_ROW_COUNT): T[][] {
  const rows: T[][] = Array.from({ length: rowCount }, () => []);
  items.forEach((item, i) => rows[i % rowCount].push(item));
  return rows.filter((row) => row.length > 0);
}

/**
 * Répète cycliquement les items d'une ligne jusqu'à remplir au moins
 * la largeur visible + une boucle fluide (marquee infini sans trou).
 */
export function expandRowItemsForScroll<T>(
  items: T[],
  viewportWidth: number,
  itemWidth: number,
  gapPx: number,
): T[] {
  if (!items.length || viewportWidth <= 0 || itemWidth <= 0) return items;

  const oneSetWidth = items.length * itemWidth + Math.max(0, items.length - 1) * gapPx;
  const targetWidth = Math.max(viewportWidth * 1.05, oneSetWidth * 2);
  const repeats = Math.max(2, Math.ceil(targetWidth / oneSetWidth));

  return Array.from({ length: repeats }, () => items).flat();
}
