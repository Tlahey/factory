/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Battery } from "../../buildings/battery/Battery";
import { createBatteryModel } from "../../buildings/battery/BatteryModel";

interface BatteryViewProps {
  entity: Battery;
}

export function BatteryView({ entity }: BatteryViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Create Model (Once)
  const { mesh, indicator, indicatorMat } = useMemo(() => {
    const mesh = createBatteryModel();

    const indicator = mesh.getObjectByName("charge_indicator") as THREE.Mesh;
    const indicatorMat = indicator.material as THREE.MeshLambertMaterial;

    // Clone material to avoid sharing state if multiple batteries exist
    // (createBatteryModel creates new material instances anyway, so not strictly needed but good practice)

    return { mesh, indicator, indicatorMat };
  }, []);

  // 2. Logic Loop
  useFrame(() => {
    if (!indicator || !indicatorMat) return;

    // Charge Percentage
    // entity.currentCharge / entity.capacity
    // Battery might not expose Capacity depending on interface?
    // Battery class has public capacity: number.
    const pct = entity.currentCharge / entity.capacity;

    // Scale Y
    // Model logic: maxBarHeight = 0.9 * 0.4 * 0.9 = ~0.324
    // Original visual used: stripH * 0.9.
    // We set scale.y which multiplies the base geometry height.
    // Base geometry was height 1 (before scaling in model logic?).
    // Actually look at model:
    // fillGeo = Box(..., 1, ...).
    // indicator.scale.set(..., stripH * 0.9 * 0.5, ...).
    // Wait, original visual set scale Y to pct * maxBarHeight.

    // Let's replicate original Visual Logic:
    // this.indicator.scale.setY(Math.max(0.01, pct * maxBarHeight));
    // BUT, original visual was operating on the object created by createBatteryModel.
    // So we should do the same.

    // original visual: maxBarHeight = 0.9 * 0.4 * 0.9;
    // The scale Y was set to this value?
    // No. "this.indicator.scale.setY(Math.max(0.01, pct * maxBarHeight));"
    // This implies the indicator's geometry is unit height 1?
    // Model: `const fillGeo = new THREE.BoxGeometry(..., 1, ...);` -> Yes, height 1.

    // So we just set scale.y directly.
    // Re-calculate maxBarHeight from Model constants or just copy logic.
    // height = 0.9. stripH = height * 0.4 = 0.36.
    // maxBarHeight (visual) = stripH * 0.9 = 0.324.

    const maxBarHeight = 0.9 * 0.4 * 0.9;
    const targetScale = Math.max(0.01, pct * maxBarHeight);

    // Direct update
    indicator.scale.y = targetScale;

    // Color
    if (entity.isEnabled) {
      if (pct < 0.2) {
        indicatorMat.color.setHex(0xff0000);
        indicatorMat.emissive.setHex(0xff0000);
      } else if (pct < 0.5) {
        indicatorMat.color.setHex(0xffaa00);
        indicatorMat.emissive.setHex(0xffaa00);
      } else {
        indicatorMat.color.setHex(0x00ff00);
        indicatorMat.emissive.setHex(0x00ff00);
      }
      indicatorMat.emissiveIntensity = 0.3;
    } else {
      indicatorMat.color.setHex(0x555555);
      indicatorMat.emissive.setHex(0x000000);
      indicatorMat.emissiveIntensity = 0;
    }
  });

  // 3. Position
  // Battery is 1x1.
  const position: [number, number, number] = [entity.x, 0, entity.y];

  // Rotation? Battery usually cylindrical, rotation doesn't matter visually much but it has one.
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
