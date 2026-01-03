'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createExtractorModel } from '@/game/buildings/extractor/ExtractorModel';
import { createConveyorModel } from '@/game/buildings/conveyor/ConveyorGeometry';
import { createChestModel } from '@/game/buildings/chest/ChestModel';
import { createConveyorTexture } from '@/game/buildings/conveyor/ConveyorTexture';
import { createItemRockModel, updateRockVisuals } from '@/game/environment/rock/RockModel';
import { createHubModel } from '@/game/buildings/hub/HubModel';

// Singleton Renderer to prevent Context Loss (Limit ~16 contexts involved)
let sharedRenderer: THREE.WebGLRenderer | null = null;

function getSharedRenderer() {
    if (!sharedRenderer) {
        sharedRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        sharedRenderer.setPixelRatio(window.devicePixelRatio);
    }
    return sharedRenderer;
}

interface ModelPreviewProps {
    type: 'building' | 'item';
    id: string;
    width?: number;
    height?: number;
    isHovered?: boolean;
    rotationSpeed?: number;
    static?: boolean;
    seed?: number; // For item variety
}

export default function ModelPreview({
    type,
    id,
    width = 64,
    height = 64,
    isHovered = false,
    rotationSpeed = 0.01,
    static: isStatic = false,
    seed = 0
}: ModelPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    // For Dynamic
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        if (!id) return;

        // Helper to Setup Scene
        const setupScene = () => {
            const scene = new THREE.Scene();

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
            dirLight.position.set(5, 10, 5);
            scene.add(dirLight);

            const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
            camera.position.set(2, 2, 2);
            camera.lookAt(0, 0.4, 0);

            let model: THREE.Object3D | null = null;
            if (type === 'building') {
                if (id === 'extractor') {
                    model = createExtractorModel();
                    model.position.y = -0.4;
                } else if (id === 'conveyor') {
                    const texture = createConveyorTexture();
                    model = createConveyorModel('straight', texture);
                    model.scale.set(1.5, 1.5, 1.5);
                    model.position.y = -0.1;
                    (model as any).userData.isConveyor = true;
                } else if (id === 'chest') {
                    model = createChestModel();
                    model.scale.set(1.3, 1.3, 1.3);
                    model.position.y = -0.4;
                } else if (id === 'hub') {
                    model = createHubModel();
                    // Center the model (2x2, parts around 0.5, 0.5)
                    model.position.set(-0.5, -0.4, -0.5);
                    model.scale.set(0.8, 0.8, 0.8);
                } else if (id === 'electric_pole') {
                    const geometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
                    const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
                    model = new THREE.Mesh(geometry, material);
                    model.position.y = 0;
                } else if (id === 'cable') {
                    const geometry = new THREE.TorusGeometry(0.3, 0.1, 8, 20);
                    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
                    model = new THREE.Mesh(geometry, material);
                    model.position.y = 0;
                }
            } else if (type === 'item') {
                if (id === 'stone') {
                    model = createItemRockModel();
                    updateRockVisuals(model as THREE.Group, seed || 42);
                    model.scale.set(4, 4, 4);
                    model.position.y = 0;
                }
            }

            if (model) {
                model.rotation.y = Math.PI / 8;
                scene.add(model);
            }

            return { scene, camera, model };
        };

        // --- STATIC MODE ---
        if (isStatic) {
            const { scene, camera, model } = setupScene();
            const renderer = getSharedRenderer();

            // Render to Data URL
            renderer.setSize(width, height);
            renderer.render(scene, camera);
            const url = renderer.domElement.toDataURL();
            setImageSrc(url);

            // Cleanup Scene
            scene.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m: any) => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if ((obj.material as any).map) (obj.material as any).map.dispose();
                        obj.material.dispose();
                    }
                }
            });
            renderer.clear(); // Clear for next use
            return;
        }

        // --- DYNAMIC MODE ---
        // Only if NOT static (rare cases). We create a dedicated renderer here.
        // We could use shared renderer with requestAnimationFrame but it complicates multiple dynamic views.
        // Assuming dynamic views are FEW (1-2), explicit renderer is fine.

        if (!containerRef.current) return;

        const { scene, camera, model } = setupScene();
        sceneRef.current = scene;
        cameraRef.current = camera;
        modelRef.current = model || null; // Fix TS

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);

            if (modelRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
                const m = modelRef.current;
                if (isHovered) {
                    m.rotation.y += rotationSpeed;
                } else {
                    const target = Math.PI / 8;
                    m.rotation.y += (target - m.rotation.y) * 0.1;
                }
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
            renderer.dispose();
            if (containerRef.current) containerRef.current.innerHTML = '';

            scene.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m: any) => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if ((obj.material as any).map) (obj.material as any).map.dispose();
                        obj.material.dispose();
                    }
                }
            });
        };

    }, [type, id, width, height, isStatic, seed, isHovered]); // Added isHovered dep for dynamic

    if (isStatic) {
        if (imageSrc) {
            return (
                <img
                    src={imageSrc}
                    width={width}
                    height={height}
                    className="object-contain pointer-events-none"
                    alt={id}
                />
            );
        }
        return <div style={{ width, height }} className="bg-transparent" />; // Placeholder
    }

    return (
        <div
            ref={containerRef}
            style={{ width, height }}
            className="pointer-events-none"
        />
    );
}
