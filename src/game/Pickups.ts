import * as THREE from "three";
import { RANGED_IDS, MELEE_IDS } from "./Weapons";

export type PickupType = "ink" | "heal" | "posture" | "weapon";

interface Drop {
  group: THREE.Group;
  type: PickupType;
  weaponId?: string;
  value: number;
  life: number;
  active: boolean;
  spin: number;
  baseY: number;
}

export interface PickupEffects {
  addInk: (n: number) => void;
  addConsumable: (type: "heal" | "posture", n: number) => void;
  addWeapon: (id: string) => boolean;
  float: (pos: THREE.Vector3, text: string, big?: boolean) => void;
}

/**
 * Floating monochrome collectibles dropped by erased enemies: ink-drop currency,
 * heal vials, posture tonics, and the occasional weapon crate. They bob, drift
 * toward the player when near, and are collected on contact.
 */
export class Pickups {
  group = new THREE.Group();
  private drops: Drop[] = [];
  private mats: Record<PickupType, THREE.MeshStandardMaterial>;

  constructor(private fx: PickupEffects) {
    this.mats = {
      ink: new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.3 }),
      heal: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5 }),
      posture: new THREE.MeshStandardMaterial({ color: 0x6c6a66, roughness: 0.5 }),
      weapon: new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.4 }),
    };
  }

  private build(type: PickupType): THREE.Group {
    const g = new THREE.Group();
    let mesh: THREE.Mesh;
    if (type === "ink") {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), this.mats.ink);
    } else if (type === "heal") {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), this.mats.heal);
    } else if (type === "posture") {
      mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.32, 0), this.mats.posture);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.mats.weapon);
    }
    mesh.castShadow = true;
    g.add(mesh);

    // a faint ground ring so drops read on the busy floor
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.42, 16),
      new THREE.MeshBasicMaterial({ color: 0x14110f, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.5;
    g.add(ring);
    return g;
  }

  private acquire(type: PickupType): Drop {
    let d = this.drops.find((x) => !x.active && x.type === type);
    if (!d) {
      d = {
        group: this.build(type),
        type,
        value: 0,
        life: 0,
        active: false,
        spin: 0,
        baseY: 0.7,
      };
      this.group.add(d.group);
      this.drops.push(d);
    }
    return d;
  }

  spawn(pos: THREE.Vector3, type: PickupType, value = 1, weaponId?: string) {
    const d = this.acquire(type);
    d.active = true;
    d.value = value;
    d.weaponId = weaponId;
    d.life = 22;
    d.spin = Math.random() * Math.PI * 2;
    d.baseY = 0.7;
    d.group.visible = true;
    // scatter a little from the death point
    d.group.position.set(
      pos.x + (Math.random() - 0.5) * 1.4,
      d.baseY,
      pos.z + (Math.random() - 0.5) * 1.4
    );
  }

  /** Roll a loot drop for an erased enemy. */
  rollLoot(pos: THREE.Vector3, wave: number) {
    // always a few ink drops
    const inks = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < inks; i++) this.spawn(pos, "ink", 1 + Math.floor(Math.random() * 2));

    const r = Math.random();
    if (r < 0.18) this.spawn(pos, "heal", 1);
    else if (r < 0.32) this.spawn(pos, "posture", 1);

    // weapon crates get likelier in later waves, but stay rare
    if (Math.random() < 0.06 + wave * 0.02) {
      const pool = Math.random() < 0.5 ? RANGED_IDS : MELEE_IDS;
      // don't drop the two starters
      const choices = pool.filter((id) => id !== "pistol" && id !== "katana");
      const id = choices[Math.floor(Math.random() * choices.length)];
      if (id) this.spawn(pos, "weapon", 1, id);
    }
  }

  update(dt: number, t: number, playerPos: THREE.Vector3) {
    for (const d of this.drops) {
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        this.retire(d);
        continue;
      }
      // bob + spin
      d.group.position.y = d.baseY + Math.sin(t * 2 + d.spin) * 0.12;
      d.group.rotation.y += dt * 2;

      const to = playerPos.clone().setY(d.group.position.y).sub(d.group.position);
      const dist = to.length();
      // magnet when close
      if (dist < 3.5) {
        d.group.position.addScaledVector(to.normalize(), Math.min(dist, 8 * dt));
      }
      if (dist < 0.9) {
        this.collect(d);
      }
    }
  }

  private collect(d: Drop) {
    const at = d.group.position.clone();
    switch (d.type) {
      case "ink":
        this.fx.addInk(d.value);
        this.fx.float(at, `+${d.value} ink`);
        break;
      case "heal":
        this.fx.addConsumable("heal", d.value);
        this.fx.float(at, `+heal vial`);
        break;
      case "posture":
        this.fx.addConsumable("posture", d.value);
        this.fx.float(at, `+posture tonic`);
        break;
      case "weapon": {
        const isNew = d.weaponId ? this.fx.addWeapon(d.weaponId) : false;
        this.fx.float(at, isNew ? `<b>[new weapon]</b>` : `+ammo`, true);
        break;
      }
    }
    this.retire(d);
  }

  private retire(d: Drop) {
    d.active = false;
    d.group.visible = false;
  }
}
