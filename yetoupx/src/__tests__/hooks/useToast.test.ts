import { renderHook, act } from "@testing-library/react";
import { useToast } from "@/hooks/useToast";

describe("useToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should initialize with empty toast", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBe("");
    expect(result.current.toastVisible).toBe(false);
    expect(result.current.toastError).toBe(false);
  });

  it("should show a toast message", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Test message");
    });
    expect(result.current.toast).toBe("Test message");
    expect(result.current.toastVisible).toBe(true);
    expect(result.current.toastError).toBe(false);
  });

  it("should show an error toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Error message", true);
    });
    expect(result.current.toast).toBe("Error message");
    expect(result.current.toastVisible).toBe(true);
    expect(result.current.toastError).toBe(true);
  });

  it("should hide toast after 4000ms", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Will disappear");
    });
    expect(result.current.toastVisible).toBe(true);

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.toastVisible).toBe(false);
  });

  it("should reset error flag on non-error toast after error", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Error", true);
    });
    expect(result.current.toastError).toBe(true);

    act(() => {
      result.current.showToast("Success");
    });
    expect(result.current.toastError).toBe(false);
  });
});
