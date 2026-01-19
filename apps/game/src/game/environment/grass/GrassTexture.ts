import * as THREE from "three";

/**
 * Creates a seamless, high-resolution grass texture.
 * Features: Tileable design, no visible seams, natural color variation.
 */
export function createGrassTexture(): THREE.CanvasTexture {
  const size = 1024; // Larger texture for less obvious repetition
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 1. Solid base color
  ctx.fillStyle = "#4a9a4a";
  ctx.fillRect(0, 0, size, size);

  // 2. Apply noise for organic variation
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // Seamless noise using modular arithmetic
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Use sine/cosine for seamless tiling
      const nx = x / size;
      const ny = y / size;
      const twoPi = Math.PI * 2;

      const noise1 =
        Math.sin(nx * twoPi * 2) * Math.cos(ny * twoPi * 2) * 15 +
        Math.sin((nx + ny) * twoPi * 3) * 10;

      const noise2 =
        Math.sin(nx * twoPi * 5 + 1.5) * Math.cos(ny * twoPi * 5) * 8;

      const noise3 =
        Math.sin(nx * twoPi * 8 + 2.3) * Math.sin(ny * twoPi * 8 + 1.1) * 5;

      const totalNoise = noise1 + noise2 + noise3;

      // Apply to colors
      data[idx] = Math.max(50, Math.min(120, data[idx] + totalNoise * 0.4)); // R
      data[idx + 1] = Math.max(
        100,
        Math.min(200, data[idx + 1] + totalNoise * 0.7),
      ); // G
      data[idx + 2] = Math.max(
        30,
        Math.min(80, data[idx + 2] + totalNoise * 0.2),
      ); // B
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // 3. Subtle dark patches (seamless)
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 30 + Math.random() * 60;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(40, 70, 35, 0.15)");
    gradient.addColorStop(1, "rgba(40, 70, 35, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Mirror to edges for seamless tiling
    if (x < radius) {
      ctx.beginPath();
      ctx.arc(x + size, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (y < radius) {
      ctx.beginPath();
      ctx.arc(x, y + size, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Light patches
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 25 + Math.random() * 50;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(120, 180, 100, 0.15)");
    gradient.addColorStop(1, "rgba(120, 180, 100, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Mirror edges
    if (x < radius) {
      ctx.beginPath();
      ctx.arc(x + size, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (y < radius) {
      ctx.beginPath();
      ctx.arc(x, y + size, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Grass blade strokes (uniform distribution)
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 8 + Math.random() * 16;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;

    const greenShade = 90 + Math.random() * 90;
    const alpha = 0.1 + Math.random() * 0.15;

    ctx.strokeStyle = `rgba(45, ${greenShade}, 35, ${alpha})`;
    ctx.lineWidth = 1.5 + Math.random();
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  // 6. Bright tip highlights
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 4 + Math.random() * 8;

    ctx.strokeStyle = `rgba(150, 200, 100, ${0.1 + Math.random() * 0.15})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - length);
    ctx.stroke();
  }

  // 7. Small details (flowers, dirt specks)
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 2 + Math.random() * 3;

    const colors = [
      "rgba(255, 240, 150, 0.4)", // Yellow
      "rgba(255, 255, 255, 0.3)", // White
      "rgba(101, 67, 33, 0.25)", // Brown dirt
    ];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Use larger repeat factor to make texture span multiple tiles
  texture.repeat.set(0.1, 0.1); // Each texture covers 10x10 tiles
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
