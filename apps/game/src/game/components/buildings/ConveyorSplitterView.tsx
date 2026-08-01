import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ConveyorSplitter } from "../../buildings/conveyor-splitter/ConveyorSplitter";
import { createConveyorSplitterModel } from "../../buildings/conveyor-splitter/ConveyorSplitterModel";
import { LogisticsItemLayer } from "./LogisticsItemLayer";
import { getBuildingTransform } from "./BuildingTransform";

interface ConveyorSplitterViewProps {
  entity: ConveyorSplitter;
}

export function ConveyorSplitterView({ entity }: ConveyorSplitterViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  const mesh = useMemo(() => createConveyorSplitterModel(), []);

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
