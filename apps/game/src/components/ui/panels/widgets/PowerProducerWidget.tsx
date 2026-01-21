"use client";

import { Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { BuildingEntity } from "@/game/entities/BuildingEntity";

interface PowerProducerWidgetProps {
  building: BuildingEntity & {
    getPowerGeneration: () => number;
    isEnabled?: boolean;
  };
}

/**
 * Widget for buildings that produce power (IPowered with type="producer")
 * Shows current power generation with real-time updates
 */
export function PowerProducerWidget({ building }: PowerProducerWidgetProps) {
  const { t } = useTranslation();

  const currentGeneration = building.getPowerGeneration?.() ?? 0;
  const isActive = currentGeneration > 0;

  return (
    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
        <Zap size={10} className="text-green-500" /> {t("common.production")}
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className={`text-lg font-mono font-bold ${isActive ? "text-green-400" : "text-gray-400"}`}
        >
          {currentGeneration.toFixed(1)}{" "}
          <span className="text-[10px] text-gray-500">kW</span>
        </div>
        {isActive && (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}
