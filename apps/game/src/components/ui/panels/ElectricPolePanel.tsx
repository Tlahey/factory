import { BuildingEntity } from "@/game/entities/BuildingEntity";
import { Activity } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ElectricPole } from "@/game/buildings/electric-pole/ElectricPole";
import { GameApp } from "@/game/GameApp";
import { useGameStore } from "@/game/state/store";
import { ElectricPoleConfigType } from "@/game/buildings/electric-pole/ElectricPoleConfig";

interface ElectricPolePanelProps {
  building: BuildingEntity;
}

export function ElectricPolePanel({ building }: ElectricPolePanelProps) {
  const { t } = useTranslation();
  // Subscribe to skills to update when upgrades are unlocked
  useGameStore((state) => state.unlockedSkills);

  const config = building.getConfig() as ElectricPoleConfigType;
  // Access global store/world to get connections - this might need access to World
  // BuildingEntity doesn't store its connections list directly, World does.
  // But we can get it via helper or if we pass World down.
  // Ideally BuildingInfoPanel.tsx passed the building. We might need to fetch connections from World here.
  // Or we can add a helper "getConnectionsCount" to BuildingEntity or World.

  // Since we don't have direct access to World here easily (unless we use the global instance hack or context),
  // we will use the global window.game instance for now as seen in BuildingInfoPanel.

  const world = (window as unknown as { game: GameApp }).game?.world;
  const connectionsCount = world
    ? world.getConnectionsCount(building.x, building.y)
    : 0;

  // Cast to ElectricPole to access maxConnections getter safely
  const maxConnections =
    building instanceof ElectricPole ? building.maxConnections : 3;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Network Status */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity size={12} className="text-blue-400" />
          {t("common.status")}
        </h4>

        <div className="space-y-2">
          <div className="flex justify-between items-center bg-black/20 p-2 rounded">
            <span className="text-sm text-gray-300">
              {t("common.connections")}
            </span>
            <span
              className={`text-sm font-mono font-bold ${connectionsCount >= maxConnections ? "text-amber-400" : "text-green-400"}`}
            >
              {connectionsCount}{" "}
              <span className="text-gray-500">/ {maxConnections}</span>
            </span>
          </div>
          <div className="flex justify-between items-center bg-black/20 p-2 rounded">
            <span className="text-sm text-gray-300">{t("common.range")}</span>
            <span className="text-sm font-mono font-bold text-blue-400">
              {config.powerConfig.range} {t("common.tiles")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
