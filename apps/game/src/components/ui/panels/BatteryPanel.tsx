"use client";

import { Battery } from "@/game/buildings/battery/Battery";
import { Zap, Box } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useState, useEffect } from "react";
import { BreakerSwitch } from "./BreakerSwitch";

interface BatteryPanelProps {
  building: Battery;
  forceUpdate: () => void;
}

export function BatteryPanel({ building, forceUpdate }: BatteryPanelProps) {
  const { t } = useTranslation();

  // Local state for throttled display (1s refresh)
  const [displayCharge, setDisplayCharge] = useState(building.currentCharge);
  const [displayFlowRate, setDisplayFlowRate] = useState(building.lastFlowRate);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayCharge(building.currentCharge);
      setDisplayFlowRate(building.lastFlowRate);
    }, 1000);
    return () => clearInterval(interval);
  }, [building]);

  const handleBreakerToggle = () => {
    building.toggleBreaker();
    window.dispatchEvent(new CustomEvent("GAME_REBUILD_POWER"));
    forceUpdate();
  };

  return (
    <div className="space-y-4 py-2">
      {/* 1. Breaker Panel */}
      <BreakerSwitch
        isEnabled={building.isEnabled}
        onToggle={handleBreakerToggle}
        title={t("common.breaker")}
      />

      {/* 2. Stats Panel */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        {/* Flow Rate */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${building.lastFlowRate > 0.1 ? "bg-green-500 animate-pulse" : building.lastFlowRate < -0.1 ? "bg-red-500 animate-pulse" : "bg-gray-500"}`}
            />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {displayFlowRate > 0.1
                ? t("common.charging")
                : displayFlowRate < -0.1
                  ? t("common.discharging")
                  : t("common.statuses.idle")}
            </span>
          </div>
          <span
            className={`text-lg font-mono font-bold ${displayFlowRate > 0 ? "text-green-400" : displayFlowRate < 0 ? "text-red-400" : "text-gray-400"}`}
          >
            {displayFlowRate > 0 ? "+" : ""}
            {displayFlowRate.toFixed(1)}{" "}
            <span className="text-[10px] text-gray-500">kW</span>
          </span>
        </div>

        {/* Flow Graph */}
        <BatteryFlowGraph building={building} />

        {/* Charge Visualization */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("common.charge")}
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {((displayCharge / building.capacity) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
              style={{
                width: `${(displayCharge / building.capacity) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Zap size={10} className="text-yellow-500" /> {t("common.stored")}
            </div>
            <div className="text-lg font-mono font-bold text-white">
              {Math.floor(displayCharge)}{" "}
              <span className="text-[10px] text-gray-500">kWs</span>
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Box size={10} className="text-blue-500" /> {t("common.capacity")}
            </div>
            <div className="text-lg font-mono font-bold text-white">
              {building.capacity}{" "}
              <span className="text-[10px] text-gray-500">kWs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Flow Graph sub-component */
function BatteryFlowGraph({ building }: { building: Battery }) {
  const { t } = useTranslation();
  const history = building.flowHistory || [];

  if (history.length < 2) {
    return (
      <div className="mb-4">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          Power Flow
        </div>
        <div className="h-24 bg-black/40 rounded border border-white/10 relative overflow-hidden flex items-center justify-center">
          <div className="text-xs text-gray-600">
            {t("skill_tree.in_progress")}...
          </div>
        </div>
      </div>
    );
  }

  const maxAbs = Math.max(10, ...history.map((h) => Math.abs(h.flow))) * 1.1;

  return (
    <div className="mb-4">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        Power Flow
      </div>
      <div className="h-24 bg-black/40 rounded border border-white/10 relative overflow-hidden">
        {/* Center axis (0 line) */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
        {/* Labels */}
        <div className="absolute left-1 top-1 text-[8px] text-green-500/70 font-mono">
          +{t("common.charge")}
        </div>
        <div className="absolute left-1 bottom-1 text-[8px] text-red-500/70 font-mono">
          -{t("common.discharging")}
        </div>

        <svg
          className="w-full h-full p-2"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(74, 222, 128, 0.4)" />
              <stop offset="100%" stopColor="rgba(74, 222, 128, 0)" />
            </linearGradient>
            <linearGradient id="fillRed" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
            </linearGradient>
            <clipPath id="clipTop">
              <rect x="0" y="0" width="100" height="50" />
            </clipPath>
            <clipPath id="clipBottom">
              <rect x="0" y="50" width="100" height="50" />
            </clipPath>
          </defs>

          {/* Filled area for positive (charging) */}
          <polygon
            points={
              `0,50 ` +
              history
                .map((pt, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = 50 - (Math.max(0, pt.flow) / maxAbs) * 50;
                  return `${x},${y}`;
                })
                .join(" ") +
              ` 100,50`
            }
            fill="url(#fillGreen)"
          />

          {/* Filled area for negative (discharging) */}
          <polygon
            points={
              `0,50 ` +
              history
                .map((pt, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = 50 - (Math.min(0, pt.flow) / maxAbs) * 50;
                  return `${x},${y}`;
                })
                .join(" ") +
              ` 100,50`
            }
            fill="url(#fillRed)"
          />

          {/* Single curve - green part (clipped to top half) */}
          <polyline
            points={history
              .map((pt, i) => {
                const x = (i / (history.length - 1)) * 100;
                const y = 50 - (pt.flow / maxAbs) * 50;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(74, 222, 128, 0.9)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            clipPath="url(#clipTop)"
          />

          {/* Single curve - red part (clipped to bottom half) */}
          <polyline
            points={history
              .map((pt, i) => {
                const x = (i / (history.length - 1)) * 100;
                const y = 50 - (pt.flow / maxAbs) * 50;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(239, 68, 68, 0.9)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            clipPath="url(#clipBottom)"
          />
        </svg>
      </div>
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[9px] text-gray-600 font-mono">
          {t("common.time_ago", { time: "60s" })}
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          {t("common.now")}
        </span>
      </div>
    </div>
  );
}
