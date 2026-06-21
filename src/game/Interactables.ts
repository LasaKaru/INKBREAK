import * as THREE from "three";

interface Shrine {
  group: THREE.Group;
  core: THREE.Mesh;
  pos: THREE.Vector3;
  radius: number;
  health: number;
  alive: boolean;
  breakTime: number;
}

export interface InteractFx {
  inkBurst: (p: THREE.Vector3, s?: number) => void;
  hitSpark: (p: THREE.Vector3, s?: number) => void;
  audioHit: () => void;
  flash: (a: number) => void;
}

/**
 * Interactive objects — ink shrines: tall obelisks with a pulsing core that
 * block movement and must be shattered (with blade, finisher or fire) to
 * complete a "shatter" objective. Each drops a burst of ink + counts down.
 */
export class Interactables {
  group = new THREE.Group();
  shrines: Shrine[] = [];

  constructor(
    private fx: InteractFx,
    count: number,
    boundary: number,
    private onShatter: (pos: THREE.Vector3, remaining: number) => void
  ) {
    for (let i = 0; i < count; i++) this.makeShrine(i, count, boundary);
  }

  get remaining() {
    return this.shrines.filter((s) => s.alive).length;
  }
  get total() {
    return this.shrines.length;
  }

  private makeShrine(i: number, count: number, boundary: number) {
    const g = new THREE.Group();
    const a = (i / Math.max(1, count)) * Math.PI * 2 + 0.4;
    const r = boundary * 0.6;
    const pos = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.position.copy(pos);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.8, flatShading: true });
    // stepped base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.6, 6), stoneMat);
    base.position.y = 0.3;
    base.castShadow = true;
    g.add(base);
    // obelisk
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 4.2, 6), stoneMat);
    shaft.position.y = 2.6;
    shaft.castShadow = true;
    g.add(shaft);
    // pulsing white core (the weak point)
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.3, emissive: 0x000000 })
    );
    core.position.y = 5.2;
    core.castShadow = true;
    g.add(core);

    this.group.add(g);
    this.shrines.push({ group: g, core, pos: pos.clone(), radius: 1.4, health: 120, alive: true, breakTime: 0 });
  }

  resolveCollision(pos: THREE.Vector3, r: number) {
    for (const s of this.shrines) {
      if (!s.alive) continue;
      const dx = pos.x - s.pos.x;
      const dz = pos.z - s.pos.z;
      const min = r + s.radius;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 0.0001) {
        const push = (min - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }

  damageArea(center: THREE.Vector3, radius: number, dmg: number) {
    for (const s of this.shrines) {
      if (!s.alive) continue;
      const dx = center.x - s.pos.x;
      const dz = center.z - s.pos.z;
      if (Math.hypot(dx, dz) < radius + s.radius) this.damage(s, dmg);
    }
  }

  private damage(s: Shrine, amount: number) {
    s.health -= amount;
    this.fx.hitSpark(s.core.getWorldPosition(new THREE.Vector3()), 0.8);
    if (s.health <= 0) {
      s.alive = false;
      s.breakTime = 0;
      const wp = s.core.getWorldPosition(new THREE.Vector3());
      this.fx.inkBurst(wp, 1.8);
      this.fx.audioHit();
      this.fx.flash(0.5);
      this.onShatter(s.pos.clone(), this.remaining);
    }
  }

  update(_dt: number, t: number) {
    for (const s of this.shrines) {
      if (s.alive) {
        s.core.rotation.y += _dt * 1.2;
        const p = 1 + Math.sin(t * 3 + s.pos.x) * 0.12;
        s.core.scale.setScalar(p);
        (s.core.material as THREE.MeshStandardMaterial).emissive.setScalar(0.25 + Math.sin(t * 3) * 0.15);
      } else if (s.group.visible) {
        s.breakTime += _dt;
        s.group.scale.y = Math.max(0, s.group.scale.y - 3 * _dt);
        if (s.breakTime > 0.5) s.group.visible = false;
      }
    }
  }

  dispose() {
    this.group.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
