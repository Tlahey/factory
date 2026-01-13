"use client";

import { Box } from "lucide-react";
import ModelPreview from "../ModelPreview";

interface ItemBufferPanelProps {
  title: string;
  items: { type: string; count: number }[];
  capacity: number;
  color?: string; // Default to "orange"
  onDragStart?: (
    e: React.DragEvent,
    source: "chest" | "inventory",
    index: number,
    slot: { type: string; count: number },
  ) => void;
  onDragOver?: (e: React.DragEvent) => void;
  sourceId?: "chest" | "inventory"; // Identifier for drag source
}

export function ItemBufferPanel({
  title,
  items,
  capacity,
  color = "orange",
  onDragStart,
  onDragOver,
  sourceId = "chest",
}: ItemBufferPanelProps) {
  // Normalize main item for display (first item or null)
  const mainItem = items.length > 0 ? items[0] : null;
  const currentCount = items.reduce((acc, item) => acc + item.count, 0);
  const fillPercentage = Math.min((currentCount / capacity) * 100, 100);

  // Map color names to Tailwind classes
  const colorMap: Record<
    string,
    { bg: string; text: string; border: string; shadow: string }
  > = {
    orange: {
      bg: "bg-orange-500",
      text: "text-orange-400",
      border: "border-orange-500",
      shadow: "shadow-[0_0_15px_rgba(249,115,22,0.2)]",
    },
    blue: {
      bg: "bg-blue-500",
      text: "text-blue-400",
      border: "border-blue-500",
      shadow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    },
    green: {
      bg: "bg-green-500",
      text: "text-green-400",
      border: "border-green-500",
      shadow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
    },
    red: {
      bg: "bg-red-500",
      text: "text-red-400",
      border: "border-red-500",
      shadow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    },
  };

  const theme = colorMap[color] || colorMap.orange;

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-xl relative overflow-hidden group">
      {/* Progress Bar Background */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <div
          className={`h-full ${theme.bg} transition-all duration-300 ease-out`}
          style={{ width: `${fillPercentage}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Box size={12} className={theme.text} />
          {title}
        </h4>
        <div
          className={`text-[10px] font-mono ${theme.text} ${theme.bg}/10 px-2 py-0.5 rounded border ${theme.border}/20`}
        >
          {currentCount} / {capacity}
        </div>
      </div>

      {/* Main Item Display */}
      <div className="flex justify-center py-2">
        <div
          className={`
            w-20 h-20 bg-black/40 rounded-xl border-2 flex items-center justify-center relative 
            transition-all duration-200
            ${
              mainItem
                ? `${theme.border}/50 ${theme.shadow} cursor-grab active:cursor-grabbing hover:${theme.border} hover:scale-105`
                : "border-white/5 border-dashed"
            }
          `}
          draggable={!!mainItem && !!onDragStart}
          onDragStart={(e) => {
            if (mainItem && onDragStart) {
              onDragStart(e, sourceId, 0, mainItem);
            }
          }}
          onDragOver={onDragOver}
        >
          {mainItem ? (
            <>
              <div
                className={`absolute inset-0 ${theme.bg}/5 rounded-xl animate-pulse`}
              />
              <ModelPreview
                type="item"
                id={mainItem.type}
                width={64}
                height={64}
                static
                seed={0}
              />
              <div
                className={`absolute -bottom-2 -right-2 ${theme.bg} text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg border ${theme.border}`}
              >
                {mainItem.count}
              </div>
            </>
          ) : (
            <div className="text-white/10 text-xs font-medium uppercase tracking-widest">
              Empty
            </div>
          )}
        </div>
      </div>

      {onDragStart && (
        <p className="text-[10px] text-center text-gray-500 mt-1">
          Drag to take items
        </p>
      )}
    </div>
  );
}
