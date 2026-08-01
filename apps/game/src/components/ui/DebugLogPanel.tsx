"use client";

import { useGameStore } from "@/game/state/store";
import { useLocalization } from "@/hooks/useLocalization";
import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  Copy,
  Trash2,
  X,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";

export default function DebugLogPanel() {
  const { t } = useLocalization();
  const isVisible = useGameStore((state) => state.isDebugLogsVisible);
  const toggleVisible = useGameStore((state) => state.toggleDebugLogs);
  const debugLogs = useGameStore((state) => state.debugLogs);
  const clearLogs = useGameStore((state) => state.clearDebugLogs);

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs on update (chronological display)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [debugLogs]);

  if (!isVisible) return null;

  // Filter logs based on search query
  const filteredLogs = debugLogs.filter((log) =>
    log.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCopy = async () => {
    try {
      // Copy in chronological order (oldest first, so reverse the store's reverse-chronological array)
      const logsToCopy = [...filteredLogs].reverse().join("\n");
      await navigator.clipboard.writeText(logsToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  return (
    <div
      className={clsx(
        "fixed right-4 z-debug font-mono text-xs text-white/90 select-text flex flex-col transition-all duration-300",
        isCollapsed
          ? "top-4 h-11 w-80"
          : "top-4 h-[500px] w-[450px] max-h-[85vh] max-w-[90vw]",
      )}
    >
      {/* Container with Glassmorphism */}
      <div className="flex flex-col h-full bg-gray-950/85 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/60 border-b border-white/10 select-none">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <span className="font-bold text-gray-200 uppercase tracking-wider text-[10px]">
              {t("debug.diagnostics_title")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Collapse button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronUp size={14} />
              )}
            </button>
            {/* Close button */}
            <button
              onClick={toggleVisible}
              className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Panel Content (Visible only when expanded) */}
        {!isCollapsed && (
          <>
            {/* Action Bar (Search, Copy, Clear) */}
            <div className="flex items-center gap-2 p-2 bg-gray-900/40 border-b border-white/10 select-none">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900/80 border border-white/10 rounded px-2 py-1 pl-8 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Copy Logs */}
              <button
                onClick={handleCopy}
                disabled={filteredLogs.length === 0}
                className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold select-none transition-all active:scale-95 border border-white/10 disabled:opacity-50 disabled:pointer-events-none",
                  copied
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                )}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? t("debug.copied") : t("debug.copy_logs")}</span>
              </button>

              {/* Clear Logs */}
              <button
                onClick={clearLogs}
                disabled={debugLogs.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-950/20 text-red-400 hover:bg-red-900/20 border border-red-500/20 active:scale-95 select-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                title="Clear Logs"
              >
                <Trash2 size={12} />
                <span>{t("debug.clear")}</span>
              </button>
            </div>

            {/* Scrollable Logs Output */}
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-black/40 font-mono text-[11px] leading-relaxed"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 select-none italic text-center py-8">
                  <Terminal className="w-8 h-8 text-gray-700 mb-2 opacity-50" />
                  <span>
                    {searchQuery ? "No matches found." : t("debug.no_logs")}
                  </span>
                </div>
              ) : (
                // Display in chronological order (bottom to top, so render reversed array)
                [...filteredLogs].reverse().map((log, idx) => {
                  // Apply syntax coloring to certain keywords
                  const isFailed =
                    log.includes("[Failed]") ||
                    log.includes("failed") ||
                    log.includes("Placement invalid") ||
                    log.includes("Placement failed");
                  const isSuccess =
                    log.includes("Successfully") || log.includes("Success");
                  const isAttempt = log.includes("Attempting");

                  return (
                    <div
                      key={idx}
                      className={clsx(
                        "py-0.5 px-1.5 rounded transition-colors break-words hover:bg-white/5",
                        isFailed &&
                          "text-red-400 bg-red-950/10 border-l border-red-500/50",
                        isSuccess &&
                          "text-green-400 bg-green-950/10 border-l border-green-500/50",
                        isAttempt && "text-purple-300",
                      )}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
