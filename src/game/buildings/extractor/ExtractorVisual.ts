import * as THREE from 'three';
import { VisualEntity } from '../../visuals/VisualEntity';
import { Extractor } from './Extractor';
import { createExtractorModel } from './ExtractorModel';
import { ParticleSystem } from '../../visuals/ParticleSystem';

export class ExtractorVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private drillMesh: THREE.Object3D | undefined;
  private drillContainer: THREE.Object3D | undefined;
  private statusLight: THREE.Mesh;
  private particleSystem: ParticleSystem;

  constructor(extractor: Extractor, particleSystem: ParticleSystem) {
    this.mesh = createExtractorModel();
    this.mesh.name = 'extractor';

    this.drillMesh = this.mesh.getObjectByName('drill_mesh');
    this.drillContainer = this.mesh.getObjectByName('drill_container');
    this.particleSystem = particleSystem;

    // Status Light
    const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.statusLight = new THREE.Mesh(lightGeo, lightMat);
    this.statusLight.position.set(0.3, 1.8, 0.3); // Top corner
    this.mesh.add(this.statusLight);
  }

  public update(delta: number, entity: Extractor): void {
    const time = performance.now() / 1000;

    // Update Status Light
    const statusMat = this.statusLight?.material as THREE.MeshBasicMaterial;
    if (!statusMat || !statusMat.color) {
      console.error('ExtractorVisual: statusLight material is undefined');
      return;
    }

    // 3-State Logic
    // 1. Not Linked (No Power Source) -> RED
    if (!entity.hasPowerSource) {
      statusMat.color.setHex(0xff0000);
      this.statusLight.scale.setScalar(1.0);
    }
    // 2. Linked but Low Energy OR Linked & Full Energy but Idle -> ORANGE
    else if (entity.powerStatus === 'warn' || !entity.active) {
      statusMat.color.setHex(0xffaa00);
      this.statusLight.scale.setScalar(1.0);
    }
    // 3. Linked & Active -> GREEN
    else {
      statusMat.color.setHex(0x00ff00);
      this.statusLight.scale.setScalar(1.0 + Math.sin(time * 10) * 0.2);
    }

    if (!entity.active) return;

    if (this.drillMesh) {
      this.drillMesh.rotation.y += delta * 15;
    }
    if (this.drillContainer) {
      this.drillContainer.position.y = 1.2 + Math.sin(time * 3) * 0.4;
    }

    if (Math.random() < 0.3) {
      this.particleSystem.spawn(entity.x, 0.1, entity.y);
    }
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== this.statusLight) {
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
            mat.emissiveIntensity = 0;
          }
        }
      }
    });
  }

  public dispose(): void {
    // Dispose geometry/materials if needed
  }
}
