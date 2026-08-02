"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import BuildingSidebar from "@/components/ui/BuildingSidebar";
import ControlBar from "@/components/ui/ControlBar";
import CameraControls from "@/components/ui/CameraControls";
import GameMenu from "@/components/ui/GameMenu";
import BuildingInfoPanel from "@/components/ui/BuildingInfoPanel";
import BuildingMenu from "@/components/ui/BuildingMenu";
import HUD from "@/components/ui/HUD";
import PendingUnlocksHUD from "@/components/ui/PendingUnlocksHUD";
import { useGameStore } from "@/game/state/store";
import DebugMenu from "@/components/ui/DebugMenu";
import DebugOverlay from "@/components/ui/DebugOverlay";
import DebugLogPanel from "@/components/ui/DebugLogPanel";
import DialogueOverlay from "@/components/ui/DialogueOverlay";
import HighlightOverlay from "@/components/ui/HighlightOverlay";
import WorldTooltip from "@/components/ui/WorldTooltip";
import { PlacementCostHUD } from "@/components/ui/PlacementCostHUD";
import {
  readBuildingDragPayload,
  readItemDragPayload,
} from "@/components/ui/dnd";

// R3F Canvas - Migrated from legacy GameCanvas
const GameCanvas = dynamic(() => import("@/components/R3FCanvas"), {
  ssr: false,
});

export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "warning";
  } | null>(null);

  const showToast = useCallback(
    (msg: string, type: "success" | "error" | "warning" = "success") => {
      setToast({ message: msg, type });
      setTimeout(
        () => setToast((prev) => (prev && prev.message === msg ? null : prev)),
        2000,
      );
    },
    [],
  );

  const togglePause = useCallback((force?: boolean) => {
    setIsPaused((prev) => {
      const newState = force !== undefined ? force : !prev;
      console.log("Home: Toggling pause to", newState);
      window.dispatchEvent(
        new CustomEvent("GAME_TOGGLE_PAUSE", { detail: newState }),
      );
      return newState;
    });
  }, []);

  const handleSave = useCallback(() => {
    const currentInventory = useGameStore.getState().inventory;
    window.dispatchEvent(
      new CustomEvent("GAME_SAVE", {
        detail: { inventory: { ...currentInventory } },
      }),
    );
    showToast("Game Saved!");
  }, [showToast]);

  const handleLoad = useCallback(() => {
    window.dispatchEvent(new CustomEvent("GAME_LOAD"));
    showToast("Game Loaded!");
    togglePause(false);
  }, [showToast, togglePause]);

  const handleNewGame = useCallback(() => {
    window.dispatchEvent(new CustomEvent("GAME_NEW"));
    togglePause(false);
    showToast("New Game Started!");
  }, [showToast, togglePause]);

  const resetInventory = useGameStore((state) => state.resetInventory);
  const setInventory = useGameStore((state) => state.setInventory);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Priority Escape Logic (Stack-like behavior)
      if (e.key === "Escape") {
        const state = useGameStore.getState();

        // 1. Close Building Menu
        if (state.isBuildingMenuOpen) {
          state.toggleBuildingMenu();
          return;
        }

        // 2. Close Info Panel / Hub
        if (state.openedEntityKey) {
          state.setOpenedEntityKey(null);
          return;
        }

        // 3. Close Inventory
        if (state.isInventoryOpen) {
          state.toggleInventory();
          return;
        }

        // 4. Cancel Building Selection / Deletion Tool
        if (state.selectedBuilding) {
          state.setSelectedBuilding(null);
          return;
        }

        // 5. Default: Toggle Pause Menu
        togglePause();
        return;
      }

      if (e.key === "b" || e.key === "B") {
        useGameStore.getState().toggleBuildingMenu();
      }
      if (e.key === "F5") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "F3") {
        e.preventDefault();
        useGameStore.getState().toggleDebugOverlay();
      }
    };

    const handleResetInv = () => {
      resetInventory();
    };

    const handleLoadInv = (e: Event) => {
      const invData = (e as CustomEvent).detail;
      if (invData) {
        setInventory(invData);
      }
    };

    const handleShowToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") {
        showToast(detail);
      } else if (detail && typeof detail.message === "string") {
        showToast(detail.message, detail.type || "success");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("GAME_RESET_INVENTORY", handleResetInv);
    window.addEventListener("GAME_LOAD_INVENTORY", handleLoadInv);
    window.addEventListener("GAME_SHOW_TOAST", handleShowToast);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("GAME_RESET_INVENTORY", handleResetInv);
      window.removeEventListener("GAME_LOAD_INVENTORY", handleLoadInv);
      window.removeEventListener("GAME_SHOW_TOAST", handleShowToast);
    };
  }, [togglePause, handleSave, resetInventory, setInventory, showToast]);

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // If dropped on the map (global), and source is chest/extractor, we delete it.
    const itemPayload = readItemDragPayload(e);
    if (itemPayload?.source === "chest") {
      window.dispatchEvent(
        new CustomEvent("GAME_ITEM_DELETE", {
          detail: {
            source: "chest",
            sourceIndex: itemPayload.index,
          },
        }),
      );
      return;
    }

    const buildingPayload = readBuildingDragPayload(e);
    if (buildingPayload?.source === "hotbar") {
      useGameStore.getState().setHotbarSlot(buildingPayload.index, null);
    }
  };

  return (
    <main
      className="w-full h-screen overflow-hidden bg-black relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      <div className="absolute inset-0 z-base text-white">
        <GameCanvas />
      </div>

      {toast && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-toast text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-fade-in-up whitespace-nowrap border border-white/20 ${
            toast.type === "error"
              ? "bg-red-500 border-red-400/20"
              : toast.type === "warning"
                ? "bg-amber-500 border-amber-400/20"
                : "bg-green-500 border-green-400/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      <GameMenu
        isPaused={isPaused}
        onResume={() => togglePause(false)}
        onSave={handleSave}
        onLoad={handleLoad}
        onNewGame={handleNewGame}
      />

      <DebugMenu />
      <DebugOverlay />
      <DebugLogPanel />

      <div
        className={`transition-opacity duration-300 ${isPaused ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <HUD />
        <DialogueOverlay />
        <HighlightOverlay />
        <WorldTooltip />
        <PendingUnlocksHUD />
        <BuildingInfoPanel />

        {/* Level 1: Control Bar & World Tools (Behind Menu) */}
        <div className="absolute inset-0 z-hud pointer-events-none p-6 text-white">
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
            <ControlBar />
          </div>
          <div className="absolute bottom-6 right-6">
            <CameraControls />
          </div>
        </div>

        {/* Level 3: Cost HUD (Behind Menu / HUD level) */}
        <div className="absolute inset-0 z-hud pointer-events-none p-6 text-white">
          <div className="absolute bottom-44 left-1/2 -translate-x-1/2">
            <PlacementCostHUD />
          </div>
        </div>

        {/* Level 4: Building Menu (Modal - z-dialog: 200) */}
        <BuildingMenu />

        {/* Level 5: Hotbar Sidebar (On Top for Interaction - z-hud: 210) */}
        <div className="absolute inset-0 z-hud pointer-events-none p-6 text-white">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end">
            <BuildingSidebar />
          </div>
        </div>
      </div>
    </main>
  );
}
