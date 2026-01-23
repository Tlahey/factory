import React from "react";
import { BaseNatureVisual } from "./BaseNatureVisual";
import { ProceduralNatureFallback } from "./ProceduralNatureFallback";

interface NatureAssetVisualProps {
  x: number;
  y: number;
  type: "tree" | "rock";
}

/**
 * The final generalized component for any nature asset.
 * It automatically handles GLTF loading (with persistence)
 * or falls back to the procedural model.
 */
export function NatureAssetVisual({ x, y, type }: NatureAssetVisualProps) {
  const proceduralFallback = (
    <ProceduralNatureFallback type={type} x={x} y={y} />
  );

  return (
    <BaseNatureVisual
      x={x}
      y={y}
      entityId={type}
      proceduralFallback={proceduralFallback}
    />
  );
}
