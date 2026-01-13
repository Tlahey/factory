"use client";

import { useState, useEffect } from "react";
import {
  X,
  Zap,
  Flame,
  ChevronRight,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import ModelPreview from "./ModelPreview";
import { Furnace } from "@/game/buildings/furnace/Furnace";
import { FURNACE_CONFIG, Recipe } from "@/game/buildings/furnace/FurnaceConfig";
import { ItemBufferPanel } from "./panels/ItemBufferPanel";

interface FurnaceDashboardProps {
  furnace: Furnace;
  onClose: () => void;
}

export default function FurnaceDashboard({
  furnace,
  onClose,
}: FurnaceDashboardProps) {
  const { t } = useTranslation();
  const [_, forceUpdate] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Poll for updates (progress bars etc)
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const handleRecipeSelect = (recipeId: string) => {
    // eslint-disable-next-line
    furnace.selectedRecipeId = recipeId;
    setIsDropdownOpen(false);
    forceUpdate((n) => n + 1);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectedRecipe = furnace.selectedRecipeId
    ? FURNACE_CONFIG.recipes.find((r) => r.id === furnace.selectedRecipeId)
    : null;

  const renderRecipeCard = (
    recipe: Recipe,
    isSelected: boolean = false,
    onClick?: () => void,
    withArrowSpace: boolean = false,
  ) => (
    <button
      key={recipe.id}
      onClick={onClick}
      className={`
                relative overflow-hidden group p-3 rounded-xl border transition-all duration-300 text-left w-full cursor-pointer
                ${
                  isSelected
                    ? "bg-gradient-to-br from-orange-500/20 to-orange-900/40 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                    : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/10"
                }
                ${withArrowSpace ? "pr-16" : ""}
            `}
    >
      <div className="flex items-center justify-between">
        {/* Input Icon */}
        <div className="flex items-center gap-4">
          <div className="relative group/input">
            <div className="w-14 h-14 bg-black/60 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
              <ModelPreview
                type="item"
                id={recipe.input}
                width={56}
                height={56}
                static
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gray-800 text-white text-xs font-bold px-1.5 py-0.5 rounded border border-white/20 shadow-md">
              1
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 text-gray-500">
            <ChevronRight
              size={20}
              className="group-hover:text-orange-400 transition-colors"
            />
            <span className="text-[10px] uppercase tracking-widest">
              {recipe.duration}s
            </span>
          </div>

          {/* Output Icon */}
          <div className="relative group/output">
            <div className="w-14 h-14 bg-black/60 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
              <ModelPreview
                type="item"
                id={recipe.output}
                width={56}
                height={56}
                static
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white text-xs font-bold px-1.5 py-0.5 rounded border border-orange-400 shadow-md">
              1
            </div>
          </div>

          <div className="flex flex-col ml-4">
            <span
              className={`text-lg font-bold leading-tight ${isSelected ? "text-orange-400" : "text-gray-200"}`}
            >
              {t(`resource.${recipe.output}`)}
            </span>
            <span className="text-xs text-gray-400 italic">
              {t(`resource.${recipe.input}`)}
            </span>
          </div>
        </div>

        {/* Rate info */}
        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded bg-black/30">
            {t("common.rate")}
          </span>
          <div className="text-xl font-mono text-white font-light tracking-tighter">
            {(60 / recipe.duration).toFixed(1)}
            <span className="text-xs text-gray-500 ml-0.5">/m</span>
          </div>
        </div>
      </div>

      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-orange-500/30 rounded-xl pointer-events-none animate-pulse" />
          {/* "Active" Badge */}
          <div className="absolute top-2 right-2 flex gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </div>
        </>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>

      <div className="relative w-[80vw] max-w-5xl h-[70vh] max-h-[700px] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-orange-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/30 border border-white/10 shadow-lg">
              <ModelPreview
                type="building"
                id="furnace"
                width={56}
                height={56}
                static
              />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-white tracking-tight">
                {t("building.furnace.name")}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${furnace.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-red-500"}`}
                />
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                  {furnace.active ? "Operational" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
          >
            <X className="w-6 h-6 text-gray-400 hovered:text-white" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Overview & Stats */}
          <div className="w-1/3 min-w-[300px] border-r border-white/10 p-6 overflow-y-auto bg-black/20 flex flex-col gap-6 custom-scrollbar">
            {/* Power Status */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                Power Consumption
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-light text-white">
                  20.0
                </span>
                <span className="text-sm text-gray-500">kW</span>
              </div>
              <div className="mt-2 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
              </div>
            </div>

            {/* Smelting Progress (Large) */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                Smelting Status
              </h3>
              <div className="relative w-48 h-48 mx-auto">
                {/* Circular Progress Placeholder - CSS Conic Gradient would be cool here, simply using border for now */}
                <div className="absolute inset-0 rounded-full border-8 border-gray-800" />
                <div className="absolute inset-0 rounded-full flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold text-white">
                    {(furnace.getProcessingSpeed() * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500 uppercase">
                    Efficiency
                  </span>
                </div>
              </div>

              {/* Active Jobs List */}
              <div className="mt-6 space-y-3">
                {furnace.activeJobs.length === 0 && (
                  <div className="text-center text-sm text-gray-600 italic py-4">
                    No active smelting jobs
                  </div>
                )}
                {furnace.activeJobs.map((job, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Batch #{idx + 1}</span>
                      <span>{(job.progress * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-100 ease-linear"
                        style={{ width: `${job.progress * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Configuration & I/O */}
          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-gray-900 to-black relative custom-scrollbar">
            {/* Recipe Selector Dropdown */}
            <div className="mb-8 relative z-20">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings size={14} />
                Configuration
              </h3>

              {/* Trigger Button */}
              <div onClick={toggleDropdown} className="cursor-pointer">
                {selectedRecipe ? (
                  <div className="relative">
                    {/* Overlay Chevron */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur rounded-full p-2 border border-white/20 text-white hover:bg-white/10 transition-colors">
                      {isDropdownOpen ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                    {renderRecipeCard(selectedRecipe, true, undefined, true)}
                  </div>
                ) : (
                  <button
                    className={`
                                        w-full bg-black/40 border border-white/10 hover:border-white/30 rounded-xl p-8 text-left 
                                        flex items-center justify-between transition-all duration-300 group cursor-pointer
                                        ${isDropdownOpen ? "border-white/30 bg-white/5" : ""}
                                    `}
                  >
                    <div className="flex flex-col gap-2">
                      <span className="text-gray-300 font-medium text-xl italic group-hover:text-white transition-colors">
                        {t("furnace.select_recipe")}
                      </span>
                      <span className="text-sm text-gray-500">
                        Click to open the recipe catalog
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-black/20 group-hover:border-white/30 transition-all">
                      {isDropdownOpen ? (
                        <ChevronUp size={24} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={24} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Dropdown Content */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-white/20 rounded-xl shadow-2xl p-2 max-h-[500px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-4 duration-200 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-2">
                    {FURNACE_CONFIG.recipes.map((recipe) =>
                      renderRecipeCard(
                        recipe,
                        furnace.selectedRecipeId === recipe.id,
                        () => handleRecipeSelect(recipe.id),
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* I/O Buffers Grid */}
            <div className="grid grid-cols-2 gap-6 relative z-10">
              {/* Input Queue */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <ItemBufferPanel
                  title="Input Feed"
                  items={furnace.inputQueue}
                  capacity={furnace.getQueueSize()}
                  color="blue"
                  sourceId="inventory"
                />
                <p className="text-xs text-center text-gray-500 mt-2">
                  Items are automatically pulled from belts
                </p>
              </div>

              {/* Output Buffer */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      Output
                    </h4>
                    <div className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      {furnace.outputSlot ? furnace.outputSlot.count : 0} /{" "}
                      {furnace.OUTPUT_CAPACITY}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className={`
                                        w-24 h-24 bg-black/40 rounded-xl border-2 relative flex items-center justify-center transition-all duration-200
                                        ${
                                          furnace.outputSlot
                                            ? "border-orange-500/50 cursor-grab active:cursor-grabbing hover:scale-105 shadow-[0_0_30px_rgba(249,115,22,0.2)]"
                                            : "border-white/5 border-dashed"
                                        }
                                    `}
                    >
                      {furnace.outputSlot ? (
                        <>
                          <ModelPreview
                            type="item"
                            id={furnace.outputSlot.type}
                            width={80}
                            height={80}
                            static
                          />
                          <div className="absolute -bottom-3 -right-3 bg-orange-600 text-white text-sm font-bold px-3 py-1 rounded-lg border border-orange-400 shadow-xl z-10">
                            {furnace.outputSlot.count}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600 uppercase font-bold tracking-widest">
                          Empty
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-center text-gray-500 mt-2">
                    Items are pushed to output belts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
