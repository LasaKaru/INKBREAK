import * as THREE from "three";
import { buildFigure, Figure } from "./Characters";
import { GameContext } from "./types";
import { Balance } from "./balance";
import { Palette } from "./Palette";

const ARCHETYPE_HUE: Record<string, number> = {
  grunt: 0x6fae5a,
  gunner: 0xc0584e,
  brute: 0xc98a3e,
  dasher: 0x57b0c2,
  shielded: 0x8d7bc0,
  exploder: 0xcf5a8a,
  flying: 0xd9c558,
  summoner: 0x5566c9,
};

export type EnemyState = "approach" | "windup" | "strike" | "vulnerable" | "dead";
export type ArchetypeId = keyof typeof Balance.archetypes;

/**
 * A minimalist white enemy figure with a small combat state machine:
 *   approach -> windup (telegraph) -> strike -> (recover) -> approach
 * Getting countered or shot mid-windup drops it into a `vulnerable` stun,
 * the opening for an execution. Archetypes (grunt/gunner/brute/dasher/shielded)
 * layer stat multipliers + behaviour flags over the base numbers.
 */
export class Enemy {
  fig: Figure;
  state: EnemyState = "approach";
  health: number;
  alive = true;
  pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private timer = 0;
  private hasGun: boolean;
  private deathTime = 0;
  private hitFlash = 0;
  private fireCooldown = Math.random() * Balance.enemy.rangedCooldown;
  private lungeCooldown = 1 + Math.random();
  private summonTimer = 2.5 + Math.random() * 2;
  walkPhase = Math.random() * Math.PI * 2;

  readonly archetype: ArchetypeId;
  private a: (typeof Balance.archetypes)[ArchetypeId];

  // tuning (base values scaled by archetype)
  readonly attackRange = Balance.enemy.attackRange;
  readonly windupTime: number;
  readonly speed: number;
  private damageMult: number;

  constructor(private ctx: GameContext, spawn: THREE.Vector3, archetype: ArchetypeId = "grunt") {
    this.archetype = archetype;
    const a = Balance.archetypes[archetype];
    this.a = a;
    this.fig = buildFigure("enemy");
    this.hasGun = a.ranged;
    this.health = Balance.enemy.health * a.health;
    this.speed = Balance.enemy.speed * a.speed;
    this.windupTime = Balance.enemy.windupTime * (a.brute ? 1.4 : 1);
    this.damageMult = a.damage;

    this.fig.pistol.visible = a.ranged;
    this.fig.sword.visible = !a.ranged;
    this.fig.root.scale.setScalar(a.scale);

    // shielded figures carry a slab shield on the left arm
    if (a.shielded) {
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.3, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.7, flatShading: true })
      );
      shield.position.set(0, -0.4, 0.1);
      shield.castShadow = true;
      this.fig.armL.add(shield);
    }

    this.pos.copy(spawn);
    this.fig.root.position.copy(spawn);
    ctx.scene.add(this.fig.root);
    this.applyPalette();
  }

  /** Recolour for the current palette: white in ink mode, archetype hue in colour. */
  applyPalette() {
    const hue = ARCHETYPE_HUE[this.archetype] ?? 0xb05050;
    this.fig.bodyMat.color.setHex(Palette.pick(0xdedcd5, hue));
    this.fig.limbMat.color.setHex(Palette.pick(0x9b9892, hue));
    this.fig.headMat.color.setHex(Palette.pick(0xdedcd5, 0xf2efe8));
  }

  get group() {
    return this.fig.root;
  }

  /** Melee damage this enemy deals to the player (archetype-scaled). */
  get meleeDamage() {
    return Balance.enemy.meleeDamage * this.damageMult;
  }

  get isFlying() {
    return this.a.flying;
  }

  /** Center-of-mass world point for targeting / VFX. */
  center(out = new THREE.Vector3()) {
    const y = (this.a.flying ? 2.8 : 1.2) * this.a.scale;
    return out.copy(this.pos).add(new THREE.Vector3(0, y, 0));
  }

  takeDamage(amount: number, from: THREE.Vector3) {
    if (!this.alive) return;

    // shielded enemies shrug off damage until they're cracked open (staggered)
    if (this.a.shielded && this.state !== "vulnerable") {
      amount *= 0.15;
      this.hitFlash = 0.1;
      this.ctx.particles.hitSpark(this.center(), 0.4);
      this.ctx.audio.block();
      this.ctx.hud.floatText(this.center(), `[<span class="b">guarded</span>]`);
      this.health -= amount;
      if (this.health <= 0) this.die();
      return;
    }

    this.health -= amount;
    this.hitFlash = 0.15;
    this.ctx.particles.inkBurst(this.center(), 0.5);
    this.ctx.audio.hit();
    this.ctx.hitStop(Balance.feel.hitStop);

    // knockback (brutes barely budge)
    const dir = this.pos.clone().sub(from).setY(0).normalize();
    this.vel.addScaledVector(dir, this.a.brute ? 1 : 3);

    if (this.health <= 0) {
      this.die();
    } else {
      this.ctx.hud.floatText(this.center(), `[${Math.max(0, Math.round(this.health))}%]`);
    }
  }

  /** Force a stun opening (used on counter). */
  stagger(duration = 2) {
    if (!this.alive) return;
    this.state = "vulnerable";
    this.timer = duration;
    this.ctx.hud.floatText(this.center(), `enemy is <span class="b">[open]</span>`);
  }

  private die() {
    this.alive = false;
    this.state = "dead";
    this.deathTime = 0;
    this.ctx.particles.inkBurst(this.center(), 1.4);
    this.ctx.audio.death();
    this.ctx.post.punchFlash(0.35);
    this.ctx.hitStop(Balance.feel.hitStopHeavy);
    this.ctx.hud.floatText(this.center(), `<span class="b">[erased]</span>`, true);
    this.ctx.onDestruction(Balance.prison.perKill);
    this.ctx.spawnLoot(this.pos.clone());
  }

  update(dt: number, t: number, playerPos: THREE.Vector3, playerBlocking: boolean) {
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.state === "dead") {
      // crumple: sink + topple, then fade out
      this.deathTime += dt;
      this.fig.root.rotation.x = Math.min(Math.PI / 2, this.deathTime * 3);
      this.fig.root.position.y = -Math.min(1, this.deathTime * 0.8);
      const k = Math.max(0, 1 - this.deathTime / 1.6);
      this.fig.root.scale.setScalar(k);
      if (this.deathTime > 1.6) this.dispose();
      return;
    }

    const toPlayer = playerPos.clone().sub(this.pos).setY(0);
    const dist = toPlayer.length();
    toPlayer.normalize();

    // face the player
    const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
    this.fig.root.rotation.y = THREE.MathUtils.lerp(
      this.fig.root.rotation.y,
      targetYaw,
      1 - Math.exp(-dt * 8)
    );

    switch (this.state) {
      case "approach": {
        if (this.a.summoner && dist < Balance.enemy.rangedFireRange && dist > 7) {
          // summoner: hang back and call in reinforcements
          this.summonTimer -= dt;
          this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, -1.9, 1 - Math.exp(-dt * 8));
          this.fig.armL.rotation.x = THREE.MathUtils.lerp(this.fig.armL.rotation.x, -1.9, 1 - Math.exp(-dt * 8));
          if (this.summonTimer <= 0) {
            this.summonTimer = 5.5 + Math.random() * 2.5;
            this.ctx.summonEnemies(1 + (Math.random() < 0.4 ? 1 : 0));
            this.ctx.particles.inkBurst(this.center(), 0.9);
            this.ctx.hud.floatText(this.center(), `[<span class="b">summon</span>]`);
          }
        } else if (this.hasGun && dist < Balance.enemy.rangedFireRange && dist > 5) {
          // gunner: hold range and fire ink rounds
          this.fireCooldown -= dt;
          this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, -1.4, 1 - Math.exp(-dt * 10));
          if (this.fireCooldown <= 0) {
            this.fireCooldown = Balance.enemy.rangedCooldown;
            this.fireRanged(playerPos);
          }
        } else if (dist > this.attackRange) {
          // dashers periodically lunge to close the gap fast
          if (this.a.dasher) {
            this.lungeCooldown -= dt;
            if (this.lungeCooldown <= 0 && dist < 11 && dist > 3) {
              this.lungeCooldown = 1.6 + Math.random();
              this.vel.addScaledVector(toPlayer, this.speed * 4);
              this.ctx.particles.emberRise(this.center());
            }
          }
          this.vel.addScaledVector(toPlayer, this.speed * dt * 6);
          this.animateWalk(t);
        } else {
          this.state = "windup";
          // exploders prime a quick fuse instead of a normal swing
          this.timer = this.a.exploder ? 0.45 : this.windupTime;
          this.ctx.hud.floatText(
            this.center(),
            this.a.exploder ? `[<span class="b">priming</span>]` : `attack [<span class="b">incoming</span>]`
          );
        }
        break;
      }
      case "windup": {
        this.timer -= dt;
        if (this.a.exploder) {
          // swell + pulse as the fuse burns
          const p = 1 + (0.45 - this.timer) * 1.2;
          this.fig.root.scale.setScalar(this.a.scale * p);
        } else {
          this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, -2.2, 1 - Math.exp(-dt * 10));
        }
        if (this.timer <= 0) {
          if (this.a.exploder) {
            this.detonate(dist);
          } else {
            this.state = "strike";
            this.timer = 0.25;
            this.resolveStrike(dist, playerBlocking);
          }
        }
        break;
      }
      case "strike": {
        this.timer -= dt;
        this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, 0.4, 1 - Math.exp(-dt * 20));
        if (this.timer <= 0) {
          this.state = "approach";
        }
        break;
      }
      case "vulnerable": {
        this.timer -= dt;
        // slumped, swaying
        this.fig.root.rotation.z = Math.sin(t * 6) * 0.12;
        this.fig.armR.rotation.x = THREE.MathUtils.lerp(this.fig.armR.rotation.x, 0.2, 1 - Math.exp(-dt * 6));
        if (this.timer <= 0) {
          this.state = "approach";
          this.fig.root.rotation.z = 0;
        }
        break;
      }
    }

    // integrate movement
    this.vel.multiplyScalar(1 - 6 * dt);
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y = 0;
    this.fig.root.position.x = this.pos.x;
    this.fig.root.position.z = this.pos.z;
    // flyers hover above the ground, bobbing
    this.fig.root.position.y = this.a.flying ? 1.6 + Math.sin(t * 2 + this.walkPhase) * 0.35 : 0;

    // hit flash tint
    const flash = this.hitFlash > 0 ? 1 : 0;
    for (const m of this.fig.materials) {
      m.emissive.setScalar(flash * 0.6);
    }
  }

  /** Exploder payoff: ink blast that hits the player if close, then dies. */
  private detonate(dist: number) {
    this.ctx.particles.inkBurst(this.center(), 2.2);
    this.ctx.post.punchFlash(0.5);
    this.ctx.hitStop(Balance.feel.hitStop);
    if (dist < 3.6) Enemy.onStrike?.(this, false);
    this.die();
  }

  /** Did the player block / counter this strike, or take the hit? */
  private resolveStrike(dist: number, playerBlocking: boolean) {
    if (dist > this.attackRange + 0.8) {
      // player escaped the range
      return;
    }
    // The Player resolves the actual block/counter outcome and damage; the
    // enemy just signals intent. We emit an event via a global hook.
    Enemy.onStrike?.(this, playerBlocking);
  }

  /** Set by Player to receive strike resolution. */
  static onStrike: ((enemy: Enemy, playerBlocking: boolean) => void) | null = null;

  /** Gunner fires an ink round toward the player. */
  private fireRanged(playerPos: THREE.Vector3) {
    const muzzle = this.fig.pistol.getObjectByName("muzzle");
    const origin = muzzle
      ? muzzle.getWorldPosition(new THREE.Vector3())
      : this.center();
    const target = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dir = target.clone().sub(origin).normalize();
    this.ctx.particles.muzzle(origin, dir);
    this.ctx.audio.shoot();
    this.ctx.spawnProjectile(origin, dir, Balance.enemy.projectileDamage);
  }

  private animateWalk(t: number) {
    const s = Math.sin(t * 9 + this.walkPhase) * 0.5;
    this.fig.legL.rotation.x = s;
    this.fig.legR.rotation.x = -s;
    this.fig.armL.rotation.x = -s * 0.6;
    if (this.state !== "windup") this.fig.armR.rotation.x = s * 0.6;
  }

  dispose() {
    if (this.fig.root.parent) this.fig.root.parent.remove(this.fig.root);
    this.fig.root.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
