import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Toast from "@/components/ui/Toast";

describe("Toast", () => {
  it("should not be visible when visible=false", () => {
    render(<Toast message="Hello" visible={false} isError={false} />);
    expect(screen.getByText("Hello").closest(".toast")).not.toHaveClass("show");
  });

  it("should be visible when visible=true", () => {
    render(<Toast message="Hello" visible={true} isError={false} />);
    expect(screen.getByText("Hello").closest(".toast")).toHaveClass("show");
  });

  it("should show success icon by default", () => {
    render(<Toast message="Success" visible={true} isError={false} />);
    expect(document.querySelector(".ti-circle-check")).toBeInTheDocument();
  });

  it("should show error icon when isError=true", () => {
    render(<Toast message="Error" visible={true} isError={true} />);
    expect(document.querySelector(".ti-alert-triangle")).toBeInTheDocument();
  });

  it("should apply error styles when isError", () => {
    render(<Toast message="Error" visible={true} isError={true} />);
    const toastEl = screen.getByText("Error").closest(".toast");
    expect(toastEl).toHaveStyle({ borderColor: "#C8371A", background: "#1a0e0b" });
  });
});
