import * as THREE from 'three';
import { VisualEntity } from './VisualEntity';

export class SimpleVisual implements VisualEntity {
  public mesh: THREE.Object3D;

  constructor(mesh: THREE.Object3D) {
    this.mesh = mesh;
  }

  public update(_delta: number, _entity?: unknown): void {
    // No-op for static visuals
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (!mat || !mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0xff0000);
          mat.emissiveIntensity = 0.5;
        } else {
          if (child.userData.originalEmissive) {
            mat.emissive.copy(child.userData.originalEmissive);
            mat.emissiveIntensity = 0; // Assuming default 0
          }
        }
      }
    });
  }

  public dispose(): void {
    // Dispose geometry/materials if strictly owned
  }
}
