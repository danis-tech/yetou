import {
  splitIntoRows,
  expandRowItemsForScroll,
  CAROUSEL_ROW_COUNT,
} from "@/lib/split-into-rows";

describe("splitIntoRows", () => {
  it("répartit en 4 lignes sans doublon", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const rows = splitIntoRows(items, 4);
    expect(rows).toHaveLength(4);
    expect(rows.flat()).toHaveLength(9);
    expect(new Set(rows.flat()).size).toBe(9);
  });
});

describe("expandRowItemsForScroll", () => {
  it("étend une ligne courte pour remplir l'écran", () => {
    const expanded = expandRowItemsForScroll([1, 2], 1200, 200, 14);
    expect(expanded.length).toBeGreaterThan(2);
    expect(expanded.length % 2).toBe(0);
  });

  it("garde une ligne déjà longue avec au moins 2 cycles", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const expanded = expandRowItemsForScroll(items, 800, 200, 14);
    expect(expanded.length).toBeGreaterThanOrEqual(items.length * 2);
  });
});

describe("CAROUSEL_ROW_COUNT", () => {
  it("vaut 4", () => {
    expect(CAROUSEL_ROW_COUNT).toBe(4);
  });
});
