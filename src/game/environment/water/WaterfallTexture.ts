import * as THREE from "three";

export function createWaterfallTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 1. Base Gradient (Deep blue to light blue)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#0055ff");
  gradient.addColorStop(1, "#0099ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // 2. Vertical Streaks (Falling water lines)
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 40 + Math.random() * 200;

    const opacity = 0.05 + Math.random() * 0.3;
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 1 + Math.random() * 3;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
    ctx.stroke();
  }

  // 3. Horizontal Foam Ripples (Simulating turbulent waves falling)
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * size;
    ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;

    // Draw wavy foam lines
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 10) {
      const rippleY = y + Math.sin(x * 0.05 + i) * 10;
      ctx.lineTo(x, rippleY);
    }
    ctx.lineTo(size, y + 20);
    ctx.lineTo(0, y + 20);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  return texture;
}

export function createWaterCurrentTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 1. Base Gradient
  const gradient = ctx.createLinearGradient(0, 0, size, 0); // Horizontal
  gradient.addColorStop(0, "#0077ff");
  gradient.addColorStop(1, "#0099ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // 2. Streaks (Horizontal)
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 30 + Math.random() * 100;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  return texture;
}
