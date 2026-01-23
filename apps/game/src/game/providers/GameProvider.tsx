"use client";

import {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import * as THREE from "three";
import { World } from "../core/World";
import { FactorySystem } from "../systems/FactorySystem";
import { PowerSystem } from "../systems/PowerSystem";
import { GuidanceSystem } from "../systems/GuidanceSystem";
import { useGameStore } from "../state/store";

interface GameContextValue {
  world: World;
  factorySystem: FactorySystem;
  powerSystem: PowerSystem;
  guidanceSystem: GuidanceSystem;

  // Logic Control
  togglePause: (paused?: boolean) => void;
  isPaused: boolean;

  // Visual Signals
  cablesDirtyRef: React.MutableRefObject<boolean>;
  markCablesDirty: () => void;

  // Lifecycle
  initializeRenderer: (
    scene: THREE.Scene,
    camera: THREE.Camera,
    gl: THREE.WebGLRenderer,
  ) => void;

  // Updates
  worldRevision: number;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGameContext must be used within GameContextProvider");
  }
  return ctx;
}

interface GameContextProviderProps {
  children: ReactNode;
}

export function GameContextProvider({ children }: GameContextProviderProps) {
  // 1. Instantiate Systems (Singleton scope for this provider)
  // We use useMemo with empty deps to create them ONCE.
  const systems = useMemo(() => {
    const world = new World();
    const factorySystem = new FactorySystem(world);
    const powerSystem = new PowerSystem(world);
    const guidanceSystem = new GuidanceSystem(world);
    return { world, factorySystem, powerSystem, guidanceSystem };
  }, []);

  const { world, factorySystem, powerSystem, guidanceSystem } = systems;

  // 2. State & Refs
  const cablesDirtyRef = useRef(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [worldRevision, setWorldRevision] = useState(0); // For forcing re-renders of terrain
  const [isLoading, setIsLoading] = useState(true); // Block rendering until initial load checks are done

  // 3. Helpers
  const markCablesDirty = () => {
    cablesDirtyRef.current = true;
  };

  const togglePause = (val?: boolean) => {
    setIsPaused((prev) => val ?? !prev);
  };

  // 4. Bind World Interceptors (Logic Triggers)
  useEffect(() => {
    // Intercept Place/Remove to Trigger Logic Updates
    const originalPlace = world.placeBuilding.bind(world);
    // eslint-disable-next-line react-hooks/immutability
    world.placeBuilding = (x, y, type, direction, skipValidation = false) => {
      const res = originalPlace(x, y, type, direction, skipValidation);
      if (res) {
        powerSystem.rebuildNetworks();
        markCablesDirty();

        // Tutorial Logic
        if (type === "hub") {
          const state = useGameStore.getState();
          if (!state.seenDialogues.includes("hub_placed")) {
            state.showDialogue("hub_placed");
          }
        }
      }
      return res;
    };

    const originalRemove = world.removeBuilding.bind(world);
    world.removeBuilding = (x, y) => {
      const res = originalRemove(x, y);
      if (res) {
        powerSystem.rebuildNetworks();
        markCablesDirty();
      }
      return res;
    };

    return () => {
      // Restore original methods if needed?
      // Since world is destroyed on unmount, it maps 1:1 to provider lifecycle.
      // No cleanup strictly needed for methods.
    };
  }, [world, powerSystem]);

  // 5. Expose to window for UI (Backward Compatibility)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).game = {
      world,
      factorySystem,
      powerSystem,
      guidanceSystem,
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).game?.world === world) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).game;
      }
    };
  }, [world, factorySystem, powerSystem, guidanceSystem]);

  // 6. Global Event Listeners (Save/Load/Pause) & Initial Load
  useEffect(() => {
    if (isDestroyed) return;

    const handleSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      const inv = customEvent.detail?.inventory;

      const worldData = world.serialize();
      const saveData = {
        world: worldData,
        inventory: inv || [],
        timestamp: Date.now(),
      };
      localStorage.setItem("factory_save", JSON.stringify(saveData));
    };

    const loadFromStorage = (): boolean => {
      const saved = localStorage.getItem("factory_save");
      if (!saved) return false;
      try {
        const rawData = JSON.parse(saved);
        let worldData, inventoryData;

        // Legacy support
        if (rawData.world) {
          worldData = rawData.world;
          inventoryData = rawData.inventory || [];
        } else {
          worldData = rawData;
          inventoryData = [];
        }

        // Inventory Migration logic
        if (
          inventoryData &&
          !Array.isArray(inventoryData) &&
          typeof inventoryData === "object"
        ) {
          // Convert object-like array {0: x, 1: y} to array [x, y]
          inventoryData = Object.values(inventoryData);
        }
        if (!Array.isArray(inventoryData)) {
          inventoryData = [];
        }

        world.deserialize(worldData);
        powerSystem.rebuildNetworks();
        markCablesDirty();
        setWorldRevision((prev) => prev + 1);

        // Dispatch inventory event back to UI
        window.dispatchEvent(
          new CustomEvent("GAME_LOAD_INVENTORY", { detail: inventoryData }),
        );
        return true;
      } catch (err) {
        console.error("Load Failed", err);
        return false;
      }
    };

    const handleLoad = () => {
      loadFromStorage();
    };

    const handleNew = () => {
      world.reset();
      useGameStore.getState().reset();
      setWorldRevision((prev) => prev + 1);
      // Dispatch UI reset
      window.dispatchEvent(new CustomEvent("GAME_RESET_INVENTORY"));
      powerSystem.rebuildNetworks();
      markCablesDirty();
      useGameStore.getState().showDialogue("welcome");
    };

    const handleRebuild = () => {
      powerSystem.rebuildNetworks();
    };

    const handleTogglePause = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      togglePause(detail);
    };

    window.addEventListener("GAME_SAVE", handleSave);
    window.addEventListener("GAME_LOAD", handleLoad);
    window.addEventListener("GAME_NEW", handleNew);
    window.addEventListener("GAME_REBUILD_POWER", handleRebuild);
    window.addEventListener("GAME_TOGGLE_PAUSE", handleTogglePause);

    // Initial Load Logic
    const initGame = () => {
      const loaded = loadFromStorage();
      if (!loaded) {
        // No save found, ensure welcome dialogue is shown for new users
        useGameStore.getState().showDialogue("welcome");
      }
      setIsLoading(false);
    };

    initGame();

    return () => {
      setIsDestroyed(true);
      window.removeEventListener("GAME_SAVE", handleSave);
      window.removeEventListener("GAME_LOAD", handleLoad);
      window.removeEventListener("GAME_NEW", handleNew);
      window.removeEventListener("GAME_REBUILD_POWER", handleRebuild);
      window.removeEventListener("GAME_TOGGLE_PAUSE", handleTogglePause);
    };
  }, [world, powerSystem, isDestroyed]);

  // 6. Init Renderer Shim (Optional, mostly no-op now)
  const initializeRenderer = (
    _scene: THREE.Scene,
    _camera: THREE.Camera,
    _gl: THREE.WebGLRenderer,
  ) => {
    // No-op for logic systems
  };

  const value: GameContextValue = {
    world,
    factorySystem,
    powerSystem,
    guidanceSystem,
    togglePause,
    isPaused,
    cablesDirtyRef,
    markCablesDirty,
    initializeRenderer,
    worldRevision,
  };

  return (
    <GameContext.Provider value={value}>
      {!isLoading && children}
    </GameContext.Provider>
  );
}

// Remove useGameAppInstance as we create instance in provider now.
