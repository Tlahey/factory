import * as THREE from 'three';

export function createElectricPoleModel(): THREE.Group {
    const group = new THREE.Group();

    // 1. Main Pole (Wood)
    const poleHeight = 2.5;
    const poleRadius = 0.12;
    const poleGeo = new THREE.CylinderGeometry(poleRadius * 0.8, poleRadius, poleHeight, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 }); // Dark Wood
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.y = poleHeight / 2;
    poleMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    group.add(poleMesh);

    // 2. Insulators (White Ceramic Hooks on side)
    const insulatorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
    
    // Start height for insulators
    const startY = poleHeight * 0.85;

    const addInsulator = (y: number, angle: number) => {
        const insGroup = new THREE.Group();
        
        // Horizontal peg
        const pegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15);
        const peg = new THREE.Mesh(pegGeo, metalMat);
        peg.rotation.z = Math.PI / 2;
        peg.position.x = 0.075 + poleRadius * 0.9; 
        insGroup.add(peg);

        // Vertical ceramic part
        const cerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1);
        const cer = new THREE.Mesh(cerGeo, insulatorMat);
        cer.position.x = 0.15 + poleRadius * 0.9;
        insGroup.add(cer);
        
        insGroup.position.y = y;
        insGroup.rotation.y = angle;
        group.add(insGroup);
    };

    // Add 3 insulators on Left (-X via rotation PI)
    // And maybe mirrored? No, typical poles have them on one side or crossarm.
    // Let's keep them on one side as per ref, but now no lamp on the other side.
    addInsulator(startY + 0.1, Math.PI);
    addInsulator(startY - 0.15, Math.PI);
    addInsulator(startY - 0.4, Math.PI);

    // Add a simple cap?
    const capGeo = new THREE.ConeGeometry(poleRadius * 0.8, 0.1, 8);
    const capMesh = new THREE.Mesh(capGeo, poleMat);
    capMesh.position.y = poleHeight + 0.05;
    group.add(capMesh);

    return group;
}
