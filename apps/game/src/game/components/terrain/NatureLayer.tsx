import React from "react";
import { useFrame } from "@react-three/fiber";
import { treeShaderController } from "../../visuals/shaders/TreeShader";
import { NatureAssetVisual } from "../../environment/NatureAssetVisual";

interface NatureLayerProps {
  natureAssets: { x: number; y: number; type: "tree" | "rock" }[];
}

export function NatureLayer({ natureAssets }: NatureLayerProps) {
  // Global Shared Systems (Wind Shaders)
  useFrame(({ clock: _clock }, delta) => {
    treeShaderController.update(delta);
  });

  return (
    <group>
      {natureAssets.map((asset) => (
        <NatureAssetVisual
          key={`${asset.type}-${asset.x}-${asset.y}`}
          x={asset.x}
          y={asset.y}
          type={asset.type}
        />
      ))}
    </group>
  );
}
