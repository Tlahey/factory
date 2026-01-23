import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameContext } from "../../providers/GameProvider";
import {
  getCableMaterial,
  getCableAttachmentPoint,
  generateCatenaryCurve,
} from "../../visuals/helpers/CableVisualHelper";

export function CablesView() {
  const { world, cablesDirtyRef } = useGameContext();
  const groupRef = useRef<THREE.Group>(null);
  const material = getCableMaterial();

  useFrame(() => {
    if (!cablesDirtyRef.current || !groupRef.current) return;

    // Rebuild Cables
    // Clean up OLD meshes
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      groupRef.current.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        // Material is shared singleton, do not dispose
      }
    }

    const cables = world.cables;

    cables.forEach((edge) => {
      const b1 = world.getBuilding(edge.x1, edge.y1);
      const b2 = world.getBuilding(edge.x2, edge.y2);

      const start = getCableAttachmentPoint(b1, edge.x1, edge.y1);
      const end = getCableAttachmentPoint(b2, edge.x2, edge.y2);

      const curve = generateCatenaryCurve(start, end);
      const geometry = new THREE.TubeGeometry(curve, 16, 0.05, 6, false); // Segments=16, radius=0.05

      // Clone material to set texture repeat properly for each cable
      const dist = start.distanceTo(end);
      const instancedMat = material.clone();
      if (instancedMat.map) {
        // We must clone the texture to change its repeat property independently
        instancedMat.map = material.map!.clone();
        instancedMat.map.repeat.set(1, dist * 2);
        instancedMat.map.needsUpdate = true;
      }

      const mesh = new THREE.Mesh(geometry, instancedMat);
      groupRef.current!.add(mesh);
    });

    // Reset Dirty Flag
    cablesDirtyRef.current = false;
  });

  return <group ref={groupRef} />;
}
