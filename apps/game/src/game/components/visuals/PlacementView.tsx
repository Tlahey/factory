import React, { useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useGameContext } from "../../providers/GameProvider";
import {
  getCableAttachmentPoint,
  generateCatenaryCurve,
  getCableMaterial,
} from "../../visuals/helpers/CableVisualHelper";
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
  BuildingId,
  IIOBuilding,
} from "../../buildings/BuildingConfig";
import {
  createIOArrowsFromConfig,
  updateIOArrows,
} from "../../visuals/helpers/IOArrowHelper";
import { updateBuildingConnectivity } from "../../buildings/BuildingIOHelper";
import { useFrame } from "@react-three/fiber";
import { Direction } from "../../entities/types";
import { BuildingEntity } from "../../entities/BuildingEntity";

// Helper Logic
const calculateTurnTypeLocal = (
  flowIn: Direction,
  flowOut: Direction,
): "straight" | "left" | "right" => {
  if (flowIn === flowOut) return "straight";
  const turnMappings: Record<Direction, { left: Direction; right: Direction }> =
    {
      north: { left: "west", right: "east" },
      south: { left: "east", right: "west" },
      east: { left: "north", right: "south" },
      west: { left: "south", right: "north" },
    };
  const mapping = turnMappings[flowIn];
  if (mapping.left === flowOut) return "left";
  if (mapping.right === flowOut) return "right";
  return "straight";
};

// 4-direction rotation mapping
const directionToRotation: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

interface PlacementViewProps {
  x: number;
  y: number;
  isValid: boolean;
  ghostType: string | null;
  rotation: Direction;
  width: number;
  height: number;
  conveyorPath?: { x: number; y: number; isValid: boolean }[];
  cablePreview?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    isValid: boolean;
  };
}

export function PlacementView({
  x,
  y,
  isValid,
  ghostType,
  rotation,
  width,
  height,
  conveyorPath = [],
  cablePreview,
}: PlacementViewProps) {
  const { world } = useGameContext();

  // --- Helpers (Ported/Adapted) ---

  const detectConveyorTurnType = useCallback(
    (
      targetX: number,
      targetY: number,
      outputDirection: Direction,
    ): "straight" | "left" | "right" => {
      // Determine where flow is coming FROM at this position
      const flowIn = determineFlowInputDirection(
        targetX,
        targetY,
        outputDirection,
        world,
      );
      if (flowIn) {
        return calculateTurnTypeLocal(flowIn, outputDirection);
      }
      return "straight";
    },
    [world],
  );

  // --- Ghost Mesh Generation ---

  const NeededConveyorType = useMemo(() => {
    if (ghostType !== "conveyor") return "straight";
    return detectConveyorTurnType(x, y, rotation);
  }, [x, y, rotation, ghostType, detectConveyorTurnType]);

  const ghostMesh = useMemo(() => {
    if (!ghostType) return null;
    let mesh: THREE.Object3D | null = null;

    // Model Factories
    if (ghostType === "extractor") mesh = createExtractorModel();
    else if (ghostType === "chest") mesh = createChestModel();
    else if (ghostType === "conveyor") {
      const texture = createConveyorTexture();
      mesh = createConveyorModel(NeededConveyorType, texture);
    } else if (ghostType === "hub") mesh = createHubModel();
    else if (ghostType === "electric_pole") mesh = createElectricPoleModel();
    else if (ghostType === "battery") mesh = createBatteryModel();
    else if (ghostType === "furnace") mesh = createFurnaceModel();
    else if (ghostType === "conveyor_merger")
      mesh = createConveyorMergerModel();
    else if (ghostType === "conveyor_splitter")
      mesh = createConveyorSplitterModel();
    else if (ghostType === "sawmill") mesh = createSawmillModel();
    else if (ghostType === "biomass_plant") mesh = createBiomassPlantModel();

    if (!mesh) return null;

    // Apply Ghost Material
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Will be tinted by validity
      transparent: true,
      opacity: 0.5,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.FrontSide,
    });

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name.includes("arrow")) return;
        child.material = ghostMat.clone();
      }
    });

    // Add IO Arrows
    const config = getBuildingConfig(ghostType as BuildingId);
    const ioConfig =
      config && "io" in config
        ? (config as unknown as IIOBuilding).io
        : undefined;

    if (ioConfig?.showArrow) {
      const arrowGroup = createIOArrowsFromConfig(
        ioConfig,
        config?.width || 1,
        config?.height || 1,
      );
      if (arrowGroup) {
        arrowGroup.name = "ghost_io_arrows";
        mesh.add(arrowGroup);
      }
    }

    return mesh;
  }, [ghostType, NeededConveyorType]);

  // Update Ghost Material Color based on Validity
  useEffect(() => {
    if (ghostMesh) {
      ghostMesh.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          if (child.parent?.name !== "ghost_io_arrows") {
            child.material.color.setHex(isValid ? 0xffffff : 0xff0000);
          }
        }
      });
    }
  }, [ghostMesh, isValid]);

  // Continuous Update for Ghost IO Arrows
  useFrame(() => {
    if (!ghostMesh || conveyorPath.length > 0) return;
    const arrowGroup = ghostMesh.getObjectByName(
      "ghost_io_arrows",
    ) as THREE.Group;
    if (!arrowGroup) return;

    const config = getBuildingConfig(ghostType as BuildingId);
    if (!config) return;

    // Mock building to calculate connectivity for ghost
    const mock = {
      x,
      y,
      direction: rotation,
      buildingType: ghostType,
      io: (config as unknown as IIOBuilding).io,
      getConfig: () => config,
      connectedInputSides: [],
      connectedOutputSides: [],
      isInputConnected: false,
      isOutputConnected: false,
    };

    updateBuildingConnectivity(
      mock as unknown as BuildingEntity & IIOBuilding,
      world,
    );
    updateIOArrows(arrowGroup, mock as unknown as BuildingEntity & IIOBuilding);
  });

  // --- Conveyor Drag Preview Meshes ---
  const dragPathMeshes = useMemo(() => {
    if (conveyorPath.length === 0) return [];

    const texture = createConveyorTexture();
    const meshes: {
      mesh: THREE.Object3D;
      x: number;
      y: number;
      r: number;
      isValid: boolean;
    }[] = [];

    conveyorPath.forEach((segment, i) => {
      const prev = i > 0 ? conveyorPath[i - 1] : null;
      const next = i < conveyorPath.length - 1 ? conveyorPath[i + 1] : null;
      const isFirst = i === 0;
      const isLast = i === conveyorPath.length - 1;
      const isSingle = conveyorPath.length === 1;

      let direction: Direction;
      let cType: "straight" | "left" | "right" = "straight";

      if (isSingle) {
        direction = rotation;
        cType = "straight";
      } else if (isFirst) {
        direction = getSegmentDirection(
          segment.x,
          segment.y,
          next!.x,
          next!.y,
          null,
          null,
        ) as Direction;
        cType = "straight";
      } else if (isLast) {
        direction = rotation;
        const prevDirection = getSegmentDirection(
          prev!.x,
          prev!.y,
          segment.x,
          segment.y,
          null,
          null,
        ) as Direction;
        cType = calculateTurnTypeLocal(prevDirection, direction);
      } else {
        direction = getSegmentDirection(
          segment.x,
          segment.y,
          next!.x,
          next!.y,
          prev!.x,
          prev!.y,
        ) as Direction;
        cType = detectConveyorType(
          prev!.x,
          prev!.y,
          segment.x,
          segment.y,
          next!.x,
          next!.y,
        );
      }

      const mesh = createConveyorModel(cType, texture);

      // Add IO Arrows to each drag segment
      const arrows = createIOArrowsFromConfig(
        (getBuildingConfig("conveyor" as BuildingId) as unknown as IIOBuilding)
          .io,
        1,
        1,
      );
      arrows.name = "drag_io_arrows";
      mesh.add(arrows);

      let rot = directionToRotation[direction];
      if (cType === "left") rot -= Math.PI / 2;
      else if (cType === "right") {
        mesh.scale.set(-1, 1, 1);
        rot += Math.PI / 2;
      }

      // HACK: Hide arrows that are internally connected in the drag chain
      // For now, simpler: we just show ALL arrows and let updateIOArrows handle it if we make it smarter.
      // Actually, we can manually hide them here by checking our index
      const isFirstSegment = i === 0;
      const isLastSegment = i === conveyorPath.length - 1;

      const mat = new THREE.MeshStandardMaterial({
        color: segment.isValid ? 0xffffff : 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      mesh.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          if (c.parent?.name !== "drag_io_arrows") {
            c.material = mat;
          }
        }
      });

      // Update arrow visibility for this segment relative to WORLD
      const mockSegment = {
        x: segment.x,
        y: segment.y,
        direction: direction,
        io: (getBuildingConfig("conveyor") as unknown as IIOBuilding).io,
        getConfig: () => getBuildingConfig("conveyor"),
        connectedInputSides: [],
        connectedOutputSides: [],
      } as unknown as BuildingEntity & IIOBuilding;

      // This only sees buildings ALREADY IN world.
      // Doesn't see other segments from the SAME path.
      updateBuildingConnectivity(mockSegment, world);

      // Manual internal connectivity for drag path
      if (!isFirstSegment) {
        // If not first, we have an input from previous segment
        if (!mockSegment.connectedInputSides.includes("back")) {
          mockSegment.connectedInputSides.push("back");
        }
      }
      if (!isLastSegment) {
        // If not last, we have an output to next segment
        if (!mockSegment.connectedOutputSides.includes("front")) {
          mockSegment.connectedOutputSides.push("front");
        }
      }

      updateIOArrows(arrows, mockSegment);

      meshes.push({
        mesh,
        x: segment.x,
        y: segment.y,
        r: rot,
        isValid: segment.isValid,
      });
    });
    return meshes;
  }, [conveyorPath, rotation, world]);

  // --- Cable Preview ---
  // --- Cable Preview ---
  const cableMesh = useMemo(() => {
    if (!cablePreview) return null;
    const { start, end, isValid } = cablePreview;

    const bStart = world.getBuilding(start.x, start.y);
    const bEnd = world.getBuilding(end.x, end.y);

    // Get exact attachment points
    const p1 = getCableAttachmentPoint(bStart, start.x, start.y);
    const p2 = getCableAttachmentPoint(bEnd, end.x, end.y);

    const curve = generateCatenaryCurve(p1, p2);
    const geometry = new THREE.TubeGeometry(curve, 16, 0.05, 6, false);

    const mat = getCableMaterial().clone();

    // Green/Red Tint for Validity
    // Using setHex on color will tint the texture
    mat.color.setHex(isValid ? 0xccffcc : 0xffaaaa);
    mat.emissive.setHex(isValid ? 0x222222 : 0x550000);

    const dist = p1.distanceTo(p2);
    if (mat.map) {
      mat.map = mat.map.clone();
      mat.map.repeat.set(1, dist * 2);
      mat.map.needsUpdate = true;
    }

    const mesh = new THREE.Mesh(geometry, mat);
    return <primitive object={mesh} />;
  }, [cablePreview, world]);

  // -- Render --

  if ((x < 0 || y < 0) && !cablePreview) return null;

  const cursorScale = [width, 1, height] as [number, number, number];
  const cursorColor = isValid ? "white" : "red";

  return (
    <group>
      {/* Cable Preview */}
      {cableMesh}

      {/* Cursor - Only if we have a valid target position */}
      {x >= 0 && y >= 0 && (
        <group position={[x + (width - 1) / 2, 0.5, y + (height - 1) / 2]}>
          <lineSegments scale={cursorScale}>
            <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
            <lineBasicMaterial color={cursorColor} linewidth={2} />
          </lineSegments>
        </group>
      )}

      {/* Ghost Building (Only if NOT dragging conveyor, or if drag is empty) */}
      {ghostMesh && conveyorPath.length === 0 && (
        <primitive
          object={ghostMesh}
          position={[x + (width - 1) / 2, 0, y + (height - 1) / 2]}
          rotation={[
            0,
            directionToRotation[rotation] +
              (ghostType === "conveyor" && NeededConveyorType === "left"
                ? -Math.PI / 2
                : ghostType === "conveyor" && NeededConveyorType === "right"
                  ? Math.PI / 2
                  : 0),
            0,
          ]}
          scale={
            ghostType === "conveyor" && NeededConveyorType === "right"
              ? [-1, 1, 1]
              : [1, 1, 1]
          }
        />
      )}

      {/* Conveyor Drag Path */}
      {dragPathMeshes.map((item, idx) => (
        <primitive
          key={idx}
          object={item.mesh}
          position={[item.x, 0, item.y]}
          rotation={[0, item.r, 0]}
        />
      ))}
    </group>
  );
}
