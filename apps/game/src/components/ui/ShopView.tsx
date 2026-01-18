"use client";

import { useGameStore } from "@/game/state/store";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getShopItems,
  getNextPurchaseCost,
  getAllowedCount,
} from "@/game/buildings/hub/shop/ShopConfig";
import ModelPreview from "./ModelPreview";
import { ShoppingCart, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { BuildingId } from "@/game/buildings/BuildingConfig";

interface ShopViewProps {
  onPurchased?: () => void;
}

export default function ShopView({ onPurchased }: ShopViewProps) {
  const { t } = useTranslation();
  const unlockedBuildings = useGameStore((state) => state.unlockedBuildings);
  const purchasedCounts = useGameStore((state) => state.purchasedCounts);
  const buyBuilding = useGameStore((state) => state.buyBuilding);
  const hasResources = useGameStore((state) => state.hasResources);
  const removeResources = useGameStore((state) => state.removeResources);
  const inventory = useGameStore((state) => state.inventory);

  const getResourceCount = (resource: string) => {
    return inventory.reduce(
      (sum, slot) => (slot.type === resource ? sum + slot.count : sum),
      0,
    );
  };

  // Filter items that are unlocked in the skill tree
  const availableItems = getShopItems().filter((item) =>
    unlockedBuildings.includes(item.id),
  );

  const handleBuy = (buildingId: BuildingId) => {
    const cost = getNextPurchaseCost(
      buildingId,
      purchasedCounts[buildingId] || 0,
    );
    if (hasResources(cost)) {
      removeResources(cost);
      buyBuilding(buildingId);
      onPurchased?.();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-900/50 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            {t("shop.title") || "Intergalactic Shop"}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {t("shop.description") ||
              "Purchase additional building licenses with gathered resources."}
          </p>
        </div>
      </div>

      {availableItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/10">
          <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">
            {t("shop.empty") || "No buildings available in the shop yet."}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            {t("shop.empty_desc") ||
              "Unlock more buildings in the Skill Tree to see them here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableItems.map((item) => {
            const purchasedCount = purchasedCounts[item.id as BuildingId] || 0;
            const cost = getNextPurchaseCost(item.id, purchasedCount);
            const canAfford = hasResources(cost);
            const totalAllowed = getAllowedCount(item.id, purchasedCount);

            return (
              <div
                key={item.id}
                className={clsx(
                  "p-4 rounded-xl border transition-all duration-300 flex flex-col gap-4",
                  canAfford
                    ? "bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10 group"
                    : "bg-black/20 border-white/5 opacity-80",
                )}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <ModelPreview
                      type="building"
                      id={item.id}
                      width={64}
                      height={64}
                      static
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">
                      {t(`building.${item.id}.name`) || item.id}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        {t("shop.owned") || "Licenses"}:
                      </span>
                      <span className="text-xs font-mono text-white bg-indigo-500/20 px-1.5 py-0.5 rounded">
                        {totalAllowed}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(cost).map(([resource, amount]) => {
                      const owned = getResourceCount(resource);
                      const affordable = owned >= amount;
                      return (
                        <div
                          key={resource}
                          className={clsx(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border",
                            affordable
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border-red-500/20 text-red-400",
                          )}
                        >
                          <span className="capitalize">{resource}</span>
                          <span className="font-bold">{amount}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleBuy(item.id)}
                    disabled={!canAfford}
                    className={clsx(
                      "w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      canAfford
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed",
                    )}
                  >
                    {canAfford ? (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        {t("shop.buy") || "Purchase License"}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        {t("shop.insufficient_resources") ||
                          "Insufficient Resources"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
