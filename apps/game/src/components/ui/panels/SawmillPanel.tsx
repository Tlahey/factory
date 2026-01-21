"use client";

import { Sawmill } from "@/game/buildings/sawmill/Sawmill";
import { InventorySlot } from "@/game/state/store";
import { ResourceProducerPanel } from "./ResourceProducerPanel";

interface SawmillPanelProps {
  building: Sawmill;
  onDragStart: (
    e: React.DragEvent,
    source: string,
    index: number,
    slot: InventorySlot,
  ) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

/**
 * Panel for Sawmill building
 * Uses the shared ResourceProducerPanel component
 */
export function SawmillPanel({
  building,
  onDragStart,
  onDragEnd,
  onDragOver,
}: SawmillPanelProps) {
  return (
    <ResourceProducerPanel
      building={building}
      resourceType="wood"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    />
  );
}
