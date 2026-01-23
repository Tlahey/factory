import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../state/store";
import { useGameContext } from "../../providers/GameProvider";

export function SelectionView() {
  const { world } = useGameContext();
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Initial Geometry creation (Memoized by React lifecycle basically)
  // We create geometries once.
  const ring1Geo = new THREE.TorusGeometry(0.7, 0.03, 16, 32);
  const ring2Geo = new THREE.TorusGeometry(0.85, 0.015, 16, 32);

  const ring1Mat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
  });

  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    depthTest: false,
  });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const openedKey = useGameStore.getState().openedEntityKey;

    if (!openedKey) {
      groupRef.current.visible = false;
      return;
    }

    const [sx, sy] = openedKey.split(",").map(Number);
    const b = world.getBuilding(sx, sy);

    let x = sx;
    let y = sy;
    let width = 1;
    let height = 1;

    if (b) {
      x = b.x;
      y = b.y;
      width = b.width;
      height = b.height;
    }

    groupRef.current.visible = true;

    // Position
    groupRef.current.position.set(
      x + (width - 1) / 2,
      0.05,
      y + (height - 1) / 2,
    );

    // Scale
    groupRef.current.scale.set(width, 1, height);

    // Animation
    const time = clock.getElapsedTime();

    if (ring1Ref.current) {
      const s1 = 1.0 + Math.sin(time * 5) * 0.1;
      ring1Ref.current.scale.set(s1, s1, 1);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.sin(time * 5) * 0.2;
    }

    if (ring2Ref.current) {
      const s2 = 1.0 + Math.cos(time * 3) * 0.05;
      ring2Ref.current.scale.set(s2, s2, 1);
    }

    // Rotation
    if (width === height) {
      groupRef.current.rotation.y += 0.02;
    } else {
      groupRef.current.rotation.y = 0;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        ref={ring1Ref}
        geometry={ring1Geo}
        material={ring1Mat}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        ref={ring2Ref}
        geometry={ring2Geo}
        material={ring2Mat}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}
