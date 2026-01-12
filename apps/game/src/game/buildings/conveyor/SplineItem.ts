import * as THREE from "three";
import { SplineSegment } from "./SplineSegment";

/**
 * SPLINE ITEM
 *
 * Represents an item being transported along a spline-based conveyor.
 * Progress is decoupled from world position for independent flow tracking.
 */

export interface SplineItemConfig {
  id: number;
  itemType: string;
  segment: SplineSegment;
  initialProgress?: number;
  mesh?: THREE.Object3D;
}

export class SplineItem {
  public readonly id: number;
  public readonly itemType: string;
  public currentSegment: SplineSegment;
  public progress: number;
  public mesh: THREE.Object3D | null;

  private readonly upVector = new THREE.Vector3(0, 1, 0);
  private readonly tempMatrix = new THREE.Matrix4();

  constructor(config: SplineItemConfig) {
    this.id = config.id;
    this.itemType = config.itemType;
    this.currentSegment = config.segment;
    this.progress = config.initialProgress ?? 0;
    this.mesh = config.mesh ?? null;
  }

  /**
   * Update mesh position and rotation based on current progress along spline
   */
  public updateVisualPosition(): void {
    if (!this.mesh) return;

    const position = this.currentSegment.getPointAt(this.progress);
    const tangent = this.currentSegment.getTangentAt(this.progress);

    this.mesh.position.copy(position);

    // Align mesh forward (-Z) to tangent direction
    if (tangent.lengthSq() > 0.001) {
      // Create rotation matrix looking along tangent
      this.tempMatrix.lookAt(
        position,
        position.clone().add(tangent),
        this.upVector,
      );
      this.mesh.quaternion.setFromRotationMatrix(this.tempMatrix);
    }
  }

  /**
   * Transfer this item to another segment
   */
  public transferTo(segment: SplineSegment, overflowProgress: number): void {
    this.currentSegment = segment;
    this.progress = overflowProgress;
    this.updateVisualPosition();
  }

  /**
   * Get current world position
   */
  public getWorldPosition(): THREE.Vector3 {
    return this.currentSegment.getPointAt(this.progress);
  }

  /**
   * Set the visual mesh for this item
   */
  public setMesh(mesh: THREE.Object3D): void {
    this.mesh = mesh;
    this.updateVisualPosition();
  }

  /**
   * Remove mesh reference (for cleanup)
   */
  public clearMesh(): void {
    this.mesh = null;
  }
}
