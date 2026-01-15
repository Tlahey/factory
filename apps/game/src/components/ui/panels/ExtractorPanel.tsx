"use client";

import { Extractor } from "@/game/buildings/extractor/Extractor";
import { InventorySlot } from "@/game/state/store";
import { Zap, Box } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ItemBufferPanel } from "./ItemBufferPanel";

interface ExtractorPanelProps {
  building: Extractor;
  onDragStart: (
    e: React.DragEvent,
    source: string,
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
    status = t("common.statuses.no_power");
    color = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (operationStatus === "blocked") {
    status = t("common.statuses.blocked");
    color = "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
  } else if (operationStatus === "no_resources") {
    status = t("common.statuses.no_resources");
    color = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (powerStatus === "warn") {
    status = t("common.statuses.low_power");
    color = "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
  } else if (isActive) {
    status = t("common.statuses.operational");
    color = "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
  } else {
    status = t("common.statuses.idle");
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
      <ItemBufferPanel
        title="Output Buffer"
        items={building.slots}
        capacity={building.BUFFER_CAPACITY}
        color="orange"
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        sourceId="chest"
      />
    </div>
  );
}
