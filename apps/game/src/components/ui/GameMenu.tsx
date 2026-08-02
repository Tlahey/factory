"use client";

import React from "react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

interface GameMenuProps {
  isPaused: boolean;
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
}

const LANGUAGES: { code: "en" | "fr"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

export default function GameMenu({
  isPaused,
  onResume,
  onSave,
  onLoad,
  onNewGame,
}: GameMenuProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const { t, locale, setLocale } = useTranslation();

  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 z-menu flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/20 p-8 rounded-2xl shadow-2xl flex flex-col gap-4 w-72 relative animate-scale-in">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          {t("menu.paused")}
        </h2>

        <button
          onClick={() => {
            console.log("UI: Resume clicked");
            setIsConfirming(false);
            onResume();
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg active:scale-95"
        >
          {t("menu.resume")}
        </button>

        <div className="h-px bg-white/10 my-2" />

        <button
          onClick={() => {
            console.log("UI: Save clicked - Dispatching GAME_SAVE");
            // Direct dispatch for robustness
            const event = new CustomEvent("GAME_SAVE");
            window.dispatchEvent(event);
            console.log("UI: GAME_SAVE Dispatched");
            onSave();
          }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-semibold transition-all border border-white/10 active:scale-95"
        >
          {t("menu.save_game")}
        </button>

        <button
          onClick={() => {
            console.log("UI: Load clicked");
            onLoad();
          }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-semibold transition-all border border-white/10 active:scale-95"
        >
          {t("menu.load_game")}
        </button>

        <div className="h-px bg-white/10 my-2" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t("menu.language")}
          </span>
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className={clsx(
                  "px-3 py-1 rounded-md text-xs font-bold transition-colors",
                  locale === lang.code
                    ? "bg-blue-500/80 text-white"
                    : "text-gray-400 hover:bg-white/10",
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/10 my-2" />

        {!isConfirming ? (
          <button
            onClick={() => {
              console.log("UI: [V2] New Game first click");
              setIsConfirming(true);
            }}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 py-3 px-4 rounded-lg font-semibold transition-all border border-red-600/30 active:scale-95"
          >
            {t("menu.new_game")}
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-2 bg-red-950/30 rounded-lg border border-red-500/30 animate-fade-in">
            <p className="text-xs text-red-300 text-center mb-2 px-1">
              {t("menu.new_game_confirm")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log("UI: [V2] New Game confirmed");
                  setIsConfirming(false);
                  onNewGame();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-md text-sm font-bold shadow-lg"
              >
                {t("menu.restart_confirm")}
              </button>
              <button
                onClick={() => {
                  console.log("UI: [V2] New Game cancelled");
                  setIsConfirming(false);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-md text-sm font-semibold"
              >
                {t("menu.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
