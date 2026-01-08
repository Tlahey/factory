import * as THREE from "three";

export function createGrassTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Fill with base green
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, 0, size, size);

  // Add some noise/speckles for variety
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 2 + Math.random() * 5;

    // Vary green shades
    const green = 150 + Math.random() * 50;
    const red = 50 + Math.random() * 50;
    ctx.strokeStyle = `rgb(${red}, ${green}, 30)`;
    ctx.lineWidth = 1 + Math.random() * 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
