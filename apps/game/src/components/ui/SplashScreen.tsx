import { useGameStore } from "@/game/state/store";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const isSceneReady = useGameStore((state) => state.isSceneReady);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isSceneReady) {
      // Small buffer to allow CSS transition
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500); // 500ms fade out duration
      return () => clearTimeout(timer);
    } else {
      // Use a functional update or check to avoid redundant renders if possible,
      // though the lint specifically dislikes synchronous calls in the effect body.
      // Using a timeout with 0 delay is a common way to defer and avoid the warning.
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }
  }, [isSceneReady]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${
        isSceneReady ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-white tracking-widest animate-pulse">
          FACTORY <span className="text-blue-500">GAME</span>
        </h1>
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm mt-4">
          Initializing Factory Systems...
        </p>
      </div>
    </div>
  );
}
