import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PickaxeToolProps {
  x: number;
  y: number; // grid Y (maps to 3D Z)
  isBlocked: boolean;
  swingCount: number;
}

export function PickaxeTool({ x, y, isBlocked, swingCount }: PickaxeToolProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const lastSwingCountRef = useRef(swingCount);
  // Purely animation state: read by useFrame, never rendered. Keeping it in
  // useState forced a re-render per swing and a setState inside the effect.
  const swingingRef = useRef(false);
  const swingTimeRef = useRef(0);

  // Detect new swing triggers
  useEffect(() => {
    if (swingCount > lastSwingCountRef.current) {
      swingingRef.current = true;
      swingTimeRef.current = 0;
    }
    lastSwingCountRef.current = swingCount;
  }, [swingCount]);

  useFrame((_, delta) => {
    const groupObj = groupRef.current;
    if (!groupObj) return;

    // Smoothly interpolate position to target grid coordinates
    // We float slightly above the ground (Y = 0.5)
    const targetX = x;
    const targetZ = y;
    groupObj.position.x += (targetX - groupObj.position.x) * 0.3;
    groupObj.position.z += (targetZ - groupObj.position.z) * 0.3;

    // Handle Swing Animation
    if (swingingRef.current) {
      swingTimeRef.current += delta * 6; // Speed of swing
      if (swingTimeRef.current >= 1.0) {
        swingingRef.current = false;
        swingTimeRef.current = 0;
        // Reset default rotation
        groupObj.rotation.set(0.4, 0.2, Math.PI / 4);
      } else {
        // Swing movement: rotate pickaxe forward and backward
        // Math.sin(t * PI) rises from 0 to 1 and back to 0.
        // We swing forward by tilting it around the Z axis
        const swingAngle = Math.sin(swingTimeRef.current * Math.PI) * 1.1;
        groupObj.rotation.set(0.4, 0.2, Math.PI / 4 - swingAngle);
      }
    } else {
      // Default idle rotation
      groupObj.rotation.set(0.4, 0.2, Math.PI / 4);
      // Soft floating animation
      groupObj.position.y = 0.6 + Math.sin(Date.now() * 0.003) * 0.08;
    }
  });

  // Pickaxe Material settings
  // Grey/translucent when blocked, full metallic colors when active
  const handleColor = isBlocked ? "#8a8a8a" : "#8B5A2B";
  const headColor = isBlocked ? "#5a5a5a" : "#708090";
  const opacity = isBlocked ? 0.4 : 1.0;
  const transparent = isBlocked;

  return (
    <group>
      {/* Pickaxe Tool Group */}
      <group
        ref={groupRef}
        position={[x, 0.6, y]}
        rotation={[0.4, 0.2, Math.PI / 4]}
      >
        {/* Handle (Wooden shaft) */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
          <meshStandardMaterial
            color={handleColor}
            roughness={0.8}
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>

        {/* Metal Head */}
        <group position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.45, 0.05, 0.05]} />
            <meshStandardMaterial
              color={headColor}
              metalness={isBlocked ? 0.0 : 0.8}
              roughness={isBlocked ? 0.9 : 0.2}
              transparent={transparent}
              opacity={opacity}
            />
          </mesh>
        </group>
      </group>

      {/* Red Prohibition Sign (only shown if blocked) */}
      {isBlocked && (
        <group
          position={[x + 0.2, 0.9, y + 0.2]}
          rotation={[0.2, Math.PI / 4, 0]}
        >
          {/* Red Circle */}
          <mesh castShadow>
            <torusGeometry args={[0.12, 0.018, 8, 24]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Diagonal Slash */}
          <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.24, 0.025, 0.025]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}
    </group>
  );
}
