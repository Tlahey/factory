import * as THREE from "three";

/**
 * Smoke Particle System for Biomass Power Plant
 *
 * Creates rising smoke particles that fade out as they ascend.
 * Different from the standard ParticleSystem which creates falling debris.
 */
export class SmokeParticleSystem {
  private group: THREE.Group;
  private pool: THREE.Mesh[] = [];
  private data: {
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    startScale: number;
  }[] = [];
  private readonly POOL_SIZE = 30;

  constructor(parentMesh: THREE.Object3D) {
    this.group = new THREE.Group();
    this.group.name = "smoke_particles";
    parentMesh.add(this.group);
    this.initPool();
  }

  private initPool() {
    // Use spheres for softer smoke appearance
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push(mesh);
      this.data.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        startScale: 1,
      });
    }
  }

  /**
   * Spawn a smoke particle at a position relative to the building center
   * @param localX - Local X offset from building center
   * @param localY - Local Y (height)
   * @param localZ - Local Z offset from building center
   */
  public spawn(localX: number, localY: number, localZ: number) {
    // Find dead particle
    let idx = this.data.findIndex((d) => d.life <= 0);
    if (idx === -1) {
      idx = Math.floor(Math.random() * this.POOL_SIZE);
    }

    const mesh = this.pool[idx];
    const d = this.data[idx];

    // Position with slight random offset
    mesh.position.set(
      localX + (Math.random() - 0.5) * 0.1,
      localY,
      localZ + (Math.random() - 0.5) * 0.1,
    );
    mesh.visible = true;

    // Reset scale
    const startScale = 0.8 + Math.random() * 0.4;
    mesh.scale.setScalar(startScale);
    d.startScale = startScale;

    // Smoke rises slowly with slight drift
    d.velocity.set(
      (Math.random() - 0.5) * 0.3, // Slight horizontal drift
      0.5 + Math.random() * 0.3, // Rise speed
      (Math.random() - 0.5) * 0.3, // Slight horizontal drift
    );

    d.maxLife = 1.5 + Math.random() * 1.0;
    d.life = d.maxLife;

    // Random gray color variation
    const grayValue = 0.4 + Math.random() * 0.3;
    (mesh.material as THREE.MeshBasicMaterial).color.setRGB(
      grayValue,
      grayValue,
      grayValue,
    );
  }

  public update(delta: number) {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const d = this.data[i];
      if (d.life > 0) {
        const mesh = this.pool[i];

        // Move upward
        mesh.position.addScaledVector(d.velocity, delta);

        // Slow down horizontal drift over time
        d.velocity.x *= 0.98;
        d.velocity.z *= 0.98;

        // Decrease life
        d.life -= delta;

        // Calculate life ratio (1 = fresh, 0 = dead)
        const lifeRatio = d.life / d.maxLife;

        // Fade out and expand as smoke rises
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = lifeRatio * 0.6;

        // Expand slightly as it rises
        const scale = d.startScale * (1 + (1 - lifeRatio) * 1.5);
        mesh.scale.setScalar(scale);

        if (d.life <= 0) {
          mesh.visible = false;
        }
      }
    }
  }

  public dispose() {
    this.pool.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.group.clear();
  }
}
