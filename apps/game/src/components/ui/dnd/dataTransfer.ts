import { isBuildingId } from "@/game/buildings/BuildingConfig";
import type { ResourceType } from "@/game/data/Items";
import type {
  BuildingDragPayload,
  BuildingDragSource,
  ItemDragPayload,
  ItemDragSource,
} from "./DragPayload";

/**
 * Write an item payload onto the native dataTransfer. Keeps the existing
 * multi-key wire format (source/index/type/count) unchanged — the typing
 * lives in the application layer, not on the wire — so this is a pure
 * refactor with no runtime behavior change.
 */
export function writeItemDragPayload(
  e: React.DragEvent,
  payload: ItemDragPayload,
): void {
  e.dataTransfer.setData("source", payload.source);
  e.dataTransfer.setData("index", String(payload.index));
  e.dataTransfer.setData("type", payload.value);
  e.dataTransfer.setData("count", String(payload.count));
  e.dataTransfer.effectAllowed = "move";
}

/**
 * Parse an item payload back out. Only checks structural completeness
 * (non-empty type, numeric index/count) — the same leniency the ad hoc
 * `getData` call sites it replaces already had.
 */
export function readItemDragPayload(
  e: React.DragEvent,
): ItemDragPayload | null {
  const type = e.dataTransfer.getData("type");
  if (!type) return null;
  const index = parseInt(e.dataTransfer.getData("index"), 10);
  const count = parseInt(e.dataTransfer.getData("count"), 10);
  if (Number.isNaN(index) || Number.isNaN(count)) return null;
  const source = e.dataTransfer.getData("source") as ItemDragSource;
  return { source, index, value: type as ResourceType, count };
}

export function writeBuildingDragPayload(
  e: React.DragEvent,
  payload: BuildingDragPayload,
): void {
  e.dataTransfer.setData("source", payload.source);
  e.dataTransfer.setData("index", String(payload.index));
  e.dataTransfer.setData("buildingId", payload.value);
}

/** Stricter than the item reader: no call site exercises this path with garbage data. */
export function readBuildingDragPayload(
  e: React.DragEvent,
): BuildingDragPayload | null {
  const buildingId = e.dataTransfer.getData("buildingId");
  if (!isBuildingId(buildingId)) return null;
  const indexRaw = e.dataTransfer.getData("index");
  const index = indexRaw === "" ? -1 : parseInt(indexRaw, 10);
  const source = e.dataTransfer.getData("source") as BuildingDragSource;
  return { source, index, value: buildingId };
}
