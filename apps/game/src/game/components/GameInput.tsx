"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/game/state/store";
import { WORLD_WIDTH, WORLD_HEIGHT } from "@/game/constants";
import { useGameContext } from "@/game/providers/GameProvider";
import { getBuildingConfig, BuildingId } from "@/game/buildings/BuildingConfig";
import { Direction } from "@/game/entities/types";
import {
  determineConveyorDirection,
  getNextValidConveyorRotation,
  isValidConveyorDirection,
} from "@/game/buildings/conveyor/ConveyorPlacementHelper";
import {
  calculateConveyorPath,
  getSegmentDirection,
} from "@/game/buildings/conveyor/ConveyorPathHelper";
import { PlacementView } from "./visuals/PlacementView";

// Helper for point-to-segment distance (Unused)
// function pointToSegmentDistance...

export function GameInput() {
  const { world, powerSystem, markCablesDirty } = useGameContext();
  const _three = useThree();

  // Local State for Interaction
  const [hoverState, setHoverState] = useState<{
    x: number;
    y: number;
    isValid: boolean;
    rotation: Direction;
    ghostType: string | null;
    width: number;
    height: number;
  }>({
    x: -1,
    y: -1,
    isValid: false,
    rotation: "north",
    ghostType: null,
    width: 1,
    height: 1,
  });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    start: { x: number; y: number } | null;
    conveyorPath: { x: number; y: number; isValid: boolean }[];
    cablePreview: {
      start: { x: number; y: number };
      end: { x: number; y: number };
      isValid: boolean;
    } | null;
  }>({
    isDragging: false,
    start: null,
    conveyorPath: [],
    cablePreview: null,
  });

  const lastHoverRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const currentRotationRef = useRef<Direction>("north");
  // Track if user has manually rotated (overrides auto-orientation)
  const manualRotationRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const getGridPos = (point: THREE.Vector3) => {
    const x = Math.floor(point.x + 0.5);
    const y = Math.floor(point.z + 0.5);
    return { x, y };
  };

  const updateHoverLogic = useCallback(
    (x: number, y: number) => {
      const { selectedBuilding, hasResources, unlockedBuildings } =
        useGameStore.getState();

      useGameStore.getState().setHoveredEntityKey(null);

      // 1. Selection / Generic Hover
      if (!selectedBuilding || selectedBuilding === "select") {
        const b = world.getBuilding(x, y);
        if (b) {
          useGameStore.getState().setHoveredEntityKey(`${b.x},${b.y}`);
          setHoverState({
            x: b.x,
            y: b.y,
            isValid: true,
            ghostType: null,
            rotation: b.direction,
            width: b.width,
            height: b.height,
          });
        } else {
          setHoverState({
            x,
            y,
            isValid: true,
            ghostType: null,
            rotation: "north",
            width: 1,
            height: 1,
          });
        }
        return;
      }

      // 2. Delete Tool
      if (selectedBuilding === "delete") {
        const b = world.getBuilding(x, y);
        if (b) {
          setHoverState({
            x: b.x,
            y: b.y,
            isValid: true,
            ghostType: "delete",
            rotation: b.direction,
            width: b.width,
            height: b.height,
          });
        } else {
          setHoverState({
            x,
            y,
            isValid: true,
            ghostType: "delete",
            rotation: "north",
            width: 1,
            height: 1,
          });
        }
        return;
      }

      // 3. Building Placement
      const config = getBuildingConfig(selectedBuilding as BuildingId);
      let dir = currentRotationRef.current;

      if (selectedBuilding === "conveyor") {
        // Only auto-orient if user hasn't manually rotated
        if (!manualRotationRef.current) {
          dir = determineConveyorDirection(x, y, world, dir);
          currentRotationRef.current = dir;
        } else {
          // User manually rotated, just validate the direction is valid (no reverse flow)
          if (!isValidConveyorDirection(x, y, dir, world)) {
            dir = determineConveyorDirection(x, y, world, dir);
            currentRotationRef.current = dir;
          }
        }
      }

      let isValid = world.canPlaceBuilding(
        x,
        y,
        selectedBuilding as BuildingId,
        dir,
      );

      // Special validation for Cable tool (Hovering to start connection)
      if (selectedBuilding === "cable") {
        const b = world.getBuilding(x, y);
        isValid = !!b && !!b.powerConfig;
      }

      if (config?.cost && !hasResources(config.cost)) isValid = false;
      if (config?.locked && !unlockedBuildings.includes(selectedBuilding))
        isValid = false;

      const width = config?.width ?? 1;
      const height = config?.height ?? 1;
      const isRotated = dir === "east" || dir === "west";
      const finalWidth = isRotated ? height : width;
      const finalHeight = isRotated ? width : height;

      setHoverState({
        x,
        y,
        isValid,
        rotation: dir,
        ghostType: selectedBuilding,
        width: finalWidth,
        height: finalHeight,
      });
    },
    [world],
  );

  const rotateSelection = useCallback(
    (clockwise: boolean = true) => {
      const clockwiseOrder: Direction[] = ["north", "east", "south", "west"];
      const currentIndex = clockwiseOrder.indexOf(currentRotationRef.current);
      const { selectedBuilding } = useGameStore.getState();

      manualRotationRef.current = true;

      if (selectedBuilding === "conveyor" && lastHoverRef.current.x >= 0) {
        const { x, y } = lastHoverRef.current;
        currentRotationRef.current = getNextValidConveyorRotation(
          currentRotationRef.current,
          x,
          y,
          world,
          clockwise,
        );
      } else {
        if (clockwise) {
          currentRotationRef.current = clockwiseOrder[(currentIndex + 1) % 4];
        } else {
          currentRotationRef.current = clockwiseOrder[(currentIndex + 3) % 4];
        }
      }

      if (lastHoverRef.current.x !== -1) {
        updateHoverLogic(lastHoverRef.current.x, lastHoverRef.current.y);
      }
    },
    [world, updateHoverLogic],
  );

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const { x, y } = getGridPos(e.point);

    if (
      x !== lastHoverRef.current.x ||
      y !== lastHoverRef.current.y ||
      isDraggingRef.current
    ) {
      // Reset manual rotation when moving to a new tile (unless dragging)
      if (
        !isDraggingRef.current &&
        (x !== lastHoverRef.current.x || y !== lastHoverRef.current.y)
      ) {
        manualRotationRef.current = false;
      }
      lastHoverRef.current = { x, y };

      if (isDraggingRef.current && dragState.start) {
        const { selectedBuilding } = useGameStore.getState();

        if (selectedBuilding === "cable") {
          const start = dragState.start;
          const end = { x, y };
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const startB = world.getBuilding(start.x, start.y);
          const endB = world.getBuilding(x, y);

          let validCable = true;
          if (!startB?.powerConfig) validCable = false;
          if (!endB || !endB.powerConfig) validCable = false;
          if (dist === 0 || dist > (startB?.powerConfig?.range || 8))
            validCable = false;

          setDragState((prev) => ({
            ...prev,
            cablePreview: { start, end, isValid: validCable },
          }));
          setHoverState((prev) => ({
            ...prev,
            x,
            y,
            isValid: validCable,
            ghostType: null,
          }));
        } else if (selectedBuilding === "conveyor") {
          const path = calculateConveyorPath(
            dragState.start.x,
            dragState.start.y,
            x,
            y,
          );
          const validated = path.map((p, index) => {
            const prev = index > 0 ? path[index - 1] : null;
            const next = index < path.length - 1 ? path[index + 1] : null;

            let dir: Direction;
            if (path.length === 1 || (index === 0 && !prev)) {
              dir = determineConveyorDirection(
                p.x,
                p.y,
                world,
                next
                  ? (getSegmentDirection(
                      p.x,
                      p.y,
                      next.x,
                      next.y,
                      null,
                      null,
                    ) as Direction)
                  : currentRotationRef.current,
              );
            } else {
              dir = getSegmentDirection(
                p.x,
                p.y,
                next ? next.x : null,
                next ? next.y : null,
                prev ? prev.x : null,
                prev ? prev.y : null,
              ) as Direction;
            }

            return {
              ...p,
              isValid: world.canPlaceBuilding(p.x, p.y, "conveyor", dir),
            };
          });

          setDragState((prev) => ({
            ...prev,
            conveyorPath: validated,
            cablePreview: null,
          }));
          // Keep hover position in sync for cursor box
          setHoverState((prev) => ({ ...prev, x, y }));
        }
      } else {
        updateHoverLogic(x, y);
      }
    }
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button === 0) {
      e.stopPropagation();
      const { x, y } = getGridPos(e.point);
      const { selectedBuilding } = useGameStore.getState();

      let isDragAction = false;

      if (selectedBuilding === "cable") {
        const b = world.getBuilding(x, y);
        if (b?.powerConfig) {
          isDraggingRef.current = true;
          setDragState({
            isDragging: true,
            start: { x, y },
            conveyorPath: [],
            cablePreview: { start: { x, y }, end: { x, y }, isValid: false },
          });
          isDragAction = true;
        }
      } else if (selectedBuilding === "conveyor") {
        const autoDir = determineConveyorDirection(
          x,
          y,
          world,
          currentRotationRef.current,
        );
        if (world.canPlaceBuilding(x, y, "conveyor", autoDir)) {
          isDraggingRef.current = true;
          setDragState({
            isDragging: true,
            start: { x, y },
            conveyorPath: [{ x, y, isValid: true }],
            cablePreview: null,
          });
          isDragAction = true;
        }
      }

      if (!isDragAction) {
        if (selectedBuilding === "select" || selectedBuilding === null) {
          const b = world.getBuilding(x, y);
          if (b && b.hasInteractionMenu()) {
            useGameStore.getState().setOpenedEntityKey(`${b.x},${b.y}`);
          } else {
            useGameStore.getState().setOpenedEntityKey(null);
          }
        } else if (selectedBuilding === "delete") {
          world.removeBuilding(x, y);
          powerSystem.rebuildNetworks();
          markCablesDirty();
        }
      }
    }
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.button === 0) {
      e.stopPropagation();
      const { x, y } = getGridPos(e.point);
      const { selectedBuilding, hasResources, removeResources } =
        useGameStore.getState();

      const wasDragging = isDraggingRef.current;
      const dragStartPos = dragState.start;
      const pathSnapshot = [...dragState.conveyorPath];
      const cableSnapshot = dragState.cablePreview
        ? { ...dragState.cablePreview }
        : null;

      // Reset drag state IMMEDIATELY
      isDraggingRef.current = false;
      setDragState({
        isDragging: false,
        start: null,
        conveyorPath: [],
        cablePreview: null,
      });

      if (wasDragging && dragStartPos) {
        if (selectedBuilding === "cable" && cableSnapshot?.isValid) {
          const success = world.addCable(dragStartPos.x, dragStartPos.y, x, y);
          if (success) {
            const cost = getBuildingConfig("cable")?.cost;
            if (cost) removeResources(cost);
          }
        } else if (selectedBuilding === "conveyor" && pathSnapshot.length > 0) {
          const convConfig = getBuildingConfig("conveyor");
          pathSnapshot.forEach((p, index) => {
            if (p.isValid) {
              if (convConfig?.cost && !hasResources(convConfig.cost)) return;

              const prev = index > 0 ? pathSnapshot[index - 1] : null;
              const next =
                index < pathSnapshot.length - 1
                  ? pathSnapshot[index + 1]
                  : null;
              let dir: Direction;

              if (pathSnapshot.length === 1 || (index === 0 && !prev)) {
                dir = determineConveyorDirection(
                  p.x,
                  p.y,
                  world,
                  next
                    ? (getSegmentDirection(
                        p.x,
                        p.y,
                        next.x,
                        next.y,
                        null,
                        null,
                      ) as Direction)
                    : currentRotationRef.current,
                );
              } else {
                dir = getSegmentDirection(
                  p.x,
                  p.y,
                  next ? next.x : null,
                  next ? next.y : null,
                  prev ? prev.x : null,
                  prev ? prev.y : null,
                ) as Direction;
              }

              if (world.placeBuilding(p.x, p.y, "conveyor", dir)) {
                if (convConfig?.cost) removeResources(convConfig.cost);
              }
            }
          });
        }
        powerSystem.rebuildNetworks();
        markCablesDirty();
      } else if (
        selectedBuilding &&
        selectedBuilding !== "select" &&
        selectedBuilding !== "delete"
      ) {
        // Non-drag placement for other buildings
        const isDragTool =
          selectedBuilding === "conveyor" || selectedBuilding === "cable";
        if (!isDragTool && hoverState.isValid) {
          const success = world.placeBuilding(
            x,
            y,
            selectedBuilding as BuildingId,
            hoverState.rotation,
          );
          if (success) {
            const config = getBuildingConfig(selectedBuilding as BuildingId);
            if (config?.cost) removeResources(config?.cost);
            powerSystem.rebuildNetworks();
            markCablesDirty();
          }
        }
      }

      // Explicitly sync hover state to show ghost at current mouse (even if occupied)
      // and ensure selection is maintained.
      updateHoverLogic(x, y);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r") {
        rotateSelection();
      }
      if (e.key === "Escape") {
        isDraggingRef.current = false;
        setDragState({
          isDragging: false,
          start: null,
          conveyorPath: [],
          cablePreview: null,
        });
        useGameStore.getState().setSelectedBuilding(null);
      }
    };

    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setDragState({
          isDragging: false,
          start: null,
          conveyorPath: [],
          cablePreview: null,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [rotateSelection]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[WORLD_WIDTH / 2, -0.01, WORLD_HEIGHT / 2]}
        visible={false}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <planeGeometry args={[WORLD_WIDTH, WORLD_HEIGHT]} />
      </mesh>

      <PlacementView
        x={hoverState.x}
        y={hoverState.y}
        isValid={hoverState.isValid}
        ghostType={hoverState.ghostType}
        rotation={hoverState.rotation}
        width={hoverState.width}
        height={hoverState.height}
        conveyorPath={dragState.conveyorPath}
        cablePreview={dragState.cablePreview || undefined}
      />
    </group>
  );
}
