"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame, invalidate } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/game/state/store";
import { CameraController } from "@/game/camera/CameraController";
import { CAMERA_BOUNDS } from "@/game/camera/CameraConfig";
import type { RigState } from "@/game/camera/CameraRig";

/** Store sync thresholds, to avoid re-rendering the HUD on every frame. */
const ANGLE_EPSILON = 0.01;
const DISTANCE_EPSILON = 0.1;

/**
 * GameCamera
 *
 * Owns the trackpad-first navigation rig (see `game/camera/`) and keeps it in
 * sync with the HUD camera controls stored in Zustand.
 */
export function GameCamera() {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const controllerRef = useRef<CameraController | null>(null);

  const cameraAzimuth = useGameStore((state) => state.cameraAzimuth);
  const cameraElevation = useGameStore((state) => state.cameraElevation);
  const cameraDistance = useGameStore((state) => state.cameraDistance);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const controller = new CameraController({
      domElement,
      camera,
      bounds: CAMERA_BOUNDS,
      // Left-drag only pans when the click isn't meant for the world: no tool
      // armed and nothing interactive under the cursor.
      canPan: () => {
        const { selectedBuilding, hoveredEntityKey } = useGameStore.getState();
        const isToolActive =
          !!selectedBuilding && selectedBuilding !== "select";
        return !isToolActive && !hoveredEntityKey;
      },
      getScheme: () => useGameStore.getState().cameraScheme,
      onSchemeDetected: () => invalidate(),
      onDragStateChange: (dragging) =>
        useGameStore.getState().setCameraDragging(dragging),
      onRigChange: (rig: RigState) => syncStore(rig),
      requestFrame: () => invalidate(),
    });

    const state = useGameStore.getState();
    controller.jumpTo({
      ...controller.desired,
      azimuth: state.cameraAzimuth,
      polar: state.cameraElevation,
      distance: state.cameraDistance,
    });
    controller.attach();
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [camera, domElement]);

  // Store -> camera: HUD buttons, tilt slider, reset view.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const { azimuth, polar, distance } = controller.desired;
    if (
      Math.abs(azimuth - cameraAzimuth) > ANGLE_EPSILON ||
      Math.abs(polar - cameraElevation) > ANGLE_EPSILON
    ) {
      controller.setAngles(cameraAzimuth, cameraElevation);
    }
    if (Math.abs(distance - cameraDistance) > DISTANCE_EPSILON) {
      controller.setDistance(cameraDistance);
    }
  }, [cameraAzimuth, cameraElevation, cameraDistance]);

  useFrame((_, delta) => {
    controllerRef.current?.update(delta);
  });

  return null;
}

/** Camera -> store, throttled so only meaningful changes trigger a render. */
function syncStore(rig: RigState) {
  const state = useGameStore.getState();

  if (
    Math.abs(state.cameraAzimuth - rig.azimuth) > ANGLE_EPSILON ||
    Math.abs(state.cameraElevation - rig.polar) > ANGLE_EPSILON
  ) {
    state.setCameraAngles(rig.azimuth, rig.polar);
  }
  if (Math.abs(state.cameraDistance - rig.distance) > DISTANCE_EPSILON) {
    state.setCameraDistance(rig.distance);
  }
}
