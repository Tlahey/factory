/* eslint-disable react-hooks/immutability */
// Per-frame animation writes straight to the Three.js material, as in every
// other building view: routing it through React state would re-render the tree
// 60 times a second.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Hub } from "../../buildings/hub/Hub";
import { createHubModel } from "../../buildings/hub/HubModel";
import { getBuildingTransform } from "./BuildingTransform";

interface HubViewProps {
  entity: Hub;
}

export function HubView({ entity }: HubViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  const { mesh, beaconMat } = useMemo(() => {
    const mesh = createHubModel();

    // The beacon is a named node. It used to be located by scanning every mesh
    // for the literal colour 0xffa500, which picks the wrong part as soon as
    // two of them share a colour.
    const beacon = mesh.getObjectByName("hub_beacon") as THREE.Mesh | undefined;
    const beaconMat = beacon?.material as
      | THREE.MeshStandardMaterial
      | undefined;

    return { mesh, beaconMat };
  }, []);

  // 2. Beacon Pulse
  // The beacon is emissive instead of `MeshBasicMaterial`, so the pulse can
  // drive `emissiveIntensity`. The previous version had no animatable property
  // and its frame loop was left empty.
  useFrame((state) => {
    if (!beaconMat) return;
    beaconMat.emissiveIntensity =
      1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.6;
  });

  // 3. Position & Rotation
  const { position, rotationY } = getBuildingTransform(entity);

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
