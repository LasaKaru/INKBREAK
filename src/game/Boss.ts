import * as THREE from "three";
import { GameContext, Targetable } from "./types";

type BossPhase = 1 | 2 | 3;
type BossState = "descending" | "idle" | "open" | "dead";

interface Shock {
  mesh: THREE.Mesh;
  radius: number;
  active: boolean;
  hit: boolean;
  damage: number;
}

/**
 * THE WARDEN — the prison's will made flesh, a void core that descends from the
 * smoke above the central altar. A three-phase fight: aimed ink volleys, radial
 * bursts, summoned figures, and (later) expanding ground shockwaves. After each
 * big attack it lowers and "opens", taking double damage — the player's window.
 */
export class Boss implements Targetable {
  group = new THREE.Group();
  pos = new THREE.Vector3(0, 0, 0); // ground projection (for distance checks)
  alive = true;
  maxHealth = 620;
  health = 620;

  private core!: THREE.Group;
  private eye!: THREE.Mesh;
  private shell!: THREE.Mesh;
  private coreY = 13;
  private targetY = 7.5;
  private stateName: BossState = "descending";
  private attackTimer = 2.5;
  private openTimer = 0;
  private deathTime = 0;
  private hitFlash = 0;
  private shocks: Shock[] = [];
  private time = 0;

  constructor(private ctx: GameContext) {
    this.build();
    ctx.scene.add(this.group);
    this.ctx.hud.showBoss("THE WARDEN");
    this.ctx.hud.say(
      "The prison stopped pretending to be a prison.",
      "— and looked back at me.",
      5
    );
  }

  // ---- Targetable ----
  get state(): string {
    return this.stateName === "open" ? "open" : "idle";
  }
  center(out = new THREE.Vector3()) {
    return out.set(0, this.coreY, 0);
  }
  get healthFrac() {
    return Math.max(0, this.health / this.maxHealth);
  }
  private get phase(): BossPhase {
    const f = this.healthFrac;
    if (f > 0.6) return 1;
    if (f > 0.25) return 2;
    return 3;
  }

  private mat(color: number, rough = 0.6, emissive = 0x000000) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true, emissive });
  }

  private build() {
    this.core = new THREE.Group();
    this.core.position.set(0, this.coreY, 0);

    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), this.mat(0x0c0a09, 0.5));
    this.shell.castShadow = true;
    this.core.add(this.shell);

    // jagged crown spikes
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 4), this.mat(0x161311, 0.5));
      spike.position.set(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7);
      spike.rotation.z = -Math.cos(a) * Math.PI * 0.4;
      spike.rotation.x = Math.sin(a) * Math.PI * 0.4;
      this.core.add(spike);
    }

    // the white "eye" — swells when the boss is open
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), this.mat(0xf2f0ea, 0.3, 0x000000));
    this.core.add(this.eye);

    this.group.add(this.core);

    // shockwave ring pool
    const ringGeo = new THREE.TorusGeometry(1, 0.18, 6, 40);
    ringGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.8, transparent: true, opacity: 0.85 })
      );
      m.visible = false;
      m.position.y = 0.3;
      this.group.add(m);
      this.shocks.push({ mesh: m, radius: 1, active: false, hit: false, damage: 0 });
    }
  }

  // ---- damage ----
  takeDamage(amount: number, _from: THREE.Vector3) {
    if (!this.alive || this.stateName === "descending") return;
    const mult = this.stateName === "open" ? 2 : 1;
    this.health -= amount * mult;
    this.hitFlash = 0.12;
    this.ctx.particles.inkBurst(this.center(), 0.4);
    this.ctx.audio.hit();
    this.ctx.hitStop(0.04);
    this.ctx.hud.setBoss(this.healthFrac);
    if (this.health <= 0) this.die();
  }

  private die() {
    this.alive = false;
    this.stateName = "dead";
    this.deathTime = 0;
    this.ctx.audio.death();
    this.ctx.post.punchFlash(1);
    this.ctx.hud.setBoss(0);
    this.ctx.hud.floatText(this.center(), `<span class="b">[the warden falls]</span>`, true);
  }

  // ---- attacks ----
  private aimedBurst(playerPos: THREE.Vector3) {
    const origin = this.center();
    const base = playerPos.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(origin).normalize();
    const shots = this.phase >= 3 ? 5 : 3;
    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 0.12;
      const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      this.ctx.spawnProjectile(origin.clone(), dir, 9);
    }
    this.ctx.audio.shoot();
  }

  private radialVolley() {
    const origin = this.center();
    const n = this.phase >= 2 ? 16 : 12;
    const off = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      const dir = new THREE.Vector3(Math.cos(a), -0.12, Math.sin(a)).normalize();
      this.ctx.spawnProjectile(origin.clone(), dir, 8);
    }
    this.ctx.audio.counter();
  }

  private slam() {
    const s = this.shocks.find((x) => !x.active);
    if (!s) return;
    s.active = true;
    s.hit = false;
    s.radius = 1;
    s.damage = 16;
    s.mesh.visible = true;
    s.mesh.position.set(0, 0.3, 0);
    s.mesh.scale.setScalar(1);
    this.ctx.audio.death();
    this.ctx.post.punchFlash(0.3);
  }

  private openUp(duration: number) {
    this.stateName = "open";
    this.openTimer = duration;
    this.ctx.hud.floatText(this.center(), `the warden is <span class="b">[open]</span>`);
  }

  // ---- main update ----
  update(dt: number, t: number, playerPos: THREE.Vector3, onHitPlayer: (dmg: number, from: THREE.Vector3) => void) {
    this.time = t;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // floaty bob + spin always
    this.core.rotation.y += dt * 0.5;
    this.shell.rotation.x += dt * 0.3;

    if (this.stateName === "dead") {
      this.deathTime += dt;
      const k = Math.max(0, 1 - this.deathTime / 2.2);
      this.core.scale.setScalar(k * (1 + Math.sin(this.deathTime * 30) * 0.05));
      this.coreY = THREE.MathUtils.lerp(this.coreY, 4, 1 - Math.exp(-dt * 2));
      this.core.position.y = this.coreY;
      if (Math.random() < 0.6) this.ctx.particles.inkBurst(this.center(), 1.2);
      return;
    }

    // hit flash on the eye
    this.eye.material && ((this.eye.material as THREE.MeshStandardMaterial).emissive.setScalar(this.hitFlash > 0 ? 0.8 : 0));

    if (this.stateName === "descending") {
      this.coreY = THREE.MathUtils.lerp(this.coreY, this.targetY, 1 - Math.exp(-dt * 1.5));
      this.core.position.y = this.coreY;
      if (Math.abs(this.coreY - this.targetY) < 0.2) {
        this.stateName = "idle";
        this.attackTimer = 1.2;
      }
      return;
    }

    // eye swells when open
    const targetEye = this.stateName === "open" ? 1.7 : 1;
    this.eye.scale.lerp(new THREE.Vector3(targetEye, targetEye, targetEye), 1 - Math.exp(-dt * 8));

    // when open, dip toward the floor so melee can reach
    const wantY = this.stateName === "open" ? 4.2 : this.targetY;
    this.coreY = THREE.MathUtils.lerp(this.coreY, wantY, 1 - Math.exp(-dt * 3));
    this.core.position.y = this.coreY;

    // open window countdown
    if (this.stateName === "open") {
      this.openTimer -= dt;
      if (this.openTimer <= 0) this.stateName = "idle";
    }

    // attack scheduler (only while not open)
    if (this.stateName === "idle") {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.runAttack(playerPos);
      }
    }

    this.updateShocks(dt, playerPos, onHitPlayer);
  }

  private runAttack(playerPos: THREE.Vector3) {
    const p = this.phase;
    const cadence = p === 1 ? 2.6 : p === 2 ? 2.1 : 1.5;
    const roll = Math.random();

    if (p === 1) {
      if (roll < 0.45) this.aimedBurst(playerPos);
      else if (roll < 0.8) this.radialVolley();
      else this.ctx.summonEnemies(2);
    } else if (p === 2) {
      if (roll < 0.3) this.aimedBurst(playerPos);
      else if (roll < 0.6) this.radialVolley();
      else if (roll < 0.8) this.slam();
      else this.ctx.summonEnemies(3);
    } else {
      // phase 3: relentless
      if (roll < 0.35) {
        this.aimedBurst(playerPos);
        this.radialVolley();
      } else if (roll < 0.7) {
        this.slam();
        this.aimedBurst(playerPos);
      } else this.ctx.summonEnemies(3);
    }

    this.attackTimer = cadence;
    // reward aggression: open after most attacks
    if (Math.random() < 0.7) this.openUp(p === 3 ? 1.6 : 2.2);
  }

  private updateShocks(dt: number, playerPos: THREE.Vector3, onHitPlayer: (dmg: number, from: THREE.Vector3) => void) {
    for (const s of this.shocks) {
      if (!s.active) continue;
      s.radius += dt * 14;
      s.mesh.scale.setScalar(s.radius);
      (s.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.85 - s.radius / 30);

      const pd = Math.hypot(playerPos.x, playerPos.z);
      if (!s.hit && Math.abs(pd - s.radius) < 1.2) {
        s.hit = true;
        onHitPlayer(s.damage, new THREE.Vector3(0, 0.5, 0));
      }
      if (s.radius > 28) {
        s.active = false;
        s.mesh.visible = false;
      }
    }
  }

  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}
