"use client";

import { useGameStore } from "@/game/state/store";
import clsx from "clsx";
import ModelPreview from "./ModelPreview";
import { BuildingId, getBuildingConfig } from "@/game/buildings/BuildingConfig";
import BuildingHoverCard from "./BuildingHoverCard";
import { getAllowedCount } from "@/game/buildings/hub/shop/ShopConfig";

export default function BuildingSidebar() {
  const selectedBuilding = useGameStore((state) => state.selectedBuilding);
  const setSelectedBuilding = useGameStore(
    (state) => state.setSelectedBuilding,
  );
  const hotbar = useGameStore((state) => state.hotbar);
  const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);
  const buildingCounts = useGameStore((state) => state.buildingCounts);
  const purchasedCounts = useGameStore((state) => state.purchasedCounts);

  // Subscribe to inventory to trigger re-renders when resources change
  const _inventory = useGameStore((state) => state.inventory);
  const hasResources = useGameStore((state) => state.hasResources);

  const setHoveredBarBuilding = useGameStore(
    (state) => state.setHoveredBarBuilding,
  );
  const isBuildingMenuOpen = useGameStore((state) => state.isBuildingMenuOpen);
  const hoveredBarBuilding = useGameStore((state) => state.hoveredBarBuilding);

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const source = e.dataTransfer.getData("source");
    console.log("Drop source:", source);

    if (source === "hotbar") {
      const sourceIndex = parseInt(e.dataTransfer.getData("index"));
      if (!isNaN(sourceIndex) && sourceIndex !== index) {
        // Swap logic
        const sourceId = hotbar[sourceIndex];
        const targetId = hotbar[index];

        // We need to update both.
        // Since Zustand updates trigger re-renders, doing one then the other might be glitchy but likely fine.
        // Better to have a swap action, but this works for now.
        setHotbarSlot(sourceIndex, targetId);
        setHotbarSlot(index, sourceId);
      }
    } else {
      // From Building Menu
      const buildingId = e.dataTransfer.getData("buildingId");
      if (buildingId) {
        setHotbarSlot(index, buildingId as BuildingId);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-row gap-2 pointer-events-auto items-end bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
      {hotbar.map((buildingId, index) => {
        const isSelected = !!buildingId && selectedBuilding === buildingId;

        // Get Count Info & Affordability
        let countDisplay = null;
        let canAfford = true;

        if (buildingId) {
          const config = getBuildingConfig(buildingId);

          if (config) {
            canAfford = hasResources(config.cost);

            const maxCount = getAllowedCount(
              buildingId as BuildingId,
              purchasedCounts[buildingId] || 0,
            );
            const current = buildingCounts[buildingId] || 0;
            const isLimitReached = current >= maxCount;
            const isInfinite = maxCount === Infinity;

            if (!isInfinite) {
              countDisplay = (
                <div
                  className={clsx(
                    "absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-sm z-sub-header",
                    isLimitReached
                      ? "bg-red-900/90 text-red-200 border-red-500/50"
                      : "bg-gray-800/90 text-gray-300 border-white/20",
                  )}
                >
                  {current}/{maxCount}
                </div>
              );
            }
          }
        }

        return (
          <div
            key={index}
            className="relative group"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Slot Number */}
            <span className="absolute left-1 top-1 text-[10px] text-gray-500 font-mono z-sub-content">
              {index + 1}
            </span>

            {countDisplay}

            {/* Hover Card */}
            {buildingId &&
              !isBuildingMenuOpen &&
              hoveredBarBuilding === buildingId && (
                <BuildingHoverCard
                  config={getBuildingConfig(buildingId)!}
                  variant="minimal"
                />
              )}

            <button
              draggable={!!buildingId}
              onMouseEnter={() => setHoveredBarBuilding(buildingId)}
              onMouseLeave={() => setHoveredBarBuilding(null)}
              onDragStart={(e) => {
                if (buildingId) {
                  e.dataTransfer.setData("source", "hotbar");
                  e.dataTransfer.setData("index", index.toString());
                  e.dataTransfer.setData("buildingId", buildingId);
                }
              }}
              onClick={() =>
                buildingId &&
                setSelectedBuilding(isSelected ? null : buildingId)
              }
              disabled={!buildingId}
              className={clsx(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 border-2 relative overflow-hidden",
                isSelected
                  ? "bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10",
                !!buildingId &&
                  canAfford &&
                  "cursor-grab active:cursor-grabbing",
                !!buildingId &&
                  !canAfford &&
                  "cursor-not-allowed opacity-50 border-red-900/30",
              )}
              title={buildingId || "Empty Slot"}
            >
              {buildingId ? (
                <div className="p-2">
                  <ModelPreview
                    type="building"
                    id={buildingId}
                    width={48}
                    height={48}
                    static={true}
                  />
                </div>
              ) : (
                <div className="text-white/10 text-xs">+</div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
