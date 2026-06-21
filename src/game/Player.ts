import * as THREE from "three";
import { buildFigure, Figure } from "./Characters";
import { GameContext, Targetable } from "./types";
import { Enemy } from "./Enemy";
import { Balance } from "./balance";
import { Inventory } from "./Inventory";
import { WeaponDef, WEAPONS, ALL_WEAPON_IDS } from "./Weapons";

const P = Balance.player;

/**
 * The faceless figure in the black suit. Owns the third-person camera rig and
 * the full combat kit: shoot, slash, block, counter (perfect-timed parry),
 * and dash. Animated procedurally for the hand-drawn motion feel.
 */
export class Player {
  fig: Figure;
  pos = new THREE.Vector3(0, 0, 10);
  vel = new THREE.Vector3();
  health: number = P.maxHealth;
  maxHealth: number = P.maxHealth; // upgradable in the shop
  alive = true;

  // posture / stamina
  stamina: number = P.maxStamina;
  maxStamina: number = P.maxStamina; // upgradable in the shop
  private staminaSpentAt = -10;
  private guardBrokenUntil = -10;

  // camera rig (yaw 0 => camera behind the player on +Z, player facing the hall)
  yaw = 0;
  pitch = 0.32;
  private camDist = 7.5;

  // combat timers
  private blocking = false;
  private blockStartedAt = -10;
  private slashCooldown = 0;
  private shootCooldown = 0;
  private dashCooldown = 0;
  private invuln = 0;
  private attackAnim = 0; // >0 while a melee swing plays
  private shootAnim = 0;
  private time = 0;

  // melee combo / flow
  private combo = 0;
  private comboTimer = 0;
  private comboSwing = 1; // alternating swing direction

  // targeting (enemies or the boss core)
  lockedTarget: Targetable | null = null;

  // loadout
  inventory = new Inventory();

  constructor(private ctx: GameContext) {
    this.fig = buildFigure("player");
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = Math.PI; // face the centre of the hall at start
    ctx.scene.add(this.fig.root);

    // receive enemy strike resolutions
    Enemy.onStrike = (enemy, _b) => this.resolveIncoming(enemy);

    // refresh visuals + HUD whenever the loadout changes
    this.inventory.onChange = () => this.refreshLoadout();
    this.refreshLoadout();
  }

  /** Apply equipped-weapon visuals + push loadout strings to the HUD. */
  private refreshLoadout() {
    const rw = this.inventory.rangedWeapon;
    const mw = this.inventory.meleeWeapon;
    this.fig.pistol.scale.setScalar(rw.meshScale);
    this.fig.sword.scale.setScalar(mw.meshScale);
    this.ctx.hud.setLoadout(rw.name, mw.name, this.inventory.inkDrops, this.inventory.consumables);
  }

  private get speed() {
    return P.moveSpeed;
  }

  get guardBroken() {
    return this.time < this.guardBrokenUntil;
  }

  /** Spend stamina to absorb a hit; returns whether the guard held. */
  private spendBlock(): "blocked" | "broken" {
    if (this.stamina >= P.staminaBlockHit) {
      this.stamina -= P.staminaBlockHit;
      this.staminaSpentAt = this.time;
      return "blocked";
    }
    this.guardBreak();
    return "broken";
  }

  private guardBreak() {
    this.guardBrokenUntil = this.time + P.guardBreakStun;
    this.stamina = 0;
    this.staminaSpentAt = this.time;
    this.blocking = false;
    this.ctx.hud.floatText(this.chest(), `[<span class="b">guard broken</span>]`, true);
    this.ctx.audio.hurt();
    this.ctx.post.punchFlash(0.3);
  }

  damage(amount: number) {
    if (this.invuln > 0 || !this.alive) return;
    this.health -= amount;
    this.ctx.audio.hurt();
    this.ctx.post.punchFlash(0.25);
    this.ctx.hud.setPlayerHealth(this.health);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  /** Called when an enemy's melee strike lands its timing. */
  private resolveIncoming(enemy: Enemy) {
    const center = enemy.center();
    if (this.blocking) {
      const sinceBlock = this.time - this.blockStartedAt;
      if (sinceBlock < P.parryWindow) {
        // PERFECT parry -> counter (free, and refunds posture)
        enemy.stagger(Balance.enemy.staggerTime);
        this.stamina = Math.min(this.maxStamina, this.stamina + P.staminaParryRefund);
        this.ctx.hud.floatText(center, `[<span class="b">countered</span>] successful`, true);
        this.ctx.audio.counter();
        this.ctx.post.punchFlash(0.4);
        this.ctx.hitStop(Balance.feel.hitStopHeavy);
        this.ctx.particles.hitSpark(center, 1.4);
      } else if (this.spendBlock() === "blocked") {
        // normal block -> chip damage, costs posture
        this.ctx.hud.floatText(center, `[<span class="b">attack blocked</span>]`);
        this.ctx.audio.block();
        this.ctx.particles.hitSpark(center, 0.6);
        this.damage(P.blockChipDamage);
      } else {
        // guard broke under the strike -> full hit
        this.ctx.hud.floatText(center, `[<span class="b">hit</span>]`);
        this.damage(P.hitDamage);
      }
    } else {
      this.ctx.hud.floatText(center, `[<span class="b">hit</span>]`);
      this.damage(enemy.meleeDamage);
      const dir = this.pos.clone().sub(enemy.pos).setY(0).normalize();
      this.vel.addScaledVector(dir, 5);
    }
  }

  /** Called when an enemy ink round reaches the player. */
  resolveProjectile(dmg: number, from: THREE.Vector3) {
    if (!this.alive) return;
    const toSource = from.clone().sub(this.pos).setY(0).normalize();
    const facing = toSource.dot(this.forward()) > 0.1;
    if (this.blocking && facing && this.spendBlock() === "blocked") {
      this.ctx.hud.floatText(this.chest(), `[<span class="b">deflected</span>]`);
      this.ctx.audio.block();
      this.ctx.particles.hitSpark(from, 0.7);
    } else {
      this.ctx.hud.floatText(this.chest(), `[<span class="b">hit</span>]`);
      this.damage(dmg);
    }
  }

  // ---------------- input-driven actions ----------------

  private rangedAttack() {
    if (this.shootCooldown > 0) return;
    const w = this.inventory.rangedWeapon;
    this.shootCooldown = w.cooldown;
    this.shootAnim = 0.18;
    this.ctx.audio.shoot();

    // muzzle world position + forward
    const muzzle = this.fig.pistol.getObjectByName("muzzle")!;
    const mpos = muzzle.getWorldPosition(new THREE.Vector3());
    const target = this.lockedTarget;
    const dir = target ? target.center().sub(mpos).normalize() : this.forward();
    this.ctx.particles.muzzle(mpos, dir);

    const range = w.range ?? 24;
    if (w.pellets && w.pellets > 1) {
      // shotgun: spray everything in a forward cone at close range
      let hit = false;
      for (const e of this.ctx.getEnemies()) {
        if (!e.alive) continue;
        const d = e.pos.distanceTo(this.pos);
        if (d > range) continue;
        const toE = e.pos.clone().sub(this.pos).setY(0).normalize();
        if (toE.dot(this.forward()) > 0.5) {
          // more pellets connect up close; damage falls off with distance
          const falloff = THREE.MathUtils.clamp(1 - d / range, 0.25, 1);
          const dmg = w.damage * (w.pellets ?? 1) * falloff;
          e.takeDamage(dmg * (e.state === "vulnerable" ? w.vulnMult : 1), this.pos);
          hit = true;
        }
      }
      if (!hit) this.ctx.hud.floatText(this.chest(), `[scatter]`);
    } else if (target && target.alive) {
      const dmg = w.damage * (target.state === "vulnerable" ? w.vulnMult : 1);
      target.takeDamage(dmg, this.pos);
      this.ctx.hud.floatText(target.center(), `[fired]`);
    }
  }

  private meleeAttack() {
    if (this.slashCooldown > 0) return;
    const w = this.inventory.meleeWeapon;
    this.slashCooldown = w.cooldown;

    // --- combo / flow ---
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 1.1; // window to keep the chain alive
    const finisher = this.combo % 4 === 0; // every 4th strike is a finisher
    const rampMult = 1 + Math.min(this.combo - 1, 3) * 0.13; // damage ramps with flow
    this.comboSwing = -this.comboSwing || 1; // alternate swing direction
    this.attackAnim = finisher ? 0.55 : w.cooldown > 0.7 ? 0.5 : 0.32;
    this.ctx.hud.setCombo(this.combo, finisher);
    this.ctx.audio.slash();

    // swap to sword pose briefly
    this.fig.sword.visible = true;
    this.fig.pistol.visible = false;

    // finishers sweep a wider arc and hit everything around the player
    const reach = (w.reach ?? 3) * (finisher ? 1.7 : 1);
    const frontDot = finisher ? -0.6 : 0.2;
    const dmg = w.damage * rampMult * (finisher ? 1.7 : 1);

    let hitAny = false;
    for (const e of this.ctx.getEnemies()) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d < reach) {
        const toE = e.pos.clone().sub(this.pos).setY(0).normalize();
        if (toE.dot(this.forward()) > frontDot) {
          hitAny = true;
          if (e.state === "vulnerable") {
            e.takeDamage(999, this.pos);
            this.ctx.hud.floatText(e.center(), `[<span class="b">execution</span>]`, true);
          } else {
            e.takeDamage(dmg, this.pos);
            this.ctx.particles.hitSpark(e.center(), finisher ? 1.6 : 1);
          }
        }
      }
    }
    // the boss core can be struck when it has dipped low (open window)
    const boss = this.ctx.getBoss();
    if (boss && boss.alive && boss.center().y < 5.5) {
      const d = Math.hypot(boss.pos.x - this.pos.x, boss.pos.z - this.pos.z);
      if (d < reach + 2) {
        boss.takeDamage(dmg, this.pos);
        this.ctx.particles.hitSpark(boss.center(), 1.3);
        hitAny = true;
      }
    }

    if (finisher && hitAny) {
      // ink-wave payoff: knockback, screen punch, style reward
      this.ctx.particles.inkBurst(this.chest(), 1.4);
      this.ctx.post.punchFlash(0.4);
      this.ctx.hitStop(Balance.feel.hitStopHeavy);
      this.inventory.addInk(2);
      this.ctx.hud.floatText(this.chest(), `[<span class="b">ink-wave</span>] x${this.combo}`, true);
    } else if (!hitAny) {
      this.ctx.hud.floatText(this.chest(), `[swing] — missed`);
    }
  }

  private useConsumable(type: "heal" | "posture") {
    if (!this.inventory.use(type)) {
      this.ctx.hud.floatText(this.chest(), `[<span class="b">none left</span>]`);
      return;
    }
    if (type === "heal") {
      this.health = Math.min(this.maxHealth, this.health + 40);
      this.ctx.hud.setPlayerHealth(this.health);
      this.ctx.hud.floatText(this.chest(), `[<span class="b">+health</span>]`);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 60);
      this.ctx.hud.floatText(this.chest(), `[<span class="b">+posture</span>]`);
    }
    this.ctx.audio.counter();
  }

  // ---------------- shop hooks ----------------

  /** Spend ink (negative n refunds). Returns false if too poor. */
  spendInk(n: number): boolean {
    if (n < 0 || this.inventory.inkDrops >= n) {
      this.inventory.addInk(-n);
      return true;
    }
    return false;
  }

  /** Unlock a random not-yet-owned weapon; returns its name or null. */
  unlockRandomWeapon(): string | null {
    const owned = new Set([...this.inventory.ranged, ...this.inventory.melee]);
    const choices = ALL_WEAPON_IDS.filter((id) => !owned.has(id));
    if (choices.length === 0) return null;
    const id = choices[Math.floor(Math.random() * choices.length)];
    this.inventory.addWeapon(id);
    return WEAPONS[id].name;
  }

  upgradeMaxHealth() {
    this.maxHealth += 20;
    this.health = this.maxHealth;
    this.ctx.hud.setPlayerHealth(this.health);
  }

  upgradeMaxStamina() {
    this.maxStamina += 20;
    this.stamina = this.maxStamina;
  }

  private dash() {
    if (this.dashCooldown > 0) return;
    if (this.stamina < P.staminaDashCost) {
      this.ctx.hud.floatText(this.chest(), `[<span class="b">exhausted</span>]`);
      return;
    }
    this.stamina -= P.staminaDashCost;
    this.staminaSpentAt = this.time;
    this.dashCooldown = P.dashCooldown;
    this.invuln = P.dashInvuln;
    this.ctx.audio.dash();
    const dir = this.moveDir.lengthSq() > 0 ? this.moveDir.clone() : this.forward();
    this.vel.addScaledVector(dir.normalize(), P.dashImpulse);
    // ink trail
    for (let i = 0; i < 14; i++) this.ctx.particles.emberRise(this.chest());
    this.ctx.hud.floatText(this.chest(), `[dash]`);
  }

  // ---------------- helpers ----------------

  private moveDir = new THREE.Vector3();

  forward(out = new THREE.Vector3()): THREE.Vector3 {
    // facing direction the body currently points
    return out.set(Math.sin(this.fig.root.rotation.y), 0, Math.cos(this.fig.root.rotation.y));
  }

  chest(out = new THREE.Vector3()) {
    return out.copy(this.pos).add(new THREE.Vector3(0, 1.4, 0));
  }

  private acquireTarget() {
    const camDir = new THREE.Vector3();
    this.ctx.camera.getWorldDirection(camDir);
    let best: Targetable | null = null;
    let bestScore = -1;

    const candidates: Targetable[] = [...this.ctx.getEnemies()];
    const boss = this.ctx.getBoss();
    if (boss && boss.alive) candidates.push(boss);

    for (const e of candidates) {
      if (!e.alive) continue;
      const to = e.center().sub(this.ctx.camera.position).normalize();
      const align = to.dot(camDir);
      const dist = e.pos.distanceTo(this.pos);
      if (align > 0.9 && dist < 28) {
        const score = align - dist * 0.005;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
    this.lockedTarget = best;
  }

  // ---------------- main update ----------------

  update(dt: number, t: number) {
    this.time = t;
    const inp = this.ctx.input;

    // ---- camera orbit from mouse ----
    const [dx, dy] = inp.takeMouseDelta();
    this.yaw -= dx * 0.0024;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.002, -0.15, 0.9);

    // ---- movement (camera relative) ----
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x); // right = forward × up
    this.moveDir.set(0, 0, 0);
    if (this.alive) {
      if (inp.keys["w"]) this.moveDir.add(f);
      if (inp.keys["s"]) this.moveDir.sub(f);
      if (inp.keys["d"]) this.moveDir.add(r);
      if (inp.keys["a"]) this.moveDir.sub(r);
    }
    if (this.moveDir.lengthSq() > 0) {
      this.moveDir.normalize();
      this.vel.addScaledVector(this.moveDir, this.speed * dt * 10);
    }

    // ---- combat input ----
    const wasBlocking = this.blocking;
    // can't raise the guard while it's broken
    this.blocking =
      this.alive && !this.guardBroken && (inp.keys[" "] || inp.rightDown);
    // stamp the instant the guard goes up, for the perfect-parry window
    if (this.blocking && !wasBlocking) this.blockStartedAt = this.time;

    // ---- stamina (posture) ----
    if (this.blocking) {
      this.stamina -= P.staminaBlockDrain * dt;
      this.staminaSpentAt = this.time;
      if (this.stamina <= 0) this.guardBreak();
    } else if (this.time - this.staminaSpentAt > P.staminaRegenDelay) {
      this.stamina = Math.min(this.maxStamina, this.stamina + P.staminaRegen * dt);
    }
    this.ctx.hud.setStamina(this.stamina / this.maxStamina, this.guardBroken);

    if (this.alive) {
      // ranged: auto weapons fire while held, others on click
      const rw = this.inventory.rangedWeapon;
      if (rw.auto ? inp.mouseDown : inp.clickedThisFrame) this.rangedAttack();
      if (inp.consumePress("f")) this.meleeAttack();
      if (inp.consumePress("shift")) this.dash();
      // weapon cycling
      if (inp.consumePress("q")) this.inventory.cycleRanged(1);
      if (inp.consumePress("e")) this.inventory.cycleMelee(1);
      // consumables
      if (inp.consumePress("1")) this.useConsumable("heal");
      if (inp.consumePress("2")) this.useConsumable("posture");
    }

    // cooldowns
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.slashCooldown = Math.max(0, this.slashCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    if (this.attackAnim <= 0 && this.fig.sword.visible) {
      this.fig.sword.visible = false;
      this.fig.pistol.visible = true;
    }

    // combo flow decays if the chain isn't continued
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0 && this.combo > 0) {
        this.combo = 0;
        this.ctx.hud.setCombo(0, false);
      }
    }

    // ---- integrate ----
    this.vel.multiplyScalar(1 - 9 * dt);
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y = 0;
    // arena boundary
    const maxR = 25;
    const r2 = Math.hypot(this.pos.x, this.pos.z);
    if (r2 > maxR) {
      this.pos.x *= maxR / r2;
      this.pos.z *= maxR / r2;
    }
    this.fig.root.position.copy(this.pos);

    // ---- targeting ----
    this.acquireTarget();

    // ---- facing ----
    let faceDir: THREE.Vector3 | null = null;
    if (this.lockedTarget) faceDir = this.lockedTarget.pos.clone().sub(this.pos).setY(0);
    else if (this.moveDir.lengthSq() > 0) faceDir = this.moveDir.clone();
    if (faceDir && faceDir.lengthSq() > 0) {
      const targetYaw = Math.atan2(faceDir.x, faceDir.z);
      this.fig.root.rotation.y = dampAngle(this.fig.root.rotation.y, targetYaw, 10, dt);
    }

    // ---- procedural animation ----
    this.animate(dt, t);

    // ---- camera ----
    this.updateCamera(dt);

    // ---- HUD ----
    this.ctx.hud.updateReticle(
      this.lockedTarget ? this.lockedTarget.center() : null,
      this.lockedTarget?.state === "vulnerable" || this.lockedTarget?.state === "open"
    );
  }

  private animate(dt: number, t: number) {
    const moving = this.moveDir.lengthSq() > 0;
    const speed = this.vel.length();
    if (moving) {
      const s = Math.sin(t * 11) * 0.5 * Math.min(1, speed / 6);
      this.fig.legL.rotation.x = s;
      this.fig.legR.rotation.x = -s;
      this.fig.armL.rotation.x = -s * 0.7;
      if (this.attackAnim <= 0 && this.shootAnim <= 0)
        this.fig.armR.rotation.x = s * 0.5;
      this.fig.torso.position.y = 1.18 + Math.abs(Math.sin(t * 11)) * 0.04;
    } else {
      // idle breathing settle
      this.fig.legL.rotation.x = THREE.MathUtils.lerp(this.fig.legL.rotation.x, 0, 1 - Math.exp(-dt * 8));
      this.fig.legR.rotation.x = THREE.MathUtils.lerp(this.fig.legR.rotation.x, 0, 1 - Math.exp(-dt * 8));
      this.fig.armL.rotation.x = THREE.MathUtils.lerp(this.fig.armL.rotation.x, 0, 1 - Math.exp(-dt * 8));
    }

    // shooting: arm raised forward toward target
    if (this.shootAnim > 0) {
      this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, -1.45, 1 - Math.exp(-dt * 30));
    }
    // slashing: alternating swings driven by the combo step
    if (this.attackAnim > 0) {
      const k = 1 - this.attackAnim / 0.55;
      this.fig.armR.rotation.x = THREE.MathUtils.lerp(-2.6, 0.8, k);
      // swing the torso the opposite way each hit for a back-and-forth feel
      this.fig.root.rotation.z = Math.sin(k * Math.PI) * 0.22 * this.comboSwing;
    } else {
      this.fig.root.rotation.z = THREE.MathUtils.lerp(this.fig.root.rotation.z, 0, 1 - Math.exp(-dt * 10));
    }

    // blocking: arm tucked across body (shield handled in Game via overlay)
    if (this.blocking && this.attackAnim <= 0 && this.shootAnim <= 0) {
      this.fig.armL.rotation.x = THREE.MathUtils.lerp(this.fig.armL.rotation.x, -1.6, 1 - Math.exp(-dt * 16));
      this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, -1.2, 1 - Math.exp(-dt * 16));
    }

    // death slump
    if (!this.alive) {
      this.fig.root.rotation.x = THREE.MathUtils.lerp(this.fig.root.rotation.x, Math.PI / 2.2, 1 - Math.exp(-dt * 4));
    }
  }

  private updateCamera(dt: number) {
    const cam = this.ctx.camera;
    const target = this.chest();
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch) + 0.4,
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.camDist);
    const desired = target.clone().add(offset);
    cam.position.lerp(desired, 1 - Math.exp(-dt * 9));
    cam.lookAt(target);
  }

  get blockingState() {
    return this.blocking;
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}
