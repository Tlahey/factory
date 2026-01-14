"use client";

import { useTranslation } from "@/hooks/useTranslation";

interface BreakerSwitchProps {
  /** Whether the breaker is currently ON (enabled) */
  isEnabled: boolean;
  /** Callback when the switch is toggled */
  onToggle: () => void;
  /** Optional title for the breaker panel */
  title?: string;
}

/**
 * BreakerSwitch - Industrial-style circuit breaker switch component
 *
 * Used for power control in buildings like Battery and Hub.
 * Features a heavy construction aesthetic with yellow/black hazard stripes.
 */
export function BreakerSwitch({
  isEnabled,
  onToggle,
  title,
}: BreakerSwitchProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl border border-black/50"
      style={{
        background:
          "repeating-linear-gradient(45deg, #eab308 0, #eab308 10px, #1a1a1a 10px, #1a1a1a 20px)",
      }}
    >
      {/* Inner Metal Plate */}
      <div className="m-1.5 bg-zinc-900 rounded-lg border border-zinc-700 p-4 shadow-inner relative">
        {/* Header */}
        {title !== undefined && (
          <div className="text-center mb-5 border-b border-white/10 pb-2">
            <h3 className="text-xl font-black text-white/40 tracking-[0.2em] font-mono uppercase drop-shadow-md">
              {title}
            </h3>
          </div>
        )}

        <div className="flex justify-center items-center gap-8 mb-2">
          {/* The Switch Logic */}
          <div
            className="relative w-16 h-28 bg-black rounded-lg shadow-xl ring-2 ring-zinc-700 cursor-pointer group hover:ring-zinc-500 transition-all active:scale-95"
            onClick={onToggle}
          >
            {/* Backplate Labels */}
            <div className="absolute top-2 left-0 w-full text-center text-[9px] font-bold text-zinc-600 uppercase tracking-wider font-mono">
              {t("common.on")}
            </div>
            <div className="absolute bottom-2 left-0 w-full text-center text-[9px] font-bold text-zinc-600 uppercase tracking-wider font-mono">
              {t("common.off")}
            </div>

            {/* The Moving Handle */}
            <div
              className={`
                absolute left-1 right-1 h-12 rounded border-t border-white/10 shadow-[0_4px_8px_black] transition-all duration-150 ease-linear
                flex flex-col justify-center items-center gap-0.5
                ${isEnabled ? "top-1 bg-zinc-700" : "bottom-1 bg-zinc-800"}
              `}
            >
              {/* Grip ridges */}
              <div className="w-8 h-0.5 bg-black/40 rounded-full"></div>
              <div className="w-8 h-0.5 bg-black/40 rounded-full"></div>
              <div className="w-8 h-0.5 bg-black/40 rounded-full"></div>
            </div>
          </div>

          {/* Status Lights */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full transition-all duration-200 border-2 border-black/50 ${isEnabled ? "bg-green-500 shadow-[0_0_15px_#22c55e] scale-110" : "bg-green-900/30"}`}
              />
              <span
                className={`text-xs font-bold tracking-wider font-mono ${isEnabled ? "text-green-400" : "text-zinc-700"}`}
              >
                {t("common.on")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full transition-all duration-200 border-2 border-black/50 ${!isEnabled ? "bg-red-500 shadow-[0_0_15px_#ef4444] scale-110" : "bg-red-900/30"}`}
              />
              <span
                className={`text-xs font-bold tracking-wider font-mono ${!isEnabled ? "text-red-400" : "text-zinc-700"}`}
              >
                {t("common.off")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
