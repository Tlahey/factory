import { describe, it, expect, beforeEach, vi } from "vitest";
import { GuidanceSystem } from "./GuidanceSystem";
import { World } from "../core/World";
import { useGameStore } from "../state/store";
import { gameEventManager } from "../events/GameEventManager";
import { BuildingEntity } from "../entities/BuildingEntity";

// Mock World and BuildingEntity
const mockBuilding = {
  getType: vi.fn(),
} as unknown as BuildingEntity;

const mockWorld = {
  buildings: {
    get: vi.fn(),
  },
} as unknown as World;

describe("GuidanceSystem", () => {
  let guidanceSystem: GuidanceSystem;

  beforeEach(() => {
    // Reset Store
    useGameStore.getState().reset();

    // Clear Event Listeners to prevent duplication across tests
    gameEventManager.removeAllListeners();

    // Reset Mocks
    vi.clearAllMocks();
    vi.mocked(mockWorld.buildings.get).mockReturnValue(mockBuilding);

    // Create Instance
    guidanceSystem = new GuidanceSystem(mockWorld);
  });

  describe("Event Triggers", () => {
    it("should show 'mined_stone' dialogue when stone is mined", () => {
      gameEventManager.emit("RESOURCE_MINED", {
        resource: "stone",
        amount: 1,
        position: { x: 0, y: 0 },
      });
      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("mined_stone");
    });

    it("should show 'mined_iron' dialogue when iron is mined", () => {
      gameEventManager.emit("RESOURCE_MINED", {
        resource: "iron_ore",
        amount: 1,
        position: { x: 0, y: 0 },
      });
      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("mined_iron");
    });

    it("should show 'hub_placed' dialogue when hub is placed", () => {
      gameEventManager.emit("BUILDING_PLACED", {
        type: "hub",
        position: { x: 0, y: 0 },
      });
      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("hub_placed");
    });

    it("should show 'chest_placed' dialogue when chest is placed", () => {
      gameEventManager.emit("BUILDING_PLACED", {
        type: "chest",
        position: { x: 0, y: 0 },
      });
      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("chest_placed");
    });

    it("should show 'extractor_no_power' dialogue when power status changes to no power", () => {
      gameEventManager.emit("POWER_STATUS_CHANGED", {
        buildingId: "1",
        hasPower: false,
      });
      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("extractor_no_power");
    });
  });

  describe("Building Interaction (onBuildingClicked)", () => {
    it("should show 'hub_info_overview' when Hub is clicked", () => {
      vi.mocked(mockBuilding.getType).mockReturnValue("hub");
      guidanceSystem.onBuildingClicked("hub-id");

      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("hub_info_overview");
    });

    it("should show 'electricity' when Wind Turbine is clicked", () => {
      vi.mocked(mockBuilding.getType).mockReturnValue("wind_turbine");
      guidanceSystem.onBuildingClicked("turbine-id");

      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("electricity");
    });

    it("should show 'first_selection' on generic building click if not seen", () => {
      // Reset seenDialogues in case previous tests affected it (though beforeEach resets store)
      vi.mocked(mockBuilding.getType).mockReturnValue("conveyor");
      guidanceSystem.onBuildingClicked("conveyor-id");

      const state = useGameStore.getState();
      expect(state.activeDialogueId).toBe("first_selection");
    });
  });

  describe("Update Loop & Menu Logic", () => {
    it("should complete 'welcome' dialogue if menu is opened", () => {
      const state = useGameStore.getState();
      state.showDialogue("welcome");

      // Simulate Menu Open
      useGameStore.setState({ isBuildingMenuOpen: true });

      guidanceSystem.update(0.1);

      expect(useGameStore.getState().activeDialogueId).not.toBe("welcome");
    });

    it("should show 'building_menu_intro' when menu is opened and hub not placed", () => {
      // Ensure no active dialogue
      useGameStore.setState({
        activeDialogueId: null,
        isBuildingMenuOpen: true,
        buildingCounts: { hub: 0 },
      });

      guidanceSystem.update(0.1);

      expect(useGameStore.getState().activeDialogueId).toBe(
        "building_menu_intro",
      );
    });

    it("should NOT show 'building_menu_intro' if hub IS placed", () => {
      useGameStore.setState({
        activeDialogueId: null,
        isBuildingMenuOpen: true,
        buildingCounts: { hub: 1 },
      });

      guidanceSystem.update(0.1);

      expect(useGameStore.getState().activeDialogueId).toBeNull();
    });

    it("should auto-close 'building_menu_intro' when menu is closed", () => {
      useGameStore.setState({
        activeDialogueId: "building_menu_intro",
        isBuildingMenuOpen: false,
      });

      guidanceSystem.update(0.1);

      expect(useGameStore.getState().activeDialogueId).toBeNull();
    });

    it("should NOT show 'building_menu_intro' twice in the same session", () => {
      useGameStore.setState({
        activeDialogueId: null,
        isBuildingMenuOpen: true,
        buildingCounts: { hub: 0 },
      });

      // First update: Show
      guidanceSystem.update(0.1);
      expect(useGameStore.getState().activeDialogueId).toBe(
        "building_menu_intro",
      );

      // Hide it manually (user ack)
      useGameStore.getState().hideDialogue();
      expect(useGameStore.getState().activeDialogueId).toBeNull();

      // Second update: Should NOT show again
      guidanceSystem.update(0.1);
      expect(useGameStore.getState().activeDialogueId).toBeNull();

      // Close Menu (Reset session)
      useGameStore.setState({ isBuildingMenuOpen: false });
      guidanceSystem.update(0.1);

      // Open Menu Again
      useGameStore.setState({ isBuildingMenuOpen: true });
      guidanceSystem.update(0.1);

      // Should show again
      expect(useGameStore.getState().activeDialogueId).toBe(
        "building_menu_intro",
      );
    });
  });
});
