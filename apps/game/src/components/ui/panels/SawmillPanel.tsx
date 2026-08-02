"use client";

import { Sawmill } from "@/game/buildings/sawmill/Sawmill";
import { ResourceProducerPanel } from "./ResourceProducerPanel";
import type {
  DragEndHandler,
  DragOverHandler,
  DragStartHandler,
  ItemDragSource,
} from "../dnd";

interface SawmillPanelProps {
  building: Sawmill;
  onDragStart: DragStartHandler<ItemDragSource, string>;
  onDragEnd: DragEndHandler;
  onDragOver: DragOverHandler;
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
