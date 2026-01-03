import * as THREE from 'three';
import { createExtractorModel } from '../buildings/extractor/ExtractorModel';
import { createChestModel } from '../buildings/chest/ChestModel';
import { createConveyorTexture } from '../buildings/conveyor/ConveyorTexture';
import { createConveyorModel } from '../buildings/conveyor/ConveyorGeometry';
import { createHubModel } from '../buildings/hub/HubModel';
import { createElectricPoleModel } from '../buildings/electric-pole/ElectricPoleModel';

export class PlacementVisuals {
  private scene: THREE.Scene;
  private cursorMesh: THREE.LineSegments;
  private ghostMesh: THREE.Object3D | null = null;
  private ghostType: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cursorMesh = this.createCursorMesh();
    this.scene.add(this.cursorMesh);
  }

  private createCursorMesh() {
      const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const mesh = new THREE.LineSegments(geometry, material);
      mesh.visible = false;
      return mesh;
  }

  public update(x: number, y: number, isValid: boolean = true, ghostType: string | null = null) {
      if (x < 0 || y < 0) {
          this.cursorMesh.visible = false;
          if (this.ghostMesh) this.ghostMesh.visible = false;
          return;
      }
      
      this.cursorMesh.visible = true;
      this.cursorMesh.position.set(x, 0.5, y); 
      
      const color = isValid ? 0xffffff : 0xff0000;
      (this.cursorMesh.material as THREE.LineBasicMaterial).color.setHex(color);

      // Handle Ghost
      if (ghostType) {
          if (this.ghostType !== ghostType) {
              if (this.ghostMesh) {
                  this.scene.remove(this.ghostMesh);
                  this.ghostMesh = null;
              }
              
              let mesh: THREE.Object3D | null = null;
              if (ghostType === 'extractor') {
                  mesh = createExtractorModel();
              } else if (ghostType === 'chest') {
                  mesh = createChestModel();
              } else if (ghostType === 'conveyor') {
                  const texture = createConveyorTexture();
                  mesh = createConveyorModel('straight', texture);
              } else if (ghostType === 'hub') {
                  mesh = createHubModel();
              } else if (ghostType === 'electric_pole') {
                  mesh = createElectricPoleModel();
              }

              if (mesh) {
                  this.ghostMesh = mesh;
                  this.ghostType = ghostType;
                  this.scene.add(this.ghostMesh);
              } else {
                  // Fallback Generic Box
                  const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
                  if (ghostType === 'electric_pole') {
                       geometry.scale(0.2, 2, 0.2);
                  }
                  const material = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Will be replaced by ghostMat
                  this.ghostMesh = new THREE.Mesh(geometry, material);
                  this.ghostType = ghostType;
                  this.scene.add(this.ghostMesh);
              }
          }

          if (this.ghostMesh) {
              this.ghostMesh.visible = true;
              this.ghostMesh.position.set(x, 0, y);
              
              // Apply Ghost Material
              const ghostColor = isValid ? 0xffffff : 0xff0000;
              const ghostMat = new THREE.MeshStandardMaterial({
                  color: ghostColor,
                  transparent: true,
                  opacity: 0.5,
                  roughness: 0.5,
                  metalness: 0.1
              });

              this.ghostMesh.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                     child.material = ghostMat;
                  }
              });
          }
      } else {
          if (this.ghostMesh) this.ghostMesh.visible = false;
      }
  }

  public dispose() {
      if (this.cursorMesh) {
          this.scene.remove(this.cursorMesh);
          // dispose geometry/material?
      }
      if (this.ghostMesh) {
          this.scene.remove(this.ghostMesh);
      }
  }
}
