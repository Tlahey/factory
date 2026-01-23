/* eslint-disable react-hooks/immutability */
import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BiomassPlant } from "../../buildings/biomass-plant/BiomassPlant";
import { createBiomassPlantModel } from "../../buildings/biomass-plant/BiomassPlantModel";
import { SmokeParticleSystem } from "../../buildings/biomass-plant/SmokeParticleSystem";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

interface BiomassPlantViewProps {
  entity: BiomassPlant;
}

export function BiomassPlantView({ entity }: BiomassPlantViewProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smokeSystemRef = useRef<SmokeParticleSystem | null>(null);
  const smokeTimerRef = useRef(0);
  const SMOKE_INTERVAL = 0.15;

  // 1. Create Model (Once)
  const { mesh, fireGlow, statusLight, breakerSwitch, woodLogs, ioArrows } =
    useMemo(() => {
      const mesh = createBiomassPlantModel();

      const fireGlow = mesh.getObjectByName("fire_glow") as THREE.Mesh;
      const statusLight = mesh.getObjectByName("status_light") as THREE.Mesh;
      const breakerSwitch = mesh.getObjectByName(
        "breaker_switch",
      ) as THREE.Mesh;

      const woodLogs: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const log = mesh.getObjectByName(`wood_log_${i}`) as THREE.Mesh;
        if (log) woodLogs.push(log);
      }

      const arrows = createIOArrows(entity as BiomassPlant);
      mesh.add(arrows);

      return {
        mesh,
        fireGlow,
        statusLight,
        breakerSwitch,
        woodLogs,
        ioArrows: arrows,
      };
    }, [entity]);

  // 2. Initialize Smoke System
  useEffect(() => {
    if (!groupRef.current) return;

    // Pass the mesh (model) as parent to SmokeSystem so particles are local/attached?
    // Actually SmokeParticleSystem adds "smoke_particles" group to parentMesh.
    // If we add it to 'mesh', it rotates with building.
    // We probably want it attached to the model mesh.

    smokeSystemRef.current = new SmokeParticleSystem(mesh);

    return () => {
      smokeSystemRef.current?.dispose();
    };
  }, [mesh]);

  // 3. Frame Loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const isEnabled = entity.isEnabled;
    const isActive = entity.active;

    // A. Status Light
    if (statusLight) {
      const mat = statusLight.material as THREE.MeshBasicMaterial;
      if (!isEnabled) {
        mat.color.setHex(0x888888);
      } else if (isActive) {
        mat.color.setHex(0x00ff00);
      } else {
        mat.color.setHex(0xffaa00);
      }
    }

    // B. Breaker Switch
    if (breakerSwitch) {
      const mat = breakerSwitch.material as THREE.MeshStandardMaterial;
      if (isEnabled) {
        mat.color.setHex(0x00cc00);
        mat.emissive.setHex(0x004400);
      } else {
        mat.color.setHex(0xcc0000);
        mat.emissive.setHex(0x440000);
      }
    }

    // C. Fire Glow & Smoke
    if (fireGlow) {
      const mat = fireGlow.material as THREE.MeshStandardMaterial;
      if (isEnabled && entity.isBurning) {
        // Flicker
        const flicker =
          0.8 + Math.sin(time * 10) * 0.2 + Math.sin(time * 17) * 0.1;
        mat.emissiveIntensity = 1.5 * flicker;
        mat.opacity = 1.0;

        // Spawn Smoke
        smokeTimerRef.current += delta;
        if (smokeTimerRef.current >= SMOKE_INTERVAL) {
          smokeTimerRef.current = 0;
          // Chimney top local pos (0.2, 2.25, -0.2)
          // If we used mesh as parent, these coords are correct.
          smokeSystemRef.current?.spawn(0.2, 2.3, -0.2);
        }
      } else {
        mat.emissiveIntensity = 0.1;
        mat.opacity = 0.3;
        smokeTimerRef.current = 0;
      }
    }

    // D. Smoke Update
    smokeSystemRef.current?.update(delta);

    // E. Wood Logs
    const fuelRatio = entity.fuelAmount / entity.getFuelCapacity();
    woodLogs.forEach((log, index) => {
      const threshold = (index + 1) / (woodLogs.length + 1);
      log.visible = fuelRatio >= threshold;
    });

    updateIOArrows(ioArrows, entity as BiomassPlant);
  });

  // 4. Position
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
