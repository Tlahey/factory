"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { useGameStore } from "@/game/state/store";
import * as THREE from "three";

/**
 * GameCamera Component
 *
 * Handles RTS-style camera controls using Drei's MapControls.
 * Syncs camera state with the Zutand store for persistence/save-load.
 */
export function GameCamera() {
  const _three = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Sync from Store -> Camera (Initial Load / External Changes)
  useEffect(() => {
    const state = useGameStore.getState();
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(state.cameraAzimuth);
      controlsRef.current.setPolarAngle(state.cameraElevation);
      controlsRef.current.update();
    }

    // Ctrl Key Listener for "Rotate on Ctrl + Left Click"
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        if (controlsRef.current) {
          controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        if (controlsRef.current) {
          controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.PAN;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Dynamic Control Locking based on Game State
  // If a tool is selected (Cable/Conveyor/Building) -> Left Click = Action (No Pan)
  // If hovering an entity (Select Mode) -> Left Click = Select (No Pan)
  // Otherwise -> Left Click = Pan
  useFrame(() => {
    if (!controlsRef.current) return;

    const { selectedBuilding, hoveredEntityKey } = useGameStore.getState();
    const isToolActive = selectedBuilding && selectedBuilding !== "select";
    const isHoveringInteractable = !!hoveredEntityKey;
    // const isCtrlPressed = controlsRef.current.mouseButtons.LEFT === THREE.MOUSE.ROTATE;

    // Determine desired Left Button Function
    let targetLeftFunc: THREE.MOUSE | null = THREE.MOUSE.PAN;

    if (isToolActive || isHoveringInteractable) {
      targetLeftFunc = null; // Disable Pan
    }

    // If Ctrl is held, we want Rotate overrides everything (handled by key listeners, but we need to respect it)
    // Actually, key listeners set LEFT to ROTATE.
    // We shouldn't overwrite if it's ROTATE.
    if (controlsRef.current.mouseButtons.LEFT === THREE.MOUSE.ROTATE) {
      return;
    }

    // Apply
    // Note: MapControls types might be strict, usually null/undefined disables it.
    // Casting to any or ignoring TS might be needed if types don't allow null.
    if (controlsRef.current.mouseButtons.LEFT !== targetLeftFunc) {
      controlsRef.current.mouseButtons.LEFT = targetLeftFunc;
    }
  });

  return (
    <MapControls
      ref={controlsRef}
      // MOUSE Button Mapping
      // Left (0) = PAN
      // Middle (1) = ROTATE (Orbit)
      // Right (2) = DOLLY (Zoom) - Standard Three.js, but we rely on Wheel primarily.
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.DOLLY,
      }}
      enableDamping={true}
      dampingFactor={0.05}
      // Zoom Limits matching legacy radius constraints (approx)
      minDistance={5}
      maxDistance={100}
      // Don't go below ground or too high
      maxPolarAngle={Math.PI / 2 - 0.1}
      // Speed adjustments
      zoomSpeed={1.0}
      rotateSpeed={0.5}
      panSpeed={1.0}
    />
  );
}
