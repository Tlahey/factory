"use client";

import { useGameStore } from "@/game/state/store";
import { X, Hammer, Lock, Ban, TriangleAlert } from "lucide-react";
import ModelPreview from "./ModelPreview";
import { BUILDINGS } from "@/game/buildings/BuildingConfig";
import { useState } from "react";
import BuildingHoverCard from "./BuildingHoverCard";
import { useTranslation } from "@/hooks/useTranslation";
import clsx from "clsx";

export default function BuildingMenu() {
  const { t } = useTranslation();
  const isBuildingMenuOpen = useGameStore((state) => state.isBuildingMenuOpen);
  const toggleBuildingMenu = useGameStore((state) => state.toggleBuildingMenu);
  const buildingCounts = useGameStore((state) => state.buildingCounts);
  const setSelectedBuilding = useGameStore(
    (state) => state.setSelectedBuilding,
  );
  const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);
  const unlockedBuildings = useGameStore((state) => state.unlockedBuildings);

  // Subscribe to inventory for updates
  const _inventory = useGameStore((state) => state.inventory);
  const hasResources = useGameStore((state) => state.hasResources);

  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(
    null,
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("buildingId", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("source");
    if (source === "hotbar") {
      const index = parseInt(e.dataTransfer.getData("index"));
      if (!isNaN(index)) {
        setHotbarSlot(index, null);
      }
    }
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-200",
        isBuildingMenuOpen
          ? "opacity-100 pointer-events-auto visible"
          : "opacity-0 pointer-events-none invisible",
      )}
    >
      <div
        className={clsx(
          "relative w-[90vw] max-w-6xl h-[80vh] max-h-[750px] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 origin-center",
          isBuildingMenuOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Hammer className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Construction Menu
              </h2>
              <p className="text-gray-400 text-xs">
                Drag buildings to your hotbar
              </p>
            </div>
          </div>
          <button
            onClick={toggleBuildingMenu}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Details Panel (Left) */}
          <div
            id="building-menu-details-panel"
            className="w-80 shrink-0 border-r border-white/10 bg-gray-900/80 p-6 flex flex-col overflow-y-auto"
          >
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-6 flex items-center gap-2">
              {hoveredBuildingId ? t("common.building") : t("common.overview")}
            </h3>

            {hoveredBuildingId && BUILDINGS[hoveredBuildingId] ? (
              <div className="flex-1 space-y-3">
                {/* Limit Reached Warning */}
                {(() => {
                  const b = BUILDINGS[hoveredBuildingId];
                  const currentCount = buildingCounts[b.type] || 0;
                  const isLimitReached = b.maxCount
                    ? currentCount >= b.maxCount
                    : false;

                  if (!isLimitReached) return null;

                  return (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                      <Ban className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-300">
                        Max limit reached ({currentCount}/{b.maxCount})
                      </span>
                    </div>
                  );
                })()}

                {/* Insufficient Resources Warning */}
                {!hasResources(BUILDINGS[hoveredBuildingId].cost) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
                    <TriangleAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-xs font-medium text-amber-200/90">
                      Insufficient resources
                    </span>
                  </div>
                )}

                <BuildingHoverCard
                  config={BUILDINGS[hoveredBuildingId]}
                  variant="full"
                  className="!static !w-full !mr-0 !bg-transparent !border-0 !shadow-none !p-0"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-start justify-center space-y-4 text-gray-300">
                <div className="p-3 rounded-full bg-blue-500/10 mb-2">
                  <Hammer size={32} className="text-blue-400" />
                </div>
                <h4 className="text-lg font-bold text-white">
                  {t("building_menu.intro_title")}
                </h4>
                <p className="text-sm leading-relaxed text-gray-400">
                  {t("building_menu.intro_text")}
                </p>
              </div>
            )}
          </div>

          {/* Main Grid (Right) */}
          <div
            id="building-menu-grid"
            className="flex-1 p-6 overflow-y-auto bg-gray-900/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Object.values(BUILDINGS)
                .filter((b) => {
                  return unlockedBuildings.includes(b.type) || !b.locked;
                })
                .map((b) => {
                  const currentCount = buildingCounts[b.type] || 0;
                  const isLimitReached = b.maxCount
                    ? currentCount >= b.maxCount
                    : false;

                  const isLocked =
                    b.locked && !unlockedBuildings.includes(b.type);

                  const isDisabled = isLimitReached || isLocked;
                  const canAfford = hasResources(b.cost);

                  return (
                    <div
                      key={b.type}
                      id={b.type === "hub" ? "hub-card" : undefined}
                      className={clsx(
                        "aspect-square rounded-xl border transition-all duration-200 group relative flex flex-col items-center justify-center gap-2 p-2",
                        isDisabled
                          ? "bg-gray-900/40 border-red-500/20 opacity-60 cursor-not-allowed"
                          : "bg-black/20 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-lg",
                        hoveredBuildingId === b.type && !isDisabled
                          ? "ring-2 ring-blue-500/50 border-transparent"
                          : "",
                        !canAfford && !isDisabled
                          ? "grayscale opacity-70 border-red-500/20"
                          : "",
                      )}
                      draggable={!isDisabled}
                      onDragStart={(e) =>
                        !isDisabled && handleDragStart(e, b.type)
                      }
                      onMouseEnter={() => setHoveredBuildingId(b.type)}
                      onMouseLeave={() => setHoveredBuildingId(null)}
                      onClick={() => {
                        if (!isDisabled) {
                          setSelectedBuilding(b.type);
                          toggleBuildingMenu();
                        }
                      }}
                    >
                      {/* Count Badge */}
                      {b.maxCount && (
                        <div
                          className={clsx(
                            "absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-sm z-10",
                            isLimitReached
                              ? "bg-red-900/90 text-red-200 border-red-500/50"
                              : "bg-gray-800/90 text-gray-300 border-white/10",
                          )}
                        >
                          {currentCount}/{b.maxCount}
                        </div>
                      )}

                      <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                        <ModelPreview
                          type="building"
                          id={b.type}
                          width={64}
                          height={64}
                        />
                      </div>

                      <div className="text-center w-full px-1 h-10 flex flex-col justify-center">
                        <span
                          className={clsx(
                            "font-bold text-[11px] leading-tight block truncate w-full transition-colors",
                            isDisabled
                              ? "text-red-400"
                              : "text-gray-300 group-hover:text-blue-200",
                          )}
                        >
                          {b.name}
                        </span>

                        <div className="h-4 flex items-center justify-center">
                          {isLocked && (
                            <div className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase tracking-wider">
                              <Lock size={9} /> Locked
                            </div>
                          )}
                          {!isLocked && !canAfford && !isDisabled && (
                            <div className="text-[9px] text-red-400 font-bold">
                              Insufficient
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
