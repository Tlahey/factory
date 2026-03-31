/* eslint-disable react-hooks/immutability */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SolarPanel } from "../../buildings/solar-panel/SolarPanel";
import { createSolarPanelModel } from "../../buildings/solar-panel/SolarPanelModel";


interface SolarPanelViewProps {
    entity: SolarPanel;
}

export function SolarPanelView({ entity }: SolarPanelViewProps) {
    const groupRef = useRef<THREE.Group>(null);

    // 1. Create Model (Once)
    const { mesh, panelMeshes, statusLightMat } = useMemo(() => {
        const mesh = createSolarPanelModel();

        // Find all solar cells to animate
        const panelMeshes: THREE.Mesh[] = [];
        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name === "solar_cell") {
                panelMeshes.push(child);
            }
        });

        // Use one of the cells for the legacy 'panelMesh' detection fallback if needed, 
        // but we should just use the array.

        // Status Light
        let statusLightMat: THREE.MeshBasicMaterial;
        const existingLight = mesh.getObjectByName("status_light");

        if (existingLight && existingLight instanceof THREE.Mesh) {
            statusLightMat = existingLight.material as THREE.MeshBasicMaterial;
        } else {
            // Fallback
            statusLightMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const lightGeo = new THREE.SphereGeometry(0.05, 8, 8);
            const light = new THREE.Mesh(lightGeo, statusLightMat);
            light.position.set(0, 0.5, 0.5);
            mesh.add(light);
        }

        return {
            mesh,
            panelMeshes,
            statusLightMat,
        };
    }, [entity]);

    // 2. Frame Loop
    useFrame((_state, delta) => {
        if (!groupRef.current) return;

        // Sunlight Feedback
        const intensity = entity.sunlightIntensity;

        // Update Cloud Shader Uniforms (uTime)
        mesh.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
                // Check if our custom uniform exists (it's injected via onBeforeCompile)
                if (obj.material.userData.shader) {
                    obj.material.userData.shader.uniforms.uTime.value += delta;
                }
            }
        });

        // Animate ALL panels
        if (panelMeshes.length > 0) {
            // Emissive glow based on sun
            const glowColor = 0x0000ff;
            const targetIntensity = intensity * 0.8; // Max glow 0.8

            panelMeshes.forEach(panel => {
                const mat = panel.material as THREE.MeshStandardMaterial;
                mat.emissive.setHex(glowColor);
                mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, delta * 2);
            });
        }

        // Status Light: Green if producing > 0, Red if 0 (Night)?
        // Or maybe Yellow if waiting for sun.
        // Entity currentOutput
        if (entity.currentOutput > 0) {
            statusLightMat.color.setHex(0x00ff00); // Producing
        } else {
            statusLightMat.color.setHex(0x555555); // Sleeping / Night
        }

        // D. Update IO Arrows
    });

    // 3. Position & Rotation
    // Solar Panel is 2x2. Center is +0.5 from corner.
    // BuildingEntity x,y are Top-Left corner (implied by PlacementVisuals logic).
    const centerX = entity.x + (entity.width - 1) / 2;
    const centerZ = entity.y + (entity.height - 1) / 2;

    const position: [number, number, number] = [centerX, 0, centerZ];

    const directionToRotation: Record<string, number> = {
        north: 0,
        east: -Math.PI / 2,
        south: Math.PI,
        west: Math.PI / 2,
    };
    const rotationY = directionToRotation[entity.direction] || 0;

    return (
        <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
            <primitive object={mesh} />
        </group>
    );
}
