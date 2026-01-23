import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ConveyorSplitter } from "../../buildings/conveyor-splitter/ConveyorSplitter";
import { createConveyorSplitterModel } from "../../buildings/conveyor-splitter/ConveyorSplitterModel";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

interface ConveyorSplitterViewProps {
  entity: ConveyorSplitter;
}

export function ConveyorSplitterView({ entity }: ConveyorSplitterViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { mesh, ioArrows } = useMemo(() => {
    const mesh = createConveyorSplitterModel();
    const arrows = createIOArrows(entity as ConveyorSplitter);
    mesh.add(arrows);
    return { mesh, ioArrows: arrows };
  }, [entity]);

  useFrame(() => {
    if (ioArrows) {
      updateIOArrows(ioArrows, entity as ConveyorSplitter);
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
