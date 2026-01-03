import * as THREE from 'three';

export function createHubModel(): THREE.Object3D {
    const group = new THREE.Group();

    // -- Materials --
    const wallColor = 0x8B4513; // Rusty Brown
    const roofColor = 0x555555; // Dark Grey
    const solarColor = 0x0044aa; // Solar Blue
    const metalColor = 0x444444; // Dark Metal
    const glowColor = 0xFFA500; // Orange Glow

    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
    const solarMat = new THREE.MeshLambertMaterial({ color: solarColor, emissive: 0x001133 });
    const metalMat = new THREE.MeshLambertMaterial({ color: metalColor });
    const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });

    // -- Geometry Helper -- 
    // Origin (0,0,0) corresponds to the center of the Top-Left tile (x,y).
    // The building covers (x,y), (x+1,y), (x,y+1), (x+1,y+1).
    // The Visual Center of the 2x2 area is at local (0.5, 0, 0.5).
    const centerX = 0.5;
    const centerZ = 0.5;

    // 1. Base Slab (Concrete/Metal Foundation) - Covers 2x2
    const baseGeo = new THREE.BoxGeometry(1.9, 0.2, 1.9);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.set(centerX, 0.1, centerZ);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Main Structure (L-Shape or Industrial Block)
    // Main Block
    const mainGeo = new THREE.BoxGeometry(1.8, 1.2, 1.2);
    const mainBldg = new THREE.Mesh(mainGeo, wallMat);
    mainBldg.position.set(centerX, 0.7, centerZ - 0.3); // Set back a bit
    mainBldg.castShadow = true;
    mainBldg.receiveShadow = true;
    group.add(mainBldg);

    // Side Wing
    const wingGeo = new THREE.BoxGeometry(0.8, 1.0, 0.6);
    const wing = new THREE.Mesh(wingGeo, wallMat);
    wing.position.set(centerX - 0.4, 0.6, centerZ + 0.5); // stick out forward left
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);

    // 3. Roofs with Solar Panels
    // Main Roof (Slanted)
    const roofGeo = new THREE.BoxGeometry(1.9, 0.1, 1.3);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(centerX, 1.35, centerZ - 0.3);
    roof.rotation.x = -0.1; // Slight slant
    group.add(roof);

    // Solar Panel on Main Roof
    const panelGeo = new THREE.BoxGeometry(1.7, 0.05, 1.0);
    const panel = new THREE.Mesh(panelGeo, solarMat);
    panel.position.set(centerX, 1.41, centerZ - 0.3);
    panel.rotation.x = -0.1;
    group.add(panel);

    // 4. Industrial Details (Chimneys, Vents)
    // Chimney
    const chimneyGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
    const chimney = new THREE.Mesh(chimneyGeo, metalMat);
    chimney.position.set(centerX + 0.7, 1.0, centerZ - 0.7);
    chimney.castShadow = true;
    group.add(chimney);

    // Vent Fan (Box representation)
    const ventGeo = new THREE.BoxGeometry(0.4, 0.4, 0.2);
    const vent = new THREE.Mesh(ventGeo, metalMat);
    vent.position.set(centerX - 0.6, 0.8, centerZ + 0.8); // Front left wing face
    group.add(vent);

    // Glowing Entrance / Sign
    const signGeo = new THREE.BoxGeometry(0.5, 0.3, 0.05);
    const sign = new THREE.Mesh(signGeo, glowMat);
    sign.position.set(centerX, 0.9, centerZ + 0.31); // Entrance area
    group.add(sign);

    return group;
}
