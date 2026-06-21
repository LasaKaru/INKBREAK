import * as THREE from "three";
import { Enemy, ArchetypeId } from "./Enemy";
import { GameContext } from "./types";

/**
 * Spawns escalating waves of white figures. Between waves it shows the loading
 * banner from the third video ("loading 2nd enemies...") and a line of
 * narrative, then drops the next group in with an ink puff.
 */
export class EnemyManager {
  enemies: Enemy[] = [];
  wave = 0;
  private betweenTimer = 0;
  private spawning = false;
  private bossTriggered = false;
  wavesBeforeBoss = 3;
  /** Game decides when the boss may appear (waves cleared and/or objective done). */
  bossReady: () => boolean = () => this.wave >= this.wavesBeforeBoss;

  // narrative beats keyed to wave clears
  private quips = [
    {
      line: "Well... that was surprisingly easy enough,",
      said: "— he said, warily.",
    },
    {
      line: "More of them. The page keeps drawing more.",
      said: "— the ink would not dry.",
    },
    {
      line: "The prison breathes when it bleeds.",
      said: "— a thought, uninvited.",
    },
    {
      line: "Almost quiet now. Almost.",
      said: "— he lied to himself.",
    },
  ];

  constructor(
    private ctx: GameContext,
    private playerPos: () => THREE.Vector3,
    private onBossTime: () => void,
    private onIntermission: () => void
  ) {}

  /** Spawn one figure at a ring position (used by waves and boss summons). */
  private spawnOne(archetype: ArchetypeId) {
    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 6;
    const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const e = new Enemy(this.ctx, p, archetype);
    this.ctx.particles.inkBurst(e.center(), 0.7);
    this.enemies.push(e);
  }

  /** Weighted archetype pick that gets nastier in later waves. */
  private rollArchetype(): ArchetypeId {
    const w = this.wave;
    const pool: ArchetypeId[] = ["grunt", "grunt"];
    if (w > 1) pool.push("gunner", "exploder");
    if (w >= 2) pool.push("dasher", "brute", "flying");
    if (w >= 3) pool.push("shielded", "dasher", "summoner");
    if (w >= 4) pool.push("flying", "exploder");
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Boss reinforcements — drop figures in immediately. */
  summon(n: number) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => this.spawnOne(this.rollArchetype()), i * 250);
    }
  }

  /** Resume after the shop intermission — next wave, or the boss. */
  proceed() {
    if (this.bossReady()) {
      this.bossTriggered = true;
      this.onBossTime();
    } else {
      this.nextWave();
    }
  }

  start() {
    this.wave = 0;
    this.nextWave();
  }

  /** Wipe all enemies and reset wave state (used when advancing worlds). */
  reset() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    this.wave = 0;
    this.betweenTimer = 0;
    this.spawning = false;
    this.bossTriggered = false;
  }

  private nextWave() {
    this.wave++;
    this.spawning = true;
    const count = 2 + this.wave; // 3, 4, 5...
    const label = ordinal(this.wave);
    this.ctx.hud.banner(`loading ${label} enemies`, "the prison stirs");
    this.ctx.audio.wave();

    // stagger the spawns slightly for drama
    let spawned = 0;
    const doSpawn = () => {
      if (spawned >= count) {
        this.spawning = false;
        return;
      }
      this.spawnOne(this.rollArchetype());
      spawned++;
      setTimeout(doSpawn, 350);
    };
    doSpawn();
  }

  update(dt: number, t: number, playerBlocking: boolean) {
    const pp = this.playerPos();
    for (const e of this.enemies) {
      e.update(dt, t, pp, playerBlocking);
    }
    // cull fully-disposed dead enemies
    this.enemies = this.enemies.filter((e) => e.group.parent !== null);

    const livingCount = this.enemies.filter((e) => e.alive).length;

    if (this.bossTriggered) return; // boss phase owns the fight now

    if (!this.spawning && livingCount === 0 && this.betweenTimer <= 0) {
      // wave cleared
      const q = this.quips[(this.wave - 1) % this.quips.length];
      this.ctx.hud.say(q.line, q.said, 4.0);
      this.betweenTimer = 4.5;
    }

    if (this.betweenTimer > 0) {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) {
        // open the shop; Game calls proceed() when the player continues
        this.onIntermission();
      }
    }
  }

  get livingCount() {
    return this.enemies.filter((e) => e.alive).length;
  }
}

function ordinal(n: number): string {
  const names = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  return names[n - 1] ?? `${n}th`;
}
