import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameContext } from "../../providers/GameProvider";
import { createRockModel } from "../../environment/rock/RockModel";
import {
  createTreeModel,
  updateTreeVisualByDepletion,
} from "../../environment/tree/TreeModel";
import { Tree } from "../../environment/tree/Tree";
import { treeShaderController } from "../../visuals/shaders/TreeShader";

interface NatureLayerProps {
  rockPositions: { x: number; y: number }[];
  treePositions: { x: number; y: number; treeCount: number }[];
}

export function NatureLayer({
  rockPositions,
  treePositions,
}: NatureLayerProps) {
  const { world } = useGameContext();
  const rockMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const treeMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  // Generate Meshes Once
  const natureData = useMemo(() => {
    const rocks: THREE.Object3D[] = [];
    const trees: THREE.Group[] = [];

    // Rocks
    rockPositions.forEach((pos) => {
      const rockGroup = createRockModel();
      rockGroup.position.set(pos.x, 0, pos.y);
      rockGroup.name = `rock_${pos.x}_${pos.y}`;
      rockGroup.userData = { x: pos.x, y: pos.y }; // Store integer coords

      rockGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      rocks.push(rockGroup);
    });

    // Trees
    treePositions.forEach((pos) => {
      const treeGroup = createTreeModel(pos.treeCount);
      treeGroup.position.set(pos.x, 0, pos.y);
      treeGroup.name = `tree_${pos.x}_${pos.y}`;
      treeGroup.userData = { x: pos.x, y: pos.y };

      treeGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Initial State
      const tile = world.getTile(pos.x, pos.y);
      if (tile && tile.isTree()) {
        const treeTile = tile as Tree;
        const percent =
          treeTile.resourceAmount / treeTile.initialResourceAmount;
        updateTreeVisualByDepletion(treeGroup, percent);
      }

      trees.push(treeGroup);
    });

    return { rocks, trees };
  }, [rockPositions, treePositions, world]);

  // Sync Refs
  useEffect(() => {
    rockMeshesRef.current.clear();
    natureData.rocks.forEach((mesh) => {
      if (mesh.userData.x !== undefined && mesh.userData.y !== undefined) {
        rockMeshesRef.current.set(
          `${mesh.userData.x},${mesh.userData.y}`,
          mesh,
        );
      }
    });

    treeMeshesRef.current.clear();
    natureData.trees.forEach((mesh) => {
      if (mesh.userData.x !== undefined && mesh.userData.y !== undefined) {
        treeMeshesRef.current.set(
          `${mesh.userData.x},${mesh.userData.y}`,
          mesh,
        );
      }
    });
  }, [natureData]);

  // Frame Update
  useFrame(({ clock: _clock }, delta) => {
    // Update Tree Shader (Wind)
    treeShaderController.update(delta);

    // Update Rocks Visibility
    rockMeshesRef.current.forEach((rockMesh, key) => {
      const [x, y] = key.split(",").map(Number);
      const tile = world.getTile(x, y);
      if (tile) {
        const targetScale = tile.getVisualScale();
        rockMesh.scale.set(targetScale, targetScale, targetScale);
        rockMesh.visible = tile.isVisualVisible();
      } else {
        rockMesh.visible = false;
      }
    });

    // Update Trees Visibility & Depletion
    treeMeshesRef.current.forEach((treeMesh, key) => {
      const [x, y] = key.split(",").map(Number);
      const tile = world.getTile(x, y);
      if (tile && tile.isTree()) {
        const treeTile = tile as Tree;
        const percentRemaining =
          treeTile.resourceAmount / treeTile.initialResourceAmount;
        // Update visual state
        updateTreeVisualByDepletion(treeMesh, percentRemaining);
        treeMesh.visible = tile.isVisualVisible();
      } else {
        treeMesh.visible = false;
      }
    });
  });

  return (
    <group>
      {natureData.rocks.map((mesh, i) => (
        <primitive key={`rock-${i}`} object={mesh} />
      ))}
      {natureData.trees.map((mesh, i) => (
        <primitive key={`tree-${i}`} object={mesh} />
      ))}
    </group>
  );
}
