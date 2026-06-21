import * as THREE from "three";
import { Enemy } from "./Enemy";

interface Pit {
  pos: THREE.Vector3;
  radius: number;
  mesh: THREE.Mesh;
  tick: number;
}

interface Spike {
  pos: THREE.Vector3;
  radius: number;
  group: THREE.Group;
  cones: THREE.Object3D;
  timer: number;
  state: "down" | "warn" | "up";
  struck: boolean;
}

export interface HazardFx {
  hurtPlayer: (n: number) => void;
  slowPlayer: (factor: number) => void;
  spark: (p: THREE.Vector3, s?: number) => void;
}

/**
 * Environmental hazards: ink pits (damage-over-time + slow, to player and
 * enemies alike) and timed spike traps (telegraphed burst damage). Lure foes
 * into them, or get caught yourself.
 */
export class Hazards {
  group = new THREE.Group();
  private pits: Pit[] = [];
  private spikes: Spike[] = [];

  constructor(pitCount: number, spikeCount: number, boundary: number) {
    for (let i = 0; i < pitCount; i++) this.makePit(boundary);
    for (let i = 0; i < spikeCount; i++) this.makeSpike(boundary);
  }

  private ringPos(boundary: number, r0 = 8): THREE.Vector3 {
    const a = Math.random() * Math.PI * 2;
    const r = r0 + Math.random() * (boundary - r0 - 4);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  private makePit(boundary: number) {
    const radius = 2.4 + Math.random() * 1.6;
    const pos = this.ringPos(boundary);
    const geo = new THREE.CircleGeometry(radius, 20);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x0c0a09, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).setY(0.04);
    this.group.add(mesh);
    this.pits.push({ pos, radius, mesh, tick: 0 });
  }

  private makeSpike(boundary: number) {
    const radius = 1.8 + Math.random() * 1.0;
    const pos = this.ringPos(boundary);
    const g = new THREE.Group();
    g.position.copy(pos);

    // a dark plate marks the trap
    const plate = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 18),
      new THREE.MeshStandardMaterial({ color: 0x33302c, roughness: 0.8 })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = 0.03;
    g.add(plate);

    // cluster of spikes that rise when active
    const cones = new THREE.Group();
    const cMat = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.5, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 5), cMat);
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * radius * 0.7;
      c.position.set(Math.cos(a) * rr, 0.55, Math.sin(a) * rr);
      c.castShadow = true;
      cones.add(c);
    }
    cones.position.y = -1.2; // hidden below the floor
    g.add(cones);

    this.group.add(g);
    this.spikes.push({
      pos,
      radius,
      group: g,
      cones,
      timer: Math.random() * 3,
      state: "down",
      struck: false,
    });
  }

  private within(p: THREE.Vector3, c: THREE.Vector3, r: number) {
    return Math.hypot(p.x - c.x, p.z - c.z) < r;
  }

  update(dt: number, playerPos: THREE.Vector3, enemies: Enemy[], fx: HazardFx) {
    let slow = 1;

    // ---- ink pits: DoT + slow ----
    for (const pit of this.pits) {
      pit.tick -= dt;
      const playerIn = this.within(playerPos, pit.pos, pit.radius);
      if (playerIn) slow = Math.min(slow, 0.5);
      if (pit.tick <= 0) {
        pit.tick = 0.5; // damage interval
        if (playerIn) {
          fx.hurtPlayer(6);
          fx.spark(playerPos.clone().setY(0.3), 0.5);
        }
        for (const e of enemies) {
          if (e.alive && !e.isFlying && this.within(e.pos, pit.pos, pit.radius)) e.takeDamage(8, pit.pos);
        }
      }
      // subtle breathing of the pool
      const s = 1 + Math.sin(performance.now() * 0.002 + pit.pos.x) * 0.03;
      pit.mesh.scale.setScalar(s);
    }

    // ---- spike traps: down -> warn -> up cycle ----
    for (const sp of this.spikes) {
      sp.timer -= dt;
      if (sp.state === "down") {
        sp.cones.position.y = THREE.MathUtils.lerp(sp.cones.position.y, -1.2, 1 - Math.exp(-dt * 8));
        if (sp.timer <= 0) {
          sp.state = "warn";
          sp.timer = 0.7;
          sp.struck = false;
        }
      } else if (sp.state === "warn") {
        // shudder as a telegraph
        sp.cones.position.y = -1.0 + Math.sin(performance.now() * 0.03) * 0.08;
        if (sp.timer <= 0) {
          sp.state = "up";
          sp.timer = 0.6;
        }
      } else {
        sp.cones.position.y = THREE.MathUtils.lerp(sp.cones.position.y, 0.2, 1 - Math.exp(-dt * 26));
        if (!sp.struck) {
          sp.struck = true;
          if (this.within(playerPos, sp.pos, sp.radius)) {
            fx.hurtPlayer(20);
            fx.spark(playerPos.clone().setY(0.4), 1);
          }
          for (const e of enemies) {
            if (e.alive && !e.isFlying && this.within(e.pos, sp.pos, sp.radius)) e.takeDamage(40, sp.pos);
          }
        }
        if (sp.timer <= 0) {
          sp.state = "down";
          sp.timer = 2 + Math.random() * 2.5;
        }
      }
    }

    fx.slowPlayer(slow);
  }

  dispose() {
    this.group.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
