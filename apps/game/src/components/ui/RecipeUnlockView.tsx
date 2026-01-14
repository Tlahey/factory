"use client";

import { useGameStore } from "@/game/state/store";
import {
  FURNACE_RECIPES,
  Recipe,
} from "@/game/buildings/furnace/FurnaceConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { Lock, Unlock, ChevronRight } from "lucide-react";
import ModelPreview from "./ModelPreview";

/**
 * RecipeUnlockView - Displays furnace recipes that can be unlocked
 * Recipes unlock sequentially: iron → copper → gold
 */
export default function RecipeUnlockView() {
  const { t } = useTranslation();
  const unlockedRecipes = useGameStore((state) => state.unlockedRecipes);
  const unlockRecipe = useGameStore((state) => state.unlockRecipe);
  const inventory = useGameStore((state) => state.inventory);
  const removeResources = useGameStore((state) => state.removeResources);
  const isUnlimitedResources = useGameStore(
    (state) => state.isUnlimitedResources,
  );

  // Sequential unlock order
  const recipeOrder = ["iron_ingot", "copper_ingot", "gold_ingot"];

  // Get resource count from inventory
  const getResourceCount = (resource: string): number => {
    return inventory.reduce(
      (sum, slot) => (slot.type === resource ? sum + slot.count : sum),
      0,
    );
  };

  // Check if player can afford the unlock cost
  const canAfford = (cost: Record<string, number>): boolean => {
    if (isUnlimitedResources) return true;
    return Object.entries(cost).every(
      ([resource, amount]) => getResourceCount(resource) >= amount,
    );
  };

  // Get the next unlockable recipe in sequence
  const getNextUnlockable = (): string | null => {
    for (const recipeId of recipeOrder) {
      if (!unlockedRecipes.includes(recipeId)) {
        return recipeId;
      }
    }
    return null;
  };

  const nextUnlockable = getNextUnlockable();

  // Handle unlock button click
  const handleUnlock = (recipe: Recipe) => {
    if (!canAfford(recipe.unlockCost)) return;
    if (recipe.id !== nextUnlockable) return;

    removeResources(recipe.unlockCost);
    unlockRecipe(recipe.id);
  };

  return (
    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          {t("hub.recipe_research") || "Recipe Research"}
        </h3>
        <p className="text-xs text-gray-500">
          {t("hub.recipe_research_desc") ||
            "Deposit resources to unlock new furnace recipes."}
        </p>
      </div>

      <div className="space-y-3">
        {FURNACE_RECIPES.map((recipe, index) => {
          const isUnlocked = unlockedRecipes.includes(recipe.id);
          const isNextToUnlock = recipe.id === nextUnlockable;
          const isPreviousUnlocked =
            index === 0 || unlockedRecipes.includes(recipeOrder[index - 1]);
          const affordable = canAfford(recipe.unlockCost);

          return (
            <div
              key={recipe.id}
              className={`
                relative p-4 rounded-xl border transition-all duration-300
                ${
                  isUnlocked
                    ? "bg-green-500/10 border-green-500/30"
                    : isNextToUnlock && affordable
                      ? "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/60"
                      : isNextToUnlock
                        ? "bg-white/5 border-white/10"
                        : "bg-gray-800/50 border-gray-700/30 opacity-50"
                }
              `}
            >
              {/* Recipe Info */}
              <div className="flex items-center gap-4">
                {/* Input Icon */}
                <div className="relative">
                  <div className="w-12 h-12 bg-black/40 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                    <ModelPreview
                      type="item"
                      id={recipe.input}
                      width={48}
                      height={48}
                      static
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[10px] font-bold px-1 py-0.5 rounded border border-white/20">
                    x{recipe.inputCount}
                  </div>
                </div>

                <ChevronRight className="text-gray-500 w-5 h-5" />

                {/* Output Icon */}
                <div className="w-12 h-12 bg-black/40 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                  <ModelPreview
                    type="item"
                    id={recipe.output}
                    width={48}
                    height={48}
                    static
                  />
                </div>

                {/* Recipe Name */}
                <div className="flex-1">
                  <h4
                    className={`font-bold ${isUnlocked ? "text-green-400" : "text-white"}`}
                  >
                    {t(`resource.${recipe.output}`)}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {recipe.inputCount} {t(`resource.${recipe.input}`)} → 1{" "}
                    {t(`resource.${recipe.output}`)}
                  </p>
                </div>

                {/* Status/Action */}
                <div className="flex-shrink-0">
                  {isUnlocked ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <Unlock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">
                        {t("skill_tree.unlocked") || "Unlocked"}
                      </span>
                    </div>
                  ) : isNextToUnlock ? (
                    <button
                      onClick={() => handleUnlock(recipe)}
                      disabled={!affordable}
                      className={`
                        px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all
                        ${
                          affordable
                            ? "bg-orange-500 hover:bg-orange-400 text-white cursor-pointer shadow-lg shadow-orange-500/30"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }
                      `}
                    >
                      {t("skill_tree.unlock") || "Unlock"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">
                        {t("skill_tree.locked") || "Locked"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Unlock Cost (only for next unlockable) */}
              {isNextToUnlock && !isUnlocked && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {t("skill_tree.cost") || "Cost"}:
                    </span>
                    {Object.entries(recipe.unlockCost).map(
                      ([resource, amount]) => {
                        const hasEnough = getResourceCount(resource) >= amount;
                        return (
                          <div
                            key={resource}
                            className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-lg
                            ${hasEnough ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                          `}
                          >
                            <div className="w-5 h-5 rounded overflow-hidden bg-black/30">
                              <ModelPreview
                                type="item"
                                id={resource}
                                width={20}
                                height={20}
                                static
                              />
                            </div>
                            <span className="text-xs font-mono font-bold">
                              {getResourceCount(resource)}/{amount}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* Locked overlay for later recipes */}
              {!isPreviousUnlocked && !isUnlocked && (
                <div className="absolute inset-0 bg-gray-900/60 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                    <span className="text-xs text-gray-500">
                      {t("hub.unlock_previous") ||
                        "Unlock previous recipe first"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All unlocked message */}
      {unlockedRecipes.length === FURNACE_RECIPES.length && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <Unlock className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-green-400 font-bold">
            {t("hub.all_recipes_unlocked") || "All recipes unlocked!"}
          </p>
        </div>
      )}
    </div>
  );
}
