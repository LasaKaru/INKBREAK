import * as THREE from "three";

interface Crate {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  radius: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  breakTime: number;
}

/**
 * Destructible cover — crates scattered around the arena. They block the
 * player and absorb enemy ink rounds (real cover), and shatter into ink + debris
 * when struck by melee, finishers or sustained fire, dropping a little ink.
 */
export class Destructibles {
  group = new THREE.Group();
  crates: Crate[] = [];

  constructor(
    private ctx: { particles: { inkBurst: (p: THREE.Vector3, s?: number) => void; hitSpark: (p: THREE.Vector3, s?: number) => void }; audio: { hit: () => void } },
    count: number,
    boundary: number,
    private onBreak: (pos: THREE.Vector3) => void
  ) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4743, roughness: 0.85, flatShading: true });
    for (let i = 0; i < count; i++) {
      const size = 1.2 + Math.random() * 0.7;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // place in a ring, away from the very centre (boss/altar) and the rim
      const a = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * (boundary - 11);
      const pos = new THREE.Vector3(Math.cos(a) * r, size / 2, Math.sin(a) * r);
      mesh.position.copy(pos);
      mesh.rotation.y = Math.random() * 0.5;
      this.group.add(mesh);

      this.crates.push({
        mesh,
        pos: pos.clone(),
        radius: size * 0.6,
        health: 50,
        maxHealth: 50,
        alive: true,
        breakTime: 0,
      });
    }
  }

  /** Push a moving circle (the player) out of any live crate. */
  resolveCollision(pos: THREE.Vector3, r: number) {
    for (const c of this.crates) {
      if (!c.alive) continue;
      const dx = pos.x - c.pos.x;
      const dz = pos.z - c.pos.z;
      const min = r + c.radius;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 0.0001) {
        const push = (min - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }

  /** A travelling point (projectile) hits cover? Damage it and report a block. */
  absorb(point: THREE.Vector3, dmg: number): boolean {
    for (const c of this.crates) {
      if (!c.alive) continue;
      const dx = point.x - c.pos.x;
      const dz = point.z - c.pos.z;
      if (Math.hypot(dx, dz) < c.radius + 0.2 && Math.abs(point.y - c.pos.y) < c.radius + 0.6) {
        this.damage(c, dmg, point);
        return true;
      }
    }
    return false;
  }

  /** Area damage from melee swings / finishers. */
  damageArea(center: THREE.Vector3, radius: number, dmg: number) {
    for (const c of this.crates) {
      if (!c.alive) continue;
      const dx = center.x - c.pos.x;
      const dz = center.z - c.pos.z;
      if (Math.hypot(dx, dz) < radius + c.radius) {
        this.damage(c, dmg, c.pos);
      }
    }
  }

  private damage(c: Crate, amount: number, from: THREE.Vector3) {
    c.health -= amount;
    this.ctx.particles.hitSpark(c.pos.clone().setY(c.pos.y + 0.3), 0.6);
    if (c.health <= 0) {
      c.alive = false;
      c.breakTime = 0;
      this.ctx.particles.inkBurst(c.pos.clone().setY(c.pos.y + 0.3), 1.0);
      this.ctx.audio.hit();
      this.onBreak(c.pos.clone());
    }
  }

  update(dt: number) {
    for (const c of this.crates) {
      if (c.alive || !c.mesh.visible) continue;
      // crumble + sink, then hide
      c.breakTime += dt;
      c.mesh.scale.multiplyScalar(1 - 4 * dt);
      c.mesh.position.y -= 4 * dt;
      if (c.breakTime >= 0.4) c.mesh.visible = false;
    }
  }

  dispose() {
    this.group.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
