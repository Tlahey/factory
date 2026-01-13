"use client";

import { Chest } from "@/game/buildings/chest/Chest";
import { InventorySlot } from "@/game/state/store";
import ModelPreview from "../ModelPreview";

import { useTranslation } from "@/hooks/useTranslation";

interface ChestPanelProps {
  building: Chest;
  onDragStart: (
    e: React.DragEvent,
    source: "chest" | "inventory",
    index: number,
    slot: InventorySlot,
  ) => void;
  onDrop: (
    e: React.DragEvent,
    target: "chest" | "inventory",
    targetIndex: number,
  ) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export function ChestPanel({
  building,
  onDragStart,
  onDrop,
  onDragOver,
}: ChestPanelProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase">
          {t("building.chest.name")} {t("common.storage")}
        </h4>
        <span className="text-xs font-mono text-gray-500">
          {building.slots.length}/{building.maxSlots} {t("common.slots")}
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
              onDragStart={(e) => onDragStart(e, "chest", i, slot)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, "chest", i)}
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
  );
}
