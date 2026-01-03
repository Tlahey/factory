
import * as THREE from 'three';

export class CableVisual {
    public mesh: THREE.LineSegments;
    
    constructor(scene: THREE.Scene, world: any) { // world: World
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });
        this.mesh = new THREE.LineSegments(geometry, material);
        // Raise slighty above ground
        this.mesh.position.y = 0.5; 
        scene.add(this.mesh);
        
        this.update(world);
    }

    public update(world: any) {
        // Rebuild geometry from world.cables
        if (!world.cables) return;

        const points: number[] = [];
        const heightOffset = 1.0; // Connect at height

        world.cables.forEach((c: any) => {
            const b1 = world.getBuilding(c.x1, c.y1);
            const b2 = world.getBuilding(c.x2, c.y2);
            
            const h1 = b1 ? (b1.getType() === 'hub' ? 1.0 : (b1.getType() === 'electric_pole' ? 1.8 : 0.5)) : 0.5;
            const h2 = b2 ? (b2.getType() === 'hub' ? 1.0 : (b2.getType() === 'electric_pole' ? 1.8 : 0.5)) : 0.5;

            points.push(c.x1, h1, c.y1);
            points.push(c.x2, h2, c.y2);
        });

        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.mesh.geometry.computeBoundingSphere(); // Important for frustration culling
    }

    public dispose(scene: THREE.Scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }

    public clear() {
        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    }
}
