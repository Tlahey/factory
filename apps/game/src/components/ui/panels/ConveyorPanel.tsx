"use client";

import { Conveyor } from "@/game/buildings/conveyor/Conveyor";
import { Zap, FastForward } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

import { InventorySlot } from "@/game/state/store";
import ModelPreview from "../ModelPreview";

interface ConveyorPanelProps {
  building: Conveyor;
  onDragStart: (
    e: React.DragEvent,
    source: string,
    index: number,
    slot: InventorySlot,
  ) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function ConveyorPanel({
  building,
  onDragStart,
  onDragEnd,
}: ConveyorPanelProps) {
  const { t } = useTranslation();

  // transportSpeed is in tiles per second.
  // 1 tile per second = 60 items per minute if fully saturated.
  const itemsPerMinute = (building.transportSpeed * 60).toFixed(1);

  return (
    <div className="space-y-6 py-2">
      {/* Status & Stats Panel */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${building.isResolved ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`}
          />
          <span className="text-sm font-bold tracking-tight text-white/90 uppercase">
            {building.isResolved
              ? t("common.statuses.operational")
              : t("common.statuses.blocked")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <FastForward size={14} className="text-cyan-400" />{" "}
              {t("common.performance")}
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-white">
                {itemsPerMinute}{" "}
                <span className="text-[10px] text-gray-500">
                  {t("common.per_minute")}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Zap size={14} className="text-yellow-500" /> {t("common.power")}
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-gray-500 uppercase italic">
                {t("common.free")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!building.isResolved && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 italic text-center">
            Conveyor must lead to a valid destination (Container) to start
            moving items.
          </p>
        </div>
      )}

      {/* Visual Item on Belt (Draggable) */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          On Belt
        </h4>
        <div
          className={`
            w-16 h-16 rounded-xl flex items-center justify-center relative
            transition-all duration-200 border
            ${
              building.currentItem
                ? "bg-slate-800 border-white/20 hover:border-cyan-400/80 hover:bg-slate-700 cursor-grab active:cursor-grabbing shadow-lg"
                : "bg-black/30 border-white/5 border-dashed"
            }
          `}
          draggable={!!building.currentItem}
          onDragStart={(e) => {
            if (building.currentItem) {
              onDragStart(e, "conveyor", 0, {
                type: building.currentItem,
                count: 1,
              });
            }
          }}
          onDragEnd={onDragEnd}
        >
          {!building.currentItem && (
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none" />
          )}

          {building.currentItem && (
            <>
              <div className="w-14 h-14 pointer-events-none">
                <ModelPreview
                  type="item"
                  id={building.currentItem}
                  width={56}
                  height={56}
                  static
                  seed={0}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-900 text-xs font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded-md border border-white/20 shadow-md min-w-[20px] text-center z-sub-content">
                1
              </div>
            </>
          )}

          {!building.currentItem && (
            <span className="text-[10px] text-gray-600 uppercase">Empty</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          {building.currentItem
            ? "Drag to remove item"
            : "Waiting for items..."}
        </p>
      </div>
    </div>
  );
}
