import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ConveyorMerger } from "../../buildings/conveyor-merger/ConveyorMerger";
import { createConveyorMergerModel } from "../../buildings/conveyor-merger/ConveyorMergerModel";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

interface ConveyorMergerViewProps {
  entity: ConveyorMerger;
}

export function ConveyorMergerView({ entity }: ConveyorMergerViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { mesh, ioArrows } = useMemo(() => {
    const mesh = createConveyorMergerModel();
    const arrows = createIOArrows(entity as ConveyorMerger);
    mesh.add(arrows);
    return { mesh, ioArrows: arrows };
  }, [entity]);

  useFrame(() => {
    if (ioArrows) {
      updateIOArrows(ioArrows, entity as ConveyorMerger);
    }
  });

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
