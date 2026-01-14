"use client";

import { useGameStore, InventorySlot } from "@/game/state/store";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Chest } from "@/game/buildings/chest/Chest";
import { Extractor } from "@/game/buildings/extractor/Extractor";
import { Hub } from "@/game/buildings/hub/Hub";
import { Battery } from "@/game/buildings/battery/Battery";
import { Furnace } from "@/game/buildings/furnace/Furnace";
import { BuildingEntity } from "@/game/entities/BuildingEntity";
import { IWorld } from "@/game/entities/types";
import ModelPreview from "./ModelPreview";
import { useTranslation } from "@/hooks/useTranslation";
import HubDashboard from "./HubDashboard";
import { skillTreeManager } from "@/game/buildings/hub/skill-tree/SkillTreeManager";
import {
  ChestPanel,
  ExtractorPanel,
  BatteryPanel,
  UpgradeReminder,
  ElectricPolePanel,
  FurnacePanel,
} from "./panels";
import FurnaceDashboard from "./FurnaceDashboard";

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
  const isBattery = building instanceof Battery;
  const isExtractor = building instanceof Extractor;
  const isFurnace = building instanceof Furnace;

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

    if (source === "inventory" && target === "chest") {
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

  if (isFurnace) {
    return <FurnaceDashboard furnace={building} onClose={handleClose} />;
  }

  return (
    <div
      className={`fixed right-6 top-24 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-white overflow-hidden z-panel animate-in slide-in-from-right-10 fade-in duration-200 transition-[width] ease-in-out flex flex-col max-h-[calc(100vh-8rem)] ${
        isChest ? "w-[440px]" : "w-80"
      }`}
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
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
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

      {/* Content - Delegates to building-specific panels */}
      <div className="p-4 min-h-[200px] overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          {isChest && (
            <ChestPanel
              building={building}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          )}

          {isExtractor && (
            <ExtractorPanel
              building={building}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
            />
          )}

          {isBattery && (
            <BatteryPanel
              building={building}
              forceUpdate={() => forceUpdate((n) => n + 1)}
            />
          )}

          {building.getType() === "electric_pole" && (
            <ElectricPolePanel building={building} />
          )}

          {/* isFurnace handled by special dashboard check above */}
          {isFurnace && <FurnacePanel building={building} />}

          {!isChest &&
            !isExtractor &&
            !isBattery &&
            !isFurnace &&
            building.getType() !== "electric_pole" && (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm italic py-8 text-center uppercase tracking-widest opacity-50">
                No statistics available
              </div>
            )}

          {/* Upgrade Level Reminder for non-Hub buildings */}
          {upgradeLevel > 0 && activeUpgrade && (
            <UpgradeReminder
              upgradeLevel={upgradeLevel}
              activeUpgrade={activeUpgrade}
            />
          )}
        </div>
      </div>
    </div>
  );
}
