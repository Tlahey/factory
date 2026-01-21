"use client";

import { Fuel } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface FuelGaugeWidgetProps {
  currentFuel: number;
  maxFuel: number;
  /** Label for the fuel type (e.g., "Wood", "Coal") */
  fuelLabel?: string;
  /** Color accent for the gauge */
  color?: "orange" | "green" | "blue" | "red";
}

const colorStyles = {
  orange: {
    bar: "from-orange-600 to-orange-400",
    text: "text-orange-400",
    icon: "text-orange-500",
  },
  green: {
    bar: "from-green-600 to-green-400",
    text: "text-green-400",
    icon: "text-green-500",
  },
  blue: {
    bar: "from-blue-600 to-blue-400",
    text: "text-blue-400",
    icon: "text-blue-500",
  },
  red: {
    bar: "from-red-600 to-red-400",
    text: "text-red-400",
    icon: "text-red-500",
  },
};

/**
 * Widget for displaying fuel/resource gauge
 * Used by buildings that consume resources over time (BiomassPlant, etc.)
 */
export function FuelGaugeWidget({
  currentFuel,
  maxFuel,
  fuelLabel = "Fuel",
  color = "orange",
}: FuelGaugeWidgetProps) {
  const { t } = useTranslation();

  const percentage = maxFuel > 0 ? (currentFuel / maxFuel) * 100 : 0;
  const styles = colorStyles[color];

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Fuel size={14} className={styles.icon} />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {fuelLabel}
          </span>
        </div>
        <span className={`text-sm font-mono font-bold ${styles.text}`}>
          {currentFuel} / {maxFuel}
        </span>
      </div>
      <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full bg-gradient-to-r ${styles.bar} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage < 20 && percentage > 0 && (
        <div className="text-[10px] text-yellow-500 font-bold mt-2 animate-pulse">
          ⚠{" "}
          {t("common.statuses.low_power").replace(
            "POWER",
            fuelLabel.toUpperCase(),
          )}
        </div>
      )}
      {percentage === 0 && (
        <div className="text-[10px] text-red-500 font-bold mt-2">
          ⚠ {t("common.statuses.no_resources")}
        </div>
      )}
    </div>
  );
}
