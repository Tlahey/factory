"use client";

import { useGameStore, InventorySlot } from "@/game/state/store";
import { useEffect, useRef } from "react";
import { Package, X, ArrowUpDown } from "lucide-react";
import ModelPreview from "./ModelPreview";
import { TrashZone } from "./TrashZone";

import { useDraggable } from "@/hooks/useDraggable";

export default function HUD() {
  const inventory = useGameStore((state) => state.inventory);
  const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
  const isDraggingItem = useGameStore((state) => state.isDraggingItem);
  const setIsDraggingItem = useGameStore((state) => state.setIsDraggingItem);

  // Helper to format count
  const formatCount = (count: number) => {
    return count > 999 ? "999+" : count;
  };

  const { position, handleMouseDown, elementRef, isDragging } = useDraggable({
    x: 24, // left-6 approx
    y: typeof window !== "undefined" ? window.innerHeight / 2 - 200 : 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "i") {
        // Changed from Tab to i
        useGameStore.getState().toggleInventory();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDragStart = (
    e: React.DragEvent,
    index: number,
    slot: InventorySlot,
  ) => {
    if (!slot.type) {
      e.preventDefault();
      return;
    }
    console.log("[HUD] Drag Start", { index, slot });

    e.dataTransfer.setData("source", "inventory");
    e.dataTransfer.setData("index", index.toString());
    e.dataTransfer.setData("type", slot.type);
    e.dataTransfer.setData("count", slot.count.toString());
    draggedIndexRef.current = index;
    setIsDraggingItem(true);
  };

  // Track dragged item index for trash zone deletion
  const draggedIndexRef = useRef<number | null>(null);

  // Handle drag end - reset drag state (deletion now handled by TrashZone)
  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setIsDraggingItem(false);
  };

  // Handle trash zone drop - delete the dragged item
  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("source");

    // If it's from inventory, we need to clear the local slot
    if (source === "inventory") {
      const index = draggedIndexRef.current;
      if (index !== null) {
        useGameStore.getState().clearInventorySlot(index);
      }
    }

    // External sources (chest, furnace) are already removed from their host on drag start.
    // Setting dropEffect to 'move' in TrashZone's onDragOver ensures they stay removed.
    // Dispatch explicit success event for robust cross-component communication
    window.dispatchEvent(
      new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
        detail: { source, sourceIndex: 0 }, // Trash doesn't care about index really, but consistent Detail
      }),
    );

    draggedIndexRef.current = null;
    setIsDraggingItem(false);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const source = e.dataTransfer.getData("source");
    const sourceIndex = parseInt(e.dataTransfer.getData("index"));
    const type = e.dataTransfer.getData("type");
    const count = parseInt(e.dataTransfer.getData("count"));

    if (source === "inventory") {
      // Reorder logic (swap) - Optional enhancement
      // For now, if dropping on self, do nothing or swap?
      // Simple swap:
      if (sourceIndex === targetIndex) return;

      // Updated Logic: Atomic Swap
      useGameStore.getState().swapInventorySlots(sourceIndex, targetIndex);
    } else if (
      source === "chest" ||
      source === "furnace_output" ||
      source === "furnace_input"
    ) {
      // Drag from Chest or Furnace (external drop)
      // Check if target is empty or match
      const targetSlot = inventory[targetIndex];
      const newCount = (targetSlot.count || 0) + count;
      const maxStack = 100; // Constant

      if (newCount <= maxStack) {
        useGameStore
          .getState()
          .updateInventorySlot(targetIndex, { type, count: newCount });
        // Signal success so source removes it
        e.dataTransfer.dropEffect = "move";
        // Dispatch explicit success event for robust cross-component communication
        window.dispatchEvent(
          new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
            detail: { source, sourceIndex },
          }),
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <>
      {/* Sliding Panel (Now Floating Draggable) */}
      <div
        ref={elementRef}
        style={isInventoryOpen ? { left: position.x, top: position.y } : {}}
        className={`
                    fixed z-hud pointer-events-auto
                    bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]
                    transition-opacity duration-300 ease-out origin-left
                    flex flex-col p-4 w-auto min-w-[200px]
                    ${isInventoryOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}
                    ${isDragging ? "cursor-grabbing" : ""}
                `}
      >
        {/* Header (Handle) */}
        <div
          onMouseDown={handleMouseDown}
          className="mb-4 pb-2 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        >
          <span className="text-white font-bold text-sm tracking-widest uppercase flex items-center gap-2 pointer-events-none">
            <Package size={16} className="text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Inventory
            </span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-mono shadow-inner pointer-events-none">
              {inventory.filter((s) => s.type).length}/{inventory.length}
            </span>
            <button
              onClick={() => useGameStore.getState().reorganizeInventory()}
              onMouseDown={(e) => e.stopPropagation()}
              title="Reorganize inventory"
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-amber-400 border border-white/5 hover:border-amber-400/30"
            >
              <ArrowUpDown size={12} />
            </button>
            <button
              onClick={() => useGameStore.getState().toggleInventory()}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-5 gap-3">
          {inventory.map((slot, index) => (
            <div
              key={index}
              draggable={!!slot.type}
              onDragStart={(e) => handleDragStart(e, index, slot)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
              className={`
                                w-16 h-16 rounded-xl flex items-center justify-center relative group
                                transition-all duration-200 border
                                ${
                                  slot.type
                                    ? "bg-slate-800 border-white/20 hover:border-amber-400/80 hover:bg-slate-700 cursor-grab active:cursor-grabbing shadow-lg"
                                    : "bg-black/30 border-white/5 hover:border-white/10"
                                }
                            `}
            >
              {/* Inner Shadow for depth in empty slots */}
              {!slot.type && (
                <div className="absolute inset-0 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none" />
              )}

              {/* Item 3D Preview */}
              {slot.type && (
                <div className="w-14 h-14 pointer-events-none">
                  <ModelPreview
                    type="item"
                    id={slot.type}
                    width={56}
                    height={56}
                    static
                    seed={index * 100}
                  />
                </div>
              )}

              {/* Count Badge */}
              {slot.type && (
                <div className="absolute -bottom-2 -right-2 bg-slate-900 text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded-md border border-white/20 shadow-md min-w-[20px] text-center z-sub-content">
                  {formatCount(slot.count)}
                </div>
              )}

              {/* Tooltip */}
              {slot.type && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-tooltip pointer-events-none">
                  <div className="font-bold capitalize mb-0.5 text-amber-300">
                    {slot.type}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Quantity:{" "}
                    <span className="text-white font-mono">{slot.count}</span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 border-opacity-100"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="mt-4 pt-3 border-t border-white/5 text-center">
          <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase opacity-60">
            Space Available: {inventory.filter((s) => !s.type).length}
          </span>
        </div>
      </div>
      <TrashZone isDragging={isDraggingItem} onDrop={handleTrashDrop} />
    </>
  );
}
