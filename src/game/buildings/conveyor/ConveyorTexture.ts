import * as THREE from "three";

export function createConveyorTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = "#444444";
  ctx.fillRect(0, 0, size, size);

  // Belt pattern (arrows/chevrons)
  ctx.strokeStyle = "#aaaaaa";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  const drawChevron = (y: number) => {
    ctx.beginPath();
    ctx.moveTo(10, y + 10);
    ctx.lineTo(size / 2, y);
    ctx.lineTo(size - 10, y + 10);
    ctx.stroke();
  };

  for (let i = 0; i < 4; i++) {
    drawChevron(i * (size / 4));
    drawChevron(i * (size / 4) - size); // Loop for animation
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}
