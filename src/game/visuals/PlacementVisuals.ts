import * as THREE from "three";
import { createExtractorModel } from "../buildings/extractor/ExtractorModel";
import { createChestModel } from "../buildings/chest/ChestModel";
import { createConveyorTexture } from "../buildings/conveyor/ConveyorTexture";
import { createConveyorModel } from "../buildings/conveyor/ConveyorGeometry";
import {
  detectConveyorType,
  getSegmentDirection,
} from "../buildings/conveyor/ConveyorPathHelper";
import { createHubModel } from "../buildings/hub/HubModel";
import { createElectricPoleModel } from "../buildings/electric-pole/ElectricPoleModel";
import { Direction4 } from "../entities/BuildingEntity";
import {
  getBuildingConfig,
  IOConfig,
  Direction,
  getDirectionFromSide,
} from "../buildings/BuildingConfig";
import { IWorld } from "../entities/types";
import { isPortConnected } from "../buildings/BuildingIOHelper";

// 4-direction rotation mapping
const directionToRotation: Record<Direction4, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

// IO Arrow constants
const ARROW_HEAD_SIZE = 0.15;
const ARROW_SHAFT_LENGTH = 0.2;
const ARROW_SHAFT_RADIUS = 0.04;
const ARROW_HEIGHT = 0.5;
const INPUT_COLOR = 0x00ff00; // Green
const OUTPUT_COLOR = 0xff0000; // Red

function createArrowMesh(color: number, pointsInward: boolean): THREE.Group {
  const arrowGroup = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
  });

  const headGeometry = new THREE.ConeGeometry(
    ARROW_HEAD_SIZE,
    ARROW_HEAD_SIZE * 1.8,
    8,
  );
  const head = new THREE.Mesh(headGeometry, material);
  const shaftGeometry = new THREE.CylinderGeometry(
    ARROW_SHAFT_RADIUS,
    ARROW_SHAFT_RADIUS,
    ARROW_SHAFT_LENGTH,
    8,
  );
  const shaft = new THREE.Mesh(shaftGeometry, material);

  head.rotation.x = Math.PI / 2;
  shaft.rotation.x = Math.PI / 2;

  if (pointsInward) {
    head.rotation.x = -Math.PI / 2;
    head.position.z = -ARROW_HEAD_SIZE * 0.8;
    shaft.position.z = ARROW_SHAFT_LENGTH / 2 + ARROW_HEAD_SIZE * 0.2;
  } else {
    head.position.z = ARROW_HEAD_SIZE * 0.8;
    shaft.position.z = -(ARROW_SHAFT_LENGTH / 2 + ARROW_HEAD_SIZE * 0.2);
  }

  arrowGroup.add(head);
  arrowGroup.add(shaft);
  return arrowGroup;
}

function getDirectionRotation(direction: Direction): number {
  switch (direction) {
    case "north":
      return Math.PI;
    case "south":
      return 0;
    case "east":
      return -Math.PI / 2;
    case "west":
      return Math.PI / 2;
  }
}

function getEdgePosition(
  direction: Direction,
  distance: number,
): { x: number; z: number } {
  switch (direction) {
    case "north":
      return { x: 0, z: -distance };
    case "south":
      return { x: 0, z: distance };
    case "east":
      return { x: distance, z: 0 };
    case "west":
      return { x: -distance, z: 0 };
  }
}

function getSideDirection(
  side: "front" | "back" | "left" | "right",
): Direction {
  // Returns the direction for the given side when building faces 'north'
  switch (side) {
    case "front":
      return "north";
    case "back":
      return "south";
    case "right":
      return "east";
    case "left":
      return "west";
  }
}

export class PlacementVisuals {
  private scene: THREE.Scene;
  private cursorMesh: THREE.LineSegments;
  private ghostMesh: THREE.Object3D | null = null;
  private ghostType: string | null = null;
  private ioArrowGroup: THREE.Group | null = null;

  // Conveyor drag preview
  private conveyorDragMeshes: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cursorMesh = this.createCursorMesh();
    this.scene.add(this.cursorMesh);
  }

  private createCursorMesh() {
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
    });
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.visible = false;
    return mesh;
  }

  // Create IO arrows for building type - ALWAYS in 'north' orientation
  // The arrows will be added to the ghost mesh and inherit its rotation
  private createIOArrows(buildingType: string): THREE.Group | null {
    const config = getBuildingConfig(buildingType);
    if (!config) return null;

    const io = (config as { io?: IOConfig }).io;
    if (!io || !io.showArrow) return null;

    const group = new THREE.Group();
    group.name = "ghost_io_arrows";

    // Create INPUT arrow (green, pointing toward building)
    // Always position for 'north' orientation - ghost mesh rotation handles the rest
    if (io.hasInput) {
      const inputSide = io.inputSide || "front";
      const inputDir = getSideDirection(inputSide);

      const inputArrow = createArrowMesh(INPUT_COLOR, true);
      const rot = getDirectionRotation(inputDir);
      const pos = getEdgePosition(inputDir, 0.55);

      inputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
      inputArrow.rotation.y = rot;
      inputArrow.name = "input_arrow";

      group.add(inputArrow);
    }

    // Create OUTPUT arrow (red, pointing away from building)
    if (io.hasOutput) {
      const outputSide = io.outputSide || "front";
      const outputDir = getSideDirection(outputSide);

      const outputArrow = createArrowMesh(OUTPUT_COLOR, false);
      const rot = getDirectionRotation(outputDir);
      const pos = getEdgePosition(outputDir, 0.55);

      outputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
      outputArrow.rotation.y = rot;
      outputArrow.name = "output_arrow";

      group.add(outputArrow);
    }

    return group.children.length > 0 ? group : null;
  }

  // updateIOArrows is no longer needed - arrows inherit ghost mesh rotation

  public update(
    x: number,
    y: number,
    isValid: boolean = true,
    ghostType: string | null = null,
    rotation: Direction4 = "north",
    world?: IWorld,
  ) {
    if (x < 0 || y < 0) {
      this.cursorMesh.visible = false;
      if (this.ghostMesh) this.ghostMesh.visible = false;
      if (this.ioArrowGroup) this.ioArrowGroup.visible = false;
      return;
    }

    this.cursorMesh.visible = true;
    this.cursorMesh.position.set(x, 0.5, y);

    const color = isValid ? 0xffffff : 0xff0000;
    (this.cursorMesh.material as THREE.LineBasicMaterial).color.setHex(color);

    // Handle Ghost
    if (ghostType) {
      if (this.ghostType !== ghostType) {
        // Remove old ghost
        if (this.ghostMesh) {
          this.scene.remove(this.ghostMesh);
          this.ghostMesh = null;
        }
        if (this.ioArrowGroup) {
          this.scene.remove(this.ioArrowGroup);
          this.ioArrowGroup = null;
        }

        let mesh: THREE.Object3D | null = null;
        if (ghostType === "extractor") {
          mesh = createExtractorModel();
        } else if (ghostType === "chest") {
          mesh = createChestModel();
        } else if (ghostType === "conveyor") {
          const texture = createConveyorTexture();
          mesh = createConveyorModel("straight", texture);
        } else if (ghostType === "hub") {
          mesh = createHubModel();
        } else if (ghostType === "electric_pole") {
          mesh = createElectricPoleModel();
        }

        if (mesh) {
          this.ghostMesh = mesh;
          this.ghostType = ghostType;
          this.scene.add(this.ghostMesh);

          // Create IO arrows and add them as children of ghost mesh
          // This way they inherit the ghost's rotation automatically
          this.ioArrowGroup = this.createIOArrows(ghostType);
          if (this.ioArrowGroup) {
            this.ghostMesh.add(this.ioArrowGroup);
          }
        } else {
          // Fallback Generic Box
          const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
          if (ghostType === "electric_pole") {
            geometry.scale(0.2, 2, 0.2);
          }
          const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
          this.ghostMesh = new THREE.Mesh(geometry, material);
          this.ghostType = ghostType;
          this.scene.add(this.ghostMesh);
        }
      }

      if (this.ghostMesh) {
        this.ghostMesh.visible = true;
        this.ghostMesh.position.set(x, 0, y);

        // Apply rotation for all buildings (including conveyor preview)
        this.ghostMesh.rotation.y = directionToRotation[rotation] ?? 0;

        // IO arrows are children of ghostMesh and inherit its rotation automatically
        // No separate positioning needed

        // Update IO arrow visibility based on connectivity
        if (this.ioArrowGroup && world) {
          const config = getBuildingConfig(this.ghostType!) as any;
          const io = config?.io as IOConfig;

          if (io) {
            if (io.hasInput) {
              const arrow = this.ioArrowGroup.getObjectByName("input_arrow");
              if (arrow) {
                const side = io.inputSide || "front";
                const absDir = getDirectionFromSide(side, rotation);
                const connected = isPortConnected(world, x, y, absDir, false);
                arrow.visible = !connected;
              }
            }
            if (io.hasOutput) {
              const arrow = this.ioArrowGroup.getObjectByName("output_arrow");
              if (arrow) {
                const side = io.outputSide || "front";
                const absDir = getDirectionFromSide(side, rotation);
                const connected = isPortConnected(world, x, y, absDir, true);
                arrow.visible = !connected;
              }
            }
          }
        }

        // Apply Ghost Material
        const ghostColor = isValid ? 0xffffff : 0xff0000;
        const ghostMat = new THREE.MeshStandardMaterial({
          color: ghostColor,
          transparent: true,
          opacity: 0.5,
          roughness: 0.5,
          metalness: 0.1,
        });

        this.ghostMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = ghostMat;
          }
        });
      }
    } else {
      if (this.ghostMesh) this.ghostMesh.visible = false;
      if (this.ioArrowGroup) this.ioArrowGroup.visible = false;
    }
  }

  /**
   * Update conveyor drag preview with multiple segments
   */
  public updateConveyorDragPreview(
    path: { x: number; y: number; isValid: boolean }[],
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
      let conveyorType: "straight" | "left" | "right" = "straight";
      if (prev && next) {
        conveyorType = detectConveyorType(
          prev.x,
          prev.y,
          segment.x,
          segment.y,
          next.x,
          next.y,
        );
      }

      // Create mesh with correct type
      const mesh = createConveyorModel(conveyorType, texture);
      mesh.position.set(segment.x, 0, segment.y);

      // Calculate rotation based on output direction
      const direction = getSegmentDirection(
        segment.x,
        segment.y,
        next ? next.x : null,
        next ? next.y : null,
        prev ? prev.x : null,
        prev ? prev.y : null,
      );

      // Map direction to rotation (same as ConveyorVisual.ts logic)
      const getRot = (dir: string) => {
        switch (dir) {
          case "north":
            return 0;
          case "west":
            return Math.PI / 2;
          case "south":
            return Math.PI;
          case "east":
            return -Math.PI / 2;
          default:
            return 0;
        }
      };

      let rot = getRot(direction);

      // Adjust rotation for turn pieces
      if (conveyorType === "left") {
        rot -= Math.PI / 2;
      } else if (conveyorType === "right") {
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
        metalness: 0.1,
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
    if (this.ioArrowGroup) {
      this.ioArrowGroup.visible = false;
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
            child.material.forEach((m) => m.dispose());
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
    }
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
    }
    if (this.ioArrowGroup) {
      this.scene.remove(this.ioArrowGroup);
    }
    this.clearConveyorDragPreview();
  }
}
