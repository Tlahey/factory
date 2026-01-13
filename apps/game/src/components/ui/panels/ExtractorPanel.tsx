"use client";

import { Extractor } from "@/game/buildings/extractor/Extractor";
import { InventorySlot } from "@/game/state/store";
import { Zap, Box } from "lucide-react";
import ModelPreview from "../ModelPreview";
import { useTranslation } from "@/hooks/useTranslation";

interface ExtractorPanelProps {
  building: Extractor;
  onDragStart: (
    e: React.DragEvent,
    source: "chest" | "inventory",
    index: number,
    slot: InventorySlot,
  ) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export function getExtractorStatusInfo(
  hasPowerSource: boolean,
  operationStatus: string,
  powerStatus: string,
  isActive: boolean,
  t: (key: string) => string,
) {
  let status = "IDLE";
  let color = "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";

  if (!hasPowerSource) {
    status = t("common.status.no_power");
    color = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (operationStatus === "blocked") {
    status = t("common.status.blocked");
    color = "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
  } else if (operationStatus === "no_resources") {
    status = t("common.status.no_resources");
    color = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (powerStatus === "warn") {
    status = t("common.status.low_power");
    color = "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
  } else if (isActive) {
    status = t("common.status.operational");
    color = "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
  } else {
    status = t("common.status.idle");
    color = "bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]";
  }

  return { status, color };
}

export function ExtractorPanel({
  building,
  onDragStart,
  onDragOver,
}: ExtractorPanelProps) {
  const { t } = useTranslation();

  const { status, color } = getExtractorStatusInfo(
    building.hasPowerSource,
    building.operationStatus,
    building.powerStatus,
    building.active,
    t,
  );

  return (
    <div className="space-y-6 py-2">
      {/* Status & Stats Panel */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${building.active ? "animate-pulse" : ""} ${color}`}
          />
          <span className="text-sm font-bold tracking-tight text-white/90">
            {status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Zap size={10} className="text-yellow-500" /> {t("common.rate")}
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
              <Box size={10} className="text-blue-500" /> {t("common.output")}
            </div>
            <div className="text-lg font-mono font-bold text-white capitalize">
              Stone
            </div>
          </div>
          <div className="col-span-2 p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Zap size={10} className="text-red-500" /> {t("common.power")}
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-red-400">
                {parseFloat(String(building.powerConfig?.rate || 0)).toFixed(2)}{" "}
                <span className="text-[10px] text-gray-500">kW</span>
              </div>
              {building.visualSatisfaction < 0.98 && (
                <div className="text-[10px] font-bold text-yellow-500">
                  {(building.visualSatisfaction * 100).toFixed(0)}% Satisfaction
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Output Buffer */}
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
                onDragStart(e, "chest", 0, building.slots[0]);
              }
            }}
            onDragOver={onDragOver}
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
  );
}
