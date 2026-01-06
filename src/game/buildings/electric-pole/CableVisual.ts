
import * as THREE from 'three';
import { IWorld } from '../../entities/types';
import { BuildingEntity } from '../../entities/BuildingEntity';

export class CableVisual {
    public group: THREE.Group;
    public previewMesh: THREE.Mesh;
    private texture: THREE.CanvasTexture;
    private material: THREE.MeshLambertMaterial;

    constructor(scene: THREE.Scene, world: IWorld) { 
        this.group = new THREE.Group();
        scene.add(this.group);

        // Generate Striped Texture "Strides"
        this.texture = this.createCableTexture();
        this.material = new THREE.MeshLambertMaterial({ 
            map: this.texture,
            color: 0xffffff,
        });

        // Preview Mesh (Initial dummy geometry)
        // We will update geometry on the fly
        this.previewMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material.clone());
        this.previewMesh.visible = false;
        scene.add(this.previewMesh);
        
        this.update(world);
    }

    private createCableTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        
        // Background Yellow/Orange
        ctx.fillStyle = '#ffaa00'; 
        ctx.fillRect(0, 0, 64, 64);
        
        // Black Stripes
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        // Diagonal stripes
        ctx.moveTo(0, 0); ctx.lineTo(32, 0); ctx.lineTo(0, 32); ctx.fill();
        ctx.moveTo(32, 64); ctx.lineTo(64, 64); ctx.lineTo(64, 32); ctx.fill();
        ctx.moveTo(0, 64); ctx.lineTo(32, 64); ctx.lineTo(64, 32); ctx.lineTo(64, 0); ctx.lineTo(32, 0); ctx.lineTo(0, 32); ctx.fill(); 
        
        // Actually simpler diagonal
        // Let's do horizontal bands for tube mapping? 
        // Tube UVs wrap around U, and V is along length. 
        // So stripes along V (length)? No, we want rings. Rings are along U?
        // Usually Tube UV: x (u) is around circumference, y (v) is length.
        // So we want stripes on V. 
        // Keep the diagonal texture, it looks cool spiraling.

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }

    public update(world: IWorld) {
        // Clear old meshes
        while(this.group.children.length > 0){ 
            const child = this.group.children[0] as THREE.Mesh;
            child.geometry.dispose(); // Dispose geometry
            this.group.remove(child);
        }

        if (!world.cables) return;

        world.cables.forEach((c: {x1: number, y1: number, x2: number, y2: number}) => {
            const b1 = world.getBuilding(c.x1, c.y1);
            const b2 = world.getBuilding(c.x2, c.y2);
            
            const h1 = this.getHeightForBuilding(b1);
            const h2 = this.getHeightForBuilding(b2);

            const start = new THREE.Vector3(c.x1, h1, c.y1);
            const end = new THREE.Vector3(c.x2, h2, c.y2);

            const mesh = this.createCableMesh(start, end);
            this.group.add(mesh);
        });
    }

    private getHeightForBuilding(b: BuildingEntity | undefined): number {
        if (!b) return 0.5;
        if (b.getType() === 'hub') return 1.0;
        if (b.getType() === 'electric_pole') return 1.8;
        if (b.getType() === 'extractor') return 1.5; // Connect higher on extractor?
        return 0.5;
    }

    private createCableMesh(start: THREE.Vector3, end: THREE.Vector3, color: number = 0xffffff): THREE.Mesh {
        const points = this.generateCatenaryPoints(start, end, 10);
        const curve = new THREE.CatmullRomCurve3(points);
        
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.05, 6, false);
        const mat = this.material.clone();
        mat.color.setHex(color);
        
        // Scale texture repeat based on length
        const dist = start.distanceTo(end);
        mat.map = this.texture.clone(); // Clone texture so we can change repeat per instance? 
        // Actually cloning texture object is cheap (shares image). 
        // But refreshing Repeat might need unique texture instance or just update matrix.
        // Better: Update texture matrix? No, map.repeat is property of Texture instance.
        mat.map.repeat.set(1, dist * 2); 
        mat.map.needsUpdate = true;

        const mesh = new THREE.Mesh(tubeGeo, mat);
        return mesh;
    }

    private generateCatenaryPoints(start: THREE.Vector3, end: THREE.Vector3, segments: number): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const dist = start.distanceTo(end);
        // Sag amount increases with distance
        const sag = Math.min(1.5, dist * 0.15); 

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = THREE.MathUtils.lerp(start.x, end.x, t);
            const z = THREE.MathUtils.lerp(start.z, end.z, t);
            
            // Linear height
            let y = THREE.MathUtils.lerp(start.y, end.y, t);
            
            // Apply parabola/catenary sag
            // 4 * t * (1-t) is standard parabola 0->1->0
            y -= sag * 4 * t * (1 - t);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    public dispose(scene: THREE.Scene) {
        scene.remove(this.group);
        scene.remove(this.previewMesh);
        
        this.group.traverse((c) => {
            if (c instanceof THREE.Mesh) {
                c.geometry.dispose();
                // Material handled via shared or cloned
                if (Array.isArray(c.material)) (c.material as THREE.Material[]).forEach(m => m.dispose());
                else (c.material as THREE.Material).dispose();
            }
        });
        this.texture.dispose();
    }

    public clear() {
         while(this.group.children.length > 0){ 
            const child = this.group.children[0] as THREE.Mesh;
            child.geometry.dispose();
            this.group.remove(child);
        }
    }

    public showPreview(start: {x: number, y: number}, end: {x: number, y: number}, isValid: boolean, world: IWorld) {
        this.previewMesh.visible = true;
        
        const b1 = world.getBuilding(start.x, start.y);
        const b2 = world.getBuilding(end.x, end.y);
        
        const h1 = this.getHeightForBuilding(b1);
        const h2 = this.getHeightForBuilding(b2);

        const vStart = new THREE.Vector3(start.x, h1, start.y);
        const vEnd = new THREE.Vector3(end.x, h2, end.y);

        // Update geometry
        if (this.previewMesh.geometry) this.previewMesh.geometry.dispose();
        
        const points = this.generateCatenaryPoints(vStart, vEnd, 10);
        const curve = new THREE.CatmullRomCurve3(points);
        this.previewMesh.geometry = new THREE.TubeGeometry(curve, 16, 0.05, 6, false);
        
        // Update Color
        const mat = this.previewMesh.material as THREE.MeshLambertMaterial;
        mat.color.setHex(isValid ? 0xffffff : 0xff0000);
        mat.emissive.setHex(isValid ? 0x222222 : 0x550000); // Glow slightly

        // Update Texture Repeat
        const dist = vStart.distanceTo(vEnd);
        mat.map!.repeat.set(1, dist * 2);
    }

    public hidePreview() {
        this.previewMesh.visible = false;
    }

    public highlightCable(cable: {x1: number, y1: number, x2: number, y2: number} | null, world: IWorld) {
        if (!cable) {
            this.hidePreview();
            return;
        }

        // Use preview mesh to highlight, OR create a highlight state for the group mesh?
        // Using preview mesh is easiest as it overlays.
        this.showPreview({x: cable.x1, y: cable.y1}, {x: cable.x2, y: cable.y2}, true, world);
        
        // Make it pulsate or distinct color?
        const mat = this.previewMesh.material as THREE.MeshLambertMaterial;
        mat.emissive.setHex(0xaaaaaa); // Bright glow
    }
}
