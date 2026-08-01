import * as THREE from "three";

let baseTexture: THREE.CanvasTexture | null = null;

/**
 * Build the belt canvas once. Every belt then gets a lightweight clone that
 * shares the same GPU image but owns its `offset`, so each belt can scroll
 * independently without allocating a canvas per instance.
 */
function createBaseTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Rubber belt base with a subtle vertical gradient for depth
  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, "#2b2b30");
  gradient.addColorStop(0.5, "#3c3c44");
  gradient.addColorStop(1, "#2b2b30");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Cleats: the raised ribs that carry the items.
  const drawCleat = (y: number) => {
    ctx.fillStyle = "#54545e";
    ctx.fillRect(6, y, size - 12, 5);
    // Highlight on the leading edge
    ctx.fillStyle = "#6e6e7a";
    ctx.fillRect(6, y, size - 12, 2);
  };

  const drawChevron = (y: number) => {
    ctx.strokeStyle = "#8a8a96";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(14, y + 8);
    ctx.lineTo(size / 2, y);
    ctx.lineTo(size - 14, y + 8);
    ctx.stroke();
  };

  const step = size / 4;
  for (let i = 0; i < 4; i++) {
    drawCleat(i * step);
    drawChevron(i * step + 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Returns a per-instance texture. Clones share the underlying image, so this
 * is cheap even with hundreds of belts on screen.
 */
export function createConveyorTexture(): THREE.Texture {
  if (!baseTexture) {
    baseTexture = createBaseTexture();
  }
  const clone = baseTexture.clone();
  clone.needsUpdate = true;
  return clone;
}
