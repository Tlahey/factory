// @vitest-environment happy-dom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import FurnaceDashboard from "./FurnaceDashboard";
import { useGameStore } from "@/game/state/store";

// Mock Entities
const mockAddItem = vi.fn();
const mockAddItemsToOutput = vi.fn();
const mockInputSplice = vi.fn();
const mockOutputSplice = vi.fn();
const mockGetQueueSize = vi.fn().mockReturnValue(10);

vi.mock("@/game/buildings/furnace/Furnace", () => {
  class MockFurnace {
    inputQueue = [];
    outputSlot = null;
    inputSplice = mockInputSplice;
    outputSplice = mockOutputSplice;
    addItem = mockAddItem;
    addItemsToOutput = mockAddItemsToOutput;
    getQueueSize = mockGetQueueSize;
    getProcessingSpeed = vi.fn().mockReturnValue(1);
    completion = 0;
    activeJobs = [];
    active = true;
    OUTPUT_CAPACITY = 10;
    selectedRecipeId = "ingot_recipe";
    getConfig() {
      return { id: "furnace", name: "Furnace" };
    }
  }
  return { Furnace: MockFurnace };
});

import { Furnace } from "@/game/buildings/furnace/Furnace";

// Mock Store
const mockSetIsDraggingItem = vi.fn();
const mockUpdateInventorySlot = vi.fn();
const mockClearInventorySlot = vi.fn();
vi.mock("@/game/state/store", () => ({
  useGameStore: vi.fn(),
}));

// Mock Child Components
let capturedInputBufferProps: any = {};
let _capturedOutputBufferProps: any = {};

vi.mock("./panels/ItemBufferPanel", () => ({
  ItemBufferPanel: (props: any) => {
    if (props.title === "Input Feed") capturedInputBufferProps = props;
    if (props.title === "Output Buffer") _capturedOutputBufferProps = props;
    return <div data-testid={`buffer-${props.sourceId}`} />;
  },
}));

vi.mock("./ModelPreview", () => ({ default: () => <div /> }));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/game/buildings/furnace/FurnaceConfig", () => ({
  FURNACE_CONFIG: {
    recipes: [
      {
        id: "ingot_recipe",
        input: "ore",
        inputCount: 1,
        output: "ingot",
        outputCount: 1,
      },
    ],
  },
}));

describe("FurnaceDashboard Drag & Drop Transaction Logic", () => {
  let furnace: any;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedInputBufferProps = {};
    _capturedOutputBufferProps = {};

    furnace = new Furnace(0, 0);
    // Setup mock arrays that we can spy on
    furnace.inputQueue = [{ type: "ore", count: 5 }];
    furnace.outputSlot = { type: "ingot", count: 2 };

    // Mock store implementation
    (useGameStore as any).mockImplementation((selector: any) => {
      const state = {
        openedEntityKey: "5,5",
        setOpenedEntityKey: vi.fn(),
        inventory: [{ type: "ore", count: 10 }],
        setIsDraggingItem: mockSetIsDraggingItem,
        updateInventorySlot: mockUpdateInventorySlot,
        clearInventorySlot: mockClearInventorySlot,
        unlockedRecipes: ["ingot_recipe"],
      };
      return selector(state);
    });
  });

  test("Drag Start (Input): Removes item locally and sets global dragging state", async () => {
    render(<FurnaceDashboard furnace={furnace} onClose={vi.fn()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(screen.getByTestId("buffer-furnace_input")).toBeTruthy();

    // Simulate Drag Start from Input Buffer
    await act(async () => {
      capturedInputBufferProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "furnace_input",
        0,
        { type: "ore", count: 5 },
      );
    });

    // Check if item was removed from furnace.inputQueue
    // Note: FurnaceDashboard manipulates the array directly splice in handleDragStart
    expect(furnace.inputQueue.length).toBe(0);
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(true);
  });

  test("Drag End (Failure): Restores item to Input Feed if NO success event", async () => {
    render(<FurnaceDashboard furnace={furnace} onClose={vi.fn()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // 1. Drag Start (Removes item)
    await act(async () => {
      capturedInputBufferProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "furnace_input",
        0,
        { type: "ore", count: 5 },
      );
    });
    expect(furnace.inputQueue.length).toBe(0);

    // 2. Drag End with dropEffect="move" BUT no event (simulating bad drop)
    await act(async () => {
      capturedInputBufferProps.onDragEnd({
        dataTransfer: { dropEffect: "move" }, // Strict mode should ignore this
      });
    });

    // Check Restoration
    expect(mockAddItem).toHaveBeenCalledWith("ore", 5);
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(false);
  });

  test("Drag End (Success Event): Does NOT restore item if success event received", async () => {
    render(<FurnaceDashboard furnace={furnace} onClose={vi.fn()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // 1. Drag Start
    await act(async () => {
      capturedInputBufferProps.onDragStart(
        { dataTransfer: { setData: vi.fn() }, preventDefault: vi.fn() },
        "furnace_input",
        0,
        furnace.inputQueue[0],
      );
    });

    // 2. Fire Success Event
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
          detail: { source: "furnace_input", sourceIndex: 0 },
        }),
      );
    });

    // 3. Drag End
    await act(async () => {
      capturedInputBufferProps.onDragEnd({
        dataTransfer: { dropEffect: "none" },
      });
    });

    // Check NO Restoration
    expect(mockAddItem).not.toHaveBeenCalled();
    expect(mockSetIsDraggingItem).toHaveBeenCalledWith(false);
  });

  test("Drop on Input Feed: Adds item to furnace and clears inventory", async () => {
    // Mock furnace accepting the item
    mockAddItem.mockReturnValue(true);

    render(<FurnaceDashboard furnace={furnace} onClose={vi.fn()} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Simulate Drop from Inventory
    await act(async () => {
      capturedInputBufferProps.onDrop({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          getData: (key: string) => {
            if (key === "source") return "inventory";
            if (key === "index") return "0";
            if (key === "type") return "ore";
            if (key === "count") return "10";
            return "";
          },
        },
      });
    });

    // Verify Furnace.addItem called
    expect(mockAddItem).toHaveBeenCalledWith("ore", 10);

    // Verify Inventory Cleared
    expect(mockClearInventorySlot).toHaveBeenCalledWith(0);
  });
});
