import { SplineSegment } from "./SplineSegment";

/**
 * SPLINE GRAPH
 *
 * Manages the connectivity graph of all conveyor spline segments.
 * Handles connections, pathfinding, and resolution detection.
 */

export class SplineGraph {
  private segments: Map<string, SplineSegment> = new Map();
  private resolvedCache: Map<string, boolean> = new Map();
  private cacheValid: boolean = false;

  /**
   * Add a segment to the graph
   */
  public addSegment(segment: SplineSegment): void {
    this.segments.set(segment.id, segment);
    this.invalidateCache();
  }

  /**
   * Remove a segment from the graph
   */
  public removeSegment(id: string): void {
    const segment = this.segments.get(id);
    if (segment) {
      segment.disconnect();
      this.segments.delete(id);
      this.invalidateCache();
    }
  }

  /**
   * Get a segment by ID
   */
  public getSegment(id: string): SplineSegment | undefined {
    return this.segments.get(id);
  }

  /**
   * Get segment by grid position
   */
  public getSegmentAt(gridX: number, gridY: number): SplineSegment | undefined {
    for (const segment of this.segments.values()) {
      if (segment.gridX === gridX && segment.gridY === gridY) {
        return segment;
      }
    }
    return undefined;
  }

  /**
   * Connect two segments (output of source → input of target)
   */
  public connect(sourceId: string, targetId: string): boolean {
    const source = this.segments.get(sourceId);
    const target = this.segments.get(targetId);

    if (!source || !target) return false;

    source.connectTo(target);
    this.invalidateCache();
    return true;
  }

  /**
   * Get all segments downstream from a starting segment
   */
  public getDownstreamPath(startId: string): SplineSegment[] {
    const path: SplineSegment[] = [];
    const visited = new Set<string>();

    let current = this.segments.get(startId);
    while (current && !visited.has(current.id)) {
      path.push(current);
      visited.add(current.id);
      current = current.getNextSegment() ?? undefined;
    }

    return path;
  }

  /**
   * Get all segments upstream from a starting segment
   */
  public getUpstreamPath(startId: string): SplineSegment[] {
    const path: SplineSegment[] = [];
    const visited = new Set<string>();

    let current = this.segments.get(startId);
    while (current && !visited.has(current.id)) {
      path.push(current);
      visited.add(current.id);
      current = current.getPreviousSegment() ?? undefined;
    }

    return path;
  }

  /**
   * Check if a segment's flow reaches a valid destination (Chest, Hub, etc.)
   * A segment is "resolved" if there is a complete path to an accepting entity.
   */
  public isResolved(segmentId: string): boolean {
    if (!this.cacheValid) {
      this.rebuildResolutionCache();
    }
    return this.resolvedCache.get(segmentId) ?? false;
  }

  /**
   * Mark a segment as resolved (called when connected to a valid destination)
   */
  public markResolved(segmentId: string, resolved: boolean): void {
    this.resolvedCache.set(segmentId, resolved);
    // Propagate resolution upstream
    if (resolved) {
      const segment = this.segments.get(segmentId);
      if (segment) {
        this.propagateResolutionUpstream(segment);
      }
    }
  }

  /**
   * Get all segments in the graph
   */
  public getAllSegments(): SplineSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get total segment count
   */
  public size(): number {
    return this.segments.size;
  }

  /**
   * Clear all segments
   */
  public clear(): void {
    for (const segment of this.segments.values()) {
      segment.disconnect();
    }
    this.segments.clear();
    this.invalidateCache();
  }

  /**
   * Invalidate the resolution cache (call when graph topology changes)
   */
  private invalidateCache(): void {
    this.cacheValid = false;
    this.resolvedCache.clear();
  }

  /**
   * Rebuild resolution cache by tracing from all endpoints
   */
  private rebuildResolutionCache(): void {
    this.resolvedCache.clear();

    // Find terminal segments (those marked as resolved externally)
    // This will be set by the integration layer when connected to Chests
    for (const segment of this.segments.values()) {
      if (!segment.hasOutput()) {
        // Terminal segment - check if it's at a valid destination
        // This check is performed by the integration layer
        this.resolvedCache.set(segment.id, false);
      }
    }

    this.cacheValid = true;
  }

  /**
   * Propagate resolution status upstream through the graph
   */
  private propagateResolutionUpstream(startSegment: SplineSegment): void {
    const visited = new Set<string>();
    const queue: SplineSegment[] = [startSegment];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      this.resolvedCache.set(current.id, true);

      const prev = current.getPreviousSegment();
      if (prev && !visited.has(prev.id)) {
        queue.push(prev);
      }
    }
  }
}
