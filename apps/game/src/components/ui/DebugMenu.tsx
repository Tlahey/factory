"use client";

import { useGameStore } from "@/game/state/store";
import { Bug, Check, Unlock, Zap, X, Trash2 } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { RESOURCES } from "@/game/data/Items";

export default function DebugMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDev] = useState(process.env.NODE_ENV === "development");

  const isUnlimitedResources = useGameStore(
    (state) => state.isUnlimitedResources,
  );
  const toggleUnlimitedResources = useGameStore(
    (state) => state.toggleUnlimitedResources,
  );
  const unlockAllSkills = useGameStore((state) => state.unlockAllSkills);
  const resetGame = useGameStore((state) => state.reset);
  const addItem = useGameStore((state) => state.addItem);

  if (!isDev) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "fixed bottom-4 left-4 z-debug w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95 border border-white/10",
          isOpen
            ? "bg-purple-600 text-white"
            : "bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800",
        )}
        title="Debug Menu"
      >
        {isOpen ? <X size={20} /> : <Bug size={20} />}
      </button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="fixed bottom-16 left-4 z-debug w-72 bg-gray-900/95 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="p-3 bg-purple-900/20 border-b border-purple-500/20 flex items-center gap-2">
            <Bug className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wide">
              Developer Tools
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {/* Cheats Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                Cheats
              </label>

              <button
                onClick={toggleUnlimitedResources}
                className={clsx(
                  "w-full flex items-center justify-between p-2 rounded-lg border transition-all",
                  isUnlimitedResources
                    ? "bg-green-500/10 border-green-500/30 text-green-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700",
                )}
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} />
                  <span className="text-xs font-medium">
                    Unlimited Resources
                  </span>
                </div>
                {isUnlimitedResources && <Check size={14} />}
              </button>

              <button
                onClick={() => {
                  unlockAllSkills();
                  // Force reload might be needed to update some UI parts if they don't subscribe properly
                  // But our components subscribe to 'unlockedSkills' so it should be fine.
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all"
              >
                <Unlock size={14} />
                <span className="text-xs font-medium">Unlock All Skills</span>
              </button>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  Add Resources (100x)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RESOURCES.map((res) => (
                    <button
                      key={res}
                      onClick={() => addItem(res, 100)}
                      className="p-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-[10px] truncate"
                      title={`Add ${res}`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Danger Zone */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-red-500/70 uppercase">
                Danger Zone
              </label>
              <button
                onClick={() => {
                  if (confirm("Reset everything? This cannot be undone.")) {
                    resetGame();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={14} />
                <span className="text-xs font-medium">Hard Reset Game</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
