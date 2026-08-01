import { Direction } from "../../entities/types";
import type { BuildingEntity } from "../../entities/BuildingEntity";
import {
  FootprintSize,
  getFootprintCenter,
} from "../../buildings/BuildingFootprint";

/**
 * Shared placement transform for every building view and for the placement
 * ghost.
 *
 * Models are authored centred on their footprint, so the group must sit on the
 * footprint centre — not on the anchor tile. Each view used to inline
 * `(width - 1) / 2`, and the ones that forgot rendered half a tile off the grid
 * as soon as the building was bigger than 1x1.
 */

/** Y rotation that makes a north-authored model face `direction`. */
export const DIRECTION_TO_ROTATION: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

export interface BuildingTransform {
  /** Group position, on the footprint centre. */
  position: [number, number, number];
  /** Y rotation in radians. */
  rotationY: number;
}

/** Transform for an arbitrary anchored footprint (used by the ghost). */
export function getFootprintTransform(
  x: number,
  y: number,
  size: FootprintSize,
  direction: Direction,
): BuildingTransform {
  const center = getFootprintCenter(x, y, size);
  return {
    position: [center.x, 0, center.y],
    rotationY: DIRECTION_TO_ROTATION[direction] ?? 0,
  };
}

/** Transform for a placed building. */
export function getBuildingTransform(
  entity: BuildingEntity,
): BuildingTransform {
  return getFootprintTransform(
    entity.x,
    entity.y,
    { width: entity.width, height: entity.height },
    entity.direction,
  );
}
