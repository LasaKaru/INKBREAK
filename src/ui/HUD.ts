import * as THREE from "three";

/**
 * HTML/CSS HUD layer. Projects world positions to screen for floating combat
 * text and the targeting reticle, and drives the bracketed feedback strings
 * that define the INKBREAK look: [countered] successful, [45%], etc.
 */
export class HUD {
  private floaters: HTMLElement;
  private playerHealth: HTMLElement;
  private prisonIntegrity: HTMLElement;
  private narrative: HTMLElement;
  private waveBanner: HTMLElement;
  private reticle: HTMLElement;
  private staminaFill: HTMLElement;
  private staminaWrap: HTMLElement;
  private narrativeTimer = 0;

  constructor(private camera: THREE.Camera) {
    this.floaters = document.getElementById("floaters")!;
    this.playerHealth = document.getElementById("player-health")!;
    this.prisonIntegrity = document.getElementById("prison-integrity")!;
    this.narrative = document.getElementById("narrative")!;
    this.waveBanner = document.getElementById("wave-banner")!;
    this.reticle = document.getElementById("reticle")!;
    this.staminaFill = document.getElementById("stamina-fill")!;
    this.staminaWrap = document.getElementById("stamina")!;
  }

  /** Posture meter, 0..1. Flagged broken when the guard is down. */
  setStamina(frac: number, broken: boolean) {
    this.staminaFill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    this.staminaWrap.classList.toggle("broken", broken);
  }

  private project(pos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = pos.clone().project(this.camera);
    const visible = v.z < 1;
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      visible,
    };
  }

  /** Floating bracketed combat text at a world position. */
  floatText(worldPos: THREE.Vector3, text: string, big = false) {
    const { x, y, visible } = this.project(worldPos);
    if (!visible) return;
    const el = document.createElement("div");
    el.className = "floater" + (big ? " big" : "");
    el.innerHTML = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.floaters.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  setPlayerHealth(pct: number) {
    this.playerHealth.textContent = `[${Math.max(0, Math.round(pct))}%]`;
    this.playerHealth.classList.remove("hurt");
    // force reflow to restart the shake animation
    void this.playerHealth.offsetWidth;
    this.playerHealth.classList.add("hurt");
  }

  setPrisonIntegrity(pct: number) {
    this.prisonIntegrity.textContent = `[${Math.max(0, Math.round(pct))}%]`;
  }

  /** Reticle follows the locked target; null hides it. */
  updateReticle(targetWorld: THREE.Vector3 | null, locked: boolean) {
    if (!targetWorld) {
      this.reticle.classList.remove("active", "locked");
      return;
    }
    const { x, y, visible } = this.project(targetWorld);
    if (!visible) {
      this.reticle.classList.remove("active");
      return;
    }
    this.reticle.style.left = `${x}px`;
    this.reticle.style.top = `${y}px`;
    this.reticle.style.transform = "translate(-50%, -50%)";
    this.reticle.classList.add("active");
    this.reticle.classList.toggle("locked", locked);
  }

  /** Bottom narrative monologue, in the handwritten font. */
  say(line: string, attribution?: string, duration = 4.5) {
    this.narrative.innerHTML =
      line + (attribution ? `<span class="said">${attribution}</span>` : "");
    this.narrative.classList.add("show");
    this.narrativeTimer = duration;
  }

  banner(main: string, sub = "") {
    this.waveBanner.innerHTML = main + (sub ? `<span class="sub">${sub}</span>` : "");
    this.waveBanner.classList.add("show");
    setTimeout(() => this.waveBanner.classList.remove("show"), 2600);
  }

  update(dt: number) {
    if (this.narrativeTimer > 0) {
      this.narrativeTimer -= dt;
      if (this.narrativeTimer <= 0) this.narrative.classList.remove("show");
    }
  }
}
