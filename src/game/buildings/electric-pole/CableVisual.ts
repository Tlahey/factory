import * as THREE from "three";
import { IWorld } from "../../entities/types";
import { BuildingEntity } from "../../entities/BuildingEntity";

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
    this.previewMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      this.material.clone(),
    );
    this.previewMesh.visible = false;
    scene.add(this.previewMesh);

    this.update(world);
  }

  private createCableTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Background Yellow/Orange
    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(0, 0, 64, 64);

    // Black Stripes
    ctx.fillStyle = "#222222";
    ctx.beginPath();
    // Diagonal stripes
    ctx.moveTo(0, 0);
    ctx.lineTo(32, 0);
    ctx.lineTo(0, 32);
    ctx.fill();
    ctx.moveTo(32, 64);
    ctx.lineTo(64, 64);
    ctx.lineTo(64, 32);
    ctx.fill();
    ctx.moveTo(0, 64);
    ctx.lineTo(32, 64);
    ctx.lineTo(64, 32);
    ctx.lineTo(64, 0);
    ctx.lineTo(32, 0);
    ctx.lineTo(0, 32);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  public update(world: IWorld) {
    // Clear old meshes
    while (this.group.children.length > 0) {
      const child = this.group.children[0] as THREE.Mesh;
      child.geometry.dispose(); // Dispose geometry
      this.group.remove(child);
    }

    if (!world.cables) return;

    world.cables.forEach(
      (c: { x1: number; y1: number; x2: number; y2: number }) => {
        const b1 = world.getBuilding(c.x1, c.y1);
        const b2 = world.getBuilding(c.x2, c.y2);

        const start = getCableAttachmentPoint(b1, c.x1, c.y1);
        const end = getCableAttachmentPoint(b2, c.x2, c.y2);

        const mesh = this.createCableMesh(start, end);
        this.group.add(mesh);
      },
    );
  }

  private createCableMesh(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xffffff,
  ): THREE.Mesh {
    const points = this.generateCatenaryPoints(start, end, 10);
    const curve = new THREE.CatmullRomCurve3(points);

    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.05, 6, false);
    const mat = this.material.clone();
    mat.color.setHex(color);

    // Scale texture repeat based on length
    const dist = start.distanceTo(end);
    mat.map = this.texture.clone();
    mat.map.repeat.set(1, dist * 2);
    mat.map.needsUpdate = true;

    const mesh = new THREE.Mesh(tubeGeo, mat);
    return mesh;
  }

  private generateCatenaryPoints(
    start: THREE.Vector3,
    end: THREE.Vector3,
    segments: number,
  ): THREE.Vector3[] {
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
        if (Array.isArray(c.material))
          (c.material as THREE.Material[]).forEach((m) => m.dispose());
        else (c.material as THREE.Material).dispose();
      }
    });
    this.texture.dispose();
  }

  public clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0] as THREE.Mesh;
      child.geometry.dispose();
      this.group.remove(child);
    }
  }

  public showPreview(
    start: { x: number; y: number },
    end: { x: number; y: number },
    isValid: boolean,
    world: IWorld,
  ) {
    this.previewMesh.visible = true;

    const b1 = world.getBuilding(start.x, start.y);
    const b2 = world.getBuilding(end.x, end.y);

    const vStart = getCableAttachmentPoint(b1, start.x, start.y);
    const vEnd = getCableAttachmentPoint(b2, end.x, end.y);

    // Update geometry
    if (this.previewMesh.geometry) this.previewMesh.geometry.dispose();

    const points = this.generateCatenaryPoints(vStart, vEnd, 10);
    const curve = new THREE.CatmullRomCurve3(points);
    this.previewMesh.geometry = new THREE.TubeGeometry(
      curve,
      16,
      0.05,
      6,
      false,
    );

    // Update Color
    const mat = this.previewMesh.material as THREE.MeshLambertMaterial;
    mat.color.setHex(isValid ? 0xffffff : 0xff0000);
    mat.emissive.setHex(isValid ? 0x222222 : 0x550000);

    // Update Texture Repeat
    const dist = vStart.distanceTo(vEnd);
    mat.map!.repeat.set(1, dist * 2);
  }

  public hidePreview() {
    this.previewMesh.visible = false;
  }

  public highlightCable(
    cable: { x1: number; y1: number; x2: number; y2: number } | null,
    world: IWorld,
  ) {
    if (!cable) {
      this.hidePreview();
      return;
    }
    this.showPreview(
      { x: cable.x1, y: cable.y1 },
      { x: cable.x2, y: cable.y2 },
      true,
      world,
    );
    const mat = this.previewMesh.material as THREE.MeshLambertMaterial;
    mat.emissive.setHex(0xaaaaaa);
  }
}

export function getCableAttachmentPoint(
  b: BuildingEntity | undefined,
  tileX: number,
  tileY: number,
): THREE.Vector3 {
  // If no building, center on tile center
  if (!b) return new THREE.Vector3(tileX, 0.5, tileY);

  let localX = 0;
  let localY = 0.5;
  let localZ = 0;

  if (b.getType() === "hub") {
    // Hub is 2x2. Pole is at center of the 2x2 block footprint.
    // Relative to the top-left tile center (b.x, b.y), the center is at (0.5, 0.5).
    localX = 0.5;
    localY = 2.5;
    localZ = 0.5;
  } else {
    // Standard 1x1 buildings are centered on their tile
    if (b.getType() === "electric_pole") localY = 1.8;
    else if (b.getType() === "extractor") localY = 1.5;
  }

  // Apply Rotation around b.x, b.y (pivot used in GameApp)
  let theta = 0;
  if (b.direction === "east") theta = -Math.PI / 2;
  else if (b.direction === "west") theta = Math.PI / 2;
  else if (b.direction === "south") theta = Math.PI;

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const worldX = b.x + localX * cos - localZ * sin;
  const worldZ = b.y + localX * sin + localZ * cos;

  return new THREE.Vector3(worldX, localY, worldZ);
}
