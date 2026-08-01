/* eslint-disable react-hooks/immutability */
import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Conveyor } from "../../buildings/conveyor/Conveyor";
import {
  BELT_SURFACE_Y,
  createConveyorModel,
} from "../../buildings/conveyor/ConveyorGeometry";
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
import { Direction } from "../../entities/types";

interface ConveyorViewProps {
  entity: Conveyor;
}

/** Rotation applied to a model authored facing north. */
const DIRECTION_ROTATION: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

/** How high above the belt surface items ride. */
const ITEM_HEIGHT = BELT_SURFACE_Y + 0.08;

export function ConveyorView({ entity }: ConveyorViewProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Track visual state in React to trigger re-renders when entity properties change during tick()
  const [visualState, setVisualState] = useState({
    type: entity.visualType,
    direction: entity.direction,
  });

  // 1. Model & Texture (Recreated only if visualType changes)
  const { mesh, beltMaterial, itemContainerRef } = useMemo(() => {
    const texture = createConveyorTexture();
    const mesh = createConveyorModel(visualState.type, texture);
    mesh.name = "conveyor";

    // Extract belt material for animation
    let beltMat: THREE.MeshLambertMaterial | null = null;
    const belt = mesh.getObjectByName("belt");
    if (belt && belt instanceof THREE.Mesh) {
      beltMat = belt.material as THREE.MeshLambertMaterial;
    }

    // Create item container as CHILD of mesh, so the curve maths below can stay
    // in the model's local space.
    const itemContainer = new THREE.Group();
    itemContainer.name = "item_container";
    mesh.add(itemContainer);

    // Counter-scale so item models are not mirrored on right turns
    // (the mesh itself is mirrored on X).
    if (visualState.type === "right") {
      itemContainer.scale.set(-1, 1, 1);
    } else {
      itemContainer.scale.set(1, 1, 1);
    }

    return {
      mesh,
      beltMaterial: beltMat,
      itemContainerRef: { current: itemContainer },
    };
  }, [visualState.type]);

  /**
   * IO arrows live in their OWN group, deliberately NOT parented to the belt
   * mesh: curved belts get an extra ±90° rotation and right turns are mirrored
   * on X, which used to flip the green/red arrows to the wrong tiles.
   * Here they are only rotated by the belt's logical direction.
   */
  const ioArrows = useMemo(
    () => createIOArrows(entity as unknown as Conveyor & IIOBuilding),
    [entity],
  );

  // 2. Item Visuals - refs for tracking
  const itemRef = useRef<THREE.Group | null>(null);
  const lastItemTypeRef = useRef<string | null>(null);

  // 3. Orientation: base rotation from direction, plus the curve compensation.
  useMemo(() => {
    const baseRotation = DIRECTION_ROTATION[visualState.direction];
    const type = visualState.type;

    let rot = baseRotation;
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
    if (ioArrows) {
      ioArrows.rotation.y = baseRotation;
    }
  }, [visualState.direction, visualState.type, mesh, ioArrows]);

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

    // B. Animate belt. The scroll speed matches the actual transport speed and
    // stops when the belt is blocked, so the animation reads as real feedback.
    if (beltMaterial && beltMaterial.map) {
      const isBlocked = entity.operationStatus === "blocked";
      if (!isBlocked) {
        beltMaterial.map.offset.y -= delta * entity.transportSpeed;
      }

      // Unresolved belts (leading nowhere) are dimmed as a hint.
      beltMaterial.color.setHex(entity.isResolved ? 0xffffff : 0xa8a8a8);
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
      const progress = THREE.MathUtils.clamp(entity.transportProgress, 0, 1);

      if (visualState.type === "straight") {
        itemContainer.position.set(0, ITEM_HEIGHT, 0.5 - progress);
        itemContainer.rotation.y = 0;
      } else {
        // Quarter arc centred on (-0.5, 0.5) with radius 0.5 (see ConveyorGeometry)
        const angle = (-Math.PI / 2) * progress;
        const radius = 0.5;
        const cx = -0.5;
        const cz = 0.5;

        itemContainer.position.set(
          cx + radius * Math.cos(angle),
          ITEM_HEIGHT,
          cz + radius * Math.sin(angle),
        );
        itemContainer.rotation.y = -angle;
      }
    } else if (itemRef.current) {
      itemRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} position={[entity.x, 0, entity.y]}>
      {/* The Conveyor Model (with the item container as child) */}
      <primitive object={mesh} />
      {/* IO arrows, kept out of the mirrored/curved model space */}
      <primitive object={ioArrows} />
    </group>
  );
}
