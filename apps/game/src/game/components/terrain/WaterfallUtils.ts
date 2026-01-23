import * as THREE from "three";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../../constants";

/**
 * Creates curved waterfall geometry
 * Legacy implementation from GameApp.ts (Correct "Convex" waterfall profile)
 */
export function createCurvedWaterfallGeometry(
  width: number,
  totalHeight: number,
  curveDepth: number,
  segments: number = 12,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const curveSegments = Math.floor(segments / 2);
  const straightSegments = segments - curveSegments;
  const straightHeight = totalHeight - curveDepth;

  // Generate vertices along the curve and straight section
  const points: { y: number; z: number }[] = [];

  // Curved section (using sine curve for smooth transition)
  // Starts HORIZONTAL at top, then curves down to VERTICAL
  for (let i = 0; i <= curveSegments; i++) {
    const t = i / curveSegments; // 0 to 1
    const angle = t * (Math.PI / 2); // 0 to 90 degrees
    const z = Math.sin(angle) * curveDepth * 0.5;
    const y = -(1 - Math.cos(angle)) * curveDepth;
    points.push({ y, z });
  }

  // Straight section
  const curveEndY = points[points.length - 1].y;
  const curveEndZ = points[points.length - 1].z;
  for (let i = 1; i <= straightSegments; i++) {
    const t = i / straightSegments;
    const y = curveEndY - t * straightHeight;
    points.push({ y, z: curveEndZ });
  }

  // Create mesh vertices (Legacy: Interleaved Left/Right)
  const halfWidth = width / 2;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    // Legacy UV: Linear based on index (faster at top, slower at bottom if points are sparse?)
    // Actually points are dense at top.
    const v = i / (points.length - 1);

    // Left vertex
    vertices.push(-halfWidth, point.y, point.z);
    uvs.push(0, v);

    // Right vertex
    vertices.push(halfWidth, point.y, point.z);
    uvs.push(1, v);
  }

  // Create triangles (Legacy Order)
  for (let i = 0; i < points.length - 1; i++) {
    const topLeft = i * 2;
    const topRight = i * 2 + 1;
    const bottomLeft = (i + 1) * 2;
    const bottomRight = (i + 1) * 2 + 1;

    // Two triangles per quad
    indices.push(topLeft, bottomLeft, topRight);
    indices.push(topRight, bottomLeft, bottomRight);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates corner waterfall geometry
 * Legacy implementation from GameApp.ts (Revolved 90 degrees)
 */
export function createCornerWaterfallGeometry(
  totalHeight: number,
  curveDepth: number,
  segments: number = 8,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const curveSegments = Math.floor(segments / 2);
  const straightSegments = segments - curveSegments;
  const straightHeight = totalHeight - curveDepth;

  // Generate the curve profile (SAME formula as main waterfall)
  const profile: { y: number; offset: number }[] = [];

  for (let i = 0; i <= curveSegments; i++) {
    const t = i / curveSegments;
    const angle = t * (Math.PI / 2);
    const offset = Math.sin(angle) * curveDepth * 0.5;
    const y = -(1 - Math.cos(angle)) * curveDepth;
    profile.push({ y, offset });
  }

  const curveEndY = profile[profile.length - 1].y;
  const curveEndOffset = profile[profile.length - 1].offset;
  for (let i = 1; i <= straightSegments; i++) {
    const t = i / straightSegments;
    const y = curveEndY - t * straightHeight;
    profile.push({ y, offset: curveEndOffset });
  }

  // Create a 90-degree corner fan (Legacy: Row Major Generation)
  const cornerSegments = 12;

  for (let p = 0; p < profile.length; p++) {
    const { y, offset } = profile[p];
    const v = p / (profile.length - 1);

    for (let c = 0; c <= cornerSegments; c++) {
      const angle = (c / cornerSegments) * (Math.PI / 2); // 0 to 90 degrees
      const x = -Math.cos(angle) * offset;
      const z = -Math.sin(angle) * offset;

      vertices.push(x, y, z);
      uvs.push(c / cornerSegments, v);
    }
  }

  // Create triangles
  const vertsPerRow = cornerSegments + 1;
  for (let p = 0; p < profile.length - 1; p++) {
    for (let c = 0; c < cornerSegments; c++) {
      const topLeft = p * vertsPerRow + c;
      const topRight = p * vertsPerRow + c + 1;
      const bottomLeft = (p + 1) * vertsPerRow + c;
      const bottomRight = (p + 1) * vertsPerRow + c + 1;

      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Creates waterfall meshes for the world edges.
 */
export function createWaterfallMeshes(
  world: { getTile: (x: number, y: number) => { isWater: () => boolean } },
  waterfallMaterial: THREE.Material,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const waterfallHeight = 3;
  const curveDepth = 1;
  const waterfallY = -0.39;

  // Create curved waterfall geometry
  const waterfallGeom = createCurvedWaterfallGeometry(
    1,
    waterfallHeight,
    curveDepth,
    16,
  );
  const cornerGeom = createCornerWaterfallGeometry(
    waterfallHeight,
    curveDepth,
    12,
  );

  // Track corners (using TILE coordinates)
  const corners: { x: number; y: number; type: string }[] = [];

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const tile = world.getTile(x, y);
      if (!tile.isWater()) continue;

      // Check if on edge
      const onNorth = y === 0;
      const onSouth = y === WORLD_HEIGHT - 1;
      const onWest = x === 0;
      const onEast = x === WORLD_WIDTH - 1;
      const wf = new THREE.Mesh(waterfallGeom.clone(), waterfallMaterial);

      // Add edge waterfalls
      if (onNorth) {
        wf.position.set(x, waterfallY, y - 0.5); // Shifted y-1
        wf.rotation.y = Math.PI; // Flipped 180 (was PI)
        meshes.push(wf);
      }
      if (onSouth) {
        const wf = new THREE.Mesh(waterfallGeom.clone(), waterfallMaterial);
        wf.position.set(x + 0, waterfallY, y + 0.5); // Kept y+1
        wf.rotation.y = 0; // Flipped 180 (was 0)
        meshes.push(wf);
      }
      if (onWest) {
        const wf = new THREE.Mesh(waterfallGeom.clone(), waterfallMaterial);
        wf.position.set(x - 0.5, waterfallY, y); // Shifted x-1
        wf.rotation.y = -Math.PI / 2; // Flipped 180 (was -PI/2)
        meshes.push(wf);
      }
      if (onEast) {
        const wf = new THREE.Mesh(waterfallGeom.clone(), waterfallMaterial);
        wf.position.set(x + 0.5, waterfallY, y); // Kept x+1
        wf.rotation.y = Math.PI / 2; // Flipped 180 (was PI/2)
        meshes.push(wf);
      }

      // Track corners
      if (onNorth && onWest) corners.push({ x: x - 1, y: y - 1, type: "NW" }); // Shifted
      if (onNorth && onEast) corners.push({ x: x + 1, y: y - 1, type: "NE" }); // Shifted
      if (onSouth && onWest) corners.push({ x: x - 1, y: y + 1, type: "SW" }); // Shifted
      if (onSouth && onEast) corners.push({ x: x + 1, y: y + 1, type: "SE" }); // Shifted
    }
  }

  // Add corner pieces
  // Placing meshes with specific offsets per corner type to align with the gap
  for (const corner of corners) {
    const wf = new THREE.Mesh(cornerGeom.clone(), waterfallMaterial);

    if (corner.type === "NW") {
      wf.position.set(corner.x + 0.5, waterfallY, corner.y + 0.5);
      wf.rotation.y = 0; // NE FLIP (Was 0)
    } else if (corner.type === "NE") {
      wf.position.set(corner.x - 0.5, waterfallY, corner.y + 0.5);
      wf.rotation.y = -Math.PI / 2; // NE FLIP (Was 0)
    } else if (corner.type === "SW") {
      wf.position.set(corner.x + 0.5, waterfallY, corner.y - 0.5);
      wf.rotation.y = Math.PI / 2; // SW FLIP (Was PI)
    } else if (corner.type === "SE") {
      wf.position.set(corner.x - 0.5, waterfallY, corner.y - 0.5);
      wf.rotation.y = Math.PI; // SE FLIP (Was -PI/2 -> +PI/2? No SE was -PI/2. Flip is PI/2)
    }

    meshes.push(wf);
  }

  return meshes;
}
