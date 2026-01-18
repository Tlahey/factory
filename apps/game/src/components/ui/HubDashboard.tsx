"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useGameStore } from "@/game/state/store";
import {
  X,
  Lock,
  Unlock,
  Zap,
  Settings,
  Clock,
  Loader2,
  Sparkles,
  ShoppingBag,
  Flame,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  SKILL_TREE,
  SkillNode,
  BuildingId,
  getSkillNode,
} from "@/game/buildings/hub/skill-tree/SkillTreeConfig";
import { skillTreeManager } from "@/game/buildings/hub/skill-tree/SkillTreeManager";
import { Hub } from "@/game/buildings/hub/Hub";
import { getBuildingConfig } from "@/game/buildings/BuildingConfig";
import { getBuildingCategoryVisuals } from "@/game/buildings/BuildingVisuals";
import ModelPreview from "./ModelPreview";
import ShopView from "./ShopView";
import RecipeUnlockView from "./RecipeUnlockView";
import { BreakerSwitch } from "./panels/BreakerSwitch";
import clsx from "clsx";

// Grid configuration for skill tree layout
const GRID_CELL_SIZE = 150;

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

const SkillTreeNode = ({ data }: NodeProps) => {
  const {
    node,
    isUnlocked,
    isPending,
    progress,
    remainingTime,
    canUnlock,
    canAfford,
    onStartUnlock,
    onHover,
  } = data;
  const { t } = useTranslation();

  // Use "tech" ID check
  const isTechNode = node.id.includes("tech") || node.type === "tech";

  const config = getBuildingConfig(node.buildingId);
  const visuals = isTechNode
    ? {
        colors: {
          bg: "bg-purple-500/20",
          border: "border-purple-500/50",
          glow: "shadow-purple-500/30",
          accent: "text-purple-400",
        },
        icon: <Settings className="w-3 h-3" />, // Fallback icon for tech
      }
    : getBuildingCategoryVisuals(config?.category || "production");

  const colors = visuals.colors;

  const isRoot = node.id === "root";
  const isUnlockNode = node.type === "unlock";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canUnlock && canAfford && !isUnlocked && !isPending) {
      onStartUnlock(node.id);
    }
  };

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
    stateClasses = "bg-gray-900/50 border-gray-700/30 opacity-40 grayscale";
  }

  // ROOT NODE RENDERING (Start Point)
  if (isRoot) {
    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          isConnectable={false}
        />
        <div
          className={`
          w-6 h-6 rounded-full border-2 border-green-500/50 
          bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]
          flex items-center justify-center
        `}
          onClick={handleClick}
          onMouseEnter={() => onHover(node)}
          onMouseLeave={() => onHover(null)}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="invisible"
          isConnectable={false}
        />
      </>
    );
  }

  // TECH NODE RENDERING (Circle)
  if (isTechNode) {
    const isReachable = canUnlock || isUnlocked || isPending;
    const techClasses = isUnlocked
      ? "bg-green-500/20 shadow-green-500/50 text-green-400"
      : isPending
        ? "bg-indigo-500/20 animate-pulse text-indigo-400"
        : canUnlock && canAfford
          ? "bg-emerald-500/20 hover:scale-110 cursor-pointer animate-pulse text-emerald-300"
          : "bg-gray-800 opacity-50 text-gray-500";

    const borderClass = isUnlocked
      ? "border-green-500"
      : isPending
        ? "border-indigo-500"
        : canUnlock && canAfford
          ? "border-emerald-500/60"
          : "border-gray-600";

    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          isConnectable={false}
        />
        <div
          className={`
          w-6 h-6 rounded-full border-2 
          transition-all duration-300 ease-out
          flex items-center justify-center
          shadow-lg
          ${techClasses}
          ${borderClass}
        `}
          onClick={handleClick}
          onMouseEnter={() => isReachable && onHover(node)}
          onMouseLeave={() => onHover(null)}
        >
          {/* Inner Dot */}
          <div
            className={`w-2 h-2 rounded-full ${isReachable ? "bg-current" : "bg-gray-600"}`}
          />

          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="invisible"
          isConnectable={false}
        />
      </>
    );
  }

  // STANDARD NODE RENDERING (Card)
  // Determine if the node is "reachable" (unlocked, pending, or available to unlock)
  const isReachable = isUnlocked || isPending || canUnlock;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="invisible"
        isConnectable={false}
      />
      <div
        className={`
            w-20 h-20 rounded-lg border-2 
            transition-all duration-300 ease-out
            flex flex-col items-center justify-center gap-0.5
            relative
            ${stateClasses}
          `}
        onClick={handleClick}
        onMouseEnter={() => isReachable && onHover(node)}
        onMouseLeave={() => onHover(null)}
      >
        {isPending && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 rounded-b-md overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {/* Building Preview OR '?' if unknown */}
        <div className="w-16 h-16 rounded overflow-hidden bg-black/30 flex items-center justify-center">
          {isReachable ? (
            <ModelPreview
              type="building"
              id={node.buildingId}
              width={64}
              height={64}
              static
            />
          ) : (
            <span className="text-4xl font-black text-gray-700 select-none">
              ?
            </span>
          )}
        </div>

        {/* Level Badge - Hide if unknown */}
        {isReachable && (
          <div className="flex items-center gap-0.5 text-[10px]">
            <span className="font-bold">
              {isRoot
                ? t("skill_tree.root")
                : isUnlockNode
                  ? ""
                  : `Lv.${node.level}`}
            </span>
          </div>
        )}

        {/* Status Icon - Hide if unknown */}
        {isReachable && (
          <div className="absolute -top-1.5 -right-1.5 z-10">
            {isRoot || isUnlocked ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Unlock className="w-2.5 h-2.5 text-white" />
              </div>
            ) : isPending ? (
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg animate-spin">
                <Loader2 className="w-2.5 h-2.5 text-white" />
              </div>
            ) : canUnlock ? (
              <div
                className={`w-5 h-5 rounded-full ${
                  canAfford ? "bg-blue-500 animate-bounce" : "bg-gray-500"
                } flex items-center justify-center shadow-lg`}
              >
                <Lock className="w-2.5 h-2.5 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                <Lock className="w-2.5 h-2.5 text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Building Type Icon - Hide if unknown */}
        {!isRoot && isReachable && (
          <div className="absolute top-4 -right-1.5 z-10">
            <div
              className={`w-5 h-5 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center shadow-lg`}
            >
              <div className={colors.accent}>{visuals.icon}</div>
            </div>
          </div>
        )}

        {/* "NEW" Badge for Unlocks (Top Left) */}
        {!isRoot && isUnlockNode && !isUnlocked && isReachable && (
          <div className="absolute -left-2 -top-2 z-20">
            <div
              className={`
                  w-5 h-5 bg-amber-400 rounded-full 
                  shadow-[0_0_10px_rgba(251,191,36,0.6)] 
                  flex items-center justify-center 
                  border border-white/20
                  ${canUnlock && canAfford ? "animate-pulse" : ""}
                `}
            >
              <Sparkles className="w-3 h-3 text-black fill-white" />
            </div>
          </div>
        )}

        {/* Remaining time */}
        {isPending && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[9px] text-indigo-300 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(remainingTime)}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="invisible"
        isConnectable={false}
      />
    </>
  );
};

const nodeTypes = {
  skillNode: SkillTreeNode,
};

interface HubDashboardProps {
  hub: Hub;
  onClose: () => void;
}

export default function HubDashboard({ hub, onClose }: HubDashboardProps) {
  const { t } = useTranslation();
  const unlockedSkills = useGameStore((state) => state.unlockedSkills);
  const pendingUnlocks = useGameStore((state) => state.pendingUnlocks);
  const inventory = useGameStore((state) => state.inventory);
  const showDialogue = useGameStore((state) => state.showDialogue);

  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [activeTab, setActiveTab] = useState<"tree" | "shop" | "recipes">(
    "tree",
  );
  const [_, forceUpdate] = useState(0);

  // Periodically check for completed unlocks and update UI
  useEffect(() => {
    const interval = setInterval(() => {
      skillTreeManager.checkPendingUnlocks();
      forceUpdate((n) => n + 1);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleStartUnlock = useCallback((nodeId: string) => {
    skillTreeManager.startUnlocking(nodeId);
    forceUpdate((n) => n + 1);
  }, []);

  // Generate nodes and edges from SKILL_TREE
  // We display ALL nodes now to show the full tree, but locked ones will be dimmed
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    SKILL_TREE.forEach((node) => {
      const isUnlocked = node.id === "root" || unlockedSkills.includes(node.id);
      const isPending = skillTreeManager.isPending(node.id);
      const canUnlock = skillTreeManager.canUnlock(node.id);
      const canAfford = skillTreeManager.canAfford(node.id);

      nodes.push({
        id: node.id,
        type: "skillNode",
        position: {
          x: node.position.x * GRID_CELL_SIZE,
          y: node.position.y * GRID_CELL_SIZE,
        },
        data: {
          node,
          isUnlocked,
          isPending,
          progress: skillTreeManager.getUnlockProgress(node.id),
          remainingTime: skillTreeManager.getRemainingTime(node.id),
          canUnlock,
          canAfford,
          onStartUnlock: handleStartUnlock,
          onHover: setHoveredNode,
        },
      });

      // Add edges for requirements
      node.requires.forEach((reqId) => {
        edges.push({
          id: `${reqId}-${node.id}`,
          source: reqId,
          target: node.id,
          animated: isPending,
          style: {
            stroke: isUnlocked ? "#22c55e" : canUnlock ? "#6366f1" : "#4b5563",
            strokeWidth: isUnlocked ? 2 : 1.5,
            opacity: isUnlocked || canUnlock ? 1 : 0.4,
          },
        });
      });
    });

    return { nodes, edges };
  }, [unlockedSkills, handleStartUnlock]); // Re-calculate when state changes

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

  // Hub stats
  const powerGeneration = hub.getPowerGeneration();

  return (
    <div className="fixed inset-0 z-dialog flex items-center justify-center animate-in fade-in duration-200">
      <div className="relative w-[90vw] max-w-6xl h-[80vh] max-h-[750px] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-green-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/30 border border-white/10">
              <ModelPreview
                type="building"
                id="hub"
                width={48}
                height={48}
                static
              />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">
                {t("building.hub.name")}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking close
            className="p-2 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Overview */}
          <div
            id="hub-overview-panel"
            className="w-80 border-r border-white/10 p-4 overflow-y-auto flex-shrink-0 z-10 bg-gray-900/95 custom-scrollbar"
          >
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">
              {t("common.overview")}
            </h3>

            {/* Hub Breaker Switch */}
            <div className="mb-4">
              <BreakerSwitch
                isEnabled={hub.isEnabled}
                onToggle={() => {
                  hub.toggleBreaker();
                  window.dispatchEvent(new CustomEvent("GAME_REBUILD_POWER"));
                  forceUpdate((n) => n + 1);
                }}
                title={t("common.breaker")}
              />
            </div>

            {/* Main Generator Status */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-3 h-3 rounded-full ${hub.isEnabled ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" : "bg-red-500"}`}
                />
                <span className="text-sm font-bold tracking-tight text-white/90">
                  MAIN GENERATOR
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Zap size={10} className="text-green-500" />
                    {t("common.production")}
                  </div>
                  <div className="text-lg font-mono font-bold text-green-400">
                    {hub.statsHistory && hub.statsHistory.length > 0
                      ? hub.statsHistory[
                          hub.statsHistory.length - 1
                        ].production.toFixed(1)
                      : powerGeneration.toFixed(1)}
                    <span className="text-[10px] text-gray-500 ml-1">kW</span>
                  </div>
                </div>
                <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Zap size={10} className="text-red-500" />
                    {t("common.consumption")}
                  </div>
                  <div className="text-lg font-mono font-bold text-red-400">
                    {hub.statsHistory && hub.statsHistory.length > 0
                      ? hub.statsHistory[
                          hub.statsHistory.length - 1
                        ].consumption.toFixed(1)
                      : "0.0"}
                    <span className="text-[10px] text-gray-500 ml-1">kW</span>
                  </div>
                </div>
              </div>

              {/* Power Graph */}
              <div className="h-24 bg-black/40 rounded border border-white/10 relative overflow-hidden">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none p-2">
                  <div className="w-full h-px bg-white" />
                  <div className="w-full h-px bg-white" />
                  <div className="w-full h-px bg-white" />
                </div>

                {(() => {
                  const history = hub.statsHistory || [];
                  if (history.length < 2)
                    return (
                      <div className="text-xs text-gray-600 flex items-center justify-center h-full">
                        Gathering Data...
                      </div>
                    );

                  const maxVal =
                    Math.max(
                      10,
                      ...history.map(
                        (h: { production: number; consumption: number }) =>
                          Math.max(h.production, h.consumption),
                      ),
                    ) * 1.1;

                  const createPoints = (key: "production" | "consumption") => {
                    return history
                      .map(
                        (
                          pt: { production: number; consumption: number },
                          i: number,
                        ) => {
                          const x = (i / (history.length - 1)) * 100;
                          const y = 100 - (pt[key] / maxVal) * 100;
                          return `${x},${y}`;
                        },
                      )
                      .join(" ");
                  };

                  return (
                    <svg
                      className="w-full h-full p-2"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Consumption line (red) */}
                      <polyline
                        points={createPoints("consumption")}
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.8)"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Production line (green) */}
                      <polyline
                        points={createPoints("production")}
                        fill="none"
                        stroke="rgba(74, 222, 128, 0.8)"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Balance indicators (small yellow dots where production ≈ consumption) */}
                      {history.map(
                        (
                          pt: { production: number; consumption: number },
                          i: number,
                        ) => {
                          const diff = Math.abs(pt.production - pt.consumption);
                          const isBalanced = diff < 1; // Within 1 kW tolerance
                          if (!isBalanced) return null;

                          const x = (i / (history.length - 1)) * 100;
                          const y = 100 - (pt.production / maxVal) * 100;

                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="1.5"
                              fill="rgba(251, 191, 36, 0.7)"
                            />
                          );
                        },
                      )}
                    </svg>
                  );
                })()}
              </div>
              <div className="flex justify-between px-1 mt-1">
                <span className="text-[9px] text-gray-600 font-mono">
                  60s ago
                </span>
                <span className="text-[9px] text-gray-600 font-mono">Now</span>
              </div>
            </div>

            {/* Active Upgrades Summary */}
            {unlockedSkills.filter(
              (s) => s.includes("_") && !s.includes("unlock"),
            ).length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Active Upgrades
                </h4>
                <div className="space-y-2">
                  {(["extractor", "chest", "hub"] as BuildingId[]).map(
                    (buildingId) => {
                      const level =
                        skillTreeManager.getBuildingUpgradeLevel(buildingId);
                      const upgrade =
                        skillTreeManager.getActiveUpgrade(buildingId);
                      if (level === 0 || !upgrade) return null;

                      return (
                        <div
                          key={buildingId}
                          className="p-2 bg-white/5 border border-white/10 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded overflow-hidden bg-black/30">
                              <ModelPreview
                                type="building"
                                id={buildingId}
                                width={24}
                                height={24}
                                static
                              />
                            </div>
                            <span className="text-xs font-bold text-white">
                              {t(`building.${buildingId}.name`)} Lv.{level}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {upgrade.effects.map((effect, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-indigo-500/20 text-indigo-300"
                              >
                                {effect.type === "multiplier"
                                  ? `${effect.stat} ×${effect.value}`
                                  : effect.type === "additive"
                                    ? `${effect.stat} +${effect.value}`
                                    : `Unlock: ${effect.stat}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* Pending Unlocks */}
            {pendingUnlocks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {t("skill_tree.in_progress")}
                </h4>
                {pendingUnlocks.map((pending) => {
                  const node = getSkillNode(pending.skillId);
                  if (!node) return null;
                  const progress = skillTreeManager.getUnlockProgress(
                    pending.skillId,
                  );
                  const remaining = skillTreeManager.getRemainingTime(
                    pending.skillId,
                  );

                  return (
                    <div
                      key={pending.skillId}
                      className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                        <span className="text-xs font-bold text-indigo-300 truncate">
                          {node.type === "unlock"
                            ? t(`building.${node.buildingId}.name`)
                            : `${t(`building.${node.buildingId}.name`)} Lv.${node.level}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {formatTime(remaining)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center Panel - Skill Tree or Shop */}
          <div
            id="hub-dashboard-main-content"
            className="flex-1 overflow-hidden relative bg-gray-900 flex flex-col"
          >
            {/* Tab Navigation */}
            <div className="flex bg-black/40 border-b border-white/5">
              <button
                onClick={() => setActiveTab("tree")}
                className={clsx(
                  "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                  activeTab === "tree"
                    ? "text-indigo-400 border-indigo-500 bg-white/5"
                    : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5",
                )}
              >
                {t("shop.tab_tree") || "Evolution Tree"}
              </button>
              <button
                id="hub-shop-tab"
                onClick={() => {
                  setActiveTab("shop");
                  showDialogue("hub_shop_intro");
                }}
                className={clsx(
                  "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                  activeTab === "shop"
                    ? "text-indigo-400 border-indigo-500 bg-white/5"
                    : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5",
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {t("shop.tab_shop") || "Shop"}
              </button>
              <button
                onClick={() => setActiveTab("recipes")}
                className={clsx(
                  "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                  activeTab === "recipes"
                    ? "text-orange-400 border-orange-500 bg-white/5"
                    : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5",
                )}
              >
                <Flame className="w-3.5 h-3.5" />
                {t("hub.tab_recipes") || "Recipes"}
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {activeTab === "tree" ? (
                <div
                  id="hub-skill-tree-panel"
                  className="w-full h-full relative"
                >
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 absolute top-4 left-4 z-40 bg-gray-900/50 backdrop-blur px-2 py-1 rounded">
                    Arbre d&apos;upgrade
                  </h3>

                  <div className="w-full h-full">
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        fitView
                        minZoom={0.5}
                        maxZoom={2}
                        nodesConnectable={false}
                        nodesDraggable={false}
                        proOptions={{ hideAttribution: true }}
                      >
                        <Background color="#374151" gap={30} size={1} />
                      </ReactFlow>
                    </ReactFlowProvider>
                  </div>

                  {/* Tooltip (kept from previous version) */}
                  {hoveredNode && hoveredNode.id !== "root" && (
                    <div className="absolute bottom-4 left-4 right-4 p-3 bg-gray-800/95 border border-white/10 rounded-xl shadow-xl animate-in fade-in duration-100 z-50 w-auto max-w-md mx-auto">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                          <ModelPreview
                            type="building"
                            id={hoveredNode.buildingId}
                            width={48}
                            height={48}
                            static
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm">
                            {hoveredNode.type === "unlock"
                              ? `${t("skill_tree.unlock")} ${t(
                                  `building.${hoveredNode.buildingId}.name`,
                                )}`
                              : hoveredUpgrade
                                ? t(hoveredUpgrade.name)
                                : `${t(`building.${hoveredNode.buildingId}.name`)} Lv.${hoveredNode.level}`}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {hoveredNode.type === "unlock"
                              ? t(
                                  `building.${hoveredNode.buildingId}.description`,
                                )
                              : hoveredUpgrade
                                ? t(hoveredUpgrade.description)
                                : ""}
                          </p>

                          {/* Effects */}
                          {hoveredUpgrade && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {hoveredUpgrade.effects.map((effect, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-indigo-500/20 text-indigo-300"
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

                          {/* Cost & Action */}
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-end justify-between gap-4">
                            <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1">
                              {hoveredCost &&
                                Object.entries(hoveredCost).map(
                                  ([resource, amount]) => {
                                    const current = getResourceCount(resource);
                                    const canAfford = current >= amount;
                                    return (
                                      <div
                                        key={resource}
                                        className={`text-[10px] font-mono flex justify-between ${canAfford ? "text-emerald-400" : "text-red-400"}`}
                                      >
                                        <span className="opacity-60">
                                          {t(`common.${resource}`)}
                                        </span>
                                        <span className="font-bold">
                                          {current}/{amount}
                                        </span>
                                      </div>
                                    );
                                  },
                                )}
                            </div>

                            <div className="flex-shrink-0 text-right">
                              {hoveredNode.unlockDuration > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 justify-end mb-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTime(hoveredNode.unlockDuration)}
                                </div>
                              )}
                              {!unlockedSkills.includes(hoveredNode.id) &&
                                !skillTreeManager.isPending(hoveredNode.id) &&
                                skillTreeManager.canUnlock(hoveredNode.id) &&
                                skillTreeManager.canAfford(hoveredNode.id) && (
                                  <button
                                    onClick={() =>
                                      handleStartUnlock(hoveredNode.id)
                                    }
                                    className="px-3 py-1.5 text-[10px] bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded transition-colors uppercase tracking-wider"
                                  >
                                    {t("skill_tree.start_unlock")}
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === "shop" ? (
                <div id="hub-shop-panel" className="w-full h-full">
                  <ShopView onPurchased={() => forceUpdate((n) => n + 1)} />
                </div>
              ) : (
                <div id="hub-recipes-panel" className="w-full h-full">
                  <RecipeUnlockView />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
