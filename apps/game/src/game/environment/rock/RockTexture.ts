import * as THREE from "three";

export function createRockTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base Grey
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  // Add darker/lighter splotches for "stone" look
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 1 + Math.random() * 5;
    const grey = 80 + Math.random() * 80;

    ctx.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
