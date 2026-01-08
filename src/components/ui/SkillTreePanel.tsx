"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "@/game/state/store";
import {
  X,
  Lock,
  Unlock,
  ChevronRight,
  Zap,
  Box,
  Settings,
  Clock,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  SKILL_TREE,
  SkillNode,
  getSkillNode,
} from "@/game/buildings/hub/skill-tree/SkillTreeConfig";
import { skillTreeManager } from "@/game/buildings/hub/skill-tree/SkillTreeManager";
import ModelPreview from "./ModelPreview";

// Grid configuration for skill tree layout
const GRID_CELL_SIZE = 140;
const GRID_PADDING = 60;

// Building icons mapping
const BUILDING_ICONS: Record<string, React.ReactNode> = {
  extractor: <Settings className="w-4 h-4" />,
  chest: <Box className="w-4 h-4" />,
  hub: <Zap className="w-4 h-4" />,
  conveyor: <Box className="w-4 h-4" />,
  electric_pole: <Zap className="w-4 h-4" />,
};

// Building colors for nodes
const BUILDING_COLORS: Record<
  string,
  { bg: string; border: string; glow: string; accent: string }
> = {
  extractor: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    glow: "shadow-red-500/30",
    accent: "text-red-400",
  },
  chest: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    glow: "shadow-amber-500/30",
    accent: "text-amber-400",
  },
  hub: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    glow: "shadow-green-500/30",
    accent: "text-green-400",
  },
  conveyor: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    glow: "shadow-blue-500/30",
    accent: "text-blue-400",
  },
  electric_pole: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    glow: "shadow-yellow-500/30",
    accent: "text-yellow-400",
  },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

interface SkillNodeProps {
  node: SkillNode;
  isUnlocked: boolean;
  isPending: boolean;
  progress: number;
  remainingTime: number;
  canUnlock: boolean;
  canAfford: boolean;
  onStartUnlock: (nodeId: string) => void;
  onHover: (node: SkillNode | null) => void;
}

function SkillNodeComponent({
  node,
  isUnlocked,
  isPending,
  progress,
  remainingTime,
  canUnlock,
  canAfford,
  onStartUnlock,
  onHover,
}: SkillNodeProps) {
  const { t } = useTranslation();
  const colors = BUILDING_COLORS[node.buildingId] || BUILDING_COLORS.extractor;
  const isRoot = node.id === "root";
  const isUnlockNode = node.type === "unlock";

  const handleClick = () => {
    if (canUnlock && canAfford && !isUnlocked && !isPending) {
      onStartUnlock(node.id);
    }
  };

  // Determine node state
  let stateClasses = "";

  if (isRoot || isUnlocked) {
    stateClasses = `${colors.bg} ${colors.border} shadow-lg ${colors.glow} ring-2 ring-white/20`;
  } else if (isPending) {
    stateClasses = `${colors.bg} ${colors.border} ring-2 ring-indigo-500/50`;
  } else if (canUnlock && canAfford) {
    stateClasses = `${colors.bg} ${colors.border} hover:scale-105 cursor-pointer animate-pulse`;
  } else if (canUnlock) {
    stateClasses = "bg-gray-800/50 border-gray-600/50 opacity-70";
  } else {
    stateClasses = "bg-gray-900/50 border-gray-700/30 opacity-40";
  }

  return (
    <div
      className={`
        absolute w-28 h-28 rounded-xl border-2 
        transition-all duration-300 ease-out
        flex flex-col items-center justify-center gap-1
        ${stateClasses}
      `}
      style={{
        left: node.position.x * GRID_CELL_SIZE + GRID_PADDING,
        top: node.position.y * GRID_CELL_SIZE + GRID_PADDING,
      }}
      onClick={handleClick}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Progress bar for pending unlocks */}
      {isPending && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Building Preview */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/30">
        <ModelPreview
          type="building"
          id={node.buildingId}
          width={48}
          height={48}
          static
        />
      </div>

      {/* Node Type & Level Badge */}
      <div className="flex items-center gap-1 text-xs">
        {BUILDING_ICONS[node.buildingId]}
        <span className="font-bold">
          {isRoot
            ? t("skill_tree.root")
            : isUnlockNode
              ? t("skill_tree.unlock")
              : `Lv.${node.level}`}
        </span>
      </div>

      {/* Building name for unlock nodes */}
      {!isRoot && (
        <span className={`text-[10px] ${colors.accent}`}>
          {t(`building.${node.buildingId}.name`)}
        </span>
      )}

      {/* Status Icon */}
      <div className="absolute -top-2 -right-2">
        {isRoot || isUnlocked ? (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <Unlock className="w-3 h-3 text-white" />
          </div>
        ) : isPending ? (
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg animate-spin">
            <Loader2 className="w-3 h-3 text-white" />
          </div>
        ) : canUnlock ? (
          <div
            className={`w-6 h-6 rounded-full ${
              canAfford ? "bg-blue-500 animate-bounce" : "bg-gray-500"
            } flex items-center justify-center shadow-lg`}
          >
            <ChevronRight className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Remaining time for pending */}
      {isPending && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-indigo-300 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {formatTime(remainingTime)}
        </div>
      )}
    </div>
  );
}

interface ConnectionLineProps {
  from: SkillNode;
  to: SkillNode;
  isActive: boolean;
}

function ConnectionLine({ from, to, isActive }: ConnectionLineProps) {
  const x1 = from.position.x * GRID_CELL_SIZE + GRID_PADDING + 56;
  const y1 = from.position.y * GRID_CELL_SIZE + GRID_PADDING + 56;
  const x2 = to.position.x * GRID_CELL_SIZE + GRID_PADDING + 56;
  const y2 = to.position.y * GRID_CELL_SIZE + GRID_PADDING + 56;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={isActive ? "#22c55e" : "#4b5563"}
      strokeWidth={isActive ? 3 : 2}
      strokeDasharray={isActive ? "none" : "5,5"}
      className="transition-all duration-300"
    />
  );
}

export default function SkillTreePanel() {
  const { t } = useTranslation();
  const isOpen = useGameStore((state) => state.isSkillTreeOpen);
  const setOpen = useGameStore((state) => state.setSkillTreeOpen);
  const unlockedSkills = useGameStore((state) => state.unlockedSkills);
  const pendingUnlocks = useGameStore((state) => state.pendingUnlocks);
  const inventory = useGameStore((state) => state.inventory);

  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [, forceUpdate] = useState(0);

  // Periodically check for completed unlocks and update UI
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      skillTreeManager.checkPendingUnlocks();
      forceUpdate((n) => n + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleStartUnlock = useCallback((nodeId: string) => {
    skillTreeManager.startUnlocking(nodeId);
    forceUpdate((n) => n + 1);
  }, []);

  if (!isOpen) return null;

  // Get visible nodes
  const visibleNodes = skillTreeManager.getVisibleNodes();

  // Calculate canvas bounds
  const maxX = Math.max(...SKILL_TREE.map((n) => n.position.x)) + 1;
  const maxY = Math.max(...SKILL_TREE.map((n) => n.position.y)) + 1;
  const canvasWidth = maxX * GRID_CELL_SIZE + GRID_PADDING * 2;
  const canvasHeight = maxY * GRID_CELL_SIZE + GRID_PADDING * 2 + 40; // Extra space for time labels

  // Get connections for visible nodes
  const connections: { from: SkillNode; to: SkillNode; isActive: boolean }[] =
    [];
  for (const node of visibleNodes) {
    for (const reqId of node.requires) {
      const reqNode = getSkillNode(reqId);
      if (reqNode && visibleNodes.some((n) => n.id === reqId)) {
        connections.push({
          from: reqNode,
          to: node,
          isActive: unlockedSkills.includes(reqId),
        });
      }
    }
  }

  // Get hovered node info
  const hoveredCost = hoveredNode
    ? skillTreeManager.getNodeCost(hoveredNode.id)
    : null;
  const hoveredUpgrade = hoveredNode
    ? skillTreeManager.getUpgradeForNode(hoveredNode.id)
    : null;

  // Calculate resource totals
  const getResourceCount = (resource: string) => {
    return inventory.reduce(
      (sum, slot) => (slot.type === resource ? sum + slot.count : sum),
      0,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-[85vw] max-w-5xl h-[75vh] max-h-[700px] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">
                {t("skill_tree.title")}
              </h2>
              <p className="text-xs text-gray-400">
                {unlockedSkills.length} / {SKILL_TREE.length}{" "}
                {t("skill_tree.unlocked")}
                {pendingUnlocks.length > 0 && (
                  <span className="ml-2 text-indigo-400">
                    ({pendingUnlocks.length} {t("skill_tree.in_progress")})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="relative"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              minWidth: "100%",
            }}
          >
            {/* Connection Lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
            >
              {connections.map((conn, i) => (
                <ConnectionLine key={i} {...conn} />
              ))}
            </svg>

            {/* Skill Nodes */}
            {visibleNodes.map((node) => {
              const isPending = skillTreeManager.isPending(node.id);
              return (
                <SkillNodeComponent
                  key={node.id}
                  node={node}
                  isUnlocked={
                    node.id === "root" || unlockedSkills.includes(node.id)
                  }
                  isPending={isPending}
                  progress={skillTreeManager.getUnlockProgress(node.id)}
                  remainingTime={skillTreeManager.getRemainingTime(node.id)}
                  canUnlock={skillTreeManager.canUnlock(node.id)}
                  canAfford={skillTreeManager.canAfford(node.id)}
                  onStartUnlock={handleStartUnlock}
                  onHover={setHoveredNode}
                />
              );
            })}
          </div>
        </div>

        {/* Tooltip / Info Panel */}
        {hoveredNode && hoveredNode.id !== "root" && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-800/95 border border-white/10 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                <ModelPreview
                  type="building"
                  id={hoveredNode.buildingId}
                  width={64}
                  height={64}
                  static
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white">
                  {hoveredNode.type === "unlock"
                    ? `${t("skill_tree.unlock")} ${t(
                        `building.${hoveredNode.buildingId}.name`,
                      )}`
                    : hoveredUpgrade
                      ? t(hoveredUpgrade.name)
                      : `${t(`building.${hoveredNode.buildingId}.name`)} Lv.${
                          hoveredNode.level
                        }`}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {hoveredNode.type === "unlock"
                    ? t(`building.${hoveredNode.buildingId}.description`)
                    : hoveredUpgrade
                      ? t(hoveredUpgrade.description)
                      : ""}
                </p>

                {/* Effects */}
                {hoveredUpgrade && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hoveredUpgrade.effects.map((effect, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs font-mono rounded bg-indigo-500/20 text-indigo-300"
                      >
                        {effect.type === "multiplier"
                          ? `${effect.stat} ×${effect.value}`
                          : effect.type === "additive"
                            ? `${effect.stat} +${effect.value}`
                            : `Unlock: ${effect.stat}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Duration */}
                {hoveredNode.unlockDuration > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {t("skill_tree.unlock_time")}:{" "}
                    {formatTime(hoveredNode.unlockDuration)}
                  </div>
                )}
              </div>

              {/* Cost */}
              <div className="flex-shrink-0 text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {t("skill_tree.cost")}
                </div>
                {hoveredCost &&
                  Object.entries(hoveredCost).map(([resource, amount]) => {
                    const current = getResourceCount(resource);
                    const canAfford = current >= amount;
                    return (
                      <div
                        key={resource}
                        className={`text-sm font-mono ${
                          canAfford ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {current}/{amount} {t(`common.${resource}`)}
                      </div>
                    );
                  })}

                {!unlockedSkills.includes(hoveredNode.id) &&
                  !skillTreeManager.isPending(hoveredNode.id) &&
                  skillTreeManager.canUnlock(hoveredNode.id) &&
                  skillTreeManager.canAfford(hoveredNode.id) && (
                    <button
                      onClick={() => handleStartUnlock(hoveredNode.id)}
                      className="mt-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg transition-colors"
                    >
                      {t("skill_tree.start_unlock")}
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
