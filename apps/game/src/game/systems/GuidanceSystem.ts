import { World } from "../core/World";
import { useGameStore } from "../state/store";
import { gameEventManager } from "../events/GameEventManager";

export class GuidanceSystem {
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.setupListeners();
  }

  private hasShownIntroThisSession = false;
  private lastMenuState = false;

  public update(_dt: number) {
    const state = useGameStore.getState();

    // Reset session flag if menu closes
    if (!state.isBuildingMenuOpen && this.lastMenuState) {
      this.hasShownIntroThisSession = false;
    }
    this.lastMenuState = state.isBuildingMenuOpen;

    // 1. Welcome Task Completion
    if (state.activeDialogueId === "welcome" && state.isBuildingMenuOpen) {
      state.hideDialogue();
    }

    // 2. Building Menu Intro Trigger (Repeatable until Hub is placed)
    const hubCount = state.buildingCounts["hub"] || 0;
    if (
      state.isBuildingMenuOpen &&
      hubCount === 0 &&
      !state.activeDialogueId &&
      !this.hasShownIntroThisSession
    ) {
      state.showDialogue("building_menu_intro");
      this.hasShownIntroThisSession = true;
    }

    // 3. Auto-close Building Menu Intro if Menu Closed
    if (
      state.activeDialogueId === "building_menu_intro" &&
      !state.isBuildingMenuOpen
    ) {
      state.hideDialogue();
    }
  }

  private setupListeners() {
    // 1. Resource Mined
    gameEventManager.on("RESOURCE_MINED", ({ resource }) => {
      const state = useGameStore.getState();
      // Check strict resource types
      if (
        resource === "stone" &&
        !state.seenDialogues.includes("mined_stone")
      ) {
        state.showDialogue("mined_stone");
      } else if (
        resource === "iron" &&
        !state.seenDialogues.includes("mined_iron")
      ) {
        state.showDialogue("mined_iron");
      }
    });

    // 2. Building Placed
    gameEventManager.on("BUILDING_PLACED", ({ type }) => {
      const state = useGameStore.getState();
      if (type === "hub" && !state.seenDialogues.includes("hub_placed")) {
        state.showDialogue("hub_placed");
      } else if (
        type === "chest" &&
        !state.seenDialogues.includes("chest_placed")
      ) {
        state.showDialogue("chest_placed");
      }
    });

    // 3. Selection (Handled partly by InputSystem but we can centralize here if InputSystem emits)
    gameEventManager.on("BUILDING_SELECTED", ({ id }) => {
      this.onBuildingClicked(id);
    });

    // 4. Power Status
    gameEventManager.on("POWER_STATUS_CHANGED", ({ hasPower }) => {
      const state = useGameStore.getState();
      if (!hasPower && !state.seenDialogues.includes("extractor_no_power")) {
        // We might need to check if it's an extractor?
        // The event could include the type.
        // For now, let's assume valid.
        state.showDialogue("extractor_no_power");
      }
    });
  }

  // Simplified Click Handler (called via Event or Input direct call)
  public onBuildingClicked(buildingId: string) {
    const state = useGameStore.getState();
    const building = this.world.buildings.get(buildingId);
    if (!building) return;

    const type = building.getType();

    // 1. Hub Info
    if (type === "hub") {
      if (!state.seenDialogues.includes("hub_info_overview")) {
        state.showDialogue("hub_info_overview");
      }
    }

    // 2. Power System (Clicking Pole, Turbine, Solar, Extractor)
    if (
      ["electric_pole", "wind_turbine", "solar_panel", "extractor"].includes(
        type,
      )
    ) {
      if (
        !state.seenDialogues.includes("electricity") &&
        !state.activeDialogueId
      ) {
        state.showDialogue("electricity");
      }
    }

    // 3. Generic First Selection
    if (!state.seenDialogues.includes("first_selection")) {
      state.showDialogue("first_selection");
    }
  }
}
