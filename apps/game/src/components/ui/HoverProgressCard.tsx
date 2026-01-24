"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Furnace } from "@/game/buildings/furnace/Furnace";
import { BiomassPlant } from "@/game/buildings/biomass-plant/BiomassPlant";
import ModelPreview from "./ModelPreview";
import { FURNACE_RECIPES } from "@/game/buildings/furnace/FurnaceConfig";
import { Flame, Hammer } from "lucide-react";

interface HoverProgressCardProps {
  entity: Furnace | BiomassPlant;
  visible: boolean;
  position?: [number, number, number];
}

export function HoverProgressCard({
  entity,
  visible,
  position = [0, 1.5, 0],
}: HoverProgressCardProps) {
  const [displayData, setDisplayData] = useState<{
    itemId: string;
    isConsuming: boolean;
  } | null>(null);

  // Refs for visual updates
  const fillRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!visible) return;

    let progress = 0; // 0 to 1
    let currentItemId: string | null = null;
    let isConsuming = false;

    if (entity instanceof Furnace) {
      if (entity.activeJobs.length > 0) {
        const job = entity.activeJobs[0];
        const recipe = FURNACE_RECIPES.find((r) => r.id === job.recipeId);
        if (recipe) {
          currentItemId = recipe.output;
          progress = job.progress; // 0 to 1 (Filling)
          isConsuming = false;
        }
      }
    } else if (entity instanceof BiomassPlant) {
      if (entity.fuelAmount > 0 || entity.combustionProgress > 0) {
        currentItemId = "wood";
        // CombustionProgress is 1 (start) -> 0 (end).
        progress = entity.combustionProgress;
        isConsuming = true;
      }
    }

    if (
      currentItemId !== displayData?.itemId ||
      isConsuming !== displayData?.isConsuming
    ) {
      if (currentItemId) {
        setDisplayData({ itemId: currentItemId, isConsuming });
      } else {
        setDisplayData(null);
      }
    }

    if (fillRef.current && lineRef.current) {
      const pct = progress * 100;

      // Consuming: Fire/Orange. Height = pct.
      // Producing: Magic/Blue. Height = pct.

      fillRef.current.style.height = `${pct}%`;
      lineRef.current.style.bottom = `${pct}%`;

      // Hide line at potential extremes if needed, panel only hides at <= 0.05
      if (progress <= 0.05) {
        lineRef.current.style.display = "none";
      } else {
        lineRef.current.style.display = "block";
      }
    }
  });

  if (!visible || !displayData) return null;

  return (
    <Html
      position={position}
      center
      style={{
        pointerEvents: "none",
        whiteSpace: "nowrap",
        zIndex: 50,
      }}
    >
      <div className="relative">
        {/* Main Box - REDUCED SIZE standard size w-16 h-16 (64px) instead of 24 (96px) */}
        {/* Darker background: bg-slate-900/90 */}
        <div
          className={`
             w-16 h-16 bg-slate-900/90 backdrop-blur-xl rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all duration-200
             ${
               displayData.isConsuming
                 ? "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                 : "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
             }
           `}
        >
          {/* Combustion/Production Background Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Gradient Body */}
            <div
              ref={fillRef}
              className={`absolute inset-x-0 bottom-0 transition-all duration-100 ease-linear ${
                displayData.isConsuming
                  ? "bg-gradient-to-t from-orange-600/50 via-orange-500/30 to-transparent"
                  : "bg-gradient-to-t from-blue-600/50 via-blue-500/30 to-transparent"
              }`}
              style={{ height: "0%" }}
            />

            {/* Animated Line Edge */}
            <div
              ref={lineRef}
              className={`absolute inset-x-0 h-1 z-10 animate-pulse ${
                displayData.isConsuming
                  ? "bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 shadow-[0_0_10px_rgba(249,115,22,1.0)]"
                  : "bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 shadow-[0_0_10px_rgba(59,130,246,1.0)]"
              }`}
              style={{ bottom: "0%" }}
            />
          </div>

          {/* Content Layer */}
          <div className="relative flex items-center justify-center w-full h-full z-20">
            {/* Glow BG */}
            <div
              className={`absolute inset-0 rounded-xl animate-pulse ${
                displayData.isConsuming ? "bg-orange-500/5" : "bg-blue-500/5"
              }`}
            />

            {/* Icon - Reduced Size to 40px */}
            <div className="flex items-center justify-center translate-y-0.5 scale-110">
              <ModelPreview
                type="item"
                id={displayData.itemId}
                width={40}
                height={40}
                static
              />
            </div>

            {/* Corner Status Icon - Reduced Size to 12px */}
            <div className="absolute top-1 right-1">
              {displayData.isConsuming ? (
                <Flame
                  size={12}
                  className="text-orange-400 animate-pulse drop-shadow-[0_0_4px_rgba(249,115,22,0.8)]"
                />
              ) : (
                <Hammer
                  size={12}
                  className="text-blue-400 animate-pulse drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Html>
  );
}
