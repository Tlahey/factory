import * as THREE from 'three';

/**
 * Creates a complex 3D model for the extractor.
 * Inspired by industrial drill rigs: Taller, with a mast and a functional drill assembly.
 */
export function createExtractorModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'extractor';

    const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x505050 });
    const yellowMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc00 }); // Industrial yellow
    const drillMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

    // 1. Base Structure (Legs)
    const legGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(legGeo, metalMaterial);
        const angle = (i * Math.PI * 2) / 3;
        const radius = 0.4;
        
        leg.position.x = Math.cos(angle) * (radius - 0.1);
        leg.position.z = Math.sin(angle) * (radius - 0.1);
        leg.position.y = 0.25;
        
        leg.rotation.z = Math.cos(angle) * 0.4;
        leg.rotation.x = -Math.sin(angle) * 0.4;
        
        leg.castShadow = true;
        leg.receiveShadow = true;
        group.add(leg);
    }

    // 2. Main Body / Platform
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
    const body = new THREE.Mesh(bodyGeo, yellowMaterial);
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. The Mast (Taller)
    const mastGeo = new THREE.BoxGeometry(0.15, 1.8, 0.15);
    const mast = new THREE.Mesh(mastGeo, metalMaterial);
    mast.position.y = 0.55 + 0.9;
    mast.castShadow = true;
    mast.receiveShadow = true;
    group.add(mast);

    // 4. Drill Assembly (Slides up and down)
    const slideGroup = new THREE.Group();
    slideGroup.name = 'drill_container';
    slideGroup.position.y = 1.0; // Start middle-ish

    // Motor / Connector
    const motorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
    const motor = new THREE.Mesh(motorGeo, yellowMaterial);
    slideGroup.add(motor);

    // The actual drill bit
    const drillGeo = new THREE.CylinderGeometry(0.05, 0.1, 1.2, 8);
    const drillMesh = new THREE.Mesh(drillGeo, drillMaterial);
    drillMesh.name = 'drill_mesh';
    drillMesh.position.y = -0.6; // Extend downwards from motor
    drillMesh.castShadow = true;
    drillMesh.receiveShadow = true;
    
    // Low poly cone at the tip
    const tipGeo = new THREE.ConeGeometry(0.1, 0.2, 8);
    const tip = new THREE.Mesh(tipGeo, drillMaterial);
    tip.position.y = -0.6; // Relative to drillMesh
    drillMesh.add(tip);

    slideGroup.position.x = 0.2; // Offset from mast
    slideGroup.add(drillMesh);
    group.add(slideGroup);

    // 5. Output Direction Indicator (Arrow pointing forward)
    // This shows where the conveyor should be placed
    const arrowGroup = new THREE.Group();
    arrowGroup.name = 'output_indicator';
    
    // Arrow shaft (smaller and higher)
    const shaftGeo = new THREE.BoxGeometry(0.1, 0.04, 0.3);
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,  // Orange/yellow for visibility
        transparent: true,
        opacity: 0.95
    });
    const shaft = new THREE.Mesh(shaftGeo, arrowMaterial);
    shaft.position.z = -0.35; // Point forward (negative Z in local space)
    shaft.position.y = 0.3; // Raised higher above ground
    arrowGroup.add(shaft);
    
    // Arrow head (triangle) - smaller
    const headGeo = new THREE.ConeGeometry(0.12, 0.2, 3);
    const head = new THREE.Mesh(headGeo, arrowMaterial);
    head.position.z = -0.55; // At tip of shaft
    head.position.y = 0.3; // Same height as shaft
    head.rotation.x = -Math.PI / 2; // Point forward (negative rotation)
    arrowGroup.add(head);
    
    // Position arrow at base level
    arrowGroup.position.y = 0.2;
    group.add(arrowGroup);

    return group;
}
