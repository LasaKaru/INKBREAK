import * as THREE from "three";
import { Enemy } from "./Enemy";
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

  constructor(private ctx: GameContext, private playerPos: () => THREE.Vector3) {}

  start() {
    this.wave = 0;
    this.nextWave();
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
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 6;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      const hasGun = Math.random() < 0.35 && this.wave > 1;
      const e = new Enemy(this.ctx, p, hasGun);
      // ink-in spawn puff
      this.ctx.particles.inkBurst(e.center(), 0.7);
      this.enemies.push(e);
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

    if (!this.spawning && livingCount === 0 && this.betweenTimer <= 0) {
      // wave cleared
      const q = this.quips[(this.wave - 1) % this.quips.length];
      this.ctx.hud.say(q.line, q.said, 4.0);
      this.betweenTimer = 4.5;
    }

    if (this.betweenTimer > 0) {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) {
        this.nextWave();
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
