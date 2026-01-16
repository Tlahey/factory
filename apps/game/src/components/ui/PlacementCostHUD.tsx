"use client";

import { useGameStore } from "@/game/state/store";
import { getBuildingConfig } from "@/game/buildings/BuildingConfig";
import ModelPreview from "./ModelPreview";
import clsx from "clsx";

export function PlacementCostHUD() {
  const selectedBuilding = useGameStore((state) => state.selectedBuilding);
  const hoveredBarBuilding = useGameStore((state) => state.hoveredBarBuilding);
  const inventory = useGameStore((state) => state.inventory);

  const activeBuildingId = hoveredBarBuilding || selectedBuilding;
  const isBuildingMenuOpen = useGameStore((state) => state.isBuildingMenuOpen);

  if (
    isBuildingMenuOpen ||
    !activeBuildingId ||
    activeBuildingId === "select" ||
    activeBuildingId === "delete"
  ) {
    return null;
  }

  const config = getBuildingConfig(activeBuildingId);
  if (!config?.cost || Object.keys(config.cost).length === 0) return null;

  const getAvailable = (resource: string) => {
    return inventory.reduce(
      (acc, slot) => (slot.type === resource ? acc + slot.count : acc),
      0,
    );
  };

  return (
    <div className="flex gap-3 justify-center items-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
      {Object.entries(config.cost).map(([resource, cost]) => {
        const available = getAvailable(resource);
        const canAfford = available >= cost;

        return (
          <div
            key={resource}
            className={clsx(
              "group relative w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 border-2 pointer-events-auto",
              canAfford
                ? "bg-slate-800/70 border-white/40 shadow-lg hover:border-amber-400/40"
                : "bg-red-950/70 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
            )}
          >
            {/* Inner Glow/Background for visibility */}
            <div className="absolute inset-2 bg-white/5 rounded-full blur-xl opacity-100" />

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 z-10 capitalize">
              {resource.replace(/_/g, " ")}
            </div>

            <div className="w-12 h-12 flex items-center justify-center relative z-0">
              <ModelPreview
                type="item"
                id={resource}
                width={48}
                height={48}
                static
              />
            </div>

            {/* Cost Badge */}
            <div
              className={clsx(
                "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-sm z-10",
                canAfford
                  ? "bg-slate-900 text-amber-400 border-white/20"
                  : "bg-red-900 text-red-100 border-red-500/50",
              )}
            >
              {cost}
            </div>
          </div>
        );
      })}
    </div>
  );
}
