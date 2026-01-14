import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DIALOGUES } from "../data/Dialogues";
import { SKILL_TREE } from "../buildings/hub/skill-tree/SkillTreeConfig";

export interface InventorySlot {
  type: string | null;
  count: number;
}

interface GameState {
  inventory: InventorySlot[];
  selectedBuilding: string | null;
  addItem: (item: string, amount: number) => void;
  removeItem: (item: string, amount: number) => void;
  setSelectedBuilding: (building: string | null) => void;
  viewMode: "2D" | "3D";
  setViewMode: (mode: "2D" | "3D") => void;

  isInventoryOpen: boolean;
  toggleInventory: () => void;

  cameraAzimuth: number;
  cameraElevation: number;
  setCameraAngles: (azimuth: number, elevation: number) => void;
  openedEntityKey: string | null;
  setOpenedEntityKey: (key: string | null) => void;
  hoveredEntityKey: string | null;
  setHoveredEntityKey: (key: string | null) => void;
  resetInventory: () => void;
  setInventory: (inventory: InventorySlot[]) => void;
  updateInventorySlot: (index: number, slot: InventorySlot) => void;
  swapInventorySlots: (fromIndex: number, toIndex: number) => void;
  clearInventorySlot: (index: number) => void;
  reorganizeInventory: () => void;

  // UI Overhaul
  isBuildingMenuOpen: boolean;
  toggleBuildingMenu: () => void;
  hotbar: (string | null)[];
  setHotbarSlot: (index: number, buildingId: string | null) => void;

  // Building Limits
  buildingCounts: Record<string, number>;
  updateBuildingCount: (type: string, delta: number) => void;
  resetBuildingCounts: () => void;
  reset: () => void;

  // Skill Tree
  unlockedSkills: string[];
  unlockSkill: (skillId: string) => void;
  resetSkillTree: () => void;
  isSkillTreeOpen: boolean;
  setSkillTreeOpen: (open: boolean) => void;

  // Pending Unlocks (skills currently being unlocked)
  pendingUnlocks: {
    skillId: string;
    startTime: number; // Unix timestamp when unlock started
    duration: number; // Duration in seconds
  }[];
  startUnlock: (skillId: string, duration: number) => void;
  cancelUnlock: (skillId: string) => void;
  completeUnlock: (skillId: string) => void;

  // Progression
  unlockedBuildings: string[];
  unlockBuilding: (buildingId: string) => void;
  unlockedRecipes: string[];
  unlockRecipe: (recipeId: string) => void;
  hasResources: (cost: Record<string, number>) => boolean;
  removeResources: (cost: Record<string, number>) => void;

  // Debug / Cheats
  isUnlimitedResources: boolean;
  toggleUnlimitedResources: () => void;
  unlockAllSkills: () => void;

  // Dialogue / Tutorial
  activeDialogueId: string | null;
  seenDialogues: string[];
  showDialogue: (id: string) => void;
  hideDialogue: () => void;
  markDialogueSeen: (id: string) => void;

  // Shop
  purchasedCounts: Record<string, number>;
  buyBuilding: (buildingId: string) => void;

  // Interactive Tutorial / Highlight System
  focusedElement: string | null; // ID of the DOM element or World Entity to highlight
  setFocusedElement: (id: string | null) => void;
}

const INVENTORY_SIZE = 10;
const STACK_SIZE = 100; // Define a stack size limit for personal inventory

export const useGameStore = create<GameState>()(
  persist(
    (set, _get) => ({
      inventory: Array(INVENTORY_SIZE)
        .fill(null)
        .map(() => ({ type: null, count: 0 })),
      selectedBuilding: null,
      viewMode: "3D",
      isInventoryOpen: false,
      toggleInventory: () =>
        set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
      cameraAzimuth: Math.PI / 4,
      cameraElevation: Math.PI / 3,
      openedEntityKey: null,
      setOpenedEntityKey: (key) => set({ openedEntityKey: key }),
      hoveredEntityKey: null,
      setHoveredEntityKey: (key) => set({ hoveredEntityKey: key }),
      resetInventory: () =>
        set({
          inventory: Array(INVENTORY_SIZE)
            .fill(null)
            .map(() => ({ type: null, count: 0 })),
        }),
      setInventory: (inventory) => {
        // Ensure we always have fixed size, even if loaded data is different
        const newInv: InventorySlot[] = Array(INVENTORY_SIZE)
          .fill(null)
          .map(() => ({ type: null, count: 0 }));
        inventory.forEach((slot, i) => {
          if (i < INVENTORY_SIZE) newInv[i] = { ...slot };
        });
        set({ inventory: newInv });
      },
      updateInventorySlot: (index, slot) =>
        set((state) => {
          const newInv = [...state.inventory];
          if (index >= 0 && index < newInv.length) {
            newInv[index] = slot;
          }
          return { inventory: newInv };
        }),
      swapInventorySlots: (fromIndex: number, toIndex: number) =>
        set((state) => {
          const newInv = [...state.inventory];
          if (
            fromIndex >= 0 &&
            fromIndex < newInv.length &&
            toIndex >= 0 &&
            toIndex < newInv.length
          ) {
            const temp = newInv[fromIndex];
            newInv[fromIndex] = newInv[toIndex];
            newInv[toIndex] = temp;
          }
          return { inventory: newInv };
        }),
      clearInventorySlot: (index: number) =>
        set((state) => {
          const newInv = [...state.inventory];
          if (index >= 0 && index < newInv.length) {
            newInv[index] = { type: null, count: 0 };
          }
          return { inventory: newInv };
        }),
      reorganizeInventory: () =>
        set((state) => {
          const STACK_SIZE = 100;

          // 1. Collect all items by type
          const itemTotals: Record<string, number> = {};
          for (const slot of state.inventory) {
            if (slot.type) {
              itemTotals[slot.type] = (itemTotals[slot.type] || 0) + slot.count;
            }
          }

          // 2. Create new organized inventory
          const newInv: InventorySlot[] = [];

          // Sort item types alphabetically for consistent ordering
          const sortedTypes = Object.keys(itemTotals).sort();

          for (const itemType of sortedTypes) {
            let remaining = itemTotals[itemType];
            while (remaining > 0) {
              const stackCount = Math.min(remaining, STACK_SIZE);
              newInv.push({ type: itemType, count: stackCount });
              remaining -= stackCount;
            }
          }

          // 3. Fill remaining slots with empty
          while (newInv.length < state.inventory.length) {
            newInv.push({ type: null, count: 0 });
          }

          return { inventory: newInv };
        }),
      addItem: (item, amount) =>
        set((state) => {
          let remaining = amount;
          const newInv = state.inventory.map((s) => ({ ...s }));

          // 1. Fill existing stacks
          for (const slot of newInv) {
            if (remaining <= 0) break;
            if (slot.type === item && slot.count < STACK_SIZE) {
              const space = STACK_SIZE - slot.count;
              const toAdd = Math.min(space, remaining);
              slot.count += toAdd;
              remaining -= toAdd;
            }
          }

          // 2. Fill empty slots
          for (const slot of newInv) {
            if (remaining <= 0) break;
            if (slot.type === null) {
              slot.type = item;
              const toAdd = Math.min(STACK_SIZE, remaining);
              slot.count = toAdd;
              remaining -= toAdd;
            }
          }

          return { inventory: newInv };
        }),
      removeItem: (item, amount) =>
        set((state) => {
          let remaining = amount;
          const newInv = state.inventory.map((s) => ({ ...s }));

          // Remove from last slots first (common game logic) or first? Let's do first found.
          for (const slot of newInv) {
            if (remaining <= 0) break;
            if (slot.type === item) {
              const toRemove = Math.min(slot.count, remaining);
              slot.count -= toRemove;
              remaining -= toRemove;
              if (slot.count === 0) {
                slot.type = null;
              }
            }
          }

          return { inventory: newInv };
        }),
      setSelectedBuilding: (building) => set({ selectedBuilding: building }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCameraAngles: (azimuth, elevation) =>
        set({ cameraAzimuth: azimuth, cameraElevation: elevation }),

      // UI Overhaul Implementation
      isBuildingMenuOpen: false,
      toggleBuildingMenu: () =>
        set((state) => ({ isBuildingMenuOpen: !state.isBuildingMenuOpen })),
      hotbar: Array(9).fill(null), // Default setup
      setHotbarSlot: (index, buildingId) =>
        set((state) => {
          const newHotbar = [...state.hotbar];
          if (index >= 0 && index < newHotbar.length) {
            newHotbar[index] = buildingId;
          }
          return { hotbar: newHotbar };
        }),

      // Building Limits
      buildingCounts: {},
      updateBuildingCount: (type, delta) =>
        set((state) => {
          const current = state.buildingCounts[type] || 0;
          return {
            buildingCounts: {
              ...state.buildingCounts,
              [type]: Math.max(0, current + delta),
            },
          };
        }),
      resetBuildingCounts: () => set({ buildingCounts: {} }),
      reset: () =>
        set({
          inventory: Array(INVENTORY_SIZE)
            .fill(null)
            .map(() => ({ type: null, count: 0 })),
          selectedBuilding: null,
          buildingCounts: {},
          hotbar: Array(9).fill(null),
          openedEntityKey: null,
          hoveredEntityKey: null,
          unlockedSkills: [],
          unlockedBuildings: ["hub"],
          pendingUnlocks: [],
          isUnlimitedResources: false,
          activeDialogueId: null,
          seenDialogues: [],
          focusedElement: null,
          unlockedRecipes: [],
          purchasedCounts: {},
        }),

      // Skill Tree
      unlockedSkills: [],
      unlockSkill: (skillId) =>
        set((state) => ({
          unlockedSkills: state.unlockedSkills.includes(skillId)
            ? state.unlockedSkills
            : [...state.unlockedSkills, skillId],
        })),
      resetSkillTree: () => set({ unlockedSkills: [], pendingUnlocks: [] }),
      isSkillTreeOpen: false,
      setSkillTreeOpen: (open) => set({ isSkillTreeOpen: open }),

      // Pending Unlocks
      pendingUnlocks: [],
      startUnlock: (skillId, duration) =>
        set((state) => {
          // Don't start if already pending
          if (state.pendingUnlocks.some((p) => p.skillId === skillId)) {
            return state;
          }
          return {
            pendingUnlocks: [
              ...state.pendingUnlocks,
              {
                skillId,
                startTime: Date.now(),
                duration,
              },
            ],
          };
        }),
      cancelUnlock: (skillId) =>
        set((state) => ({
          pendingUnlocks: state.pendingUnlocks.filter(
            (p) => p.skillId !== skillId,
          ),
        })),
      completeUnlock: (skillId) =>
        set((state) => ({
          pendingUnlocks: state.pendingUnlocks.filter(
            (p) => p.skillId !== skillId,
          ),
          unlockedSkills: state.unlockedSkills.includes(skillId)
            ? state.unlockedSkills
            : [...state.unlockedSkills, skillId],
        })),

      unlockedBuildings: ["hub"], // Only Hub is a starter item
      unlockBuilding: (buildingId) =>
        set((state) => ({
          unlockedBuildings: state.unlockedBuildings.includes(buildingId)
            ? state.unlockedBuildings
            : [...state.unlockedBuildings, buildingId],
        })),
      unlockedRecipes: [],
      unlockRecipe: (recipeId) =>
        set((state) => ({
          unlockedRecipes: state.unlockedRecipes.includes(recipeId)
            ? state.unlockedRecipes
            : [...state.unlockedRecipes, recipeId],
        })),
      hasResources: (cost) => {
        const state = _get();
        if (state.isUnlimitedResources) return true;

        // Aggregate inventory
        const totalResources: Record<string, number> = {};
        for (const slot of state.inventory) {
          if (slot.type) {
            totalResources[slot.type] =
              (totalResources[slot.type] || 0) + slot.count;
          }
        }
        // Check cost
        for (const [resource, amount] of Object.entries(cost)) {
          if ((totalResources[resource] || 0) < amount) {
            return false;
          }
        }
        return true;
      },
      removeResources: (cost) =>
        set((state) => {
          if (state.isUnlimitedResources) return state;

          const newInv = state.inventory.map((s) => ({ ...s }));
          for (const [resource, amount] of Object.entries(cost)) {
            let remaining = amount;
            // Remove from stacks
            for (const slot of newInv) {
              if (remaining <= 0) break;
              if (slot.type === resource) {
                const toRemove = Math.min(slot.count, remaining);
                slot.count -= toRemove;
                remaining -= toRemove;
                if (slot.count === 0) {
                  slot.type = null;
                }
              }
            }
          }
          return { inventory: newInv };
        }),

      // Debug / Cheats
      isUnlimitedResources: false,
      toggleUnlimitedResources: () =>
        set((state) => ({
          isUnlimitedResources: !state.isUnlimitedResources,
        })),
      unlockAllSkills: () =>
        set(() => {
          const allSkillIds = SKILL_TREE.map((node) => node.id);
          const allUnlockBuildings = SKILL_TREE.filter(
            (node) => node.type === "unlock",
          ).map((node) => node.buildingId);

          return {
            unlockedSkills: allSkillIds,
            unlockedBuildings: ["hub", ...allUnlockBuildings],
            pendingUnlocks: [], // Clear any pending
          };
        }),

      // Dialogue
      activeDialogueId: null,
      seenDialogues: [],
      showDialogue: (id) =>
        set((state) => {
          if (state.activeDialogueId) return state; // Block if something is active

          const config = DIALOGUES[id];
          const isSeen = state.seenDialogues.includes(id);

          // Allow if not seen OR if repeatable
          if (isSeen && !config?.repeatable) return state;

          return { activeDialogueId: id };
        }),
      hideDialogue: () =>
        set((state) => {
          if (!state.activeDialogueId) return { activeDialogueId: null };

          const currentId = state.activeDialogueId;
          const currentConfig = DIALOGUES[currentId];
          const newSeen = state.seenDialogues.includes(currentId)
            ? state.seenDialogues
            : [...state.seenDialogues, currentId];

          // Check for next in sequence
          if (currentConfig?.next && !newSeen.includes(currentConfig.next)) {
            return {
              activeDialogueId: currentConfig.next,
              seenDialogues: newSeen,
            };
          }

          return { activeDialogueId: null, seenDialogues: newSeen };
        }),
      markDialogueSeen: (id) =>
        set((state) => ({
          seenDialogues: state.seenDialogues.includes(id)
            ? state.seenDialogues
            : [...state.seenDialogues, id],
        })),

      // Interactive Tutorial
      focusedElement: null,
      setFocusedElement: (id) => set({ focusedElement: id }),

      // Shop
      purchasedCounts: {},
      buyBuilding: (buildingId: string) =>
        set((state) => {
          const current = state.purchasedCounts[buildingId] || 0;
          return {
            purchasedCounts: {
              ...state.purchasedCounts,
              [buildingId]: current + 1,
            },
          };
        }),
    }),
    {
      name: "factory-game-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({
        // Select which fields to persist
        inventory: state.inventory,
        hotbar: state.hotbar,
        unlockedSkills: state.unlockedSkills,
        unlockedBuildings: state.unlockedBuildings,
        pendingUnlocks: state.pendingUnlocks,
        isUnlimitedResources: state.isUnlimitedResources,
        seenDialogues: state.seenDialogues,
        purchasedCounts: state.purchasedCounts,
        unlockedRecipes: state.unlockedRecipes,
      }),
    },
  ),
);
