import { useMemo } from "react";
import { ElectricPole } from "../../buildings/electric-pole/ElectricPole";
import { createElectricPoleModel } from "../../buildings/electric-pole/ElectricPoleModel";
import { getBuildingTransform } from "./BuildingTransform";

interface ElectricPoleViewProps {
  entity: ElectricPole;
}

export function ElectricPoleView({ entity }: ElectricPoleViewProps) {
  const mesh = useMemo(() => createElectricPoleModel(), []);

  const { position, rotationY } = getBuildingTransform(entity);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
