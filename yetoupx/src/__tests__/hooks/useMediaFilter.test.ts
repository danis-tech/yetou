import { buildMediaListQuery, hasMediaListFilters } from "@/services/api";

describe("buildMediaListQuery", () => {
  it("inclut type et page_size", () => {
    expect(buildMediaListQuery({ type: "photo" })).toContain("type=photo");
    expect(buildMediaListQuery({ type: "photo" })).toContain("page_size=48");
  });

  it("ignore les filtres à « all »", () => {
    const q = buildMediaListQuery({
      type: "photo",
      category: "all",
      resolution: "all",
      sort: "recent",
    });
    expect(q).toContain("type=photo");
    expect(q).toContain("sort=recent");
    expect(q).not.toContain("category=");
    expect(q).not.toContain("resolution=");
  });

  it("encode recherche, tri et filtres", () => {
    const q = buildMediaListQuery({
      type: "video",
      category: "nature",
      duration: "30",
      search: "libreville drone",
      sort: "popular",
    });
    expect(q).toContain("type=video");
    expect(q).toContain("category=nature");
    expect(q).toContain("duration=30");
    expect(q).toContain("search=libreville");
    expect(q).toContain("sort=popular");
  });
});

describe("hasMediaListFilters", () => {
  it("retourne false sans filtre ni recherche", () => {
    expect(hasMediaListFilters({ type: "photo" })).toBe(false);
    expect(hasMediaListFilters({ type: "photo", category: "all", resolution: "all", sort: "recent" })).toBe(false);
  });

  it("retourne true avec filtre ou recherche", () => {
    expect(hasMediaListFilters({ type: "photo", category: "nature" })).toBe(true);
    expect(hasMediaListFilters({ type: "photo", search: "libreville" })).toBe(true);
    expect(hasMediaListFilters({ type: "video", duration: "30" })).toBe(true);
  });
});
