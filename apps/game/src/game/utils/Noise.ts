/**
 * Simple 2D Noise function (Value Noise)
 * Based on basic interpolation of hashed gradients.
 */

// Simple pseudo-random hash
function hash(x: number, y: number): number {
    let a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return a - Math.floor(a);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

export function noise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    
    const fx = x - ix;
    const fy = y - iy;
    
    const u = smoothstep(fx);
    const v = smoothstep(fy);
    
    // Corner hashes
    const bl = hash(ix, iy);
    const br = hash(ix + 1, iy);
    const tl = hash(ix, iy + 1);
    const tr = hash(ix + 1, iy + 1);
    
    // Mix
    const b = lerp(bl, br, u);
    const t = lerp(tl, tr, u);
    
    return lerp(b, t, v);
}
