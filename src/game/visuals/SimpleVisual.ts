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

  public setHighlight(active: boolean): void {
      this.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
              if (active) {
                   if (!child.userData.originalEmissive) {
                       child.userData.originalEmissive = (child.material as THREE.MeshStandardMaterial).emissive?.clone() || new THREE.Color(0,0,0);
                   }
                   (child.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
                   (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
              } else {
                   if (child.userData.originalEmissive) {
                       (child.material as THREE.MeshStandardMaterial).emissive.copy(child.userData.originalEmissive);
                       (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0; // Assuming default 0
                   }
              }
          }
      });
  }

  public dispose(): void {
    // Dispose geometry/materials if strictly owned
  }
}
