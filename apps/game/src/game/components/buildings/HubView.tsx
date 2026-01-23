import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Hub } from "../../buildings/hub/Hub";
import { createHubModel } from "../../buildings/hub/HubModel";

interface HubViewProps {
  entity: Hub;
}

export function HubView({ entity }: HubViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  // Hub is static, no dynamic parts extracted currently.
  // If we want to animate glow, we need to extract the material.
  const { mesh, glowMat } = useMemo(() => {
    const mesh = createHubModel();

    // Find glow material to animate
    // createHubModel uses: const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
    // We can traverse to find it or modify createHubModel to name it.
    // Or just rely on finding meshes with that material uuid?
    // Traversing is safer.
    let foundMat: THREE.Material | undefined;
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Check if material color is Orange (0xffa500)
        const mat = child.material as THREE.MeshBasicMaterial;
        if (mat.color && mat.color.getHex() === 0xffa500) {
          foundMat = mat;
        }
      }
    });

    return { mesh, glowMat: foundMat as THREE.MeshBasicMaterial | undefined };
  }, []);

  // 2. Pulse Animation (Subtle)
  useFrame((state) => {
    if (glowMat) {
      const time = state.clock.elapsedTime;
      const _pulse = 0.8 + Math.sin(time * 2) * 0.2;
      // MeshBasicMaterial doesn't have emissiveIntensity. It just has color.
      // If it was Standard, we could Pulse emissive.
      // For Basic, we can Pulse opacity (if transparent) or change color value slightly?
      // Or just leave it static as SimpleVisual did.
      // Let's leave it static to save Perf for now.
    }
  });

  // 3. Position & Rotation
  // 2x2 Support
  const offsetX = (entity.width - 1) / 2;
  const offsetY = (entity.height - 1) / 2;
  const position: [number, number, number] = [
    entity.x + offsetX,
    0,
    entity.y + offsetY,
  ];

  // Hub usually doesn't rotate, but it can.
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
