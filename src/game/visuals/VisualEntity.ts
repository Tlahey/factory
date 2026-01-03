import * as THREE from 'three';

export interface VisualEntity<T = any> {
  mesh: THREE.Object3D;
  update(delta: number, entity: T): void;
  dispose(): void;
}
