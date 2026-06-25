import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

describe("useBodyScrollLock", () => {
  it("should set overflow hidden when locked", () => {
    renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should clear overflow when unlocked", () => {
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe("");
  });

  it("should restore overflow on unmount", () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
