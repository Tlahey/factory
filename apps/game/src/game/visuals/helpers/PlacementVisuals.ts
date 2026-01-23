import * as THREE from "three";
import { createExtractorModel } from "../../buildings/extractor/ExtractorModel";
import { createChestModel } from "../../buildings/chest/ChestModel";
import { createConveyorTexture } from "../../buildings/conveyor/ConveyorTexture";
import { createConveyorModel } from "../../buildings/conveyor/ConveyorGeometry";
import {
  detectConveyorType,
  getSegmentDirection,
} from "../../buildings/conveyor/ConveyorPathHelper";
import { determineFlowInputDirection } from "../../buildings/conveyor/ConveyorLogicSystem";
import { createHubModel } from "../../buildings/hub/HubModel";
import { createBatteryModel } from "../../buildings/battery/BatteryModel";
import { createElectricPoleModel } from "../../buildings/electric-pole/ElectricPoleModel";
import { createFurnaceModel } from "../../buildings/furnace/FurnaceModel";
import { createConveyorMergerModel } from "../../buildings/conveyor-merger/ConveyorMergerModel";
import { createConveyorSplitterModel } from "../../buildings/conveyor-splitter/ConveyorSplitterModel";
import { createSawmillModel } from "../../buildings/sawmill/SawmillModel";
import { createBiomassPlantModel } from "../../buildings/biomass-plant/BiomassPlantModel";
import {
  getBuildingConfig,
  IOConfig,
  BuildingId,
} from "../../buildings/BuildingConfig";
import { IWorld, Direction } from "../../entities/types";

// 4-direction rotation mapping
const directionToRotation: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

import { createIOArrowsFromConfig } from "./IOArrowHelper";

export class PlacementVisuals {
  private scene: THREE.Scene;
  private cursorMesh: THREE.LineSegments;
  private ghostMesh: THREE.Object3D | null = null;
  private ghostType: string | null = null;
  private ioArrowGroup: THREE.Group | null = null;

  // For conveyor: track current visual type to detect changes
  private conveyorVisualType: "straight" | "left" | "right" = "straight";

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
  private createIOArrows(buildingType: BuildingId): THREE.Group | null {
    const config = getBuildingConfig(buildingType);
    if (!config) return null;

    const io = (config as { io?: IOConfig }).io;
    if (!io || !io.showArrow) return null;

    const width = config.width || 1;
    const height = config.height || 1;

    // Use shared helper
    return createIOArrowsFromConfig(io, width, height);
  }

  /**
   * Detect what type of conveyor (straight/left/right) should be shown based on adjacent input sources.
   * Finds any building outputting to the placement position and calculates the turn type.
   * Uses calculateTurnType for consistency with actual Conveyor.updateVisualState logic.
   */
  private detectConveyorTurnType(
    x: number,
    y: number,
    outputDirection: Direction,
    world: IWorld,
  ): "straight" | "left" | "right" {
    // Determine where flow is coming FROM at this position
    const flowIn = determineFlowInputDirection(x, y, outputDirection, world);

    if (flowIn) {
      // flowOut = our output direction
      return this.calculateTurnTypeLocal(flowIn, outputDirection);
    }

    // No adjacent input source found, default to straight
    return "straight";
  }

  /**
   * Calculate turn type based on flow directions (same logic as ConveyorLogicSystem.calculateTurnType)
   */
  private calculateTurnTypeLocal(
    flowIn: Direction,
    flowOut: Direction,
  ): "straight" | "left" | "right" {
    if (flowIn === flowOut) {
      return "straight";
    }

    // Turn mappings: given flowIn, which direction is left/right
    const turnMappings: Record<
      Direction,
      { left: Direction; right: Direction }
    > = {
      north: { left: "west", right: "east" },
      south: { left: "east", right: "west" },
      east: { left: "north", right: "south" },
      west: { left: "south", right: "north" },
    };

    const mapping = turnMappings[flowIn];
    if (mapping.left === flowOut) {
      return "left";
    } else if (mapping.right === flowOut) {
      return "right";
    }

    // 180° turn - invalid but return straight as fallback
    return "straight";
  }

  // updateIOArrows is no longer needed - arrows inherit ghost mesh rotation

  public update(
    x: number,
    y: number,
    isValid: boolean = true,
    ghostType: string | null = null,
    rotation: Direction = "north",
    world?: IWorld,
    hoverWidth: number = 1,
    hoverHeight: number = 1,
  ) {
    if (x < 0 || y < 0) {
      this.cursorMesh.visible = false;
      if (this.ghostMesh) this.ghostMesh.visible = false;
      if (this.ioArrowGroup) this.ioArrowGroup.visible = false;
      return;
    }

    this.cursorMesh.visible = true;

    // Default 1x1 base pos
    const baseX = x;
    const baseZ = y;

    // Use passed dimensions directly (InputSystem handles rotation swapping)
    const width = hoverWidth;
    const height = hoverHeight;

    // Scale cursor directly to target dimensions
    this.cursorMesh.scale.set(width, 1, height);

    // Position cursor at the center of the target area
    // Since Anchor is at baseX, baseZ (Corner of first tile), and centers are at integers.
    // Center of N tiles starting at X is X + (N-1)/2.
    this.cursorMesh.position.set(
      baseX + (width - 1) / 2,
      0.5,
      baseZ + (height - 1) / 2,
    );
    // Force rotation to 0 as dimensions handle the shape
    this.cursorMesh.rotation.y = 0;

    const color = isValid ? 0xffffff : 0xff0000;
    (this.cursorMesh.material as THREE.LineBasicMaterial).color.setHex(color);

    // Handle Ghost
    if (ghostType) {
      // For conveyors, detect the visual type based on adjacent buildings
      let neededConveyorType: "straight" | "left" | "right" = "straight";
      if (ghostType === "conveyor" && world) {
        neededConveyorType = this.detectConveyorTurnType(x, y, rotation, world);
      }

      // Check if we need to recreate the ghost mesh
      const conveyorTypeChanged =
        ghostType === "conveyor" &&
        this.conveyorVisualType !== neededConveyorType;

      if (this.ghostType !== ghostType || conveyorTypeChanged) {
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
          mesh = createConveyorModel(neededConveyorType, texture);
          this.conveyorVisualType = neededConveyorType;
        } else if (ghostType === "hub") {
          mesh = createHubModel();
        } else if (ghostType === "electric_pole") {
          mesh = createElectricPoleModel();
        } else if (ghostType === "battery") {
          mesh = createBatteryModel();
        } else if (ghostType === "furnace") {
          mesh = createFurnaceModel();
        } else if (ghostType === "conveyor_merger") {
          mesh = createConveyorMergerModel();
        } else if (ghostType === "conveyor_splitter") {
          mesh = createConveyorSplitterModel();
        } else if (ghostType === "sawmill") {
          mesh = createSawmillModel();
        } else if (ghostType === "biomass_plant") {
          mesh = createBiomassPlantModel();
        }

        if (mesh) {
          this.ghostMesh = mesh;
          this.scene.add(this.ghostMesh);

          // IO Arrows
          this.ioArrowGroup = this.createIOArrows(ghostType as BuildingId);
          if (this.ioArrowGroup) {
            this.ghostMesh.add(this.ioArrowGroup);
          }
          this.ghostType = ghostType;
        }
      }

      if (this.ghostMesh) {
        this.ghostMesh.visible = true; // FIX: Ensure visible if it was hidden previously

        // Ghost Position Logic - Center it on the footprint center
        // Centers are at integers. Center of N tiles starting at X is X + (N-1)/2.
        this.ghostMesh.position.set(
          baseX + (width - 1) / 2,
          0,
          baseZ + (height - 1) / 2,
        );

        const rotAngle = directionToRotation[rotation] ?? 0;
        this.ghostMesh.rotation.y = rotAngle;

        // Helper for Conveyor Rotation?
        if (ghostType === "conveyor") {
          // Reset scale defaults
          this.ghostMesh.scale.set(1, 1, 1);

          // Conveyor visual rotation overrides
          if (this.conveyorVisualType === "left") {
            this.ghostMesh.rotation.y -= Math.PI / 2;
          } else if (this.conveyorVisualType === "right") {
            this.ghostMesh.scale.set(-1, 1, 1); // Mirror for right turns
            this.ghostMesh.rotation.y += Math.PI / 2;
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
          side: THREE.FrontSide, // Fix for "bar" effect (was DoubleSide)
        });

        this.ghostMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Skip IO arrows - preserve their green/red colors
            if (child.parent?.name === "ghost_io_arrows") return;
            // Skip input/output arrows explicitly if structure differs
            if (
              child.name.includes("input_arrow") ||
              child.name.includes("output_arrow")
            )
              return;

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
   * @param path - Array of segments with positions and validity
   * @param rotation - User's rotation for the LAST segment
   */
  public updateConveyorDragPreview(
    path: { x: number; y: number; isValid: boolean }[],
    rotation: Direction = "north",
  ) {
    // Clear existing drag meshes
    this.clearConveyorDragPreview();

    if (path.length === 0) return;

    console.log(
      `[DEBUG] updateConveyorDragPreview: path.length=${path.length}, rotation=${rotation}`,
    );
    console.log(
      `[DEBUG] Path: ${path.map((p, i) => `[${i}](${p.x},${p.y})`).join(" -> ")}`,
    );
    console.log(
      `[DEBUG] First: (${path[0].x},${path[0].y}), Last: (${path[path.length - 1].x},${path[path.length - 1].y})`,
    );

    const texture = createConveyorTexture();

    // Create a mesh for each segment in the path with correct type and rotation
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const prev = i > 0 ? path[i - 1] : null;
      const next = i < path.length - 1 ? path[i + 1] : null;
      const isFirst = i === 0;
      const isLast = i === path.length - 1;
      const isSingle = path.length === 1;

      // Determine direction and conveyor type
      let direction: Direction;
      let conveyorType: "straight" | "left" | "right" = "straight";

      if (isSingle) {
        // SINGLE ELEMENT: Use user's rotation, no turn
        direction = rotation;
        conveyorType = "straight";
        console.log(
          `[DEBUG] Segment ${i} SINGLE: dir=${direction}, type=${conveyorType}`,
        );
      } else if (isFirst) {
        // FIRST ELEMENT of multi-element path: point toward next, always straight
        direction = getSegmentDirection(
          segment.x,
          segment.y,
          next!.x,
          next!.y,
          null,
          null,
        ) as Direction;
        conveyorType = "straight"; // First element is always straight
        console.log(
          `[DEBUG] Segment ${i} FIRST: dir=${direction}, type=${conveyorType}`,
        );
      } else if (isLast) {
        // LAST ELEMENT: Use user's rotation, calculate turn from prev
        direction = rotation;
        const prevDirection = getSegmentDirection(
          prev!.x,
          prev!.y,
          segment.x,
          segment.y,
          null,
          null,
        ) as Direction;
        conveyorType = this.calculateTurnTypeLocal(prevDirection, direction);
        console.log(
          `[DEBUG] Segment ${i} LAST: prevDir=${prevDirection}, dir=${direction}, type=${conveyorType}`,
        );
      } else {
        // MIDDLE ELEMENT: Calculate from path positions
        direction = getSegmentDirection(
          segment.x,
          segment.y,
          next!.x,
          next!.y,
          prev!.x,
          prev!.y,
        ) as Direction;
        conveyorType = detectConveyorType(
          prev!.x,
          prev!.y,
          segment.x,
          segment.y,
          next!.x,
          next!.y,
        );
        console.log(
          `[DEBUG] Segment ${i} MIDDLE: dir=${direction}, type=${conveyorType}`,
        );
      }

      // Create mesh with correct type
      const mesh = createConveyorModel(conveyorType, texture);
      mesh.position.set(segment.x, 0, segment.y);

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
        side: THREE.DoubleSide, // Fix for negative scale culling
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
      this.ghostMesh = null;
    }
    // ioArrowGroup is a child of ghostMesh, so it's removed with it.
    // explicit remove from scene would be wrong if it's attached to ghost.
    this.ioArrowGroup = null;

    this.ghostType = null;
    this.conveyorVisualType = "straight";
    this.clearConveyorDragPreview();
  }
}
