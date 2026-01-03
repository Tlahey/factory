'use client';

import { useEffect, useRef } from 'react';
import { GameApp } from '@/game/GameApp';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameApp | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Game
    if (!gameRef.current) {
      gameRef.current = new GameApp(containerRef.current);
    }

    // Cleanup
    const game = gameRef.current;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
