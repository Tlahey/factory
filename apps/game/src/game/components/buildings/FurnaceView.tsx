/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Furnace } from "../../buildings/furnace/Furnace";
import { createFurnaceModel } from "../../buildings/furnace/FurnaceModel";
import { ParticleSystem } from "../../visuals/helpers/ParticleSystem";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";
import { HoverProgressCard } from "../../../components/ui/HoverProgressCard";
import { useState } from "react";
import { getBuildingTransform } from "./BuildingTransform";
import { getDirectionOffset } from "../../buildings/BuildingConfig";

interface FurnaceViewProps {
  entity: Furnace;
  particleSystem: ParticleSystem;
}

export function FurnaceView({ entity, particleSystem }: FurnaceViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  const { mesh, coreMesh, hammerPivot, statusLightMat, ioArrows } =
    useMemo(() => {
      const mesh = createFurnaceModel();

      const coreMesh = mesh.getObjectByName("core_mesh") as THREE.Mesh;
      const hammerPivot = mesh.getObjectByName("hammer_pivot");
      const statusLight = mesh.getObjectByName("status_light") as THREE.Mesh;

      // Ensure materials are unique/ready
      const statusLightMat = statusLight.material as THREE.MeshBasicMaterial;

      // IO Arrows
      const arrows = createIOArrows(entity as Furnace);
      mesh.add(arrows);

      return {
        mesh,
        coreMesh,
        hammerPivot,
        statusLightMat,
        ioArrows: arrows,
      };
    }, [entity]);

  // 2. Frame Loop
  const animTimeRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const isActive = entity.active;

    if (isActive) {
      animTimeRef.current += delta;
    }
    const animTime = animTimeRef.current;

    // A. Status Light
    let targetColor = 0x888888;
    if (isActive) {
      targetColor = 0x00ff00;
    } else if (entity.operationStatus === "no_power") {
      targetColor = 0xff0000;
    } else if (entity.operationStatus === "blocked") {
      targetColor = 0xffaa00;
    }

    if (statusLightMat.color.getHex() !== targetColor) {
      statusLightMat.color.setHex(targetColor);
    }

    // B. Core Glow (Lava)
    if (coreMesh) {
      const mat = coreMesh.material as THREE.MeshStandardMaterial;
      if (isActive) {
        // Glow pulse can stay on global time (ambient effect) or local.
        // Let's keep global for ambient heat feeling, or local for "active pumping".
        // User complaint was about "catch up" so mechanical movement is key.
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;
        mat.emissiveIntensity = 1.5 + pulse * 1.5;
      } else {
        mat.emissiveIntensity = 0.5;
      }
    }

    // C. Hammer Animation
    if (hammerPivot) {
      if (isActive) {
        // Sharp hit effect using local time
        const hammerAngle = Math.max(-0.5, Math.sin(animTime * 8) * 0.5);
        hammerPivot.rotation.x = hammerAngle;
      } else {
        // Resting
        hammerPivot.rotation.x = -0.4;
      }
    }

    // D. Particles (Smoke above the lava pool, which sits on the front half)
    if (isActive && Math.random() < 0.1) {
      const center = entity.getCenter();
      const front = getDirectionOffset(entity.direction);
      particleSystem.spawn(
        center.x + front.dx * 0.5,
        1.2,
        center.y + front.dy * 0.5,
      );
    }

    updateIOArrows(ioArrows, entity as Furnace);
  });

  // 3. Position & Rotation
  const { position, rotationY } = getBuildingTransform(entity);

  const [hovered, setHovered] = useState(false);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <primitive object={mesh} />
      <HoverProgressCard entity={entity} visible={hovered} />
    </group>
  );
}
