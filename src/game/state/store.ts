import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  viewMode: '2D' | '3D';
  setViewMode: (mode: '2D' | '3D') => void;
  
  isInventoryOpen: boolean;
  toggleInventory: () => void;

  cameraAzimuth: number;
  cameraElevation: number;
  setCameraAngles: (azimuth: number, elevation: number) => void;
  openedEntityKey: string | null;
  setOpenedEntityKey: (key: string | null) => void;
  resetInventory: () => void;
  setInventory: (inventory: InventorySlot[]) => void;
  updateInventorySlot: (index: number, slot: InventorySlot) => void;
  swapInventorySlots: (fromIndex: number, toIndex: number) => void;

  // UI Overhaul
  isBuildingMenuOpen: boolean;
  toggleBuildingMenu: () => void;
  hotbar: (string | null)[];
  setHotbarSlot: (index: number, buildingId: string | null) => void;

  // Building Limits
  buildingCounts: Record<string, number>;
  updateBuildingCount: (type: string, delta: number) => void;
  reset: () => void;
}

const INVENTORY_SIZE = 10;
const STACK_SIZE = 100; // Define a stack size limit for personal inventory

export const useGameStore = create<GameState>()(
  persist(
    (set, _get) => ({
      inventory: Array(INVENTORY_SIZE).fill(null).map(() => ({ type: null, count: 0 })),
      selectedBuilding: null,
      viewMode: '3D',
      isInventoryOpen: false,
      toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
      cameraAzimuth: Math.PI / 4,
      cameraElevation: Math.PI / 3,
      openedEntityKey: null,
      setOpenedEntityKey: (key) => set({ openedEntityKey: key }),
      resetInventory: () => set({ inventory: Array(INVENTORY_SIZE).fill(null).map(() => ({ type: null, count: 0 })) }),
      setInventory: (inventory) => {
        // Ensure we always have fixed size, even if loaded data is different
        const newInv: InventorySlot[] = Array(INVENTORY_SIZE).fill(null).map(() => ({ type: null, count: 0 }));
        inventory.forEach((slot, i) => {
          if (i < INVENTORY_SIZE) newInv[i] = { ...slot };
        });
        set({ inventory: newInv });
      },
      updateInventorySlot: (index, slot) => set((state) => {
        const newInv = [...state.inventory];
        if (index >= 0 && index < newInv.length) {
          newInv[index] = slot;
        }
        return { inventory: newInv };
      }),
      swapInventorySlots: (fromIndex: number, toIndex: number) => set((state) => {
        const newInv = [...state.inventory];
        if (fromIndex >= 0 && fromIndex < newInv.length && toIndex >= 0 && toIndex < newInv.length) {
          const temp = newInv[fromIndex];
          newInv[fromIndex] = newInv[toIndex];
          newInv[toIndex] = temp;
        }
        return { inventory: newInv };
      }),
      addItem: (item, amount) =>
        set((state) => {
          let remaining = amount;
          const newInv = state.inventory.map(s => ({ ...s }));

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
          const newInv = state.inventory.map(s => ({ ...s }));

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
      setCameraAngles: (azimuth, elevation) => set({ cameraAzimuth: azimuth, cameraElevation: elevation }),

      // UI Overhaul Implementation
      isBuildingMenuOpen: false,
      toggleBuildingMenu: () => set((state) => ({ isBuildingMenuOpen: !state.isBuildingMenuOpen })),
      hotbar: ['extractor', 'conveyor', 'chest', 'hub', 'electric_pole', 'cable', null, null, null], // Default setup
      setHotbarSlot: (index, buildingId) => set((state) => {
        const newHotbar = [...state.hotbar];
        if (index >= 0 && index < newHotbar.length) {
          newHotbar[index] = buildingId;
        }
        return { hotbar: newHotbar };
      }),

      // Building Limits
      buildingCounts: {},
      updateBuildingCount: (type, delta) => set((state) => {
        const current = state.buildingCounts[type] || 0;
        return {
          buildingCounts: {
            ...state.buildingCounts,
            [type]: Math.max(0, current + delta),
          }
        };
      }),
      reset: () => set({
        inventory: Array(INVENTORY_SIZE).fill(null).map(() => ({ type: null, count: 0 })),
        selectedBuilding: null,
        buildingCounts: {},
        hotbar: ['extractor', 'conveyor', 'chest', 'hub', 'electric_pole', 'cable', null, null, null],
        openedEntityKey: null,
      }),
    }),
    {
      name: 'factory-game-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({ // Select which fields to persist
        inventory: state.inventory,
        hotbar: state.hotbar,
      }),
    }
  )
);

