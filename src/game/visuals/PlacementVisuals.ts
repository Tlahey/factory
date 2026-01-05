import * as THREE from 'three';
import { createExtractorModel } from '../buildings/extractor/ExtractorModel';
import { createChestModel } from '../buildings/chest/ChestModel';
import { createConveyorTexture } from '../buildings/conveyor/ConveyorTexture';
import { createConveyorModel } from '../buildings/conveyor/ConveyorGeometry';
import { detectConveyorType, getSegmentDirection } from '../buildings/conveyor/ConveyorPathHelper';
import { createHubModel } from '../buildings/hub/HubModel';
import { createElectricPoleModel } from '../buildings/electric-pole/ElectricPoleModel';

export class PlacementVisuals {
  private scene: THREE.Scene;
  private cursorMesh: THREE.LineSegments;
  private ghostMesh: THREE.Object3D | null = null;
  private ghostType: string | null = null;
  
  // Conveyor drag preview
  private conveyorDragMeshes: THREE.Object3D[] = [];

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

  /**
   * Update conveyor drag preview with multiple segments
   */
  public updateConveyorDragPreview(
    path: { x: number; y: number; isValid: boolean }[]
  ) {
    // Clear existing drag meshes
    this.clearConveyorDragPreview();

    if (path.length === 0) return;

    const texture = createConveyorTexture();
    
    // Create a mesh for each segment in the path with correct type and rotation
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const prev = i > 0 ? path[i - 1] : null;
      const next = i < path.length - 1 ? path[i + 1] : null;
      
      // Determine conveyor type (straight, left, right) based on neighbors
      let conveyorType: 'straight' | 'left' | 'right' = 'straight';
      if (prev && next) {
        conveyorType = detectConveyorType(
          prev.x, prev.y,
          segment.x, segment.y,
          next.x, next.y
        );
      }
      
      // Create mesh with correct type
      // Create mesh with correct type
      const mesh = createConveyorModel(conveyorType, texture);
      mesh.position.set(segment.x, 0, segment.y);
      
      // Calculate rotation based on output direction (where this segment points to)
      // or maintain input direction if it's the last segment
      const direction = getSegmentDirection(
        segment.x, segment.y,
        next ? next.x : null, next ? next.y : null,
        prev ? prev.x : null, prev ? prev.y : null
      );
        
      // Map direction to rotation (same as ConveyorVisual.ts logic)
      const getRot = (dir: string) => {
        switch(dir) {
          case 'north': return 0;
          case 'west': return Math.PI / 2;
          case 'south': return Math.PI;
          case 'east': return -Math.PI / 2;
          default: return 0;
        }
      };
      
      let rot = getRot(direction);
      
      // Adjust rotation for turn pieces (same logic as ConveyorVisual)
      // Note: Turn pieces are only identified if both prev and next exist
      if (conveyorType === 'left') {
        rot -= Math.PI / 2;
      } else if (conveyorType === 'right') {
        mesh.scale.set(-1, 1, 1); // Mirror for right turns
        rot += Math.PI / 2;
      }
      
      mesh.rotation.y = rot;
      
      // Apply white or red transparent material based on validity
      const color = segment.isValid ? 0xffffff : 0xff0000;
      const material = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        roughness: 0.5,
        metalness: 0.1
      });
      
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
      
      this.scene.add(mesh);
      this.conveyorDragMeshes.push(mesh);
    }
    
    // Hide single-tile ghost during conveyor drag
    if (this.ghostMesh) {
      this.ghostMesh.visible = false;
    }
    this.cursorMesh.visible = false;
  }

  /**
   * Clear all conveyor drag preview meshes
   */
  public clearConveyorDragPreview() {
    for (const mesh of this.conveyorDragMeshes) {
      this.scene.remove(mesh);
      // Dispose geometry and materials to free memory
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    this.conveyorDragMeshes = [];
  }

  public dispose() {
      if (this.cursorMesh) {
          this.scene.remove(this.cursorMesh);
          // dispose geometry/material?
      }
      if (this.ghostMesh) {
          this.scene.remove(this.ghostMesh);
      }
      this.clearConveyorDragPreview();
  }
}
