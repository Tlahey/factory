import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Chest } from "../../buildings/chest/Chest";
import { createChestModel } from "../../buildings/chest/ChestModel";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";
import { getBuildingTransform } from "./BuildingTransform";

interface ChestViewProps {
  entity: Chest;
}

export function ChestView({ entity }: ChestViewProps) {
  // 1. Create Model (Once)
  // Chest is static.
  const { mesh, ioArrows } = useMemo(() => {
    const mesh = createChestModel();
    // ChestConfig declares showArrow, but the view never drew them: the input
    // and output faces of a chest were invisible until you tried to feed it.
    const arrows = createIOArrows(entity);
    mesh.add(arrows);
    return { mesh, ioArrows: arrows };
  }, [entity]);

  useFrame(() => {
    updateIOArrows(ioArrows, entity);
  });

  // 2. Position
  const { position, rotationY } = getBuildingTransform(entity);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
