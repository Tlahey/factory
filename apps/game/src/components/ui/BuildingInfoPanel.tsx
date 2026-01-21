"use client";

import { useGameStore, InventorySlot } from "@/game/state/store";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Chest } from "@/game/buildings/chest/Chest";
import { Extractor } from "@/game/buildings/extractor/Extractor";
import { Hub } from "@/game/buildings/hub/Hub";
import { Battery } from "@/game/buildings/battery/Battery";
import { Furnace } from "@/game/buildings/furnace/Furnace";
import { Conveyor } from "@/game/buildings/conveyor/Conveyor";
import { BiomassPlant } from "@/game/buildings/biomass-plant/BiomassPlant";
import { Sawmill } from "@/game/buildings/sawmill/Sawmill";
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
  ConveyorPanel,
  BiomassPlantPanel,
  SawmillPanel,
} from "./panels";
import FurnaceDashboard from "./FurnaceDashboard";

export default function BuildingInfoPanel() {
  const { t } = useTranslation();
  const openedEntityKey = useGameStore((state) => state.openedEntityKey);
  // const _setOpenedEntityKey = useGameStore((state) => state.setOpenedEntityKey);
  const setOpenedEntityKey = useGameStore((state) => state.setOpenedEntityKey);
  const setIsDraggingItem = useGameStore((state) => state.setIsDraggingItem);

  const [building, setBuilding] = useState<BuildingEntity | null>(null);
  const [, forceUpdate] = useState(0);

  // Track the source of the drag for deletion on successful drop
  const draggedItemRef = useRef<{
    source: string;
    index: number;
    type: string | null;
    count: number;
  } | null>(null);

  // Track if a transfer was explicitly successful (robust cross-component confirmation)
  const transferSuccessRef = useRef(false);

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

  // Listen for explicit transfer success events
  useEffect(() => {
    const handleTransferSuccess = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        draggedItemRef.current &&
        detail.source === draggedItemRef.current.source
      ) {
        // Confirm successful transfer for current item
        transferSuccessRef.current = true;
      }
    };
    window.addEventListener(
      "GAME_ITEM_TRANSFER_SUCCESS",
      handleTransferSuccess,
    );
    return () => {
      window.removeEventListener(
        "GAME_ITEM_TRANSFER_SUCCESS",
        handleTransferSuccess,
      );
    };
  }, []);

  // Building state is now managed via drag lifecycle (onDragStart/onDragEnd)

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
  const isConveyor = building instanceof Conveyor;
  const isBiomassPlant = building instanceof BiomassPlant;
  const isSawmill = building instanceof Sawmill;

  // Get current upgrade level for buildings
  const buildingType = building.getType();
  const upgradeLevel = skillTreeManager.getBuildingUpgradeLevel(buildingType);
  const activeUpgrade = skillTreeManager.getActiveUpgrade(buildingType);

  const handleDragStart = (
    e: React.DragEvent,
    source: string,
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

    draggedItemRef.current = {
      source,
      index,
      type: slot.type,
      count: slot.count,
    };

    // IMMEDIATELY REMOVE TO PREVENT DUPLICATION (e.g. chest outputting to conveyor while dragging)
    if (source === "chest" && (isChest || isExtractor)) {
      if (building.removeSlot) {
        building.removeSlot(index);
      } else {
        building.slots.splice(index, 1);
      }
      setBuilding(building);
      forceUpdate((n) => n + 1);
    } else if (source === "conveyor" && isConveyor) {
      (building as Conveyor).removeItem();
      setBuilding(building);
      forceUpdate((n) => n + 1);
    }

    transferSuccessRef.current = false; // Reset success flag
    setIsDraggingItem(true);
  };

  const handleDragEnd = (_e: React.DragEvent) => {
    setIsDraggingItem(false);

    // If we received an explicit success event, consider it done.
    // Strict Mode: We IGNORE e.dataTransfer.dropEffect because it returns "move" even for invalid drops.
    const isSuccess = transferSuccessRef.current;

    // If NOT a success (drag cancelled or dropped on invalid target), restore the item
    if (!isSuccess && draggedItemRef.current) {
      const { source, type, count } = draggedItemRef.current;
      if (source === "chest" && (isChest || isExtractor) && type) {
        if (isChest) {
          (building as Chest).addItem(type, count);
        } else if (isExtractor) {
          building.slots.push({ type, count });
        }
        setBuilding(building);
        forceUpdate((n) => n + 1);
      }
    }
    draggedItemRef.current = null;
    transferSuccessRef.current = false;
  };

  const handleDrop = (
    e: React.DragEvent,
    target: "chest" | "inventory",
    targetIndex: number,
  ) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("source") as "chest" | "inventory";
    const sourceIndex = parseInt(e.dataTransfer.getData("index"));

    if (source === target) return;

    // Check if target is 'chest' or general building drop via sub-component bubbling
    // If targetIndex is undefined, we might just be dropping "on the panel" generally, but ChestPanel slots provide index.
    if (target === "chest" && isChest && targetIndex !== undefined) {
      const type = e.dataTransfer.getData("type");
      const count = parseInt(e.dataTransfer.getData("count"));

      if (!type || isNaN(count)) return;

      const success = (building as Chest).addItem(type, count);

      if (success) {
        // If from inventory, clear it locally
        if (source === "inventory") {
          useGameStore
            .getState()
            .updateInventorySlot(sourceIndex, { type: null, count: 0 });
        } else {
          // If from explicit other source (Furnace, etc), dispatch success event
          window.dispatchEvent(
            new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
              detail: { source, sourceIndex },
            }),
          );
        }

        setBuilding(building);
        forceUpdate((n) => n + 1);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    void e; // Mark as used
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
        e.dataTransfer.dropEffect = "none";
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
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            />
          )}

          {isExtractor && (
            <ExtractorPanel
              building={building}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
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

          {isConveyor && (
            <ConveyorPanel
              building={building}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          )}

          {isBiomassPlant && (
            <BiomassPlantPanel
              building={building}
              forceUpdate={() => forceUpdate((n) => n + 1)}
            />
          )}

          {isSawmill && (
            <SawmillPanel
              building={building}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            />
          )}

          {!isChest &&
            !isExtractor &&
            !isBattery &&
            !isFurnace &&
            !isConveyor &&
            !isBiomassPlant &&
            !isSawmill &&
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
