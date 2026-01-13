import { BuildingCategory } from "./BuildingConfig";
import { Settings, Box, Zap } from "lucide-react";
import React from "react";

export interface BuildingVisuals {
  colors: {
    bg: string;
    border: string;
    glow: string;
    accent: string;
  };
  icon: React.ReactNode;
}

const CATEGORY_ICONS: Record<BuildingCategory, React.ReactNode> = {
  production: <Settings className="w-3 h-3" />,
  logistics: <Box className="w-3 h-3" />,
  storage: <Box className="w-3 h-3" />,
  power: <Zap className="w-3 h-3" />,
  special: <Zap className="w-3 h-3" />,
};

const CATEGORY_COLORS: Record<BuildingCategory, BuildingVisuals["colors"]> = {
  production: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    glow: "shadow-red-500/30",
    accent: "text-red-400",
  },
  logistics: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    glow: "shadow-blue-500/30",
    accent: "text-blue-400",
  },
  storage: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    glow: "shadow-amber-500/30",
    accent: "text-amber-400",
  },
  power: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    glow: "shadow-yellow-500/30",
    accent: "text-yellow-400",
  },
  special: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    glow: "shadow-green-500/30",
    accent: "text-green-400",
  },
};

export function getBuildingCategoryVisuals(
  category: BuildingCategory,
): BuildingVisuals {
  return {
    colors: CATEGORY_COLORS[category],
    icon: CATEGORY_ICONS[category],
  };
}
