/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Extractor } from "../../buildings/extractor/Extractor";
import { createExtractorModel } from "../../buildings/extractor/ExtractorModel";
import { ParticleSystem } from "../../visuals/helpers/ParticleSystem";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

interface ExtractorViewProps {
  entity: Extractor;
  particleSystem: ParticleSystem;
}

export function ExtractorView({ entity, particleSystem }: ExtractorViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  const { mesh, drillMesh, drillContainer, statusLightMat, ioArrows } =
    useMemo(() => {
      const mesh = createExtractorModel();

      const drillMesh = mesh.getObjectByName("drill_mesh");
      const drillContainer = mesh.getObjectByName("drill_container");

      // Status Light
      const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(0.3, 1.8, 0.3);
      mesh.add(light);

      // IO Arrows
      // Extractor implements IIOBuilding (output only usually)
      const arrows = createIOArrows(entity as Extractor);
      mesh.add(arrows);

      return {
        mesh,
        drillMesh,
        drillContainer,
        statusLightMat: lightMat,
        ioArrows: arrows,
      };
    }, [entity]);

  // 2. Frame Loop
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

    if (statusLightMat.color.getHex() !== targetColor) {
      statusLightMat.color.setHex(targetColor);
    }

    // B. Animations
    if (isActive) {
      const speed = 15 * (entity.visualSatisfaction || 0);

      // Spin Drill
      if (drillMesh) {
        drillMesh.rotation.y += delta * speed;
      }

      // Move Container (Vertical Pulse)
      if (drillContainer) {
        const pulseSpeed = 3 * (entity.visualSatisfaction || 0);
        drillContainer.position.y = 1.2 + Math.sin(animTime * pulseSpeed) * 0.4;
      }

      // C. Particles
      if (Math.random() < 0.3) {
        particleSystem.spawn(entity.x, 0.1, entity.y);
      }
    }

    // D. Update IO Arrows
    updateIOArrows(ioArrows, entity as Extractor);
  });

  // 3. Position & Rotation
  // Extractor is 1x1, centered
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
