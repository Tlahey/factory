import * as THREE from "three";

/**
 * Creates a stylized battery model resembling an AA/AAA cylindrical battery.
 * Features:
 * - Green/blue main body with metallic sheen
 * - Gold positive terminal (top)
 * - Silver negative terminal (bottom)
 * - Decorative rings and label area
 * - Charge indicator strip
 */
export function createBatteryModel(): THREE.Group {
  const group = new THREE.Group();

  // Dimensions for 1x1 tile
  const radius = 0.38;
  const height = 0.9;
  const segments = 24;

  // === MATERIALS ===
  // Main body - vibrant green/teal gradient-like appearance
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x22aa66, // Vibrant green
    metalness: 0.3,
    roughness: 0.4,
  });

  // Positive terminal (top) - gold/brass
  const posTerminalMat = new THREE.MeshStandardMaterial({
    color: 0xffcc33,
    metalness: 0.8,
    roughness: 0.2,
  });

  // Negative terminal (bottom) - silver
  const negTerminalMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.7,
    roughness: 0.2,
  });

  // Accent rings - dark metallic
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.6,
    roughness: 0.3,
  });

  // Label band - darker green with branding look
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0x115533,
    metalness: 0.1,
    roughness: 0.6,
  });

  // Charge indicator background
  const indicatorBackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // === MAIN BODY ===
  const bodyGeo = new THREE.CylinderGeometry(
    radius,
    radius,
    height * 0.7,
    segments,
  );
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = height * 0.35 + height * 0.08;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // === LABEL BAND (middle section) ===
  const labelGeo = new THREE.CylinderGeometry(
    radius + 0.01,
    radius + 0.01,
    height * 0.25,
    segments,
  );
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = height * 0.4;
  label.castShadow = true;
  group.add(label);

  // === TOP RING (accent) ===
  const topRingGeo = new THREE.CylinderGeometry(
    radius + 0.02,
    radius + 0.02,
    0.04,
    segments,
  );
  const topRing = new THREE.Mesh(topRingGeo, ringMat);
  topRing.position.y = height * 0.68;
  group.add(topRing);

  // === BOTTOM RING (accent) ===
  const bottomRing = new THREE.Mesh(topRingGeo, ringMat);
  bottomRing.position.y = height * 0.1;
  group.add(bottomRing);

  // === POSITIVE TERMINAL (TOP - nipple) ===
  const posTerminalGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.12, segments);
  const posTerminal = new THREE.Mesh(posTerminalGeo, posTerminalMat);
  posTerminal.position.y = height * 0.75;
  posTerminal.castShadow = true;
  group.add(posTerminal);

  // Small cap on top of positive terminal
  const posCapGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, segments);
  const posCap = new THREE.Mesh(posCapGeo, posTerminalMat);
  posCap.position.y = height * 0.81;
  group.add(posCap);

  // === NEGATIVE TERMINAL (BOTTOM - flat) ===
  const negTerminalGeo = new THREE.CylinderGeometry(
    radius * 0.8,
    radius * 0.8,
    0.06,
    segments,
  );
  const negTerminal = new THREE.Mesh(negTerminalGeo, negTerminalMat);
  negTerminal.position.y = 0.03;
  negTerminal.castShadow = true;
  group.add(negTerminal);

  // === CHARGE INDICATOR STRIP ===
  const stripW = 0.15;
  const stripH = height * 0.4;
  const stripD = 0.03;

  // Background strip
  const stripGeo = new THREE.BoxGeometry(stripW, stripH, stripD);
  const strip = new THREE.Mesh(stripGeo, indicatorBackMat);
  strip.position.set(0, height * 0.4, radius + 0.02);
  group.add(strip);

  // Charge bar (scales based on charge)
  const fillGeo = new THREE.BoxGeometry(stripW * 0.8, 1, stripD + 0.01);
  fillGeo.translate(0, 0.5, 0); // Pivot at bottom

  const chargeMat = new THREE.MeshLambertMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 0.3,
  });
  const indicator = new THREE.Mesh(fillGeo, chargeMat);
  indicator.name = "charge_indicator";

  // Position at bottom of strip
  const stripBottomY = height * 0.4 - stripH / 2;
  const barBottomY = stripBottomY + stripH * 0.05;

  indicator.position.set(0, barBottomY, radius + 0.025);
  indicator.scale.set(1, stripH * 0.9 * 0.5, 1); // Start at 50% for visual
  group.add(indicator);

  // === "+" SYMBOL on top ===
  const plusMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Horizontal bar of +
  const plusH = new THREE.BoxGeometry(0.08, 0.015, 0.015);
  const plusHMesh = new THREE.Mesh(plusH, plusMat);
  plusHMesh.position.set(0, height * 0.82, 0);
  group.add(plusHMesh);

  // Vertical bar of +
  const plusV = new THREE.BoxGeometry(0.015, 0.015, 0.08);
  const plusVMesh = new THREE.Mesh(plusV, plusMat);
  plusVMesh.position.set(0, height * 0.82, 0);
  group.add(plusVMesh);

  return group;
}
