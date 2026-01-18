"use client";

import { Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface TrashZoneProps {
  /** Whether an item is currently being dragged from inventory */
  isDragging: boolean;
  /** Callback when an item is dropped in the trash zone */
  onDrop: (e: React.DragEvent) => void;
}

/**
 * TrashZone - Appears at the bottom of the screen when dragging inventory items.
 * Dropping an item here will delete it from inventory.
 */
export function TrashZone({ isDragging, onDrop }: TrashZoneProps) {
  const { t } = useTranslation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e);
  };

  if (!isDragging) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="fixed bottom-24 right-8 z-hud
                 w-48 h-48 
                 bg-red-900/80 backdrop-blur-md
                 border-2 border-dashed border-red-500/60
                 rounded-xl
                 flex flex-col items-center justify-center gap-2
                 transition-all duration-200
                 hover:bg-red-800/90 hover:border-red-400 hover:scale-105
                 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
    >
      <Trash2 className="w-6 h-6 text-red-400 animate-pulse" />
      <span className="text-red-300 text-xs font-bold uppercase tracking-wider">
        {t("common.drop_to_delete") || "Drop to delete"}
      </span>
    </div>
  );
}
