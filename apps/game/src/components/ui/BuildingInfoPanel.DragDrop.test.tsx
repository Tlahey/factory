// @vitest-environment happy-dom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
// import "@testing-library/jest-dom"; // Causing issues in some environments, relying on truthy checks
import BuildingInfoPanel from "./BuildingInfoPanel";
import { useGameStore } from "@/game/state/store";

// Mock Entity Classes
const mockRemoveSlot = vi.fn();
const mockAddItem = vi.fn();

vi.mock("@/game/buildings/chest/Chest", () => {
  class MockChest {
    getType() {
      return "chest";
    }
    getConfig() {
      return { id: "chest", name: "Chest" };
    }
    maxSlots = 10;
    slots = [{ type: "stone", count: 10 }];
    removeSlot = mockRemoveSlot;
    addItem = mockAddItem;
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
    slots = [{ type: "coal", count: 5 }];
  }
  return { Extractor: MockExtractor };
});

vi.mock("@/game/buildings/hub/Hub", () => ({ Hub: class {} }));
vi.mock("@/game/buildings/battery/Battery", () => ({ Battery: class {} }));
vi.mock("@/game/buildings/furnace/Furnace", () => ({ Furnace: class {} }));
vi.mock("@/game/buildings/conveyor/Conveyor", () => ({ Conveyor: class {} }));

import { Chest } from "@/game/buildings/chest/Chest";

// Mock store
const mockSetIsDraggingItem = vi.fn();
const mockGetState = vi.fn(); // NEW
vi.mock("@/game/state/store", () => {
  const fn = vi.fn();
  (fn as any).getState = () => mockGetState(); // Return result of spy
  return {
    useGameStore: fn,
    InventorySlot: {},
  };
});

// Mock child components to capture props
let capturedChestProps: any = {};

vi.mock("./panels", () => ({
  ChestPanel: (props: any) => {
    capturedChestProps = props;
    return <div data-testid="chest-panel" />;
  },
  ExtractorPanel: () => <div />,
  BatteryPanel: () => <div />,
  ElectricPolePanel: () => <div />,
  UpgradeReminder: () => <div />,
  FurnacePanel: () => <div />,
  ConveyorPanel: () => <div />,
}));

vi.mock("./ModelPreview", () => ({ default: () => <div /> }));
vi.mock("./HubDashboard", () => ({ default: () => <div /> }));
vi.mock("./FurnaceDashboard", () => ({ default: () => <div /> }));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/game/buildings/hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getBuildingUpgradeLevel: () => 0,
    getActiveUpgrade: () => null,
  },
}));

// Mock window.game
const mockGetBuilding = vi.fn();
Object.defineProperty(window, "game", {
  value: { world: { getBuilding: mockGetBuilding } },
  writable: true,
});

describe("BuildingInfoPanel Drag & Drop Transaction Logic", () => {
  const setOpenedEntityKey = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedChestProps = {};

    // Setup Store Mock
    mockGetState.mockReturnValue({
      updateInventorySlot: vi.fn(),
    });

    (useGameStore as any).mockImplementation((selector: any) => {
      const state = {
        openedEntityKey: "5,5",
        setOpenedEntityKey,
        inventory: [],
        setIsDraggingItem: mockSetIsDraggingItem,
      };
      return selector(state);
    });
  });

  test("Drag Start: removes item immediately and sets global dragging state", async () => {
    const chest = new Chest(5, 5);
    chest.slots = [{ type: "stone", count: 10 }];
    mockGetBuilding.mockReturnValue(chest);

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(screen.getByTestId("chest-panel")).toBeTruthy();

    // Trigger Drag Start via captured prop
    await act(async () => {
      capturedChestProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "chest",
        0, // index
        { type: "stone", count: 10 },
      );
    });

    // Check immediate removal
    expect(mockRemoveSlot).toHaveBeenCalledWith(0);
    // Check global dragging state
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(true);
  });

  test("Drag End (Failure): restores item if dropEffect is NOT move", async () => {
    const chest = new Chest(5, 5);
    chest.slots = [{ type: "stone", count: 10 }];
    mockGetBuilding.mockReturnValue(chest);

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // 1. Start Drag
    await act(async () => {
      capturedChestProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "chest",
        0,
        { type: "stone", count: 10 },
      );
    });

    // 2. End Drag with failure (dropEffect = 'none')
    await act(async () => {
      capturedChestProps.onDragEnd({
        dataTransfer: { dropEffect: "none" },
      });
    });

    // Check restoration
    expect(mockAddItem).toHaveBeenCalledWith("stone", 10);
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(false);
  });

  test("Drag End (Strict Mode): RESTORES item even if dropEffect IS move (because we require explicit event)", async () => {
    const chest = new Chest(5, 5);
    chest.slots = [{ type: "stone", count: 10 }];
    mockGetBuilding.mockReturnValue(chest);

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // 1. Start Drag
    await act(async () => {
      capturedChestProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "chest",
        0,
        { type: "stone", count: 10 },
      );
    });

    // 2. End Drag with browser saying "move" but NO event fired
    await act(async () => {
      capturedChestProps.onDragEnd({
        dataTransfer: { dropEffect: "move" },
      });
    });

    // Check RESTORATION (Strict Mode Safety)
    expect(mockAddItem).toHaveBeenCalledWith("stone", 10);
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(false);
  });

  test("Drag End (Explicit Success Event): DOES NOT restore item if dropEffect is 'none' BUT event was received", async () => {
    const chest = new Chest(5, 5);
    chest.slots = [{ type: "stone", count: 10 }];
    mockGetBuilding.mockReturnValue(chest);

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // 1. Start Drag
    await act(async () => {
      capturedChestProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "chest",
        0,
        { type: "stone", count: 10 },
      );
    });

    // 2. Fire Success Event (simulating HUD receiving it)
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
          detail: { source: "chest", sourceIndex: 0 },
        }),
      );
    });

    // 3. End Drag with apparent failure (browser issue simulation)
    await act(async () => {
      capturedChestProps.onDragEnd({
        dataTransfer: { dropEffect: "none" },
      });
    });

    // Check NO restoration explicitly because event confirmed success
    expect(mockAddItem).not.toHaveBeenCalled();
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(false);
  });

  test("Drop (External Source): Dispatches GAME_ITEM_TRANSFER_SUCCESS event", async () => {
    const chest = new Chest(5, 5);
    mockGetBuilding.mockReturnValue(chest);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Simulate Drop from "furnace"
    mockAddItem.mockReturnValue(true); // Simulate success
    await act(async () => {
      capturedChestProps.onDrop(
        {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: {
            getData: (key: string) => {
              if (key === "source") return "furnace";
              if (key === "index") return "0";
              if (key === "type") return "coal";
              if (key === "count") return "5";
              return "";
            },
          },
        },
        "chest", // target
        1, // targetIndex
      );
    });

    // Verify addItem called
    expect(mockAddItem).toHaveBeenCalledWith("coal", 5);

    // Verify success event dispatched
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GAME_ITEM_TRANSFER_SUCCESS",
        detail: { source: "furnace", sourceIndex: 0 },
      }),
    );
  });

  test("Drop (Inventory Source): Updates inventory locally, does NOT dispatch success event", async () => {
    const chest = new Chest(5, 5);
    mockGetBuilding.mockReturnValue(chest);
    mockAddItem.mockReturnValue(true); // Simulate success
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const mockUpdateInventorySlot = vi.fn();
    mockGetState.mockReturnValue({
      updateInventorySlot: mockUpdateInventorySlot,
    });

    // Update Store Mock for this test to capture inventory update
    (useGameStore as any).mockImplementation((selector: any) => {
      if (selector.toString().includes("updateInventorySlot")) {
        return mockUpdateInventorySlot;
      }
      const state = {
        openedEntityKey: "5,5",
        setOpenedEntityKey: vi.fn(),
        inventory: [{ type: "coal", count: 5 }],
        setIsDraggingItem: mockSetIsDraggingItem,
        updateInventorySlot: mockUpdateInventorySlot,
      };
      return selector(state);
    });

    render(<BuildingInfoPanel />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Simulate Drop from "inventory"
    await act(async () => {
      capturedChestProps.onDrop(
        {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: {
            getData: (key: string) => {
              if (key === "source") return "inventory";
              if (key === "index") return "0";
              if (key === "type") return "coal";
              if (key === "count") return "5";
              return "";
            },
          },
        },
        "chest",
        1,
      );
    });

    // Verify addItem called
    expect(mockAddItem).toHaveBeenCalledWith("coal", 5);

    // Verify inventory cleared
    expect(mockUpdateInventorySlot).toHaveBeenCalledWith(0, {
      type: null,
      count: 0,
    });

    // Verify NO success event dispatched (as handled locally)
    // Note: dispatchEvent might be called for other things, but NOT for this item transfer
    const calls = dispatchSpy.mock.calls.map((call) => call[0] as CustomEvent);
    const successEvent = calls.find(
      (e) => e.type === "GAME_ITEM_TRANSFER_SUCCESS",
    );
    expect(successEvent).toBeUndefined();
  });
});
