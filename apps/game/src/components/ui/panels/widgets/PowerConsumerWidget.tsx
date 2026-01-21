"use client";

import { Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { BuildingEntity } from "@/game/entities/BuildingEntity";

interface PowerConsumerWidgetProps {
  building: BuildingEntity & {
    getPowerDemand?: () => number;
    hasPowerSource: boolean;
    powerSatisfaction: number;
    visualSatisfaction: number;
  };
}

/**
 * Widget for buildings that consume power (IPowered with type="consumer")
 * Shows power demand and satisfaction level
 */
export function PowerConsumerWidget({ building }: PowerConsumerWidgetProps) {
  const { t } = useTranslation();

  const powerDemand = building.getPowerDemand?.() ?? 0;
  const powerRate = building.powerConfig?.rate ?? powerDemand;

  return (
    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
        <Zap size={10} className="text-red-500" /> {t("common.consumption")}
      </div>
      <div className="text-lg font-mono font-bold text-red-400">
        {parseFloat(String(powerRate)).toFixed(1)}{" "}
        <span className="text-[10px] text-gray-500">kW</span>
      </div>
      {building.visualSatisfaction < 0.98 && (
        <div className="text-[10px] font-bold text-yellow-500 mt-1">
          {(building.visualSatisfaction * 100).toFixed(0)}%{" "}
          {t("common.efficiency")}
        </div>
      )}
    </div>
  );
}
