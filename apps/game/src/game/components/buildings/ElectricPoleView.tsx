import { useMemo } from "react";
import { ElectricPole } from "../../buildings/electric-pole/ElectricPole";
import { createElectricPoleModel } from "../../buildings/electric-pole/ElectricPoleModel";

interface ElectricPoleViewProps {
  entity: ElectricPole;
}

export function ElectricPoleView({ entity }: ElectricPoleViewProps) {
  const mesh = useMemo(() => createElectricPoleModel(), []);

  const position: [number, number, number] = [entity.x, 0, entity.y];

  // Pole rotation might matter for insulators orientation if it spans direction?
  // Usually poles don't rotate with direction in logic unless specified.
  // Entity has direction.
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
