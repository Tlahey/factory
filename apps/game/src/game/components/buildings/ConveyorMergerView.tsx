import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ConveyorMerger } from "../../buildings/conveyor-merger/ConveyorMerger";
import { createConveyorMergerModel } from "../../buildings/conveyor-merger/ConveyorMergerModel";
import { LogisticsItemLayer } from "./LogisticsItemLayer";
import { getBuildingTransform } from "./BuildingTransform";

interface ConveyorMergerViewProps {
  entity: ConveyorMerger;
}

export function ConveyorMergerView({ entity }: ConveyorMergerViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const mesh = useMemo(() => createConveyorMergerModel(), []);

  // The outer group is unrotated: the item layer rotates the arrows itself.
  const { position, rotationY } = getBuildingTransform(entity);

  return (
    <group ref={groupRef} position={position}>
      <group rotation={[0, rotationY, 0]}>
        <primitive object={mesh} />
      </group>
      <LogisticsItemLayer entity={entity} rotationY={rotationY} />
    </group>
  );
}
