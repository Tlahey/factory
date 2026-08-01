"use client";
/* eslint-disable react-hooks/immutability */
// `scene.environment` is imperative Three.js state; installing it from an
// effect (and clearing it on teardown) is the standard R3F pattern.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { createOutdoorEnvironment } from "../visuals/environment/OutdoorEnvironment";

interface SceneEnvironmentProps {
  /** How much the environment contributes on top of `Lights`. */
  intensity?: number;
}

/**
 * Installs the procedural environment map on the scene.
 *
 * Required by every `MeshStandardMaterial` with a non-zero `metalness`: without
 * it, metal has nothing to reflect and renders black. See
 * `OutdoorEnvironment.ts`.
 *
 * Kept deliberately low so it reads as reflections, not as a second ambient
 * light washing out the directional shadows.
 */
export function SceneEnvironment({ intensity = 0.45 }: SceneEnvironmentProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const target = createOutdoorEnvironment(gl);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
