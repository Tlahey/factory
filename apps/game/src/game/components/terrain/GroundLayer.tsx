/* eslint-disable react-hooks/immutability */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SandShaderController } from "../../visuals/shaders/SandShader";
import { createGrassShaderMaterial } from "../../visuals/shaders/GrassShader";
import { getShaderUniforms } from "../../visuals/shaders/ShaderUtils";

interface GroundLayerProps {
  grassMesh?: THREE.Mesh | null;
  sandMesh?: THREE.Mesh | null;
  sandController?: SandShaderController | null;
}

export function GroundLayer({
  grassMesh,
  sandMesh,
  sandController,
}: GroundLayerProps) {
  const grassMatRef = useRef<THREE.Material | null>(null);

  // Sync Materials
  useEffect(() => {
    if (sandMesh && sandController) {
      sandMesh.material = sandController.material;
    }
  }, [sandMesh, sandController]);

  // Handle Grass Material separate lifecycle if needed
  // Assuming grassMesh provided has valid material,
  // but uTime needs update. We'll store ref to it.
  // Handle Grass Material separate lifecycle if needed
  useEffect(() => {
    if (grassMesh) {
      if (!grassMatRef.current) {
        grassMatRef.current = createGrassShaderMaterial();
      }
      grassMesh.material = grassMatRef.current;
    }
  }, [grassMesh]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    // Update Grass
    if (grassMesh && grassMesh.material) {
      const uniforms = getShaderUniforms(grassMesh.material as THREE.Material);
      if (uniforms?.uTime) {
        uniforms.uTime.value = elapsedTime;
      }
    }

    // Update Sand
    sandController?.update(elapsedTime);
  });

  return (
    <group>
      {grassMesh && <primitive object={grassMesh} receiveShadow />}
      {sandMesh && <primitive object={sandMesh} receiveShadow />}
    </group>
  );
}
