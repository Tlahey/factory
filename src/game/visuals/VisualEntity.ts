import * as THREE from 'three';

export interface VisualEntity<T = unknown> {
  mesh: THREE.Object3D;
  update(delta: number, entity: T): void;
  setHighlight?(active: boolean): void;
  dispose(): void;
}
