"use client";

import { Extractor } from "@/game/buildings/extractor/Extractor";
import {
  ResourceProducerPanel,
  getResourceProducerStatusInfo,
} from "./ResourceProducerPanel";
import type {
  DragEndHandler,
  DragOverHandler,
  DragStartHandler,
  ItemDragSource,
} from "../dnd";

interface ExtractorPanelProps {
  building: Extractor;
  onDragStart: DragStartHandler<ItemDragSource, string>;
  onDragEnd: DragEndHandler;
  onDragOver: DragOverHandler;
}

// Re-export for backward compatibility
export { getResourceProducerStatusInfo as getExtractorStatusInfo };

/**
 * Panel for Extractor building
 * Uses the shared ResourceProducerPanel component
 */
export function ExtractorPanel({
  building,
  onDragStart,
  onDragEnd,
  onDragOver,
}: ExtractorPanelProps) {
  // Determine resource type from what's being extracted
  const resourceType =
    building.slots.length > 0 ? building.slots[0].type : "stone";

  return (
    <ResourceProducerPanel
      building={building}
      resourceType={resourceType}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    />
  );
}
