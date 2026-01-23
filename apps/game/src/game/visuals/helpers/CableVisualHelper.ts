import * as THREE from "three";
import { BuildingEntity } from "../../entities/BuildingEntity";

// Cached resources
let cableTexture: THREE.CanvasTexture | null = null;
let cableMaterial: THREE.MeshLambertMaterial | null = null;

export function getCableTexture(): THREE.CanvasTexture {
  if (cableTexture) return cableTexture;

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
  tex.colorSpace = THREE.SRGBColorSpace;

  cableTexture = tex;
  return cableTexture;
}

export function getCableMaterial(): THREE.MeshLambertMaterial {
  if (cableMaterial) return cableMaterial;

  cableMaterial = new THREE.MeshLambertMaterial({
    map: getCableTexture(),
    color: 0xffffff,
  });
  return cableMaterial;
}

export function getCableAttachmentPoint(
  b: BuildingEntity | undefined,
  tileX: number,
  tileY: number,
): THREE.Vector3 {
  // If no building, center on tile center
  // Default legacy behavior: tile center at y=0.5
  if (!b) return new THREE.Vector3(tileX, 0.5, tileY);

  // 1. Calculate Logical Center (same as GameApp / PlacementVisuals)
  const isRotated = b.direction === "east" || b.direction === "west";
  const finalWidth = isRotated ? b.height : b.width;
  const finalHeight = isRotated ? b.width : b.height;

  // Center in world coordinates
  const centerX = b.x + (finalWidth - 1) / 2;
  const centerZ = b.y + (finalHeight - 1) / 2;

  const localX = 0;
  let localY = 0.5;
  const localZ = 0;

  if (b.getType() === "hub") {
    // Hub's pole is at its center, high up
    localY = 2.5;
  } else {
    // Standard connection points
    if (b.getType() === "electric_pole") localY = 1.8;
    else if (b.getType() === "extractor") localY = 1.5;
  }

  // 2. Apply Rotation relative to center
  // (For Hub/Poles where localX=localZ=0, this is a no-op, which is correct as they rotate in-place)
  let theta = 0;
  if (b.direction === "east") theta = -Math.PI / 2;
  else if (b.direction === "west") theta = Math.PI / 2;
  else if (b.direction === "south") theta = Math.PI;

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Rotate offset (typically (0,0,0) for poles, but useful if we add side connectors later)
  const worldX = centerX + localX * cos - localZ * sin;
  const worldZ = centerZ + localX * sin + localZ * cos;

  return new THREE.Vector3(worldX, localY, worldZ);
}

export function generateCatenaryCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 20,
): THREE.CatmullRomCurve3 {
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
  return new THREE.CatmullRomCurve3(points);
}
