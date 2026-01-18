"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/game/state/store";
import { Clock, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getSkillNode } from "@/game/buildings/hub/skill-tree/SkillTreeConfig";
import { skillTreeManager } from "@/game/buildings/hub/skill-tree/SkillTreeManager";
import ModelPreview from "./ModelPreview";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

interface PendingUnlockItemProps {
  skillId: string;
  startTime: number;
  duration: number;
  currentTime: number;
}

function PendingUnlockItem({
  skillId,
  startTime,
  duration,
  currentTime,
}: PendingUnlockItemProps) {
  const { t } = useTranslation();
  const setSkillTreeOpen = useGameStore((state) => state.setSkillTreeOpen);
  const node = getSkillNode(skillId);

  if (!node) return null;

  const elapsed = (currentTime - startTime) / 1000;
  const progress = Math.min(1, elapsed / duration);
  const remaining = Math.max(0, duration - elapsed);

  return (
    <div
      onClick={() => setSkillTreeOpen(true)}
      className="group flex items-center gap-3 p-2 pr-4 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 transition-all shadow-lg"
    >
      {/* Building Preview */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
        <ModelPreview
          type="building"
          id={node.buildingId}
          width={48}
          height={48}
          static
        />
        {/* Progress overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-indigo-500/80 transition-all duration-300"
          style={{ height: `${progress * 100}%` }}
        />
        {/* Spinning loader */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin drop-shadow-lg" />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <div className="text-xs font-bold text-white truncate">
          {node.type === "unlock"
            ? `${t("skill_tree.unlocking")} ${t(
                `building.${node.buildingId}.name`,
              )}`
            : `${t(`building.${node.buildingId}.name`)} Lv.${node.level}`}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-indigo-400">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{formatTime(remaining)}</span>
        </div>
        {/* Progress bar */}
        <div className="w-24 h-1 mt-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PendingUnlocksHUD() {
  const pendingUnlocks = useGameStore((state) => state.pendingUnlocks);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Periodically update to show elapsed time and check completions
  useEffect(() => {
    if (pendingUnlocks.length === 0) return;

    const interval = setInterval(() => {
      skillTreeManager.checkPendingUnlocks();
      setCurrentTime(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [pendingUnlocks.length]);

  if (pendingUnlocks.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-hud flex flex-col gap-2 animate-in slide-in-from-left-4 duration-300">
      {pendingUnlocks.map((pending) => (
        <PendingUnlockItem
          key={pending.skillId}
          skillId={pending.skillId}
          startTime={pending.startTime}
          duration={pending.duration}
          currentTime={currentTime}
        />
      ))}
    </div>
  );
}
