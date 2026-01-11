"use client";

import React from "react";

interface GameMenuProps {
  isPaused: boolean;
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
}

export default function GameMenu({
  isPaused,
  onResume,
  onSave,
  onLoad,
  onNewGame,
}: GameMenuProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);

  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 z-menu flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/20 p-8 rounded-2xl shadow-2xl flex flex-col gap-4 w-72 relative animate-scale-in">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          PAUSED
        </h2>

        <button
          onClick={() => {
            console.log("UI: Resume clicked");
            setIsConfirming(false);
            onResume();
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg active:scale-95"
        >
          Resume
        </button>

        <div className="h-px bg-white/10 my-2" />

        <button
          onClick={() => {
            console.log("UI: Save clicked");
            onSave();
          }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-semibold transition-all border border-white/10 active:scale-95"
        >
          Save Game
        </button>

        <button
          onClick={() => {
            console.log("UI: Load clicked");
            onLoad();
          }}
          className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-semibold transition-all border border-white/10 active:scale-95"
        >
          Load Game
        </button>

        <div className="h-px bg-white/10 my-2" />

        {!isConfirming ? (
          <button
            onClick={() => {
              console.log("UI: [V2] New Game first click");
              setIsConfirming(true);
            }}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 py-3 px-4 rounded-lg font-semibold transition-all border border-red-600/30 active:scale-95"
          >
            New Game
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-2 bg-red-950/30 rounded-lg border border-red-500/30 animate-fade-in">
            <p className="text-xs text-red-300 text-center mb-2 px-1">
              Toute progression non sauvegardée sera perdue. Êtes-vous sûr ?
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
                Recommencer
              </button>
              <button
                onClick={() => {
                  console.log("UI: [V2] New Game cancelled");
                  setIsConfirming(false);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-md text-sm font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
