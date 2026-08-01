import * as THREE from "three";

/**
 * CONVEYOR GEOMETRY
 *
 * Local space contract (do NOT change without updating ConveyorView):
 * - Straight: the belt runs along -Z, an item enters at z = +0.5 and leaves at
 *   z = -0.5. Belt surface sits at y = BELT_SURFACE_Y.
 * - Curve: quarter arc of radius 0.5 centred on (-0.5, 0, 0.5), swept from
 *   angle 0 to -PI/2. Right turns reuse the same geometry mirrored on X by the
 *   view layer.
 */

/** Height of the walkable belt surface, shared with the item positioning. */
export const BELT_SURFACE_Y = 0.12;

const BELT_WIDTH = 0.4;
const FRAME_WIDTH = 0.06;
const FRAME_HEIGHT = 0.14;
const FRAME_OFFSET = BELT_WIDTH / 2 + FRAME_WIDTH / 2; // centre of each side frame
const TRIM_HEIGHT = 0.025;
const CURVE_SEGMENTS = 14;

const FRAME_COLOR = 0x4a4e57; // dark industrial metal
const TRIM_COLOR = 0xf2b21c; // hazard yellow
const LEG_COLOR = 0x33363d;

function createMaterials(texture: THREE.Texture) {
  return {
    belt: new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
    }),
    frame: new THREE.MeshLambertMaterial({ color: FRAME_COLOR }),
    trim: new THREE.MeshLambertMaterial({ color: TRIM_COLOR }),
    leg: new THREE.MeshLambertMaterial({ color: LEG_COLOR }),
  };
}

type Materials = ReturnType<typeof createMaterials>;

/** Straight section: belt slab, side frames + hazard trim, end rollers, legs. */
function buildStraight(group: THREE.Group, mats: Materials): void {
  // 1. Belt surface
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(BELT_WIDTH, 0.06, 1),
    mats.belt,
  );
  belt.position.y = BELT_SURFACE_Y - 0.03;
  belt.name = "belt";
  belt.castShadow = true;
  belt.receiveShadow = true;
  group.add(belt);

  // 2. Side frames + hazard trim on top of them
  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(FRAME_WIDTH, FRAME_HEIGHT, 1),
      mats.frame,
    );
    frame.position.set(side * FRAME_OFFSET, FRAME_HEIGHT / 2 - 0.04, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(FRAME_WIDTH * 1.05, TRIM_HEIGHT, 1),
      mats.trim,
    );
    trim.position.set(
      side * FRAME_OFFSET,
      FRAME_HEIGHT - 0.04 + TRIM_HEIGHT / 2,
      0,
    );
    group.add(trim);
  }

  // 3. End rollers — read as "this thing moves" even when static
  const rollerGeo = new THREE.CylinderGeometry(0.055, 0.055, BELT_WIDTH, 10);
  for (const z of [-0.47, 0.47]) {
    const roller = new THREE.Mesh(rollerGeo, mats.frame);
    roller.rotation.z = Math.PI / 2; // lay it across the belt
    roller.position.set(0, BELT_SURFACE_Y - 0.03, z);
    group.add(roller);
  }

  // 4. Legs, sunk into the ground so the belt never floats
  const legGeo = new THREE.BoxGeometry(BELT_WIDTH + FRAME_WIDTH, 0.1, 0.1);
  for (const z of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(legGeo, mats.leg);
    leg.position.set(0, 0.0, z);
    group.add(leg);
  }
}

/** Quarter-turn section. */
function buildCurve(group: THREE.Group, mats: Materials): void {
  const center = new THREE.Vector2(-0.5, 0.5);
  const radius = 0.5;
  const halfWidth = BELT_WIDTH / 2;
  const startAngle = 0;
  const endAngle = -Math.PI / 2;

  // 1. Belt ribbon with UVs following the arc
  const beltGeo = new THREE.BufferGeometry();
  const beltVertices: number[] = [];
  const beltUVs: number[] = [];
  const beltIndices: number[] = [];

  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS;
    const angle = startAngle + (endAngle - startAngle) * t;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rInner = radius - halfWidth;
    const rOuter = radius + halfWidth;

    beltVertices.push(
      center.x + rInner * cos,
      BELT_SURFACE_Y,
      center.y + rInner * sin,
    );
    beltVertices.push(
      center.x + rOuter * cos,
      BELT_SURFACE_Y,
      center.y + rOuter * sin,
    );

    // U across the width, V along the arc so the scroll animation still works.
    beltUVs.push(0, t);
    beltUVs.push(1, t);

    if (i < CURVE_SEGMENTS) {
      const base = i * 2;
      // CCW winding => normals point up
      beltIndices.push(base, base + 1, base + 2);
      beltIndices.push(base + 1, base + 3, base + 2);
    }
  }

  beltGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(beltVertices, 3),
  );
  beltGeo.setAttribute("uv", new THREE.Float32BufferAttribute(beltUVs, 2));
  beltGeo.setIndex(beltIndices);
  beltGeo.computeVertexNormals();

  const beltMesh = new THREE.Mesh(beltGeo, mats.belt);
  beltMesh.name = "belt";
  beltMesh.receiveShadow = true;
  beltMesh.castShadow = true;
  group.add(beltMesh);

  // 2. Curved side frames + trims, extruded along the arc
  const extrudeAlongArc = (
    arcRadius: number,
    profileWidth: number,
    profileHeight: number,
    material: THREE.Material,
    yOffset: number,
  ) => {
    const arc = new THREE.EllipseCurve(
      center.x,
      center.y,
      arcRadius,
      arcRadius,
      startAngle,
      endAngle,
      true,
      0,
    );
    const path = new THREE.CatmullRomCurve3(
      arc.getPoints(CURVE_SEGMENTS).map((p) => new THREE.Vector3(p.x, 0, p.y)),
    );

    // The extrusion frame is rotated, so X is vertical and Y is horizontal.
    const shape = new THREE.Shape();
    shape.moveTo(-profileHeight / 2, -profileWidth / 2);
    shape.lineTo(profileHeight / 2, -profileWidth / 2);
    shape.lineTo(profileHeight / 2, profileWidth / 2);
    shape.lineTo(-profileHeight / 2, profileWidth / 2);

    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        steps: CURVE_SEGMENTS,
        bevelEnabled: false,
        extrudePath: path,
      }),
      material,
    );
    mesh.position.y = yOffset;
    return mesh;
  };

  for (const side of [-1, 1]) {
    const arcRadius = radius + side * FRAME_OFFSET;
    group.add(
      extrudeAlongArc(
        arcRadius,
        FRAME_WIDTH,
        FRAME_HEIGHT,
        mats.frame,
        FRAME_HEIGHT / 2 - 0.04,
      ),
    );
    group.add(
      extrudeAlongArc(
        arcRadius,
        FRAME_WIDTH * 1.05,
        TRIM_HEIGHT,
        mats.trim,
        FRAME_HEIGHT - 0.04 + TRIM_HEIGHT / 2,
      ),
    );
  }

  // 3. Bed under the belt
  group.add(
    extrudeAlongArc(radius, BELT_WIDTH + FRAME_WIDTH, 0.1, mats.leg, 0.0),
  );
}

export function createConveyorModel(
  type: "straight" | "left" | "right",
  texture: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const mats = createMaterials(texture);

  if (type === "straight") {
    buildStraight(group, mats);
  } else {
    // Left-turn geometry; the view mirrors it on X for right turns.
    buildCurve(group, mats);
  }

  group.userData.conveyorType = type;
  return group;
}
