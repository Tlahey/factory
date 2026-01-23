/* eslint-disable react-hooks/immutability */
import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Conveyor } from "../../buildings/conveyor/Conveyor";
import { createConveyorModel } from "../../buildings/conveyor/ConveyorGeometry";
import { createConveyorTexture } from "../../buildings/conveyor/ConveyorTexture";
import {
  createItemModel,
  updateItemVisuals,
} from "../../resources/ResourceRegistryHelper";
import { disposeObject3D } from "../../utils/DisposeUtils";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";
import { IIOBuilding } from "../../buildings/BuildingConfig";

interface ConveyorViewProps {
  entity: Conveyor;
}

export function ConveyorView({ entity }: ConveyorViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Track visual state in React to trigger re-renders when entity properties change during tick()
  const [visualState, setVisualState] = useState({
    type: entity.visualType,
    direction: entity.direction,
  });

  // 1. Model & Texture (Recreated only if visualType changes)
  const { mesh, beltMaterial, itemContainerRef, ioArrows } = useMemo(() => {
    const texture = createConveyorTexture();
    const mesh = createConveyorModel(visualState.type, texture);
    mesh.name = "conveyor";

    // Extract belt material for animation
    let beltMat: THREE.MeshLambertMaterial | null = null;
    const belt = mesh.getObjectByName("belt");
    if (belt && belt instanceof THREE.Mesh) {
      beltMat = belt.material as THREE.MeshLambertMaterial;
    }

    // Create item container as CHILD of mesh
    const itemContainer = new THREE.Group();
    itemContainer.name = "item_container";
    mesh.add(itemContainer);

    // Counter-scale for Right turns
    if (visualState.type === "right") {
      itemContainer.scale.set(-1, 1, 1);
    } else {
      itemContainer.scale.set(1, 1, 1);
    }

    // Create IO arrows as CHILD of mesh
    const arrows = createIOArrows(entity as unknown as Conveyor & IIOBuilding);
    mesh.add(arrows);

    return {
      mesh,
      beltMaterial: beltMat,
      itemContainerRef: { current: itemContainer },
      ioArrows: arrows,
    };
  }, [visualState.type, entity]);

  // 2. Item Visuals - refs for tracking
  const itemRef = useRef<THREE.Group | null>(null);
  const lastItemTypeRef = useRef<string | null>(null);

  // 3. Initial Orientation Setup
  useMemo(() => {
    const dir = visualState.direction;
    const type = visualState.type;

    let rot = 0;
    switch (dir) {
      case "north":
        rot = 0;
        break;
      case "west":
        rot = Math.PI / 2;
        break;
      case "south":
        rot = Math.PI;
        break;
      case "east":
        rot = -Math.PI / 2;
        break;
    }

    let scaleX = 1;
    if (type === "left") rot -= Math.PI / 2;
    else if (type === "right") {
      scaleX = -1;
      rot += Math.PI / 2;
    }

    if (mesh) {
      mesh.rotation.y = rot;
      mesh.scale.set(scaleX, 1, 1);
    }
  }, [visualState.direction, visualState.type, mesh]);

  // FRAME LOOP
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // A. Reactivity Check: Update state if entity properties changed during tick()
    if (
      entity.visualType !== visualState.type ||
      entity.direction !== visualState.direction
    ) {
      setVisualState({
        type: entity.visualType,
        direction: entity.direction,
      });
    }

    // B. Animate Belt
    if (beltMaterial && beltMaterial.map) {
      beltMaterial.map.offset.y -= delta * 0.5;

      if (entity.isResolved) {
        beltMaterial.color.setHex(0xffffff);
      } else {
        beltMaterial.color.setHex(0xcccccc);
      }
    }

    // C. Update IO Arrows
    if (ioArrows) {
      updateIOArrows(ioArrows, entity as unknown as Conveyor & IIOBuilding);
    }
  });

  // Custom Effect for Items
  useFrame(() => {
    const itemContainer = itemContainerRef.current;
    if (!itemContainer) return;

    const currentItem = entity.currentItem;

    // 1. Swap Mesh if type changed
    if (currentItem !== lastItemTypeRef.current) {
      if (itemRef.current) {
        itemContainer.remove(itemRef.current);
        disposeObject3D(itemRef.current);
        itemRef.current = null;
      }

      if (currentItem) {
        const newMesh = createItemModel(currentItem);
        if (newMesh) {
          itemContainer.add(newMesh);
          itemRef.current = newMesh;
        }
      }
      lastItemTypeRef.current = currentItem;
    }

    // 2. Update Position/Visuals
    if (itemRef.current && currentItem) {
      itemRef.current.visible = true;
      // seed update
      updateItemVisuals(currentItem, itemRef.current, entity.itemId || 0);

      // Position (in mesh-local space, which is already rotated)
      const progress = entity.transportProgress;

      if (visualState.type === "straight") {
        itemContainer.position.set(0, 0.2, 0.5 - progress);
        itemContainer.rotation.y = 0;
      } else {
        // Curve
        const angle = (-Math.PI / 2) * progress;
        const radius = 0.5;
        const cx = -0.5;
        const cz = 0.5;

        const x = cx + radius * Math.cos(angle);
        const z = cz + radius * Math.sin(angle);

        itemContainer.position.set(x, 0.2, z);

        if (visualState.type === "right") {
          itemContainer.rotation.y = -angle;
        } else {
          itemContainer.rotation.y = -angle;
        }
      }
    } else if (itemRef.current) {
      itemRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} position={[entity.x, 0, entity.y]}>
      {/* The Conveyor Model (with item container and IO arrows as children) */}
      <primitive object={mesh} />
    </group>
  );
}
