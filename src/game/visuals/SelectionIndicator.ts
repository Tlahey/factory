import * as THREE from 'three';

export class SelectionIndicator {
    private scene: THREE.Scene;
    private mesh: THREE.Group;
    private ring: THREE.Mesh;
    private ring2: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        // Pulsing Ring 1
        const geo = new THREE.TorusGeometry(0.7, 0.03, 16, 32);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.6,
            depthTest: false // Always show on top of floor
        });
        this.ring = new THREE.Mesh(geo, mat);
        this.ring.rotation.x = Math.PI / 2;
        this.mesh.add(this.ring);

        // Outer Ring 2
        const geo2 = new THREE.TorusGeometry(0.85, 0.015, 16, 32);
        const mat2 = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.3,
            depthTest: false
        });
        this.ring2 = new THREE.Mesh(geo2, mat2);
        this.ring2.rotation.x = Math.PI / 2;
        this.mesh.add(this.ring2);

        this.mesh.visible = false;
        this.scene.add(this.mesh);
    }

    public update(x: number | null, y: number | null, width: number = 1, height: number = 1) {
        if (x === null || y === null) {
            this.mesh.visible = false;
            return;
        }

        this.mesh.visible = true;
        // Center the indicator based on dimensions
        // Tile (x,y) center is at (x, 0, y).
        // For width 2, we want center at x + 0.5.
        // Formula: x + (width - 1) / 2
        this.mesh.position.set(x + (width - 1) / 2, 0.05, y + (height - 1) / 2);

        // Scale the ring to fit
        // Original radius 0.7 covers ~1.4 units. Slightly larger than 1.
        // simple scaling:
        this.mesh.scale.set(width, 1, height);

        const time = performance.now() / 1000;
        
        // Pulse effect
        // Apply pulse to rings (local scale), distinct from mesh scale
        const s1 = 1.0 + Math.sin(time * 5) * 0.1;
        this.ring.scale.set(s1, s1, 1);
        (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 5) * 0.2;

        const s2 = 1.0 + Math.cos(time * 3) * 0.05;
        this.ring2.scale.set(s2, s2, 1);
        
        // Slight rotation for detail
        this.mesh.rotation.y += 0.02;
    }

    public dispose() {
        this.scene.remove(this.mesh);
        this.ring.geometry.dispose();
        (this.ring.material as THREE.Material).dispose();
        this.ring2.geometry.dispose();
        (this.ring2.material as THREE.Material).dispose();
    }
}
