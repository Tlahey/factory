import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BuildingSidebar from "./BuildingSidebar";
import { useGameStore } from "../../game/state/store";

// Mock store
vi.mock("../../game/state/store", () => ({
  useGameStore: vi.fn(),
}));

// Mock simple components
vi.mock("./ModelPreview", () => ({
  default: () => <div data-testid="model-preview" />,
}));

vi.mock("./BuildingHoverCard", () => ({
  default: () => <div data-testid="building-hover-card" />,
}));

// Mock translation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock building config
vi.mock("@/game/buildings/BuildingConfig", () => ({
  getBuildingConfig: (id: string) => ({
    type: id,
    id: id,
    cost: { iron_ore: 10 },
    name: id,
  }),
  BUILDINGS: {
    extractor: {
      type: "extractor",
      id: "extractor",
      cost: { iron_ore: 10 },
      name: "Extractor",
    },
  },
}));

describe("BuildingSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("does not show hover card when BuildingMenu is open", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => {
        const state = {
          selectedBuilding: null,
          setSelectedBuilding: vi.fn(),
          hotbar: ["extractor", null, null],
          setHotbarSlot: vi.fn(),
          buildingCounts: {},
          purchasedCounts: {},
          inventory: [],
          hasResources: () => true,
          setHoveredBarBuilding: vi.fn(),
          hoveredBarBuilding: "extractor",
          isBuildingMenuOpen: true, // Menu is open!
        };
        return selector(state);
      },
    );

    render(<BuildingSidebar />);

    // BuildingHoverCard should NOT be in the document
    expect(screen.queryByTestId("building-hover-card")).not.toBeInTheDocument();
  });

  test("shows hover card when BuildingMenu is closed and item is hovered", () => {
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => {
        const state = {
          selectedBuilding: null,
          setSelectedBuilding: vi.fn(),
          hotbar: ["extractor", null, null],
          setHotbarSlot: vi.fn(),
          buildingCounts: {},
          purchasedCounts: {},
          inventory: [],
          hasResources: () => true,
          setHoveredBarBuilding: vi.fn(),
          hoveredBarBuilding: "extractor",
          isBuildingMenuOpen: false, // Menu is closed
        };
        return selector(state);
      },
    );

    render(<BuildingSidebar />);

    // BuildingHoverCard SHOULD be in the document
    expect(screen.getByTestId("building-hover-card")).toBeInTheDocument();
  });
});
