/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { IIOBuilding } from "../../buildings/BuildingConfig";
import { BELT_SURFACE_Y } from "../../buildings/conveyor/ConveyorGeometry";
import {
  createItemModel,
  updateItemVisuals,
} from "../../resources/ResourceRegistryHelper";
import { disposeObject3D } from "../../utils/DisposeUtils";
import {
  createIOArrows,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";

/** Buildings that hold a single in-transit item (merger, splitter). */
type SingleItemLogistics = BuildingEntity &
  IIOBuilding & {
    currentItem: string | null;
    itemId: number | null;
  };

interface LogisticsItemLayerProps {
  entity: SingleItemLogistics;
  /** Rotation of the parent model, applied to the IO arrows. */
  rotationY: number;
}

const ITEM_HEIGHT = BELT_SURFACE_Y + 0.08;

/**
 * Renders the IO arrows and the item currently held by a merger/splitter.
 *
 * Without this, items vanished visually while crossing a merger or splitter,
 * which made a stalled logistics block impossible to diagnose in game.
 */
export function LogisticsItemLayer({
  entity,
  rotationY,
}: LogisticsItemLayerProps) {
  const ioArrows = useMemo(() => createIOArrows(entity), [entity]);

  const itemContainer = useMemo(() => {
    const container = new THREE.Group();
    container.name = "item_container";
    container.position.set(0, ITEM_HEIGHT, 0);
    return container;
  }, []);

  const itemRef = useRef<THREE.Group | null>(null);
  const lastItemTypeRef = useRef<string | null>(null);

  useFrame(() => {
    ioArrows.rotation.y = rotationY;
    updateIOArrows(ioArrows, entity);

    const currentItem = entity.currentItem;

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

    if (itemRef.current) {
      itemRef.current.visible = !!currentItem;
      if (currentItem) {
        updateItemVisuals(currentItem, itemRef.current, entity.itemId || 0);
      }
    }
  });

  return (
    <>
      <primitive object={ioArrows} />
      <primitive object={itemContainer} />
    </>
  );
}
