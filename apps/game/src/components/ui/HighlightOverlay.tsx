"use client";

import { useGameStore } from "@/game/state/store";
import { useEffect, useState } from "react";

export default function HighlightOverlay() {
  const focusedElementId = useGameStore((state) => state.focusedElement);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (!focusedElementId) {
        setRect(null);
        return;
      }
      const el = document.getElementById(focusedElementId);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    const interval = setInterval(updateRect, 100); // Poll for dynamic UI

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      clearInterval(interval);
    };
  }, [focusedElementId]);

  if (!focusedElementId || !rect) return null;

  return (
    <div className="fixed inset-0 z-overlay pointer-events-none">
      {/* Semi-transparent Backdrop with Hole */}
      <div
        className="absolute inset-0 bg-black/50 transition-all duration-300 pointer-events-auto"
        style={{
          clipPath: `polygon(
                0% 0%, 
                0% 100%, 
                100% 100%, 
                100% 0%, 
                0% 0%, 
                ${rect.left}px 0%, 
                ${rect.left}px ${rect.top}px, 
                ${rect.right}px ${rect.top}px, 
                ${rect.right}px ${rect.bottom}px, 
                ${rect.left}px ${rect.bottom}px, 
                ${rect.left}px 0%
             )`,
        }}
      ></div>

      {/* Spotlight Border */}
      <div
        className="absolute border-2 border-amber-400 bg-amber-400/5 rounded-2xl shadow-[0_0_50px_rgba(251,191,36,0.3)] transition-all duration-300 ease-out"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        }}
      >
        {/* Label Arrow or Text could go here */}
      </div>
    </div>
  );
}
