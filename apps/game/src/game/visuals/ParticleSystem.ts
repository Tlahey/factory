import * as THREE from "three";

export class ParticleSystem {
  private group: THREE.Group;
  private pool: THREE.Mesh[] = [];
  private data: { velocity: THREE.Vector3; life: number }[] = [];
  private readonly POOL_SIZE = 50;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.initPool();
  }

  private initPool() {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.pool.push(mesh);
      this.data.push({ velocity: new THREE.Vector3(), life: 0 });
    }
  }

  public spawn(x: number, y: number, z: number) {
    // Find dead particle
    let idx = this.data.findIndex((d) => d.life <= 0);
    if (idx === -1) {
      // Optional: Overwrite oldest or just ignore
      idx = 0; // simplistic ring buffer overwrite if full, or just ignore
    }

    const mesh = this.pool[idx];
    const d = this.data[idx];

    mesh.position.set(
      x + (Math.random() - 0.5) * 0.4,
      y,
      z + (Math.random() - 0.5) * 0.4,
    );
    mesh.visible = true;

    d.velocity.set(
      (Math.random() - 0.5) * 2,
      2 + Math.random() * 2,
      (Math.random() - 0.5) * 2,
    );
    d.life = 0.5 + Math.random() * 0.5;
  }

  public update(delta: number) {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const d = this.data[i];
      if (d.life > 0) {
        const mesh = this.pool[i];
        mesh.position.addScaledVector(d.velocity, delta);
        d.velocity.y -= 9.8 * delta;
        d.life -= delta;

        if (d.life <= 0) {
          mesh.visible = false;
        }
      }
    }
  }
}
