import { Furnace } from "@/game/buildings/furnace/Furnace";
import { FURNACE_CONFIG } from "@/game/buildings/furnace/FurnaceConfig";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useState } from "react";
import ModelPreview from "../ModelPreview";
import { ChevronRight, ChevronDown, Flame, ChevronUp } from "lucide-react";
import { ItemBufferPanel } from "./ItemBufferPanel";
import { Recipe } from "@/game/buildings/BuildingConfig";

interface FurnacePanelProps {
  building: Furnace;
  onDragStart?: (
    e: React.DragEvent,
    source: string,
    index: number,
    slot: { type: string; count: number },
  ) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export function FurnacePanel({
  building,
  onDragStart,
  onDragOver: _onDragOver,
}: FurnacePanelProps) {
  const { t } = useTranslation();
  const [_, forceUpdate] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Poll for updates (progress bars etc)
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const handleRecipeSelect = (recipeId: string) => {
    building.setRecipe(recipeId);
    setIsDropdownOpen(false);
    forceUpdate((n) => n + 1);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectedRecipe = building.selectedRecipeId
    ? FURNACE_CONFIG.recipes.find((r) => r.id === building.selectedRecipeId)
    : null;

  const renderRecipeCard = (
    recipe: Recipe,
    isSelected: boolean = false,
    onClick?: () => void,
  ) => (
    <button
      key={recipe.id}
      onClick={onClick}
      className={`
                relative overflow-hidden group p-3 rounded-xl border transition-all duration-300 text-left w-full
                ${
                  isSelected
                    ? "bg-gradient-to-br from-orange-500/20 to-orange-900/40 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                    : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/10"
                }
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
            <span className="text-[9px] uppercase tracking-widest">
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

          <div className="flex flex-col ml-3">
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
    <div className="space-y-6">
      {/* Visual Recipe Selector Dropdown */}
      <div className="space-y-2 relative z-20">
        <label className="text-xs uppercase text-gray-400 font-bold tracking-wider flex items-center gap-2">
          <Flame
            size={12}
            className={
              building.active
                ? "text-orange-500 animate-pulse"
                : "text-gray-500"
            }
          />
          {t("furnace.recipe")}
        </label>

        {/* Trigger Button (Closed State) */}
        <div onClick={toggleDropdown} className="cursor-pointer">
          {selectedRecipe ? (
            <div className="relative">
              {/* Overlay Chevron */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur rounded-full p-1.5 border border-white/20 text-white hover:bg-white/10 transition-colors">
                {isDropdownOpen ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </div>
              {renderRecipeCard(selectedRecipe, true)}
            </div>
          ) : (
            <button
              className={`
                            w-full bg-black/40 border border-white/10 hover:border-white/30 rounded-xl p-6 text-left 
                            flex items-center justify-between transition-all duration-300 group
                            ${isDropdownOpen ? "border-white/30 bg-white/5" : ""}
                        `}
            >
              <div className="flex flex-col gap-1">
                <span className="text-gray-300 font-medium text-lg italic group-hover:text-white transition-colors">
                  {t("furnace.select_recipe")}
                </span>
                <span className="text-xs text-gray-500">
                  Click here to configure production
                </span>
              </div>
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-black/20 group-hover:border-white/30 transition-all">
                {isDropdownOpen ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Dropdown List (Open State) */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-2 max-h-[400px] overflow-y-auto space-y-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            {FURNACE_CONFIG.recipes.map((recipe) =>
              renderRecipeCard(
                recipe,
                building.selectedRecipeId === recipe.id,
                () => handleRecipeSelect(recipe.id),
              ),
            )}
          </div>
        )}
      </div>

      {/* Input Queue Buffer */}
      <div>
        <ItemBufferPanel
          title="Input Queue"
          items={building.inputQueue}
          capacity={building.getQueueSize()}
          color="blue"
          sourceId="inventory"
        />
        <p className="text-[10px] text-gray-500 text-center mt-1 animate-pulse">
          {building.inputQueue.length > 0
            ? "Processing resources..."
            : "Waiting for inputs..."}
        </p>
      </div>

      {/* Active Jobs Progress */}
      {building.activeJobs.length > 0 && (
        <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            <span>Smelting Progress</span>
            <span className="text-orange-400">
              {(building.getProcessingSpeed() * 100).toFixed(0)}% Speed
            </span>
          </div>
          {building.activeJobs.map((job, idx) => (
            <div
              key={idx}
              className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5"
            >
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                style={{ width: `${job.progress * 100}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Output Slot (Mini) */}
      <div className="flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent p-4 rounded-xl border border-white/10">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Output Storage
          </span>
          <span className="text-[10px] text-gray-600">Drag to collect</span>
        </div>

        <div
          className={`
                        w-16 h-16 bg-black/40 rounded-xl border-2 relative flex items-center justify-center transition-all duration-200
                        ${
                          building.outputSlot
                            ? "border-orange-500/50 cursor-grab active:cursor-grabbing hover:border-orange-400 hover:scale-105 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                            : "border-white/5 border-dashed"
                        }
                    `}
          draggable={!!building.outputSlot && !!onDragStart}
          onDragStart={(e) => {
            if (building.outputSlot && onDragStart) {
              onDragStart(e, "chest", 0, building.outputSlot); // Using 'chest' source ID for output
            }
          }}
        >
          {building.outputSlot ? (
            <>
              <ModelPreview
                type="item"
                id={building.outputSlot.type}
                width={56}
                height={56}
                static
              />
              <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-md border border-orange-400 shadow-lg min-w-[24px] text-center z-10">
                {building.outputSlot.count}
              </div>
            </>
          ) : (
            <span className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">
              Empty
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
