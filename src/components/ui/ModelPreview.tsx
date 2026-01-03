'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createExtractorModel } from '@/game/buildings/extractor/ExtractorModel';
import { createConveyorModel } from '@/game/buildings/conveyor/ConveyorGeometry';
import { createChestModel } from '@/game/buildings/chest/ChestModel';
import { createConveyorTexture } from '@/game/buildings/conveyor/ConveyorTexture';
import { createItemRockModel, updateRockVisuals } from '@/game/environment/rock/RockModel';

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
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(2, 2, 2);
        camera.lookAt(0, 0.4, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

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
            } else if (id === 'chest') {
                model = createChestModel();
                model.scale.set(1.3, 1.3, 1.3);
                model.position.y = -0.4;
            }
        } else if (type === 'item') {
            if (id === 'stone') {
                model = createItemRockModel();
                updateRockVisuals(model as THREE.Group, seed || 42);
                model.scale.set(4, 4, 4); // Items are smaller in world, scale up for preview
                model.position.y = 0;
            }
        }

        if (model) {
            model.rotation.y = Math.PI / 8;
            scene.add(model);
            modelRef.current = model;
        }

        const animate = () => {
            if (!isStatic) {
                frameIdRef.current = requestAnimationFrame(animate);
            }

            if (modelRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
                const model = modelRef.current;

                if (isHovered && !isStatic) {
                    model.rotation.y += rotationSpeed;
                } else if (!isStatic) {
                    const target = Math.PI / 8;
                    model.rotation.y += (target - model.rotation.y) * 0.1;
                }

                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }

            if (isStatic) {
                // Render once if static
                rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
            }
        };

        if (isStatic) {
            animate();
        } else {
            animate();
        }

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
            renderer.dispose();
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [type, id, width, height, isStatic, seed]);

    // Handle hover change without re-creating scene
    useEffect(() => {
        if (isStatic) return;
        // The rotation logic is in the animate loop which checks isHovered
    }, [isHovered, isStatic]);

    return (
        <div
            ref={containerRef}
            style={{ width, height }}
            className="pointer-events-none"
        />
    );
}
