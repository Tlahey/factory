"use client";

import { useGameStore } from "@/game/state/store";
import { useMousePosition } from "@/hooks/useMousePosition";
import { getBuildingConfig } from "@/game/buildings/BuildingConfig";
import ModelPreview from "./ModelPreview";

export function PlacementResourceTooltip() {
  const selectedBuilding = useGameStore((state) => state.selectedBuilding);
  const inventory = useGameStore((state) => state.inventory);
  const mouse = useMousePosition();

  if (
    !selectedBuilding ||
    selectedBuilding === "select" ||
    selectedBuilding === "delete"
  ) {
    return null;
  }

  const config = getBuildingConfig(selectedBuilding);
  if (!config?.cost) return null;

  // Calculate available resources
  const getAvailable = (resource: string) => {
    return inventory.reduce(
      (acc, slot) => (slot.type === resource ? acc + slot.count : acc),
      0,
    );
  };

  return (
    <div
      className="fixed z-tooltip pointer-events-none flex flex-col gap-2"
      style={{
        left: mouse.x + 20,
        top: mouse.y + 20,
      }}
    >
      <div className="bg-black/80 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl space-y-2">
        <h4 className="text-[10px] uppercase font-bold text-gray-400 mb-1 border-b border-white/10 pb-1">
          Construction Cost
        </h4>
        {Object.entries(config.cost).map(([resource, cost]) => {
          const available = getAvailable(resource);
          const canAfford = available >= cost;

          return (
            <div key={resource} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded border border-white/10 overflow-hidden relative">
                <ModelPreview
                  type="item"
                  id={resource}
                  width={32}
                  height={32}
                  static
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white capitalize">
                  {resource.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className={canAfford ? "text-white" : "text-red-400"}>
                    {cost}
                  </span>
                  <span className="text-gray-500">({available})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
