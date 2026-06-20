import * as THREE from "three";
import { Input } from "./Input";
import { Particles } from "./Particles";
import { Arena } from "./Arena";
import { Environment } from "./Environment";
import { Sharks } from "./Sharks";
import { VoidSmoke } from "./VoidSmoke";
import { Player } from "./Player";
import { EnemyManager } from "./EnemyManager";
import { Projectiles } from "./Projectiles";
import { Pickups } from "./Pickups";
import { Boss } from "./Boss";
import { Balance } from "./balance";
import { HUD } from "../ui/HUD";
import { Audio } from "../audio/Audio";
import { Postprocessing } from "../render/Postprocessing";
import { GameContext } from "./types";

/**
 * Top-level game: scene/renderer setup, the monochrome lighting, the sketch
 * post-processing, the intro beat with the floating sharks, and the main loop
 * driving the wave combat and the "prison integrity" meta-meter.
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private input: Input;
  private particles: Particles;
  private hud: HUD;
  private audio: Audio;
  private post: Postprocessing;

  private arena: Arena;
  private environment: Environment;
  private sharks: Sharks;
  private voidSmoke: VoidSmoke;
  private player: Player;
  private enemies: EnemyManager;
  private projectiles: Projectiles;
  private pickups!: Pickups;
  private boss: Boss | null = null;
  private bossDefeated = false;
  private ctx: GameContext;

  private prisonIntegrity = 100;
  private started = false;
  private gameOver = false;
  private paused = false;
  private inventoryOpen = false;
  private elapsed = 0;
  private emberTimer = 0;
  private hitStopTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    // ---- renderer ----
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ---- scene ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe9e7e1);
    // deeper fog so the hall stays crisp but mountains wash toward the white horizon
    this.scene.fog = new THREE.Fog(0xe9e7e1, 36, 200);

    // ---- camera ----
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 6, 20);

    this.setupLights();

    // ---- subsystems ----
    this.input = new Input(canvas);
    this.particles = new Particles();
    this.scene.add(this.particles.points);
    this.hud = new HUD(this.camera);
    this.audio = new Audio();
    this.post = new Postprocessing(this.renderer, this.scene, this.camera);

    // ---- world ----
    this.environment = new Environment();
    this.scene.add(this.environment.group);
    this.arena = new Arena();
    this.scene.add(this.arena.group);
    this.sharks = new Sharks(4);
    this.scene.add(this.sharks.group);
    this.voidSmoke = new VoidSmoke(new THREE.Vector3(0, 16, 0));
    this.scene.add(this.voidSmoke.group);

    // ---- context + actors ----
    this.ctx = {
      scene: this.scene,
      camera: this.camera,
      input: this.input,
      particles: this.particles,
      hud: this.hud,
      audio: this.audio,
      post: this.post,
      getEnemies: () => this.enemies.enemies,
      onDestruction: (a) => this.tickIntegrity(a),
      hitStop: (d) => {
        this.hitStopTimer = Math.max(this.hitStopTimer, d);
      },
      spawnProjectile: (origin, dir, dmg) => this.projectiles.spawn(origin, dir, dmg),
      spawnLoot: (pos) => this.pickups.rollLoot(pos, this.enemies.wave),
      summonEnemies: (n) => this.enemies.summon(n),
      getBoss: () => this.boss,
    };

    this.projectiles = new Projectiles(Balance.enemy.projectileSpeed);
    this.scene.add(this.projectiles.group);
    this.player = new Player(this.ctx);
    this.enemies = new EnemyManager(this.ctx, () => this.player.pos, () => this.startBoss());

    // pickups feed straight into the player's inventory + the HUD
    this.pickups = new Pickups({
      addInk: (n) => this.player.inventory.addInk(n),
      addConsumable: (type, n) => this.player.inventory.addConsumable(type, n),
      addWeapon: (id) => this.player.inventory.addWeapon(id),
      float: (pos, text, big) => this.hud.floatText(pos, text, big),
    });
    this.scene.add(this.pickups.group);

    window.addEventListener("resize", () => this.onResize());

    this.bindStart(canvas);
    // render a couple of frames behind the title card so it isn't blank
    this.renderStill();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    // strong key light for the dramatic, high-contrast shadows / god-ray feel
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(12, 26, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    const d = 34;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    // cold rim/fill from the opposite side
    const fill = new THREE.DirectionalLight(0xdddddd, 0.4);
    fill.position.set(-14, 10, -10);
    this.scene.add(fill);

    // faint up-light from the void
    const voidGlow = new THREE.PointLight(0x222222, 0.6, 40);
    voidGlow.position.set(0, 14, 0);
    this.scene.add(voidGlow);
  }

  private bindStart(canvas: HTMLCanvasElement) {
    const titlecard = document.getElementById("titlecard")!;
    const btn = document.getElementById("start-btn")!;
    const quality = document.getElementById("quality") as HTMLSelectElement;
    btn.addEventListener("click", () => {
      this.audio.init();
      this.applyQuality(quality.value);
      titlecard.classList.add("hidden");
      this.input.requestLock();
      this.beginIntro();
    });
    // re-lock the pointer on click during play
    canvas.addEventListener("click", () => {
      if (this.started && !this.input.pointerLocked && !this.gameOver && !this.paused) {
        this.input.requestLock();
      }
    });

    // ---- pause handling: losing pointer lock mid-combat pauses ----
    const pausecard = document.getElementById("pausecard")!;
    document.addEventListener("pointerlockchange", () => {
      if (!this.started || this.gameOver) return;
      // the inventory screen manages its own pause; don't show the pause card
      if (this.inventoryOpen) return;
      if (!this.input.pointerLocked) {
        this.paused = true;
        pausecard.classList.remove("hidden");
      }
    });
    document.getElementById("resume-btn")!.addEventListener("click", () => {
      pausecard.classList.add("hidden");
      this.paused = false;
      this.input.requestLock();
    });
    document.getElementById("restart-btn")!.addEventListener("click", () => {
      location.reload();
    });

    // ---- inventory toggle (Tab) ----
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (this.started && !this.gameOver) this.toggleInventory();
      }
    });
  }

  private toggleInventory() {
    // can't open the inventory from the pause card
    if (this.paused && !this.inventoryOpen) return;
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      this.paused = true;
      this.player.inventory.show();
      document.exitPointerLock?.();
    } else {
      this.player.inventory.hide();
      this.paused = false;
      this.input.requestLock();
    }
  }

  /** Quality presets: trade fidelity for frame-rate on weaker devices. */
  private applyQuality(level: string) {
    if (level === "low") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      this.renderer.shadowMap.enabled = false;
    } else if (level === "high") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
    }
    this.onResize();
  }

  /** Cinematic intro: ink wipe + opening monologue, then the first wave. */
  private beginIntro() {
    if (this.started) return;
    this.started = true;
    this.inkWipe();

    this.hud.setPlayerHealth(100);
    this.hud.setPrisonIntegrity(100);

    setTimeout(() => {
      this.hud.say(
        "I woke inside a drawing of a prison.",
        "— and the drawing was not finished."
      );
    }, 900);

    setTimeout(() => {
      this.hud.banner("INKBREAK", "break the prison");
    }, 4200);

    setTimeout(() => {
      this.enemies.start();
    }, 5200);

    this.clock.start();
    this.loop();
  }

  /** Quick ink-to-paper wipe transition. */
  private inkWipe() {
    const wipe = document.getElementById("inkwipe")!;
    wipe.classList.add("on");
    setTimeout(() => wipe.classList.remove("on"), 480);
  }

  private tickIntegrity(amount: number) {
    // pre-boss flavour; the real win condition is the Warden's defeat. Floor it
    // so wave kills alone can never end the run before the boss appears.
    if (this.boss) return; // boss owns the integrity readout during the fight
    this.prisonIntegrity = Math.max(8, this.prisonIntegrity - amount);
    this.hud.setPrisonIntegrity(this.prisonIntegrity);
  }

  /** The prison wakes: spawn the Warden boss. */
  private startBoss() {
    this.boss = new Boss(this.ctx);
    this.hud.banner("THE WARDEN", "the prison wakes");
    this.post.punchFlash(0.6);
  }

  private win() {
    this.gameOver = true;
    this.hud.hideBoss();
    this.hud.setPrisonIntegrity(0);
    this.hud.banner("the prison breaks", "[0%]");
    this.hud.say(
      "The prison stood firm at a perfect [100%]... until it didn't.",
      "— and the page tore open.",
      999
    );
    this.post.punchFlash(0.9);
    document.exitPointerLock?.();
  }

  private lose() {
    this.gameOver = true;
    this.hud.banner("erased", "the ink takes you back");
    this.hud.say("So this is how the sketch ends.", "— the line went still.", 999);
    document.exitPointerLock?.();
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, this.renderer.getPixelRatio());
  }

  private renderStill() {
    this.post.update(0, 0);
    this.post.render();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const realDt = Math.min(this.clock.getDelta(), 0.05);

    // paused: hold the frame, keep grain alive but freeze gameplay
    if (this.paused) {
      this.input.endFrame();
      this.post.render();
      return;
    }

    // hit-stop: dilate gameplay time briefly on impacts for punch
    let scale = 1;
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= realDt;
      scale = 0.04; // Balance.feel.timeScaleFloor
    }
    const dt = realDt * scale;
    this.elapsed += dt;
    const t = this.elapsed;

    // ambient ink rising from the void column
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = 0.08;
      this.particles.emberRise(new THREE.Vector3((Math.random() - 0.5) * 2, 11, (Math.random() - 0.5) * 2));
    }

    if (!this.gameOver) {
      this.player.update(dt, t);
      this.enemies.update(dt, t, this.player.blockingState);
      this.projectiles.update(
        dt,
        this.player.pos,
        (dmg, from) => this.player.resolveProjectile(dmg, from),
        (at) => this.particles.hitSpark(at, 0.5)
      );
      this.pickups.update(dt, t, this.player.pos);

      // ---- boss ---- (keep updating through the death animation)
      if (this.boss) {
        this.boss.update(dt, t, this.player.pos, (dmg, from) =>
          this.player.resolveProjectile(dmg, from)
        );
        if (this.boss.alive) {
          this.hud.setPrisonIntegrity(this.boss.healthFrac * 100);
        } else if (!this.bossDefeated) {
          this.bossDefeated = true;
          this.hud.say(
            "The prison stood firm at a perfect [100%]... and then it broke.",
            "— the warden was only ever me.",
            999
          );
          setTimeout(() => this.win(), 2000);
        }
      }

      if (!this.player.alive && !this.gameOver) this.lose();
    } else {
      // keep the camera drifting for the end card
      this.camera.position.x += Math.sin(t * 0.2) * dt * 0.5;
      this.camera.lookAt(0, 6, 0);
    }

    this.arena.update(dt, t);
    this.environment.update(dt, t);
    this.sharks.update(dt, t);
    this.voidSmoke.update(dt, t);
    this.particles.update(dt);
    this.hud.update(dt);
    this.post.update(dt, t);

    this.input.endFrame();
    this.post.render();
  };
}
