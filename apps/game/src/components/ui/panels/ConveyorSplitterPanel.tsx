"use client";

import { useState } from "react";
import {
  ConveyorSplitter,
  SplitterOutputSide,
} from "@/game/buildings/conveyor-splitter/ConveyorSplitter";
import { RESOURCES, ResourceType } from "@/game/data/Items";
import { useTranslation } from "@/hooks/useTranslation";

interface ConveyorSplitterPanelProps {
  building: ConveyorSplitter;
}

const PORTS: { side: SplitterOutputSide; labelKey: string }[] = [
  { side: "front", labelKey: "conveyor_splitter.front" },
  { side: "left", labelKey: "conveyor_splitter.left" },
  { side: "right", labelKey: "conveyor_splitter.right" },
];

const CHIP_BASE =
  "px-2 py-1 rounded-md border text-[10px] font-medium transition-colors";
const CHIP_SELECTED =
  "border-cyan-500/60 bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]";
const CHIP_UNSELECTED =
  "border-white/10 bg-black/30 text-gray-300 hover:border-white/20 hover:bg-white/10";

/**
 * Panel for the Conveyor Splitter building.
 * Lets the player restrict each output port to a specific resource type
 * (or "Any", the default round-robin behavior).
 */
export function ConveyorSplitterPanel({
  building,
}: ConveyorSplitterPanelProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState(building.outputFilters);

  const select = (side: SplitterOutputSide, type: ResourceType | null) => {
    building.setOutputFilter(side, type);
    setFilters({ ...filters, [side]: type });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-xs uppercase text-gray-400 font-bold tracking-wider">
        {t("conveyor_splitter.output_filter")}
      </div>

      {PORTS.map(({ side, labelKey }) => (
        <div key={side} className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            {t(labelKey)}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => select(side, null)}
              className={`${CHIP_BASE} ${filters[side] === null ? CHIP_SELECTED : CHIP_UNSELECTED}`}
            >
              {t("conveyor_splitter.any_resource")}
            </button>
            {RESOURCES.map((res) => (
              <button
                key={res}
                onClick={() => select(side, res)}
                className={`${CHIP_BASE} ${filters[side] === res ? CHIP_SELECTED : CHIP_UNSELECTED}`}
              >
                {t(`resource.${res}`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
