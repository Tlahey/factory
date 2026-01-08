import * as THREE from "three";

export function createChestModel(): THREE.Group {
  const group = new THREE.Group();

  // Dimensions
  const size = 0.8;
  const height = 0.7;
  const wallThick = 0.05;

  // Materials
  const containerMat = new THREE.MeshLambertMaterial({ color: 0x446688 }); // Blue-ish metal
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x333333 }); // Dark grey frame
  const detailMat = new THREE.MeshLambertMaterial({ color: 0xcccccc }); // Silver details

  // 1. Main Container Body (Slightly smaller than frame)
  const bodyGeo = new THREE.BoxGeometry(
    size - wallThick * 2,
    height - wallThick * 2,
    size - wallThick * 2,
  );
  const body = new THREE.Mesh(bodyGeo, containerMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 2. Corner Pillars (Frame)
  const pillarGeo = new THREE.BoxGeometry(wallThick, height, wallThick);
  const positions = [
    { x: -size / 2 + wallThick / 2, z: -size / 2 + wallThick / 2 },
    { x: size / 2 - wallThick / 2, z: -size / 2 + wallThick / 2 },
    { x: -size / 2 + wallThick / 2, z: size / 2 - wallThick / 2 },
    { x: size / 2 - wallThick / 2, z: size / 2 - wallThick / 2 },
  ];

  positions.forEach((pos) => {
    const pillar = new THREE.Mesh(pillarGeo, frameMat);
    pillar.position.set(pos.x, height / 2, pos.z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  });

  // 3. Top and Bottom Rims
  const hRimGeo = new THREE.BoxGeometry(size, wallThick, size);

  // Bottom Rim
  const bottomRim = new THREE.Mesh(hRimGeo, frameMat);
  bottomRim.position.y = wallThick / 2;
  bottomRim.castShadow = true;
  bottomRim.receiveShadow = true;
  group.add(bottomRim);

  // Top Rim
  const topRim = new THREE.Mesh(hRimGeo, frameMat);
  topRim.position.y = height - wallThick / 2;
  topRim.castShadow = true;
  topRim.receiveShadow = true;
  group.add(topRim);

  // 4. Detail: Latch / Lock on front
  const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.05);
  const lock = new THREE.Mesh(lockGeo, detailMat);
  // Assuming Front is South (Z+)? Or North (Z-)?
  // Usually Chest faces 'South' (towards camera).
  lock.position.set(0, height * 0.6, size / 2 + 0.01);
  lock.castShadow = true;
  group.add(lock);

  return group;
}
