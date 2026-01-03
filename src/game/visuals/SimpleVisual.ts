import * as THREE from 'three';
import { VisualEntity } from './VisualEntity';

export class SimpleVisual implements VisualEntity {
  public mesh: THREE.Object3D;

  constructor(mesh: THREE.Object3D) {
    this.mesh = mesh;
  }

  public update(delta: number, entity?: any): void {
    // No-op for static visuals
  }

  public dispose(): void {
    // Dispose geometry/materials if strictly owned
  }
}
