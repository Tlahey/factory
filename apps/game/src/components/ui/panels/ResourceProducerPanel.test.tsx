import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ResourceProducerPanel } from "./ResourceProducerPanel";

// Mock dependencies
vi.mock("../ModelPreview", () => ({ default: () => null }));
vi.mock("lucide-react", () => ({
  X: () => null,
  Box: () => null,
  Zap: () => null,
  ArrowUp: () => null,
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function buildMockBuilding(powerRate: number) {
  return {
    active: true,
    slots: [],
    BUFFER_CAPACITY: 20,
    hasPowerSource: true,
    operationStatus: "ok",
    powerStatus: "active",
    visualSatisfaction: 1,
    powerConfig: { rate: powerRate },
  } as any;
}

describe("ResourceProducerPanel", () => {
  it("renders the building's power consumption from powerConfig.rate", () => {
    render(
      <ResourceProducerPanel
        building={buildMockBuilding(5.5)}
        resourceType="wood"
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDragOver={() => {}}
      />,
    );

    expect(screen.getByText("5.50")).toBeInTheDocument();
  });

  it("shows the same power consumption regardless of the producing building (Extractor vs Sawmill share this panel)", () => {
    const { unmount } = render(
      <ResourceProducerPanel
        building={buildMockBuilding(3)}
        resourceType="stone"
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDragOver={() => {}}
      />,
    );
    expect(screen.getByText("3.00")).toBeInTheDocument();
    unmount();

    render(
      <ResourceProducerPanel
        building={buildMockBuilding(3)}
        resourceType="wood"
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDragOver={() => {}}
      />,
    );
    expect(screen.getByText("3.00")).toBeInTheDocument();
  });
});
