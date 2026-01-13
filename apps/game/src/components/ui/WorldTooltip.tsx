"use client";

import { useGameStore } from "@/game/state/store";
import { useEffect, useState } from "react";
import { BuildingEntity } from "@/game/entities/BuildingEntity";
import { IWorld } from "@/game/entities/types";
import {
  ElectricPoleConfigType,
  BaseBuildingConfig,
} from "@/game/buildings/BuildingConfig";
import { useTranslation } from "@/hooks/useTranslation";

export default function WorldTooltip() {
  const hoveredEntityKey = useGameStore((state) => state.hoveredEntityKey);
  const selectedBuilding = useGameStore((state) => state.selectedBuilding);

  let building: BuildingEntity | null = null;
  let connections = 0;

  if (hoveredEntityKey) {
    const [x, y] = hoveredEntityKey.split(",").map(Number);
    const world = (window as unknown as { game: { world: IWorld } }).game
      ?.world;
    if (world) {
      building = world.getBuilding(x, y) ?? null;
      if (building && building.getType() === "electric_pole") {
        connections = world.getConnectionsCount(x, y);
      }
    }
  }

  if (!building) return null;
  // If placing something (except maybe cable), hide tooltip to avoid clutter?
  // User asked for "Au passage de la souris ... on affichera le nombre".
  // If I am in "Select" mode (default), show it.
  if (
    selectedBuilding &&
    selectedBuilding !== "select" &&
    selectedBuilding !== "cable" &&
    selectedBuilding !== "delete"
  )
    return null;

  const config = building.getConfig();
  if (!config) return null;

  // For now, only Electric Poles need special display?
  // Or we can show name for everything.
  const isPole = building.getType() === "electric_pole";

  // Calculate screen position?
  // InputSystem has mouse pos but doesn't share it with store efficiently every frame.
  // BuildingHoverCard uses `absolute top-0 right-full` style positioning, appearing NEXT to cursor or Fixed?
  // HUD uses fixed positioning.
  // Since this is a "Tooltip", it should probably follow mouse or be fixed in a corner.
  // Implementing "follow mouse" in React without prop drilling mouse pos is hard/laggy.
  // Better to put it in a fixed status area or floating near the object in 3D (Projected).
  // OR just fixed at bottom/top of screen.

  // Let's try fixed position near cursor using a simple mouse listener here?
  // Or just fixed bottom center.

  // User request: "Au passage de la souris au dessus du poteau..." (On mouse over...)
  // Providing a tooltip next to the mouse is best.

  return (
    <TooltipContent config={config} connections={connections} isPole={isPole} />
  );
}

interface TooltipContentProps {
  config: BaseBuildingConfig;
  connections: number;
  isPole: boolean;
}

function TooltipContent({ config, connections, isPole }: TooltipContentProps) {
  const { t } = useTranslation();
  const [pos, setPos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const style = {
    left: pos.x + 15,
    top: pos.y + 15,
  };

  return (
    <div
      className="fixed z-tooltip pointer-events-none bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl p-3 min-w-[150px]"
      style={style}
    >
      <div className="font-bold text-white text-sm mb-1">
        {t(`building.${config.id}.name`)}
      </div>
      {isPole && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Connections:</span>
          <span
            className={`font-mono font-bold ${connections >= ((config as ElectricPoleConfigType).maxConnections || 3) ? "text-amber-400" : "text-green-400"}`}
          >
            {connections} /{" "}
            {(config as ElectricPoleConfigType).maxConnections || 3}
          </span>
        </div>
      )}
    </div>
  );
}
