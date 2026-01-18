import * as THREE from "three";

/**
 * Base class for all game resources (items).
 * This provides a unified interface for visual representation and metadata.
 */
export abstract class GameResource {
  public abstract readonly id: string;
  public abstract readonly name: string;

  /**
   * Create a 3D model for this resource to be displayed on conveyors or in previews.
   */
  public abstract createModel(): THREE.Group;

  /**
   * Update the visuals of a previously created model, potentially using a seed for variety.
   */
  public abstract updateVisuals(group: THREE.Group, seed: number): void;
}
