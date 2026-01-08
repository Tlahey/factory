import * as THREE from "three";

export function createSandTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base sand color (Creamy Yellow)
  ctx.fillStyle = "#f0e68c";
  ctx.fillRect(0, 0, size, size);

  // Add grain/noise
  for (let i = 0; i < 30000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    // Vary sand shades (brownish/yellowish grains)
    const v = Math.random();
    if (v < 0.2) {
      ctx.fillStyle = "rgba(139, 69, 19, 0.1)"; // Brownish grain
    } else if (v < 0.5) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // Lighter grain
    } else {
      ctx.fillStyle = "rgba(218, 165, 32, 0.15)"; // Golden grain
    }

    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
