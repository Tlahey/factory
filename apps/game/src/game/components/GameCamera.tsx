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

  // Subscribe to store values for azimuth and elevation
  const cameraAzimuth = useGameStore((state) => state.cameraAzimuth);
  const cameraElevation = useGameStore((state) => state.cameraElevation);
  const setCameraAngles = useGameStore((state) => state.setCameraAngles);

  // Sync from Store -> Camera (Initial Load & External Changes like UI buttons)
  useEffect(() => {
    if (controlsRef.current) {
      const currentAzimuth = controlsRef.current.getAzimuthalAngle();
      const currentElevation = controlsRef.current.getPolarAngle();

      // Update camera only if store values are significantly different from controls
      if (
        Math.abs(currentAzimuth - cameraAzimuth) > 0.01 ||
        Math.abs(currentElevation - cameraElevation) > 0.01
      ) {
        controlsRef.current.setAzimuthalAngle(cameraAzimuth);
        controlsRef.current.setPolarAngle(cameraElevation);
        controlsRef.current.update();
      }
    }
  }, [cameraAzimuth, cameraElevation]);

  // Event handlers and key listeners
  useEffect(() => {
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

    // Custom wheel listener to rotate using Command (Meta) + 2-finger scroll
    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey) {
        e.preventDefault(); // Stop MapControls zoom / browser page zoom

        if (controlsRef.current) {
          const factor = 0.003; // Rotation sensitivity factor
          const newAzimuth =
            controlsRef.current.getAzimuthalAngle() + e.deltaX * factor;
          const newElevation = THREE.MathUtils.clamp(
            controlsRef.current.getPolarAngle() + e.deltaY * factor,
            0.1, // min polar angle
            Math.PI / 2 - 0.1, // max polar angle (not below ground)
          );

          controlsRef.current.setAzimuthalAngle(newAzimuth);
          controlsRef.current.setPolarAngle(newElevation);
          controlsRef.current.update();

          // Propagate manual wheel rotation directly back to the store
          setCameraAngles(newAzimuth, newElevation);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const domElement = _three.gl.domElement;
    domElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      domElement.removeEventListener("wheel", handleWheel);
    };
  }, [_three.gl.domElement, setCameraAngles]);

  // Sync Camera -> Store on manual controls interaction (drag / pan / etc)
  const handleControlsChange = () => {
    if (!controlsRef.current) return;
    const azimuth = controlsRef.current.getAzimuthalAngle();
    const elevation = controlsRef.current.getPolarAngle();
    const state = useGameStore.getState();

    // Only update if difference is noticeable to prevent loop fires
    if (
      Math.abs(state.cameraAzimuth - azimuth) > 0.01 ||
      Math.abs(state.cameraElevation - elevation) > 0.01
    ) {
      state.setCameraAngles(azimuth, elevation);
    }
  };

  // Dynamic Control Locking based on Game State
  // If a tool is selected (Cable/Conveyor/Building) -> Left Click = Action (No Pan)
  // If hovering an entity (Select Mode) -> Left Click = Select (No Pan)
  // Otherwise -> Left Click = Pan
  useFrame(() => {
    if (!controlsRef.current) return;

    const { selectedBuilding, hoveredEntityKey } = useGameStore.getState();
    const isToolActive = selectedBuilding && selectedBuilding !== "select";
    const isHoveringInteractable = !!hoveredEntityKey;

    // Determine desired Left Button Function
    let targetLeftFunc: THREE.MOUSE | null = THREE.MOUSE.PAN;

    if (isToolActive || isHoveringInteractable) {
      targetLeftFunc = null; // Disable Pan
    }

    // If Ctrl/Meta is held, we want Rotate override (handled by key listeners)
    if (controlsRef.current.mouseButtons.LEFT === THREE.MOUSE.ROTATE) {
      return;
    }

    // Apply
    if (controlsRef.current.mouseButtons.LEFT !== targetLeftFunc) {
      controlsRef.current.mouseButtons.LEFT = targetLeftFunc;
    }
  });

  return (
    <MapControls
      ref={controlsRef}
      onChange={handleControlsChange}
      // MOUSE Button Mapping
      // Left (0) = PAN
      // Middle (1) = ROTATE (Orbit)
      // Right (2) = ROTATE (Orbit) - Enables trackpad 2-finger click & drag to rotate
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.ROTATE,
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
