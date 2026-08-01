"use client";

import { BuildingEntity } from "@/game/entities/BuildingEntity";
import { useGameStore } from "@/game/state/store";
import { Activity } from "lucide-react";

interface XStateInspectorProps {
  building: BuildingEntity;
}

export default function XStateInspector({ building }: XStateInspectorProps) {
  const isDebugOverlayVisible = useGameStore(
    (state) => state.isDebugOverlayVisible,
  );

  if (!isDebugOverlayVisible || !building.actor) return null;

  const snapshot = building.actor.getSnapshot();
  const stateValue = snapshot ? String(snapshot.value) : "unknown";
  const context = snapshot ? snapshot.context : {};

  // Safely clean context to avoid circular serialization bugs
  const getInspectableContext = () => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (key === "building") continue; // Exclude circular building reference
      if (value && typeof value === "object") {
        try {
          // Verify it can be serialized (e.g. no circular refs)
          JSON.stringify(value);
          clean[key] = value;
        } catch {
          clean[key] = "[Complex Object]";
        }
      } else {
        clean[key] = value;
      }
    }
    return clean;
  };

  const cleanContext = getInspectableContext();

  return (
    <div className="mt-4 p-3 bg-purple-950/20 border border-purple-500/20 rounded-lg text-xs font-mono">
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-purple-500/20">
        <Activity size={12} className="text-purple-400 animate-pulse" />
        <span className="font-bold uppercase tracking-wider text-purple-300 text-[10px]">
          XState Machine Inspector
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Actor ID:</span>
          <span className="text-gray-300 font-bold">{building.getType()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">State:</span>
          <span className="px-1.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {stateValue}
          </span>
        </div>

        {Object.keys(cleanContext).length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">
              Context Variables
            </div>
            <div className="bg-black/40 rounded p-1.5 max-h-32 overflow-y-auto text-[10px] space-y-1 custom-scrollbar text-purple-200">
              {Object.entries(cleanContext).map(([key, val]) => (
                <div
                  key={key}
                  className="flex justify-between items-start gap-2"
                >
                  <span className="text-gray-500 shrink-0">{key}:</span>
                  <span className="text-right break-all">
                    {typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
