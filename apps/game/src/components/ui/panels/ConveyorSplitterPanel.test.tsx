import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConveyorSplitterPanel } from "./ConveyorSplitterPanel";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ConveyorSplitterPanel", () => {
  it("calls setOutputFilter with the clicked resource for the front port", () => {
    const building = {
      outputFilters: { front: null, left: null, right: null },
      setOutputFilter: vi.fn(),
    } as any;

    render(<ConveyorSplitterPanel building={building} />);

    // Three rows (front/left/right) each render this label — the first is Front's.
    fireEvent.click(screen.getAllByText("resource.iron_ore")[0]);

    expect(building.setOutputFilter).toHaveBeenCalledWith("front", "iron_ore");
  });

  it("calls setOutputFilter with null when Any is clicked", () => {
    const building = {
      outputFilters: { front: "iron_ore", left: null, right: null },
      setOutputFilter: vi.fn(),
    } as any;

    render(<ConveyorSplitterPanel building={building} />);

    fireEvent.click(screen.getAllByText("conveyor_splitter.any_resource")[0]);

    expect(building.setOutputFilter).toHaveBeenCalledWith("front", null);
  });

  it("renders a row for each of the three output ports", () => {
    const building = {
      outputFilters: { front: null, left: null, right: null },
      setOutputFilter: vi.fn(),
    } as any;

    render(<ConveyorSplitterPanel building={building} />);

    expect(screen.getByText("conveyor_splitter.front")).toBeInTheDocument();
    expect(screen.getByText("conveyor_splitter.left")).toBeInTheDocument();
    expect(screen.getByText("conveyor_splitter.right")).toBeInTheDocument();
  });
});
