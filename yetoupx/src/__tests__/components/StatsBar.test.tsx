import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StatsBar from "@/components/layout/StatsBar";

describe("StatsBar", () => {
  it("should display photo and video counts", () => {
    render(<StatsBar photoCount={12} videoCount={9} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    const nines = screen.getAllByText("9");
    expect(nines.length).toBeGreaterThanOrEqual(2);
  });

  it("should always show 9 provinces", () => {
    render(<StatsBar photoCount={5} videoCount={3} />);
    const nines = screen.getAllByText("9");
    expect(nines.length).toBe(1);
    expect(screen.getByText("Provinces du Gabon")).toBeInTheDocument();
  });

  it("should show 100% droits commerciaux", () => {
    render(<StatsBar photoCount={0} videoCount={0} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Droits commerciaux inclus")).toBeInTheDocument();
  });
});
