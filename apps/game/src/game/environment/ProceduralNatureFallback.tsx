import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameContext } from "../providers/GameProvider";
import { createTreeModel, updateTreeVisualByDepletion } from "./tree/TreeModel";
import { createRockModel } from "./rock/RockModel";
import { Tree } from "./tree/Tree";
import { Rock } from "./rock/Rock";

interface ProceduralNatureFallbackProps {
  type: "tree" | "rock";
  x: number;
  y: number;
}

/**
 * Unified component for procedural nature asset rendering.
 * Used as a fallback when GLTF models are missing or fail to load.
 */
export function ProceduralNatureFallback({
  type,
  x,
  y,
}: ProceduralNatureFallbackProps) {
  const { world } = useGameContext();

  const mesh = useMemo(() => {
    let group: THREE.Group;

    if (type === "tree") {
      const tile = world.getTile(x, y);
      const treeCount = tile instanceof Tree ? tile.treeCount : 1;
      group = createTreeModel(treeCount);
    } else {
      group = createRockModel();
    }

    group.userData = { x, y };
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return group;
  }, [type, x, y, world]);

  const meshRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const meshObj = meshRef.current;
    if (!meshObj) return;

    const tile = world.getTile(x, y);
    if (!tile) {
      meshObj.visible = false;
      return;
    }

    if (type === "tree" && tile instanceof Tree) {
      const percent = tile.resourceAmount / tile.initialResourceAmount;
      updateTreeVisualByDepletion(meshObj, percent);
      meshObj.visible = tile.isVisualVisible();
    } else if (type === "rock" && tile instanceof Rock) {
      const targetScale = tile.getVisualScale();
      meshObj.scale.set(targetScale, targetScale, targetScale);
      meshObj.visible = tile.isVisualVisible();
    } else {
      meshObj.visible = false;
    }
  });

  return <primitive ref={meshRef} object={mesh} position={[x, 0, y]} />;
}
