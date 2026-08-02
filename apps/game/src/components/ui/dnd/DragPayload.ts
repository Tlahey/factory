import type { ResourceType } from "@/game/data/Items";
import type { BuildingId } from "@/game/buildings/BuildingConfig";

/** Where an item-carrying drag can originate from. */
export type ItemDragSource =
  "inventory" | "chest" | "furnace_input" | "furnace_output" | "conveyor";

/** Where a building-carrying (hotbar/placement) drag can originate from. */
export type BuildingDragSource = "hotbar" | "building_menu";

/**
 * Generic envelope for anything draggable in the game UI. `TValue` is the
 * literal-typed identifier the drag carries (ResourceType, BuildingId, ...);
 * `TSource` narrows where it came from. Two call sites are only compatible
 * with each other when both type parameters line up — this is what stops an
 * inventory item from being wired into a building-hotbar drop target (or
 * vice versa) at compile time.
 */
export interface DragPayload<TSource extends string, TValue> {
  source: TSource;
  index: number;
  value: TValue;
}

/** An item (resource) travelling between inventory/chest/furnace/conveyor slots. */
export interface ItemDragPayload extends DragPayload<
  ItemDragSource,
  ResourceType
> {
  count: number;
}

/** A building travelling onto/within the hotbar. */
export type BuildingDragPayload = DragPayload<BuildingDragSource, BuildingId>;

/** The shape every item-carrying drag slot has (mirrors InventorySlot). */
export interface DragSlot<TValue> {
  type: TValue;
  count: number;
}

export type DragStartHandler<TSource extends string, TValue> = (
  e: React.DragEvent,
  source: TSource,
  index: number,
  slot: DragSlot<TValue>,
) => void;

export type DragEndHandler = (e: React.DragEvent) => void;

export type DropHandler<TTarget extends string> = (
  e: React.DragEvent,
  target: TTarget,
  targetIndex: number,
) => void;

export type DragOverHandler = (e: React.DragEvent) => void;

/**
 * Shared contract every draggable *item* element implements consistently.
 * A component typed `Draggable<ItemDragSource, ResourceType>` cannot be
 * handed a handler typed `Draggable<BuildingDragSource, BuildingId>` (or any
 * other mismatched pairing) without a compile error.
 */
export interface Draggable<TSource extends string, TValue> {
  onDragStart: DragStartHandler<TSource, TValue>;
  onDragEnd: DragEndHandler;
}

/** Drop-target identifiers for item slots reuse the same literal set as sources. */
export type ItemDropTarget = ItemDragSource;
