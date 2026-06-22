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
import { Settings, SettingsState } from "./Settings";
import { Shop } from "./Shop";
import { Perks } from "./Perks";
import { Destructibles } from "./Destructibles";
import { Interactables } from "./Interactables";
import { Hazards } from "./Hazards";
import { LEVELS, SELECTABLE_LEVELS, LevelConfig, getLevel, nextLevel } from "./Levels";
import { Palette } from "./Palette";
import { Balance } from "./balance";
import { HUD } from "../ui/HUD";
import { Minimap, Blip } from "../ui/Minimap";
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
  private minimap: Minimap;
  private audio: Audio;
  private post: Postprocessing;
  private settings!: Settings;

  private arena!: Arena;
  private environment!: Environment;
  private destructibles!: Destructibles;
  private interactables!: Interactables;
  private hazards!: Hazards;
  private currentLevel: LevelConfig = getLevel(localStorage.getItem("inkbreak.level") || "prison");
  private unlocked: Set<string> = this.loadUnlocked();
  private sharks: Sharks;
  private voidSmoke: VoidSmoke;
  private player: Player;
  private enemies: EnemyManager;
  private projectiles: Projectiles;
  private pickups!: Pickups;
  private boss: Boss | null = null;
  private bossDefeated = false;
  private secretDoor: THREE.Group | null = null;
  private secretDoorPos = new THREE.Vector3();
  private nearSecret = false;
  private secretReturnId: string | null = null;
  private advancing = false;
  private shop!: Shop;
  private perks!: Perks;
  private perksOpen = false;
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

    // ---- scene ---- (bright paper white so the ink look stays high-contrast)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f3ef);
    // fog washes the far mountains toward the white horizon without muddying the hall
    this.scene.fog = new THREE.Fog(0xf4f3ef, 48, 210);

    // ---- camera ----
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      460
    );
    this.camera.position.set(0, 6, 20);

    this.setupLights();

    // ---- subsystems ----
    this.input = new Input(canvas);
    this.particles = new Particles();
    this.scene.add(this.particles.points);
    this.hud = new HUD(this.camera);
    this.minimap = new Minimap();
    this.audio = new Audio();
    this.post = new Postprocessing(this.renderer, this.scene, this.camera);

    // ---- world ----
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
      getDestructibles: () => this.destructibles,
      getInteractables: () => this.interactables,
    };

    this.projectiles = new Projectiles(Balance.enemy.projectileSpeed);
    this.scene.add(this.projectiles.group);
    this.player = new Player(this.ctx);
    this.enemies = new EnemyManager(
      this.ctx,
      () => this.player.pos,
      () => this.startBoss(),
      () => this.openShop()
    );

    // pickups feed straight into the player's inventory + the HUD
    this.pickups = new Pickups({
      addInk: (n) => this.player.inventory.addInk(n),
      addConsumable: (type, n) => this.player.inventory.addConsumable(type, n),
      addWeapon: (id) => this.player.inventory.addWeapon(id),
      float: (pos, text, big) => this.hud.floatText(pos, text, big),
    });
    this.scene.add(this.pickups.group);

    // between-wave ink shop
    this.shop = new Shop(
      {
        getInk: () => this.player.inventory.inkDrops,
        spend: (n) => this.player.spendInk(n),
        addConsumable: (t, n) => this.player.inventory.addConsumable(t, n),
        unlockWeapon: () => this.player.unlockRandomWeapon(),
        upgradeHealth: () => this.player.upgradeMaxHealth(),
        upgradeStamina: () => this.player.upgradeMaxStamina(),
        toast: (msg) => this.hud.banner(msg),
      },
      () => this.closeShop()
    );

    this.perks = new Perks(
      {
        getInk: () => this.player.inventory.inkDrops,
        spend: (n) => this.player.spendInk(n),
        player: this.player,
        toast: (msg) => this.hud.banner(msg),
      },
      () => this.closePerks()
    );

    // ---- settings (look / quality / volume) with live apply ----
    this.settings = new Settings((s) => this.applySettings(s));
    this.applySettings(this.settings.state);

    // ---- build the selected world (arena + environment + atmosphere) ----
    this.buildWorld(this.currentLevel);

    window.addEventListener("resize", () => this.onResize());

    this.bindStart(canvas);
    // render a couple of frames behind the title card so it isn't blank
    this.renderStill();
  }

  private setupLights() {
    // bright, even ambient for a clean cartoon read; the shader adds contrast + ink lines
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambient);

    // strong key light for the dramatic, high-contrast shadows / god-ray feel
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
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

    // rim/fill from the opposite side keeps shadowed faces from going pure black
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-14, 10, -10);
    this.scene.add(fill);
  }

  private bindStart(canvas: HTMLCanvasElement) {
    const titlecard = document.getElementById("titlecard")!;
    const pausecard = document.getElementById("pausecard")!;
    const btn = document.getElementById("start-btn")!;
    btn.addEventListener("click", () => {
      this.audio.init();
      this.audio.startMusic();
      titlecard.classList.add("hidden");
      this.input.requestLock();
      this.beginIntro();
    });
    // re-lock the pointer on click during play
    canvas.addEventListener("click", () => {
      if (
        this.started &&
        !this.input.pointerLocked &&
        !this.gameOver &&
        !this.paused &&
        !this.settings.isOpen &&
        !this.perksOpen
      ) {
        this.input.requestLock();
      }
    });

    // ---- pause handling: losing pointer lock mid-combat pauses ----
    document.addEventListener("pointerlockchange", () => {
      if (!this.started || this.gameOver) return;
      // the inventory / settings / shop / perks screens manage their own pause
      if (this.inventoryOpen || this.settings.isOpen || this.shop.isOpen || this.perksOpen) return;
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

    // ---- settings access from both menus ----
    document.getElementById("title-settings-btn")!.addEventListener("click", () => {
      this.settings.show();
    });
    document.getElementById("pause-settings-btn")!.addEventListener("click", () => {
      this.settings.show();
    });
    document.getElementById("pause-perks-btn")!.addEventListener("click", () => {
      this.openPerks(true);
    });

    // ---- world select ----
    this.buildLevelSelectUI();
    document.getElementById("title-worlds-btn")!.addEventListener("click", () => {
      document.getElementById("levelselect")!.classList.remove("hidden");
    });
    const titleLevel = document.getElementById("title-level");
    if (titleLevel) titleLevel.textContent = this.currentLevel.name;

    // ---- inventory (Tab) + perks (P) toggles ----
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (this.started && !this.gameOver && !this.settings.isOpen) this.toggleInventory();
      }
      if (e.key.toLowerCase() === "p") {
        if (this.started && !this.gameOver && !this.paused && !this.perksOpen) this.openPerks(false);
        else if (this.perksOpen && !this.perksReturnToPause) this.closePerks();
      }
      if (e.key.toLowerCase() === "g") {
        if (this.started && !this.gameOver && !this.paused && this.nearSecret) this.enterSecret();
      }
    });
  }

  /** Populate the world-select overlay with cards for each level. */
  private buildLevelSelectUI() {
    const panel = document.getElementById("levelselect")!;
    const cards = SELECTABLE_LEVELS.map((l) => {
      const locked = !this.unlocked.has(l.id);
      return `
      <button class="lvl-card ${l.id === this.currentLevel.id ? "active" : ""} ${locked ? "locked" : ""}" data-id="${l.id}" ${locked ? "data-locked=1" : ""}>
        <span class="lvl-name">${l.name} ${locked ? '<span class="lvl-lock">[locked]</span>' : ""}</span>
        <span class="lvl-sub">${l.subtitle}</span>
        <span class="lvl-blurb">${locked ? "clear the previous world to unlock." : l.blurb}</span>
      </button>`;
    }).join("");
    panel.innerHTML = `
      <div class="lvl-inner">
        <h2>[ choose a world ]</h2>
        <div class="lvl-grid">${cards}</div>
        <button id="lvl-close">[ back ]</button>
      </div>`;

    panel.querySelectorAll<HTMLElement>(".lvl-card").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.locked) return; // can't pick a locked world
        this.selectLevel(el.dataset.id!);
        panel.querySelectorAll(".lvl-card").forEach((c) => c.classList.remove("active"));
        el.classList.add("active");
      });
    });
    document.getElementById("lvl-close")!.addEventListener("click", () => {
      panel.classList.add("hidden");
    });
  }

  /** Apply settings: render look, quality (pixel ratio + shadows), volume. */
  private applySettings(s: SettingsState) {
    this.post.setLook(s);
    this.audio.setVolume(s.volume);

    // colour vs ink palette — recolour the world + actors if it changed
    const mode = s.color === "color" ? "color" : "ink";
    const changed = Palette.mode !== mode;
    Palette.mode = mode;
    this.post.setColorMode(mode === "color");
    if (changed && this.arena) {
      this.buildWorld(this.currentLevel);
      this.player.recolor();
      for (const e of this.enemies.enemies) e.applyPalette();
    }

    if (s.quality === "low") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      this.renderer.shadowMap.enabled = false;
    } else if (s.quality === "high") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
    }
    this.post.setSize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
    // live preview while not running (title/pause screens)
    if (!this.started || this.paused) this.renderStill();
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

  private loadUnlocked(): Set<string> {
    try {
      const r = localStorage.getItem("inkbreak.unlocked");
      if (r) return new Set(JSON.parse(r));
    } catch {
      /* ignore */
    }
    return new Set([LEVELS[0].id]);
  }

  private saveUnlocked() {
    try {
      localStorage.setItem("inkbreak.unlocked", JSON.stringify([...this.unlocked]));
    } catch {
      /* ignore */
    }
  }

  /** Mark the cleared level and unlock the next one; returns it (or null). */
  private unlockNext(): LevelConfig | null {
    const idx = LEVELS.findIndex((l) => l.id === this.currentLevel.id);
    const next = LEVELS[idx + 1];
    if (next && !this.unlocked.has(next.id)) {
      this.unlocked.add(next.id);
      this.saveUnlocked();
      this.buildLevelSelectUI(); // reflect the unlock if the menu reopens
      return next;
    }
    return null;
  }

  /** (Re)build the arena + environment + atmosphere for a level. */
  private buildWorld(cfg: LevelConfig) {
    this.currentLevel = cfg;
    if (this.arena) {
      this.scene.remove(this.arena.group);
      this.arena.dispose();
    }
    if (this.environment) {
      this.scene.remove(this.environment.group);
      this.environment.dispose();
    }
    this.arena = new Arena(cfg);
    this.scene.add(this.arena.group);
    this.environment = new Environment(cfg);
    this.scene.add(this.environment.group);

    if (this.destructibles) {
      this.scene.remove(this.destructibles.group);
      this.destructibles.dispose();
    }
    this.destructibles = new Destructibles(
      { particles: this.particles, audio: this.audio },
      cfg.crates,
      cfg.boundary,
      (pos) => this.pickups.spawn(pos, "ink", 2)
    );
    this.scene.add(this.destructibles.group);

    if (this.hazards) {
      this.scene.remove(this.hazards.group);
      this.hazards.dispose();
    }
    this.hazards = new Hazards(cfg.pits, cfg.spikes, cfg.boundary);
    this.scene.add(this.hazards.group);

    if (this.interactables) {
      this.scene.remove(this.interactables.group);
      this.interactables.dispose();
    }
    this.interactables = new Interactables(
      {
        inkBurst: (p, s) => this.particles.inkBurst(p, s),
        hitSpark: (p, s) => this.particles.hitSpark(p, s),
        audioHit: () => this.audio.death(),
        flash: (a) => this.post.punchFlash(a),
      },
      cfg.objective === "shatter" ? cfg.shrines : 0,
      cfg.boundary,
      (pos, remaining) => this.onShrineShattered(pos, remaining)
    );
    this.scene.add(this.interactables.group);

    this.buildSecretDoor(cfg);

    // the boss only appears once this world's objective is met
    this.enemies.bossReady = () =>
      cfg.objective === "shatter"
        ? this.interactables.remaining === 0
        : this.enemies.wave >= cfg.wavesBeforeBoss;
    this.refreshObjective();

    const bg = Palette.pick(cfg.bg, 0xdfeaf2);
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = new THREE.Fog(bg, cfg.fogNear, cfg.fogFar);
    this.player.boundary = cfg.boundary;
    this.enemies.wavesBeforeBoss = cfg.wavesBeforeBoss;

    if (!this.started) this.renderStill();
  }

  /** A hidden door, tucked near the rim, that warps to the secret Sanctum. */
  private buildSecretDoor(cfg: LevelConfig) {
    if (this.secretDoor) {
      this.scene.remove(this.secretDoor);
      this.secretDoor = null;
    }
    if (cfg.hidden) return; // no door inside the secret world itself

    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.8, flatShading: true });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), stone);
    left.position.set(-1.1, 2.1, 0);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), stone);
    right.position.set(1.1, 2.1, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 0.6), stone);
    top.position.set(0, 4.3, 0);
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 3.9, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.6 })
    );
    slab.position.set(0, 2.05, 0);
    // glowing keyhole sigil
    const key = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf2f0ea, emissive: 0xffffff })
    );
    key.position.set(0, 2.4, 0.2);
    key.name = "sigil";
    g.add(left, right, top, slab, key);
    g.traverse((o: THREE.Object3D) => ((o as THREE.Mesh).castShadow = true));

    // tuck it against the wall at a fixed, discoverable-but-quiet angle
    const a = 2.2;
    const r = cfg.boundary - 1.5;
    this.secretDoorPos.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.position.copy(this.secretDoorPos);
    g.lookAt(0, 2, 0);
    this.scene.add(g);
    this.secretDoor = g;
  }

  /** Warp into the hidden Sanctum, granting the legendary Voidedge blade. */
  private enterSecret() {
    if (!this.started || this.gameOver || this.advancing) return;
    this.secretReturnId = this.currentLevel.id;
    this.player.inventory.addWeapon("voidedge");
    this.hud.banner("a secret door opens", "the Voidedge is yours");
    this.hud.say("Behind the page, a blade was waiting.", "— Voidedge acquired.", 4);
    this.advanceWorld(getLevel("sanctum"));
  }

  private unlockWorld(id: string) {
    if (!this.unlocked.has(id)) {
      this.unlocked.add(id);
      this.saveUnlocked();
      this.buildLevelSelectUI();
    }
  }

  private resetBoss() {
    if (this.boss) this.boss.dispose();
    this.boss = null;
    this.hud.hideBoss();
  }

  /** Transition into a world mid-run, keeping loadout / perks / ink. */
  private advanceWorld(cfg: LevelConfig) {
    this.advancing = true;
    this.hud.setPrompt("");
    this.inkWipe();
    setTimeout(() => {
      this.buildWorld(cfg);
      this.enemies.reset();
      this.resetBoss();
      this.bossDefeated = false;
      this.prisonIntegrity = 100;
      this.hud.setPrisonIntegrity(100);
      // place the figure near the edge, facing in
      this.player.pos.set(0, 0, cfg.boundary * 0.45);
      this.player.vel.set(0, 0, 0);
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
      this.hud.setPlayerHealth(this.player.health);
      this.hud.banner(cfg.name, cfg.subtitle);
      this.advancing = false;
      setTimeout(() => this.enemies.start(), 700);
    }, 520);
  }

  /** Called once when a world's Warden is defeated — advance the campaign. */
  private onBossDefeated() {
    this.bossDefeated = true;
    this.hud.setPrisonIntegrity(0);

    // clearing the secret sanctum returns you to the main campaign
    if (this.currentLevel.hidden) {
      const ret = this.secretReturnId ?? "prison";
      this.secretReturnId = null;
      const nxt = nextLevel(ret);
      this.hud.banner("the sanctum yields", "the page turns");
      if (nxt) {
        this.unlockWorld(nxt.id);
        setTimeout(() => this.advanceWorld(nxt), 2600);
      } else {
        setTimeout(() => this.win(), 2200);
      }
      return;
    }

    const nxt = nextLevel(this.currentLevel.id);
    if (nxt) {
      this.unlockWorld(nxt.id);
      this.hud.banner(`${this.currentLevel.name} falls`, `next · ${nxt.name}`);
      this.hud.say("The world breaks open. Another bleeds through.", "— onward.", 3);
      setTimeout(() => this.advanceWorld(nxt), 2900);
    } else {
      this.win();
    }
  }

  /** Feed the corner radar with the current world's blips. */
  private updateMinimap() {
    const blips: Blip[] = [];
    for (const e of this.enemies.enemies) {
      if (e.alive) blips.push({ x: e.pos.x, z: e.pos.z, kind: e.isFlying ? "flyer" : "enemy" });
    }
    if (this.boss && this.boss.alive) blips.push({ x: 0, z: 0, kind: "boss" });
    for (const s of this.interactables.shrines) {
      if (s.alive) blips.push({ x: s.pos.x, z: s.pos.z, kind: "shrine" });
    }
    if (this.secretDoor) {
      blips.push({ x: this.secretDoorPos.x, z: this.secretDoorPos.z, kind: "door" });
    }
    this.minimap.update(
      this.player.pos.x,
      this.player.pos.z,
      this.player.fig.root.rotation.y,
      blips,
      this.currentLevel.boundary + 8
    );
  }

  /** Update the objective line in the HUD for the current world state. */
  private refreshObjective() {
    if (this.gameOver) return this.hud.setObjective("");
    if (this.currentLevel.objective === "shatter" && this.interactables) {
      const t = this.interactables.total;
      const done = t - this.interactables.remaining;
      if (this.interactables.remaining > 0) {
        this.hud.setObjective(`objective · shatter the ink shrines <b>[${done}/${t}]</b>`);
      } else {
        this.hud.setObjective(`objective · <b>the way is open</b> — face the warden`);
      }
    } else {
      this.hud.setObjective("");
    }
  }

  private onShrineShattered(pos: THREE.Vector3, remaining: number) {
    // big ink payoff
    for (let i = 0; i < 4; i++) this.pickups.spawn(pos, "ink", 3);
    this.pickups.spawn(pos, "posture", 1);
    this.hud.floatText(pos.clone().setY(4), `<span class="b">[shrine shattered]</span>`, true);
    this.refreshObjective();
    if (remaining === 0) {
      this.hud.banner("the way is open", "the warden stirs");
      this.hud.say("The shrines are silent now. Only the Warden remains.", "— the page thins.", 4);
    }
  }

  /** Pick a level/location (from the world-select screen). */
  private selectLevel(id: string) {
    if (this.started || !this.unlocked.has(id)) return;
    const cfg = getLevel(id);
    try {
      localStorage.setItem("inkbreak.level", cfg.id);
    } catch {
      /* ignore */
    }
    this.buildWorld(cfg);
    const label = document.getElementById("title-level");
    if (label) label.textContent = cfg.name;
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

  /** Open the between-wave shop (pauses, releases the mouse). */
  private openShop() {
    this.paused = true;
    document.exitPointerLock?.();
    this.shop.show();
  }

  /** Continue from the shop into the next wave (or the boss). */
  private closeShop() {
    this.shop.hide();
    this.paused = false;
    this.input.requestLock();
    this.enemies.proceed();
  }

  private perksReturnToPause = false;

  /** Open the Ink Arts perk screen. */
  private openPerks(fromPause: boolean) {
    if (!this.started || this.gameOver) return;
    this.perksReturnToPause = fromPause;
    if (fromPause) document.getElementById("pausecard")!.classList.add("hidden");
    this.paused = true;
    this.perksOpen = true;
    document.exitPointerLock?.();
    this.perks.show();
  }

  private closePerks() {
    this.perks.hide();
    this.perksOpen = false;
    if (this.perksReturnToPause) {
      document.getElementById("pausecard")!.classList.remove("hidden");
    } else {
      this.paused = false;
      this.input.requestLock();
    }
  }

  /** The prison wakes: spawn the Warden boss. */
  private startBoss() {
    this.boss = new Boss(this.ctx);
    this.hud.banner("THE WARDEN", "the prison wakes");
    this.hud.setObjective("");
    this.post.punchFlash(0.6);
  }

  /** Final victory — the whole campaign is done. */
  private win() {
    this.gameOver = true;
    this.hud.hideBoss();
    this.hud.setPrisonIntegrity(0);
    this.hud.setPrompt("");
    this.hud.banner("every world unmade", "[0%]");
    this.hud.say(
      "The prison stood firm at a perfect [100%]... until it didn't. Every page, torn.",
      "— the artist set down the pen. reload to begin again.",
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
        (at) => this.particles.hitSpark(at, 0.5),
        (at) => this.destructibles.absorb(at, 20)
      );
      this.pickups.update(dt, t, this.player.pos);

      // ---- hazards (ink pits + spike traps) ----
      this.hazards.update(dt, this.player.pos, this.enemies.enemies, {
        hurtPlayer: (n) => this.player.damage(n),
        slowPlayer: (f) => (this.player.externalSlow = f),
        spark: (p, s) => this.particles.hitSpark(p, s),
      });

      // ---- boss ---- (keep updating through the death animation)
      if (this.boss) {
        this.boss.update(dt, t, this.player.pos, (dmg, from) =>
          this.player.resolveProjectile(dmg, from)
        );
        if (this.boss.alive) {
          this.hud.setPrisonIntegrity(this.boss.healthFrac * 100);
        } else if (!this.bossDefeated) {
          this.onBossDefeated();
        }
      }

      // ---- secret door proximity + sigil glow ----
      if (this.secretDoor && !this.advancing) {
        const d = this.player.pos.distanceTo(this.secretDoorPos);
        const sigil = this.secretDoor.getObjectByName("sigil");
        if (sigil) {
          (sigil as THREE.Mesh).rotation.z += dt * 2;
          ((sigil as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.setScalar(
            0.4 + Math.sin(t * 4) * 0.3
          );
        }
        const near = d < 3.4;
        if (near !== this.nearSecret) {
          this.nearSecret = near;
          this.hud.setPrompt(near ? "a secret door hums — press <b>[G]</b>" : "");
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
    this.destructibles.update(dt);
    this.interactables.update(dt, t);
    this.sharks.update(dt, t);
    this.voidSmoke.update(dt, t);
    this.particles.update(dt);
    this.hud.update(dt);
    if (!this.gameOver) {
      this.updateMinimap();
      // music swells with the threat on screen
      let mi = 0.3;
      if (this.boss && this.boss.alive) mi = 1.0;
      else {
        const live = this.enemies.livingCount;
        mi = live > 0 ? Math.min(0.9, 0.45 + live * 0.06) : 0.3;
      }
      this.audio.setMusicIntensity(mi);
    } else {
      this.audio.setMusicIntensity(0.16);
    }
    this.post.update(dt, t);

    this.input.endFrame();
    this.post.render();
  };
}
