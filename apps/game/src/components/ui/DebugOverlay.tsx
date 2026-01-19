"use client";

import { useGameStore } from "@/game/state/store";
import { useMemo } from "react";

/**
 * DebugOverlay - Minecraft F3-style debug overlay
 * Displays FPS and other debug information.
 * Toggle visibility with F3 key or via Debug Menu.
 */
export default function DebugOverlay() {
  const isVisible = useGameStore((state) => state.isDebugOverlayVisible);
  const currentFPS = useGameStore((state) => state.currentFPS);
  const viewMode = useGameStore((state) => state.viewMode);
  const buildingCounts = useGameStore((state) => state.buildingCounts);

  // Calculate total buildings
  const totalBuildings = useMemo(() => {
    return Object.values(buildingCounts).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
  }, [buildingCounts]);

  if (!isVisible) return null;

  // FPS color indicator
  const fpsColor =
    currentFPS >= 55
      ? "text-green-400"
      : currentFPS >= 30
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="fixed top-4 left-4 z-debug font-mono text-xs text-white/90 pointer-events-none select-none">
      {/* Main Debug Panel */}
      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/10 space-y-1 min-w-48">
        {/* Title */}
        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider border-b border-white/10 pb-1">
          Debug Info (F3)
        </div>

        {/* FPS */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-bold ${fpsColor}`}>{currentFPS}</span>
        </div>

        {/* Target FPS */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Target:</span>
          <span className="text-blue-300">60</span>
        </div>

        <div className="h-px bg-white/10 my-1" />

        {/* View Mode */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">View:</span>
          <span className="text-cyan-300">{viewMode}</span>
        </div>

        {/* Total Buildings */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Buildings:</span>
          <span className="text-orange-300">{totalBuildings}</span>
        </div>

        {/* Memory (if available) */}
        {typeof performance !== "undefined" &&
          "memory" in performance &&
          (
            performance as Performance & {
              memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
            }
          ).memory && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Memory:</span>
                <span className="text-pink-300">
                  {Math.round(
                    ((
                      performance as Performance & {
                        memory: { usedJSHeapSize: number };
                      }
                    ).memory.usedJSHeapSize /
                      1024 /
                      1024) *
                      10,
                  ) / 10}{" "}
                  MB
                </span>
              </div>
            </>
          )}
      </div>

      {/* Hint */}
      <div className="mt-2 text-[10px] text-gray-500">Press F3 to toggle</div>
    </div>
  );
}
