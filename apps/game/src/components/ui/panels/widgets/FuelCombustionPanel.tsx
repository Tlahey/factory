"use client";

import { Flame, Fuel, Timer } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import ModelPreview from "../../ModelPreview";

interface FuelCombustionPanelProps {
  /** Current fuel amount */
  fuelAmount: number;
  /** Maximum fuel capacity */
  maxFuel: number;
  /** Combustion progress (0 to 1, where 1 = full, 0 = consumed) */
  combustionProgress: number;
  /** Whether the building is currently burning fuel */
  isBurning: boolean;
  /** Whether the building is enabled */
  isEnabled: boolean;
  /** Resource type for the fuel (e.g., "wood") */
  fuelType?: string;
  /** Title for the panel */
  title?: string;
  /** Consumption time in seconds */
  consumptionTime?: number;
  /** Whether the building is connected to a power network (optional, default true) */
  hasNetwork?: boolean;
}

/**
 * Combined Fuel and Combustion panel
 *
 * Displays fuel level with an animated combustion effect:
 * - Shows fuel item with count
 * - Animated burning effect (level drops from top to bottom)
 * - Status indicator integrated
 */
export function FuelCombustionPanel({
  fuelAmount,
  maxFuel,
  combustionProgress,
  isBurning,
  isEnabled,
  fuelType = "wood",
  title = "Fuel Storage",
  consumptionTime,
  hasNetwork = true,
}: FuelCombustionPanelProps) {
  const { t } = useTranslation();

  const fillPercentage = Math.min((fuelAmount / maxFuel) * 100, 100);

  // Determine status
  let statusText = t("common.statuses.idle");
  let statusColor = "bg-gray-500";

  if (!isEnabled) {
    statusText = t("common.statuses.disabled");
    statusColor = "bg-gray-500";
  } else if (!hasNetwork) {
    statusText = "No Network"; // TODO: Add translation
    statusColor = "bg-red-500";
  } else if (isBurning) {
    statusText = t("common.statuses.active");
    statusColor = "bg-green-500";
  } else if (fuelAmount === 0) {
    statusText = t("common.statuses.no_resources");
    statusColor = "bg-red-500";
  }

  // Calculate remaining fuel progress
  // If progress goes from 0 (start) to 1 (end), remaining is 1 - progress.
  const remainingProgress = Math.max(0, 1 - combustionProgress);

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-xl relative overflow-hidden flex flex-col gap-3">
      {/* Top Progress Bar - Fuel Level */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <div
          className="h-full bg-orange-500 transition-all duration-300 ease-out"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Fuel size={12} className="text-orange-400" />
          {title}
        </h4>
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${statusColor} ${isBurning ? "animate-pulse" : ""}`}
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Main Fuel Display with Combustion Animation */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Fuel Item Box */}
          <div
            className={`
              w-24 h-24 bg-black/40 rounded-xl border-2 flex items-center justify-center relative overflow-hidden
              transition-all duration-200
              ${fuelAmount > 0 ? "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "border-white/5 border-dashed"}
            `}
          >
            {/* Combustion Animation Background - Consumes from top to bottom (level drops) */}
            {isBurning && remainingProgress < 1 && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Fire gradient representing the fuel remaining */}
                {/* Anchored at BOTTOM. Height reduces as remainingProgress reduces. */}
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-orange-600/40 via-orange-500/20 to-transparent transition-all duration-100 ease-linear"
                  style={{
                    height: `${remainingProgress * 100}%`,
                  }}
                />

                {/* Animated fire line at the burning edge (top of the fluid) */}
                <div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 animate-pulse z-10"
                  style={{
                    bottom: `${remainingProgress * 100}%`,
                    boxShadow: "0 0 10px rgba(249, 115, 22, 1.0)",
                    display: remainingProgress <= 0.05 ? "none" : "block",
                  }}
                />
              </div>
            )}

            {fuelAmount > 0 ? (
              <div className="relative flex items-center justify-center w-full h-full z-20">
                {/* Glowing background when burning */}
                {isBurning && (
                  <div className="absolute inset-0 bg-orange-500/5 rounded-xl animate-pulse" />
                )}

                {/* Fuel Item Preview - Force centering */}
                <div className="flex items-center justify-center translate-y-0.5">
                  <ModelPreview
                    type="item"
                    id={fuelType}
                    width={56}
                    height={56}
                    static
                    seed={0}
                  />
                </div>

                {/* Flame Icon when burning */}
                {isBurning && (
                  <div className="absolute top-1 right-1">
                    <Flame
                      size={14}
                      className="text-orange-400 animate-pulse drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white/10 text-xs font-medium uppercase tracking-widest text-center px-2">
                No Fuel
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Footer - Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {/* Capacity Box */}
        <div className="bg-black/20 rounded-lg border border-white/5 p-2 flex flex-col items-center justify-center">
          <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">
            {t("resource." + fuelType)}
          </div>
          <div className="text-sm font-mono font-bold text-orange-400">
            {fuelAmount} <span className="text-xs text-gray-600">/</span>{" "}
            {maxFuel}
          </div>
        </div>

        {/* Rate Box */}
        {consumptionTime && (
          <div className="bg-black/20 rounded-lg border border-white/5 p-2 flex flex-col items-center justify-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <Timer size={10} /> Consum.
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {(60 / consumptionTime).toFixed(0)}{" "}
              <span className="text-[9px] text-gray-500 uppercase">/ min</span>
            </div>
          </div>
        )}
      </div>

      {/* Low Fuel Warning */}
      {isEnabled && fuelAmount > 0 && fuelAmount <= 3 && (
        <div className="absolute bottom-12 left-0 right-0 text-[10px] text-yellow-500 font-bold text-center animate-pulse pointer-events-none">
          ⚠ Low fuel!
        </div>
      )}
    </div>
  );
}
