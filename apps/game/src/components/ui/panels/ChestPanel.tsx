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
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: building.maxSlots }).map((_, i) => {
          const slot = building.slots[i];
          return (
            <div
              key={`chest-slot-${i}`}
              draggable={!!slot}
              onDragStart={(e) => slot && onDragStart(e, "chest", i, slot)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, "chest", i)}
              className={`
                w-16 h-16 rounded-xl flex items-center justify-center relative group
                transition-all duration-200 border
                ${
                  slot
                    ? "bg-slate-800 border-white/20 hover:border-amber-400/80 hover:bg-slate-700 cursor-grab active:cursor-grabbing shadow-lg"
                    : "bg-black/30 border-white/5 hover:border-white/10"
                }
              `}
            >
              {/* Inner Shadow for depth in empty slots */}
              {!slot && (
                <div className="absolute inset-0 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none" />
              )}

              {slot && (
                <>
                  <div className="w-14 h-14 pointer-events-none">
                    <ModelPreview
                      type="item"
                      id={slot.type}
                      width={56}
                      height={56}
                      static
                      seed={i * 100}
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-slate-900 text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded-md border border-white/20 shadow-md min-w-[20px] text-center z-10">
                    {slot.count}
                  </div>

                  {/* Tooltip on Hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-50 pointer-events-none">
                    <div className="font-bold capitalize mb-0.5 text-amber-300">
                      {slot.type}
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 border-opacity-100"></div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
