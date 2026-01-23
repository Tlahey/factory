import { useMemo } from "react";
import { Chest } from "../../buildings/chest/Chest";
import { createChestModel } from "../../buildings/chest/ChestModel";

interface ChestViewProps {
  entity: Chest;
}

export function ChestView({ entity }: ChestViewProps) {
  // 1. Create Model (Once)
  // Chest is static.
  const mesh = useMemo(() => createChestModel(), []);

  // 2. Position
  const position: [number, number, number] = [entity.x, 0, entity.y];

  const directionToRotation: Record<string, number> = {
    north: 0,
    east: -Math.PI / 2,
    south: Math.PI,
    west: Math.PI / 2,
  };
  const rotationY = directionToRotation[entity.direction] || 0;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
