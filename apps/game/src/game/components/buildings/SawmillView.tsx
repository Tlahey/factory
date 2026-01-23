/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sawmill } from "../../buildings/sawmill/Sawmill";
import {
  createSawmillModel,
  getSawBlade,
  getSawHead,
} from "../../buildings/sawmill/SawmillModel";
import { ParticleSystem } from "../../visuals/helpers/ParticleSystem";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

interface SawmillViewProps {
  entity: Sawmill;
  particleSystem: ParticleSystem;
}

export function SawmillView({ entity, particleSystem }: SawmillViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  const { mesh, sawBlade, sawHead, statusLightMat, ioArrows } = useMemo(() => {
    const mesh = createSawmillModel();

    // Extract animated parts
    const blade = getSawBlade(mesh);
    const head = getSawHead(mesh);

    // Status Light (Custom addition to model)
    const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0.35, 0.4, 0.35);
    mesh.add(light);

    // IO Arrows
    const arrows = createIOArrows(entity as Sawmill);
    mesh.add(arrows);

    return {
      mesh,
      sawBlade: blade,
      sawHead: head,
      statusLightMat: lightMat,
      ioArrows: arrows,
    };
  }, [entity]); // Empty deps: Model structure is static

  // 2. Frame Animation Loop
  const animTimeRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // const time = state.clock.elapsedTime;
    const isActive = entity.active;

    if (isActive) {
      animTimeRef.current += delta;
    }
    const animTime = animTimeRef.current;

    // A. Visual Status Logic
    let targetColor = 0xff0000;

    if (!entity.hasPowerSource) {
      targetColor = 0xff0000; // Red
    } else if (entity.powerStatus === "warn" && isActive) {
      targetColor = 0xffaa00; // Orange
      // scale = 1.0 + Math.sin(time * 5) * 0.15;
    } else if (!isActive) {
      targetColor = 0xffaa00; // Orange Idle
    } else {
      targetColor = 0x00ff00; // Green Active
      // scale = 1.0 + Math.sin(time * 10) * 0.2;
    }

    // Apply visual updates directly (avoiding React state for per-frame updates)
    if (statusLightMat.color.getHex() !== targetColor) {
      statusLightMat.color.setHex(targetColor);
    }

    // B. Animations
    if (isActive) {
      const speed = 20 * (entity.visualSatisfaction || 1);

      // Spin Blade
      if (sawBlade) {
        sawBlade.rotation.y += delta * speed;
      }

      // Move Head
      if (sawHead) {
        sawHead.position.x = Math.sin(animTime * 2) * 0.25;
      }

      // C. Particles
      if (Math.random() < 0.4) {
        const headX = sawHead ? sawHead.position.x : 0;
        particleSystem.spawn(
          entity.x + headX + (Math.random() - 0.5) * 0.2,
          0.2,
          entity.y + (Math.random() - 0.5) * 0.2,
        );
      }
    }

    // D. Update IO Arrows
    updateIOArrows(ioArrows, entity as Sawmill);
  });

  // 3. Position & Rotation
  // 1x1 building centered at 0,0 relative to parent tile
  // Actually, BuildingEntity x/y are world coords.
  // Legacy visual offset logic:
  // offsetX = (width - 1) / 2
  // position = [x + offsetX, 0, y + offsetY]

  // Sawmill is 1x1 so offset is 0.
  const position: [number, number, number] = [entity.x, 0, entity.y];

  const directionToRotation: Record<string, number> = {
    north: 0,
    east: -Math.PI / 2,
    south: Math.PI,
    west: Math.PI / 2,
  };
  const rotationY = directionToRotation[entity.direction] || 0;

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
