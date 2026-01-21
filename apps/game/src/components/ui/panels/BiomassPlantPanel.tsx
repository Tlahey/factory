"use client";

import { BiomassPlant } from "@/game/buildings/biomass-plant/BiomassPlant";
import { useTranslation } from "@/hooks/useTranslation";
import { PowerProducerWidget, FuelCombustionPanel } from "./widgets";
import { BreakerSwitch } from "./BreakerSwitch";

import { BiomassPlantConfigType } from "@/game/buildings/biomass-plant/BiomassPlantConfig";

interface BiomassPlantPanelProps {
  building: BiomassPlant;
  forceUpdate: () => void;
}

/**
 * Panel for Biomass Power Plant
 *
 * Displays:
 * - Breaker switch (on/off control)
 * - UNIFIED Fuel & Combustion panel with animation
 * - Power production gauge
 */
export function BiomassPlantPanel({
  building,
  forceUpdate,
}: BiomassPlantPanelProps) {
  const { t } = useTranslation();

  const handleBreakerToggle = () => {
    building.toggleBreaker();
    window.dispatchEvent(new CustomEvent("GAME_REBUILD_POWER"));
    forceUpdate();
  };

  return (
    <div className="space-y-4 py-2">
      {/* 1. Breaker Panel */}
      <BreakerSwitch
        isEnabled={building.isEnabled}
        onToggle={handleBreakerToggle}
        title={t("common.breaker")}
      />

      {/* 2. Unified Fuel & Combustion Panel */}
      <FuelCombustionPanel
        fuelAmount={building.fuelAmount}
        maxFuel={building.getFuelCapacity()}
        combustionProgress={building.combustionProgress}
        isBurning={building.isBurning}
        isEnabled={building.isEnabled}
        fuelType="wood"
        title="Wood Burner"
        consumptionTime={
          (building.getConfig() as BiomassPlantConfigType).consumptionTime
        }
        hasNetwork={building.networkSize > 1}
      />

      {/* 3. Power Production */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="grid grid-cols-1 gap-4">
          <PowerProducerWidget building={building} />
        </div>
      </div>
    </div>
  );
}
