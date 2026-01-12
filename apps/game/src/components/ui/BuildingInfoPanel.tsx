"use client";

import { useGameStore, InventorySlot } from "@/game/state/store";
import { useState, useEffect } from "react";
import { X, Box, Zap, ArrowUp } from "lucide-react";
import { Chest } from "@/game/buildings/chest/Chest";
import { Extractor } from "@/game/buildings/extractor/Extractor";
import { Hub } from "@/game/buildings/hub/Hub";
import { BuildingEntity } from "@/game/entities/BuildingEntity";
import { IWorld } from "@/game/entities/types";
import ModelPreview from "./ModelPreview";
import { useTranslation } from "@/hooks/useTranslation";
import HubDashboard from "./HubDashboard";
import { skillTreeManager } from "@/game/buildings/hub/skill-tree/SkillTreeManager";

export default function BuildingInfoPanel() {
  const { t } = useTranslation();
  const openedEntityKey = useGameStore((state) => state.openedEntityKey);
  const setOpenedEntityKey = useGameStore((state) => state.setOpenedEntityKey);
  const inventory = useGameStore((state) => state.inventory);

  const [building, setBuilding] = useState<BuildingEntity | null>(null);
  const [_, forceUpdate] = useState(0);

  // Clear building immediately when key changes
  useEffect(() => {
    if (!openedEntityKey) return;

    // Immediately fetch the building (async to avoid sync setState warning)
    setTimeout(() => {
      const [x, y] = openedEntityKey.split(",").map(Number);
      const b = (
        window as unknown as { game: { world: IWorld } }
      ).game?.world.getBuilding(x, y);
      setBuilding(b || null);
    }, 0);

    // Poll for updates
    const interval = setInterval(() => {
      const [x, y] = openedEntityKey.split(",").map(Number);
      const b = (
        window as unknown as { game: { world: IWorld } }
      ).game?.world.getBuilding(x, y);
      setBuilding(b || null);
      forceUpdate((n) => n + 1);
    }, 33);

    return () => {
      clearInterval(interval);
      setBuilding(null);
    };
  }, [openedEntityKey]);

  // Event Listener for Drops on HUD (Chest -> HUD)
  useEffect(() => {
    const handleInventoryDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        !building ||
        (!(building instanceof Chest) && !(building instanceof Extractor))
      )
        return;

      const { source, sourceIndex, targetIndex, type } = detail;

      if (source === "chest") {
        const slot = building.slots[sourceIndex];
        if (!slot) return;

        // 1. Add to Player Inventory
        const currentInv = useGameStore.getState().inventory;
        const existingSlot = currentInv[targetIndex];

        let finalCount = slot.count;
        if (existingSlot && existingSlot.type === type) {
          finalCount += existingSlot.count;
        }

        useGameStore
          .getState()
          .updateInventorySlot(targetIndex, { type, count: finalCount });

        // 2. Remove from Chest/Extractor
        if (building.removeSlot) {
          building.removeSlot(sourceIndex);
        } else {
          building.slots.splice(sourceIndex, 1);
        }
        setBuilding(building);
        forceUpdate((n) => n + 1);
      }
    };

    const handleItemDelete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        !building ||
        (!(building instanceof Chest) && !(building instanceof Extractor))
      )
        return;

      const { source, sourceIndex } = detail;

      if (source === "chest") {
        // Just remove
        if (building.removeSlot) {
          building.removeSlot(sourceIndex);
        } else {
          building.slots.splice(sourceIndex, 1);
        }
        setBuilding(building);
        forceUpdate((n) => n + 1);
      }
    };

    window.addEventListener("GAME_INVENTORY_DROP", handleInventoryDrop);
    window.addEventListener("GAME_ITEM_DELETE", handleItemDelete);
    return () => {
      window.removeEventListener("GAME_INVENTORY_DROP", handleInventoryDrop);
      window.removeEventListener("GAME_ITEM_DELETE", handleItemDelete);
    };
  }, [building]);

  if (!openedEntityKey || !building) return null;

  const config = building.getConfig();
  if (!config) return null;

  const handleClose = () => {
    setOpenedEntityKey(null);
  };

  const isChest = building instanceof Chest;
  const isHub = building instanceof Hub;

  // Get current upgrade level for buildings
  const buildingType = building.getType();
  const upgradeLevel = skillTreeManager.getBuildingUpgradeLevel(buildingType);
  const activeUpgrade = skillTreeManager.getActiveUpgrade(buildingType);

  const handleDragStart = (
    e: React.DragEvent,
    source: "chest" | "inventory",
    index: number,
    slot: InventorySlot,
  ) => {
    if (!slot || !slot.type) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("source", source);
    e.dataTransfer.setData("index", index.toString());
    e.dataTransfer.setData("type", slot.type);
    e.dataTransfer.setData("count", slot.count.toString());
  };

  const handleDrop = (
    e: React.DragEvent,
    target: "chest" | "inventory",
    _targetIndex: number,
  ) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("source") as "chest" | "inventory";
    const sourceIndex = parseInt(e.dataTransfer.getData("index"));

    if (source === target) return;

    if (source === "chest" && target === "inventory") {
      // Logic handled by HUD if target is 'inventory'?
      // Wait, if we drop on the InfoPanel's Inventory UI (which we are deleting), this would run.
      // But we are deleting it.
      // So this block is likely dead code if we remove the UI target.
      // BUT: We kept it in case we re-add it? Or we should clean it up?
      // User asked "enlever la partie Player Inventory".
      // So we define drop targets only for Chest.
    } else if (source === "inventory" && target === "chest") {
      // Move Inventory (HUD) -> Chest
      const invSlot = inventory[sourceIndex];
      if (!invSlot.type) return;

      const success = (building as Chest).addItem(invSlot.type, invSlot.count);

      if (success) {
        useGameStore
          .getState()
          .updateInventorySlot(sourceIndex, { type: null, count: 0 });
        setBuilding(building);
        forceUpdate((n) => n + 1);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // For Hub buildings, show the HubDashboard instead
  if (isHub) {
    return <HubDashboard hub={building} onClose={handleClose} />;
  }

  return (
    <div
      className="fixed right-6 top-24 w-80 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-white overflow-hidden z-panel animate-in slide-in-from-right-10 fade-in duration-200"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/10">
            <ModelPreview
              type="building"
              id={building.getType()}
              width={48}
              height={48}
              static
            />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none capitalize">
              {t(`building.${config.id}.name`)}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {isChest ? `Lv. ${building.maxSlots - 4}` : t("common.building")}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[200px]">
        <div className="space-y-4">
          {isChest && (
            <>
              {/* Container Storage */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">
                    Container Storage
                  </h4>
                  <span className="text-xs font-mono text-gray-500">
                    {building.slots.length}/{building.maxSlots} Slots
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: building.maxSlots }).map((_, i) => {
                    const slot = building.slots[i];
                    return (
                      <div
                        key={`chest-slot-${i}`}
                        className="aspect-square bg-black/40 rounded border border-white/10 flex items-center justify-center relative group cursor-grab active:cursor-grabbing"
                        draggable={!!slot}
                        onDragStart={(e) =>
                          handleDragStart(e, "chest", i, slot)
                        }
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, "chest", i)}
                      >
                        {slot ? (
                          <>
                            <ModelPreview
                              type="item"
                              id={slot.type}
                              width={40}
                              height={40}
                              static
                              seed={i * 100}
                            />
                            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold bg-black/60 px-0.5 rounded shadow-sm">
                              {slot.count}
                            </span>
                          </>
                        ) : (
                          <div className="text-white/5">+</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!isChest && building instanceof Extractor && (
            <div className="space-y-6 py-2">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    let status = "IDLE";
                    let color =
                      "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"; // Orange/Yellow

                    // 1. Not Linked
                    if (!building.hasPowerSource) {
                      status = t("common.status.no_power");
                      color =
                        "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                    }
                    // 2. Blocked
                    else if (building.operationStatus === "blocked") {
                      status = t("common.status.blocked");
                      color =
                        "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
                    }
                    // 3. No Resources
                    else if (building.operationStatus === "no_resources") {
                      status = t("common.status.no_resources");
                      color =
                        "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                    }
                    // 4. Low Power
                    else if (building.powerStatus === "warn") {
                      status = t("common.status.low_power");
                      color =
                        "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
                    }
                    // 5. Active
                    else if (building.active) {
                      status = t("common.status.operational");
                      color =
                        "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
                    }
                    // 6. Idle
                    else {
                      status = t("common.status.idle");
                      color =
                        "bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]";
                    }

                    return (
                      <>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            building.active ? "animate-pulse" : ""
                          } ${color}`}
                        />
                        <span className="text-sm font-bold tracking-tight text-white/90">
                          {status}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Zap size={10} className="text-yellow-500" />{" "}
                      {t("common.rate")}
                    </div>
                    <div className="text-lg font-mono font-bold text-white">
                      {(building.getExtractionRate() * 60).toFixed(1)}{" "}
                      <span className="text-[10px] text-gray-500">
                        {t("common.per_minute")}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Box size={10} className="text-blue-500" />{" "}
                      {t("common.output")}
                    </div>
                    <div className="text-lg font-mono font-bold text-white capitalize">
                      Stone
                    </div>
                  </div>
                  <div className="col-span-2 p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Zap size={10} className="text-red-500" />{" "}
                      {t("common.power")}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-red-400">
                        {parseFloat(
                          String(building.powerConfig?.rate || 0),
                        ).toFixed(2)}{" "}
                        <span className="text-[10px] text-gray-500">kW</span>
                      </div>
                      {building.visualSatisfaction < 0.98 && (
                        <div className="text-[10px] font-bold text-yellow-500">
                          {(building.visualSatisfaction * 100).toFixed(0)}%
                          Satisfaction
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Buffer Visual */}
              <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div
                    className="h-full bg-orange-500 transition-all duration-300 ease-out"
                    style={{
                      width: `${((building.slots[0]?.count || 0) / building.BUFFER_CAPACITY) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Box size={12} className="text-orange-400" />
                    Output Buffer
                  </h4>
                  <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                    {building.slots[0]?.count || 0} / {building.BUFFER_CAPACITY}
                  </span>
                </div>

                <div className="flex justify-center py-2">
                  <div
                    className={`
                           w-20 h-20 bg-black/40 rounded-xl border-2 flex items-center justify-center relative 
                           transition-all duration-200
                           ${
                             building.slots.length > 0
                               ? "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-grab active:cursor-grabbing hover:border-orange-400 hover:scale-105"
                               : "border-white/5 border-dashed"
                           }
                        `}
                    draggable={building.slots.length > 0}
                    onDragStart={(e) => {
                      if (building.slots.length > 0) {
                        handleDragStart(e, "chest", 0, building.slots[0]);
                      }
                    }}
                    onDragOver={handleDragOver}
                  >
                    {building.slots.length > 0 ? (
                      <>
                        <div className="absolute inset-0 bg-orange-500/5 rounded-xl animate-pulse" />
                        <ModelPreview
                          type="item"
                          id={building.slots[0].type}
                          width={64}
                          height={64}
                          static
                          seed={0}
                        />
                        <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg border border-orange-400">
                          {building.slots[0].count}
                        </div>
                      </>
                    ) : (
                      <div className="text-white/10 text-xs font-medium uppercase tracking-widest">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-center text-gray-500 mt-1">
                  Drag to take items
                </p>
              </div>
            </div>
          )}

          {!isChest && !(building instanceof Extractor) && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm italic py-8 text-center uppercase tracking-widest opacity-50">
              No statistics available
            </div>
          )}

          {/* Upgrade Level Reminder for non-Hub buildings */}
          {!isHub && upgradeLevel > 0 && activeUpgrade && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUp className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-indigo-300">
                  {t(activeUpgrade.name)}
                </span>
                <span className="text-xs font-mono text-indigo-400">
                  Lv.{upgradeLevel}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {t(activeUpgrade.description)}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {activeUpgrade.effects.map((effect, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-indigo-500/20 text-indigo-300"
                  >
                    {effect.type === "multiplier"
                      ? `${effect.stat} ×${effect.value}`
                      : effect.type === "additive"
                        ? `${effect.stat} +${effect.value}`
                        : `Unlock: ${effect.stat}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
