import * as THREE from 'three';

export function createBeachTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Fill with sand base
    ctx.fillStyle = '#f0e68c';
    ctx.fillRect(0, 0, size, size);

    // 2. Add grass patches at the top (inner side)
    // We assume the texture will be mapped so Y=0 is inner and Y=1 is outer
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * size;
        const y = Math.pow(Math.random(), 2) * size * 0.7; // Weighted towards the 'top' (inside)
        
        const green = 100 + Math.random() * 100;
        ctx.fillStyle = `rgb(50, ${green}, 30)`;
        ctx.fillRect(x, y, 2, 2);
    }

    // 3. Add sand grains everywhere
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = 'rgba(218, 165, 32, 0.2)';
        ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}
