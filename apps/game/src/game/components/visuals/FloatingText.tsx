import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

interface FloatingTextProps {
  x: number;
  y: number;
  text: string;
  onComplete: () => void;
}

export function FloatingText({ x, y, text, onComplete }: FloatingTextProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const completedRef = useRef(false);

  useFrame((_, delta) => {
    if (completedRef.current) return;

    let completed = false;
    setOffsetY((prev) => {
      const next = prev + delta * 1.5; // floats up
      if (next > 1.5) {
        completed = true;
      }
      return next;
    });
    setOpacity((prev) => Math.max(0, prev - delta * 0.9)); // fades out

    if (completed) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <Html
      position={[x, 1.2 + offsetY, y]}
      center
      distanceFactor={8}
      style={{
        pointerEvents: "none",
        transition: "opacity 0.05s ease-out",
        opacity: opacity,
      }}
    >
      <div className="text-base font-black text-green-400 select-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] whitespace-nowrap bg-black/65 px-3 py-1 rounded-md border border-green-500/30 scale-110 shadow-lg">
        {text}
      </div>
    </Html>
  );
}
