import * as THREE from 'three';

export function createConveyorModel(type: 'straight' | 'left' | 'right', texture: THREE.Texture): THREE.Group {
    const group = new THREE.Group();

    // Materials
    const beltMaterial = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 }); // Dark metal frame
    const railMaterial = new THREE.MeshLambertMaterial({ color: 0xffaa00 }); // Yellow safety rails

    // Dimensions (Reduced to approx 50% width - Total width ~0.5)
    const BELT_WIDTH = 0.35;
    const BELT_THICKNESS = 0.1;
    const RAIL_WIDTH = 0.05;
    const RAIL_HEIGHT = 0.12;
    const FRAME_OFFSET = 0.22; // Distance from center to rail center

    if (type === 'straight') {
        // 1. Belt
        const beltGeo = new THREE.BoxGeometry(BELT_WIDTH, BELT_THICKNESS, 1);
        const beltMesh = new THREE.Mesh(beltGeo, beltMaterial);
        beltMesh.position.y = 0.06; // Align top surface to 0.11 (0.06 + 0.05)
        beltMesh.name = 'belt';
        beltMesh.castShadow = true;
        beltMesh.receiveShadow = true;
        group.add(beltMesh);

        // 2. Rails
        const leftRail = new THREE.Mesh(
            new THREE.BoxGeometry(RAIL_WIDTH, RAIL_HEIGHT, 1), 
            railMaterial
        );
        leftRail.position.set(-FRAME_OFFSET, 0.05, 0); // Slightly raised
        leftRail.castShadow = true;
        leftRail.receiveShadow = true;
        group.add(leftRail);

        const rightRail = new THREE.Mesh(
            new THREE.BoxGeometry(RAIL_WIDTH, RAIL_HEIGHT, 1), 
            railMaterial
        );
        rightRail.position.set(FRAME_OFFSET, 0.05, 0);
        rightRail.castShadow = true;
        rightRail.receiveShadow = true;
        group.add(rightRail);

        // 3. Rollers support (visual underneath)
        const bed = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 1), // Thicker to penetrate ground (-0.05 to 0.05)
            frameMaterial
        );
        bed.position.y = 0; // Centered at 0, so extends -0.05 to 0.05
        group.add(bed);

    } else {
        // CURVE (Default Left Turn geometry, GameApp mirrors for Right)
        
        // 1. Belt Logic: Custom BufferGeometry for precise UVs
        const beltGeo = new THREE.BufferGeometry();
        const beltVertices: number[] = [];
        const beltUVs: number[] = [];
        const beltIndices: number[] = [];
        const segments = 12;
        
        const center = new THREE.Vector3(-0.5, 0, 0.5); 
        const radius = 0.5;
        const width = BELT_WIDTH;
        const halfWidth = width / 2;
        
        // Arc definition (Quarter circle 0 to -PI/2)
        const startAngle = 0;
        const endAngle = -Math.PI / 2;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = startAngle + (endAngle - startAngle) * t;
            
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Radii for Inner and Outer edges of the belt ribbon
            const rInner = radius - halfWidth;
            const rOuter = radius + halfWidth;
            
            // Inner Vertex
            const ix = center.x + rInner * cos;
            const iz = center.z + rInner * sin;
            
            // Outer Vertex
            const ox = center.x + rOuter * cos;
            const oz = center.z + rOuter * sin;
            
            // Height Y (Sit slightly above bed/rails foundation)
            const y = 0.11; // Raised to avoid z-fighting
            
            beltVertices.push(ix, y, iz);
            beltVertices.push(ox, y, oz);
            
            // UV Mapping
            // U: Across width (0=Inner, 1=Outer)
            // V: Along length (proportional to t). 
            // Repeat texture 1 time along the curve (roughly matches length of 0.785 vs 1.0)
            beltUVs.push(0, t * 1); 
            beltUVs.push(1, t * 1); 
            
            if (i < segments) {
                const base = i * 2;
                // CCW Winding for Upward Normal
                // 0(Inner), 1(Outer), 2(NextInner), 3(NextOuter).
                beltIndices.push(base, base + 1, base + 2); 
                beltIndices.push(base + 1, base + 3, base + 2);
            }
        }
        
        beltGeo.setAttribute('position', new THREE.Float32BufferAttribute(beltVertices, 3));
        beltGeo.setAttribute('uv', new THREE.Float32BufferAttribute(beltUVs, 2));
        beltGeo.setIndex(beltIndices);
        beltGeo.computeVertexNormals();

        const beltMesh = new THREE.Mesh(beltGeo, beltMaterial);
        beltMesh.name = 'belt';
        beltMesh.receiveShadow = true;
        // Shadow casting for single-plane might be glitchy (shadow acne), but we try.
        beltMesh.castShadow = true;
        group.add(beltMesh);

        // 2. Rails Checks (Rotated)
        const createRail = (radius: number) => {
             const railArc = new THREE.EllipseCurve(-0.5, 0.5, radius, radius, 0, -Math.PI/2, true, 0);
             const rPoints = railArc.getPoints(12).map(p => new THREE.Vector3(p.x, 0, p.y));
             const rPath = new THREE.CatmullRomCurve3(rPoints);
             
             // Swap Width/Height
             const rShape = new THREE.Shape();
             rShape.moveTo(-RAIL_HEIGHT/2, -RAIL_WIDTH/2);
             rShape.lineTo(RAIL_HEIGHT/2, -RAIL_WIDTH/2);
             rShape.lineTo(RAIL_HEIGHT/2, RAIL_WIDTH/2);
             rShape.lineTo(-RAIL_HEIGHT/2, RAIL_WIDTH/2);
             
             return new THREE.Mesh(
                 new THREE.ExtrudeGeometry(rShape, { steps: 12, bevelEnabled: false, extrudePath: rPath }),
                 railMaterial
             );
        };

        const innerRail = createRail(0.5 - FRAME_OFFSET);
        innerRail.position.y = 0.05; 
        group.add(innerRail);

        const outerRail = createRail(0.5 + FRAME_OFFSET);
        outerRail.position.y = 0.05;
        group.add(outerRail);
        
        // 3. Bed (Rotated)
         const bedArc = new THREE.EllipseCurve(-0.5, 0.5, 0.5, 0.5, 0, -Math.PI/2, true, 0);
         const bPath = new THREE.CatmullRomCurve3(bedArc.getPoints(12).map(p => new THREE.Vector3(p.x, 0, p.y)));
         const bedShape = new THREE.Shape();
         // Original: (-0.45, -0.05) to (0.45, 0.02).
         // Rotated (x->y, y->x): Y is Width (-0.45 to 0.45). X is Height/Vertical.
         // New Width: 0.5 -> +/- 0.25 (Width) | Vert: -0.05 to 0.05
         bedShape.moveTo(-0.05, -0.25);
         bedShape.lineTo(-0.05, 0.25);
         bedShape.lineTo(0.05, 0.25);
         bedShape.lineTo(0.05, -0.25);
         
         const bedMesh = new THREE.Mesh(
             new THREE.ExtrudeGeometry(bedShape, { steps: 12, bevelEnabled: false, extrudePath: bPath }),
             frameMaterial
         );
         bedMesh.position.y = 0; // Shape handles height
         group.add(bedMesh);
    }

    group.userData.conveyorType = type;
    return group;
}
