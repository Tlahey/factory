"use client";

import { useTranslation } from "@/hooks/useTranslation";

interface StatusIndicatorWidgetProps {
  /** Current operational status */
  status: "working" | "blocked" | "no_resources" | "no_power" | "idle";
  /** Whether the building is actively doing something */
  isActive?: boolean;
  /** Whether the building has a power source */
  hasPowerSource?: boolean;
  /** Custom label override */
  customLabel?: string;
}

const statusStyles = {
  working: {
    color: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    labelKey: "common.statuses.operational",
  },
  blocked: {
    color: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
    labelKey: "common.statuses.blocked",
  },
  no_resources: {
    color: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    labelKey: "common.statuses.no_resources",
  },
  no_power: {
    color: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    labelKey: "common.statuses.no_power",
  },
  idle: {
    color: "bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]",
    labelKey: "common.statuses.idle",
  },
};

/**
 * Widget for displaying building operational status
 * Automatically determines the correct status color and label
 */
export function StatusIndicatorWidget({
  status,
  isActive = false,
  hasPowerSource = true,
  customLabel,
}: StatusIndicatorWidgetProps) {
  const { t } = useTranslation();

  // Determine effective status
  let effectiveStatus = status;
  if (!hasPowerSource && status !== "idle") {
    effectiveStatus = "no_power";
  } else if (isActive && status === "idle") {
    effectiveStatus = "working";
  }

  const style = statusStyles[effectiveStatus];
  const label = customLabel || t(style.labelKey);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full ${isActive ? "animate-pulse" : ""} ${style.color}`}
      />
      <span className="text-sm font-bold tracking-tight text-white/90">
        {label}
      </span>
    </div>
  );
}
