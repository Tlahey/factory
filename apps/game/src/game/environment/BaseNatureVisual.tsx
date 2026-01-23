import React, { useEffect, useState, ReactNode } from "react";
import * as THREE from "three";
import { GLTFEntityModel } from "../hooks/useAssetLoader";
import { useGameContext } from "../providers/GameProvider";
import { ResourceTile } from "./ResourceTile";
import { assetLibrary } from "../systems/AssetLibrary";
import { AssetErrorBoundary } from "../components/common/AssetErrorBoundary";

interface BaseNatureVisualProps {
  x: number;
  y: number;
  entityId: string;
  proceduralFallback: ReactNode;
  onVariantAssigned?: (vId: string) => void;
}

/**
 * A generalized component for rendering nature entities (Trees, Rocks, etc.)
 * with support for dynamic GLTF loading and persistence.
 */
export function BaseNatureVisual({
  x,
  y,
  entityId,
  proceduralFallback,
  onVariantAssigned,
}: BaseNatureVisualProps) {
  const { world } = useGameContext();
  const [variantUrl, setVariantUrl] = useState<string | null>(null);

  // 1. Initialize Asset Library & Variant Assignment
  useEffect(() => {
    let active = true;

    const init = async () => {
      await assetLibrary.initialize();
      if (!active) return;

      const tile = world.getTile(x, y);
      if (tile && tile instanceof ResourceTile) {
        let vId = tile.variantId;

        // Lazy Assignment if missing
        if (!vId) {
          vId = assetLibrary.getRandomVariantId(entityId);
          if (vId) {
            tile.variantId = vId;
            if (onVariantAssigned) onVariantAssigned(vId);
          }
        }

        if (vId) {
          const url = assetLibrary.getVariantUrl(entityId, vId);
          setVariantUrl(url);
        }
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [x, y, world, entityId, onVariantAssigned]);

  // 2. Render GLTF if available (with Error Boundary)
  if (variantUrl) {
    return (
      <AssetErrorBoundary fallback={proceduralFallback}>
        <GLTFEntityModel
          url={variantUrl}
          position={[x, 0, y]}
          onLoaded={(_scene: THREE.Group) => {
            // Optional: Global setup for the scene if needed
          }}
        />
      </AssetErrorBoundary>
    );
  }

  // 3. Fallback to Procedural
  return <>{proceduralFallback}</>;
}
