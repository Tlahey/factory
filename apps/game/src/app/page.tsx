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
import DialogueOverlay from "@/components/ui/DialogueOverlay";
import HighlightOverlay from "@/components/ui/HighlightOverlay";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
});

export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 2000);
  }, []);

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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("GAME_RESET_INVENTORY", handleResetInv);
    window.addEventListener("GAME_LOAD_INVENTORY", handleLoadInv);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("GAME_RESET_INVENTORY", handleResetInv);
      window.removeEventListener("GAME_LOAD_INVENTORY", handleLoadInv);
    };
  }, [togglePause, handleSave, resetInventory, setInventory]);

  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      <div className="absolute inset-0 z-0 text-white">
        <GameCanvas />
      </div>

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] bg-green-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-fade-in-up whitespace-nowrap border border-white/20">
          {toast}
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

      <div
        className={`transition-opacity duration-300 ${isPaused ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <HUD />
        <DialogueOverlay />
        <HighlightOverlay />
        <PendingUnlocksHUD />
        <BuildingInfoPanel />
        <BuildingMenu />
        <div className="absolute inset-0 z-[60] pointer-events-none p-6">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end z-10">
            <BuildingSidebar />
          </div>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
            <ControlBar />
          </div>
          <div className="absolute bottom-6 right-6">
            <CameraControls />
          </div>
        </div>
      </div>
    </main>
  );
}
