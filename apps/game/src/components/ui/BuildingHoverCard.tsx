"use client";

import { BuildingConfig } from "@/game/buildings/BuildingConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { useGameStore } from "@/game/state/store";

import clsx from "clsx";

interface BuildingHoverCardProps {
  config: BuildingConfig;
  variant?: "minimal" | "full";
  className?: string;
}

export default function BuildingHoverCard({
  config,
  variant = "full",
  className,
}: BuildingHoverCardProps) {
  const { t } = useTranslation();
  const buildingCounts = useGameStore((state) => state.buildingCounts);
  const inventory = useGameStore((state) => state.inventory);
  const count = buildingCounts[config.type] || 0;

  // Helper to get translated string or fallback
  const getName = () => t(`building.${config.id}.name`);
  const getDescription = () => t(`building.${config.id}.description`);

  const getPlayerResourceCount = (resourceId: string) => {
    return inventory.reduce((total, slot) => {
      return slot.type === resourceId ? total + slot.count : total;
    }, 0);
  };

  if (variant === "minimal") {
    return (
      <div
        className={clsx(
          "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden z-[80] pointer-events-none",
          className,
        )}
      >
        <div className="p-2 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="font-bold text-sm text-white leading-none">
            {getName()}
          </h3>
        </div>
        <div className="p-2">
          <div className="flex flex-col gap-1">
            {(() => {
              const costEntries = Object.entries(config.cost || {});
              const totalCost = costEntries.reduce(
                (acc, [, amount]) => acc + amount,
                0,
              );
              const isEmpty = costEntries.length === 0 || totalCost === 0;

              if (isEmpty) {
                return (
                  <div className="flex justify-between items-center bg-black/20 p-1.5 rounded">
                    <span className="text-xs text-gray-400 font-bold uppercase">
                      {t("common.free")}
                    </span>
                  </div>
                );
              }

              return costEntries.map(([res, amount]) => {
                const playerAmount = getPlayerResourceCount(res);
                const canAfford = playerAmount >= amount;

                return (
                  <div
                    key={res}
                    className="flex justify-between items-center bg-black/20 p-1.5 rounded"
                  >
                    <span className="text-xs text-gray-400 font-bold uppercase">
                      {t(`common.${res}`)}
                    </span>
                    <span
                      className={clsx(
                        "text-xs font-bold flex items-center gap-1",
                        canAfford ? "text-amber-400" : "text-red-500",
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      {amount}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "absolute top-0 right-full mr-4 w-64 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[80] pointer-events-none",
        className,
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-white/5">
        <h3 className="font-bold text-lg text-white leading-none">
          {getName()}
        </h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-400 capitalize">
            {config.type}
          </span>
          <span className="text-xs font-mono text-gray-500">
            {t("common.count")}:{" "}
            <span
              className={
                config.maxCount && count >= config.maxCount
                  ? "text-red-400"
                  : "text-gray-300"
              }
            >
              {count}
            </span>
            {config.maxCount && (
              <span className="text-gray-600"> / {config.maxCount}</span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Description */}
        <p className="text-xs text-gray-300 leading-relaxed italic">
          {getDescription()}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Cost */}
          <div className="col-span-2 flex flex-col gap-1 bg-black/20 p-2 rounded">
            <span className="text-xs text-gray-400 font-bold uppercase mb-1">
              {t("common.cost")}
            </span>
            {(() => {
              const costEntries = Object.entries(config.cost || {});
              const totalCost = costEntries.reduce(
                (acc, [, amount]) => acc + amount,
                0,
              );
              const isEmpty = costEntries.length === 0 || totalCost === 0;

              if (isEmpty) {
                return (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300 capitalize">
                      {t("common.free")}
                    </span>
                  </div>
                );
              }

              return costEntries.map(([res, amount]) => {
                const playerAmount = getPlayerResourceCount(res);
                const canAfford = playerAmount >= amount;

                return (
                  <div key={res} className="flex justify-between items-center">
                    <span className="text-xs text-gray-300 capitalize">
                      {t(`common.${res}`)}
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-bold flex items-center gap-1",
                        canAfford ? "text-amber-400" : "text-red-500",
                      )}
                    >
                      <div className="w-2 h-2 rounded-full bg-stone-400" />
                      {amount}
                    </span>
                  </div>
                );
              });
            })()}
          </div>

          {/* Power */}
          {"powerConfig" in config &&
            config.powerConfig &&
            config.powerConfig.rate > 0 && (
              <div className="col-span-2 flex justify-between items-center bg-black/20 p-2 rounded">
                <span className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1">
                  <Zap
                    size={10}
                    className={
                      config.powerConfig.type === "producer"
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  />
                  {t("common.power")}
                </span>
                <span
                  className={`text-sm font-mono font-bold ${config.powerConfig.type === "producer" ? "text-green-400" : "text-red-400"}`}
                >
                  {config.powerConfig.type === "producer" ? "+" : "-"}
                  {config.powerConfig.rate} kW
                </span>
              </div>
            )}

          {/* Rate/Speed */}
          {"extractionRate" in config && (
            <div className="col-span-2 flex justify-between items-center bg-black/20 p-2 rounded">
              <span className="text-xs text-gray-400 font-bold uppercase">
                {t("common.rate")}
              </span>
              <span className="text-sm font-mono font-bold text-blue-400">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(config as any).extractionRate} {t("common.per_minute")}
              </span>
            </div>
          )}
          {"speed" in config && (
            <div className="col-span-2 flex justify-between items-center bg-black/20 p-2 rounded">
              <span className="text-xs text-gray-400 font-bold uppercase">
                {t("common.rate")}
              </span>
              <span className="text-sm font-mono font-bold text-blue-400">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(config as any).speed} {t("common.per_minute")}
              </span>
            </div>
          )}

          {/* IO */}
          {"io" in config && (
            <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
              <div
                className={`p-1.5 rounded flex items-center justify-center gap-1.5 ${config.io.hasInput ? "bg-green-900/20 text-green-400 border border-green-500/20" : "bg-gray-800/30 text-gray-600"}`}
              >
                <ArrowRight size={12} />
                <span className="text-[10px] font-bold uppercase">
                  {t("common.input")}
                </span>
              </div>
              <div
                className={`p-1.5 rounded flex items-center justify-center gap-1.5 ${config.io.hasOutput ? "bg-orange-900/20 text-orange-400 border border-orange-500/20" : "bg-gray-800/30 text-gray-600"}`}
              >
                <ArrowLeft size={12} />
                <span className="text-[10px] font-bold uppercase">
                  {t("common.output")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
