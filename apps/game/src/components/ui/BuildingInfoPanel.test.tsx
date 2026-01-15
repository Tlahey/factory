import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import BuildingInfoPanel from "./BuildingInfoPanel";
import { useGameStore } from "../../game/state/store";

// Mock Entity Classes inside factory to avoid hoisting issues
// Mock Entity Classes inside factory to avoid hoisting issues
vi.mock("@/game/buildings/chest/Chest", () => {
  class MockChest {
    getType() {
      return "chest";
    }
    getConfig() {
      return { id: "chest", name: "Chest" };
    }
    maxSlots = 10;
    slots: { type: string | null; count: number }[] = [];
  }
  return { Chest: MockChest };
});

vi.mock("@/game/buildings/extractor/Extractor", () => {
  class MockExtractor {
    getType() {
      return "extractor";
    }
    getConfig() {
      return { id: "extractor", name: "Extractor" };
    }
    slots: { type: string | null; count: number }[] = [];
  }
  return { Extractor: MockExtractor };
});

vi.mock("@/game/buildings/hub/Hub", () => {
  class MockHub {
    getType() {
      return "hub";
    }
    getConfig() {
      return { id: "hub", name: "Hub" };
    }
    slots: { type: string | null; count: number }[] = [];
  }
  return { Hub: MockHub };
});

vi.mock("@/game/buildings/battery/Battery", () => {
  class MockBattery {
    getType() {
      return "battery";
    }
    getConfig() {
      return { id: "battery", name: "Battery" };
    }
    slots: { type: string | null; count: number }[] = [];
  }
  return { Battery: MockBattery };
});

// Import them to use in tests (they will be the mocks)
import { Extractor } from "@/game/buildings/extractor/Extractor";
import { Hub } from "@/game/buildings/hub/Hub";

// Mock store
vi.mock("../../game/state/store", () => ({
  useGameStore: vi.fn(),
  InventorySlot: {},
}));

// Mock simple components
vi.mock("./ModelPreview", () => ({
  default: () => <div data-testid="model-preview" />,
}));

vi.mock("./panels", () => ({
  ChestPanel: () => <div data-testid="chest-panel" />,
  ExtractorPanel: () => <div data-testid="extractor-panel" />,
  BatteryPanel: () => <div data-testid="battery-panel" />,
  ElectricPolePanel: () => <div data-testid="pole-panel" />,
  UpgradeReminder: () => <div data-testid="upgrade-reminder" />,
}));

vi.mock("./HubDashboard", () => ({
  default: () => <div data-testid="hub-dashboard" />,
}));

vi.mock("@/game/buildings/hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getBuildingUpgradeLevel: () => 0,
    getActiveUpgrade: () => null,
  },
}));

// Mock translation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock window.game
const mockGetBuilding = vi.fn();
Object.defineProperty(window, "game", {
  value: {
    world: {
      getBuilding: mockGetBuilding,
    },
  },
  writable: true,
});

describe("BuildingInfoPanel", () => {
  const setOpenedEntityKey = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => {
        if (typeof selector === "function") {
          return selector({
            openedEntityKey: "10,10",
            setOpenedEntityKey,
            inventory: [],
          });
        }
        return {
          getState: () => ({
            updateInventorySlot: vi.fn(),
            inventory: [],
          }),
        };
      },
    );
    interface MockStore {
      getState: () => {
        updateInventorySlot: () => void;
        inventory: never[];
      };
    }
    (useGameStore as unknown as MockStore).getState = () => ({
      updateInventorySlot: vi.fn(),
      inventory: [],
    });
  });

  test("renders nothing if no building found (async load)", async () => {
    mockGetBuilding.mockReturnValue(null);
    const { container } = render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(container).toBeEmptyDOMElement();
  });

  test("renders content for Extractor", async () => {
    mockGetBuilding.mockReturnValue(
      new Extractor(0, 0) as unknown as Extractor,
    );

    const { getByTestId } = render(<BuildingInfoPanel />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(screen.getByText("building.extractor.name")).toBeInTheDocument();
    expect(getByTestId("extractor-panel")).toBeInTheDocument();
  });

  test("renders HubDashboard for Hub", async () => {
    mockGetBuilding.mockReturnValue(new Hub(0, 0) as unknown as Hub);

    const { getByTestId } = render(<BuildingInfoPanel />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(getByTestId("hub-dashboard")).toBeInTheDocument();
  });

  test("closes panel on button click", async () => {
    mockGetBuilding.mockReturnValue(
      new Extractor(0, 0) as unknown as Extractor,
    );

    render(<BuildingInfoPanel />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(setOpenedEntityKey).toHaveBeenCalledWith(null);
  });
});
