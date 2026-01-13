"use client";

import { ArrowUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { BuildingUpgrade } from "@/game/buildings/BuildingConfig";

interface UpgradeReminderProps {
  upgradeLevel: number;
  activeUpgrade: BuildingUpgrade;
}

export function UpgradeReminder({
  upgradeLevel,
  activeUpgrade,
}: UpgradeReminderProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <ArrowUp className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-bold text-indigo-300">
          {t(activeUpgrade.name)}
        </span>
        <span className="text-xs font-mono text-indigo-400">
          Lv.{upgradeLevel}
        </span>
      </div>
      <p className="text-xs text-gray-400">{t(activeUpgrade.description)}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {activeUpgrade.effects.map((effect, i) => (
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
    </div>
  );
}
