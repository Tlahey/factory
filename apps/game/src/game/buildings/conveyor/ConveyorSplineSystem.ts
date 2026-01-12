import { SplineGraph } from "./SplineGraph";
import { SplineItem, SplineItemConfig } from "./SplineItem";
import { SplineSegment } from "./SplineSegment";

/**
 * CONVEYOR SPLINE SYSTEM
 *
 * Central system managing all item transport on spline-based conveyors.
 * Handles movement updates, collision detection (backpressure), and segment transitions.
 */

export interface ConveyorSplineSystemConfig {
  minItemSpacing?: number;
  lookaheadThreshold?: number;
}

export class ConveyorSplineSystem {
  public readonly graph: SplineGraph;
  private items: Map<number, SplineItem> = new Map();
  private itemsOnSegment: Map<string, Set<SplineItem>> = new Map();
  private nextItemId: number = 1;

  // Configuration
  private readonly minItemSpacing: number;
  private readonly lookaheadThreshold: number;

  constructor(graph: SplineGraph, config?: ConveyorSplineSystemConfig) {
    this.graph = graph;
    this.minItemSpacing = config?.minItemSpacing ?? 0.2;
    this.lookaheadThreshold = config?.lookaheadThreshold ?? 0.85;
  }

  /**
   * Main update loop - called each frame
   */
  public update(delta: number): void {
    for (const item of this.items.values()) {
      this.updateItem(item, delta);
    }
  }

  /**
   * Update a single item's position
   */
  private updateItem(item: SplineItem, delta: number): void {
    const segment = item.currentSegment;

    // Check if blocked by collision
    if (this.checkCollision(item)) {
      // Item is blocked, don't move
      item.updateVisualPosition();
      return;
    }

    // Move item along spline
    const speedMultiplier = segment.speed;
    item.progress += speedMultiplier * delta;

    // Check for segment transition
    if (item.progress >= 1.0) {
      this.handleSegmentTransition(item);
    }

    // Update visual position
    item.updateVisualPosition();
  }

  /**
   * Handle transition from current segment to next
   */
  private handleSegmentTransition(item: SplineItem): void {
    const nextSegment = item.currentSegment.getNextSegment();

    if (nextSegment && this.canEnterSegment(nextSegment, item)) {
      // Calculate overflow for smooth transition
      const overflow = item.progress - 1.0;

      // Remove from old segment tracking
      this.removeFromSegmentTracking(item);

      // Transfer to next segment
      item.currentSegment = nextSegment;
      item.progress = Math.max(0, overflow);

      // Add to new segment tracking
      this.addToSegmentTracking(item);
    } else {
      // Blocked at end of segment
      item.progress = 1.0;
    }
  }

  /**
   * Check if an item is blocked due to collision or backpressure
   */
  public checkCollision(item: SplineItem): boolean {
    const segment = item.currentSegment;

    // 1. Check items ahead on same segment
    const segmentItems = this.getItemsOnSegment(segment);
    for (const other of segmentItems) {
      if (other.id === item.id) continue;

      const gap = other.progress - item.progress;
      if (gap > 0 && gap < this.minItemSpacing) {
        return true; // Too close to item ahead
      }
    }

    // 2. Check backpressure from next segment
    if (item.progress > this.lookaheadThreshold) {
      const nextSegment = segment.getNextSegment();

      if (nextSegment) {
        // Check if next segment is at capacity
        const nextItems = this.getItemsOnSegment(nextSegment);
        if (nextItems.length >= nextSegment.capacity) {
          return true; // Next segment full
        }

        // Check if there's an item at the entrance of next segment
        for (const other of nextItems) {
          if (other.progress < this.minItemSpacing) {
            return true; // Item blocking entrance
          }
        }
      } else {
        // No next segment - check if we're at end of line
        // May need to check for destination (Chest, Hub) here
        return !this.hasValidDestination(segment);
      }
    }

    return false;
  }

  /**
   * Check if a segment has a valid item destination
   */
  private hasValidDestination(segment: SplineSegment): boolean {
    // This will be extended to check for Chest/Hub connections
    return this.graph.isResolved(segment.id);
  }

  /**
   * Check if an item can enter a segment
   */
  private canEnterSegment(segment: SplineSegment, item: SplineItem): boolean {
    // Check capacity
    const currentItems = this.getItemsOnSegment(segment);
    if (currentItems.length >= segment.capacity) {
      return false;
    }

    // Check entrance clearance
    for (const other of currentItems) {
      if (other.id !== item.id && other.progress < this.minItemSpacing) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add an item to the transport system
   */
  public addItem(config: Omit<SplineItemConfig, "id">): SplineItem {
    const id = this.nextItemId++;
    const item = new SplineItem({ ...config, id });

    this.items.set(id, item);
    this.addToSegmentTracking(item);

    return item;
  }

  /**
   * Remove an item from the transport system
   */
  public removeItem(itemId: number): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    this.removeFromSegmentTracking(item);
    this.items.delete(itemId);

    return true;
  }

  /**
   * Get an item by ID
   */
  public getItem(itemId: number): SplineItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get all items on a specific segment
   */
  public getItemsOnSegment(segment: SplineSegment): SplineItem[] {
    const items = this.itemsOnSegment.get(segment.id);
    return items ? Array.from(items) : [];
  }

  /**
   * Get all items sorted by progress (front to back) on a segment
   */
  public getItemsOnSegmentSorted(segment: SplineSegment): SplineItem[] {
    return this.getItemsOnSegment(segment).sort(
      (a, b) => b.progress - a.progress,
    );
  }

  /**
   * Add item to segment tracking map
   */
  private addToSegmentTracking(item: SplineItem): void {
    const segmentId = item.currentSegment.id;
    let set = this.itemsOnSegment.get(segmentId);
    if (!set) {
      set = new Set();
      this.itemsOnSegment.set(segmentId, set);
    }
    set.add(item);
  }

  /**
   * Remove item from segment tracking map
   */
  private removeFromSegmentTracking(item: SplineItem): void {
    const segmentId = item.currentSegment.id;
    const set = this.itemsOnSegment.get(segmentId);
    if (set) {
      set.delete(item);
      if (set.size === 0) {
        this.itemsOnSegment.delete(segmentId);
      }
    }
  }

  /**
   * Get total number of items in the system
   */
  public getItemCount(): number {
    return this.items.size;
  }

  /**
   * Get all items in the system
   */
  public getAllItems(): SplineItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Clear all items from the system
   */
  public clearItems(): void {
    this.items.clear();
    this.itemsOnSegment.clear();
    this.nextItemId = 1;
  }

  /**
   * Remove a segment and all its items
   */
  public onSegmentRemoved(segmentId: string): void {
    const itemsToRemove: number[] = [];

    for (const item of this.items.values()) {
      if (item.currentSegment.id === segmentId) {
        itemsToRemove.push(item.id);
      }
    }

    for (const id of itemsToRemove) {
      this.removeItem(id);
    }

    this.itemsOnSegment.delete(segmentId);
  }
}
