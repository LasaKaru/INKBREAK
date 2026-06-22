/**
 * INKBREAK settings: render-look knobs (contrast, edges, posterize levels,
 * hatching, grain, vignette), quality, and volume. Persists to localStorage,
 * exposes presets, and builds its own settings panel UI with live preview.
 */
export interface SettingsState {
  preset: string;
  contrast: number;
  brightness: number;
  edge: number;
  levels: number;
  hatching: number;
  grain: number;
  vignette: number;
  quality: "low" | "medium" | "high";
  volume: number;
  color: "ink" | "color";
}

export const PRESETS: Record<string, Partial<SettingsState>> = {
  cartoon: { contrast: 1.7, brightness: 1.34, edge: 2.4, levels: 3, hatching: 0, grain: 0, vignette: 0.05 },
  clean: { contrast: 1.6, brightness: 1.15, edge: 1.6, levels: 4, hatching: 0.1, grain: 0.02, vignette: 0.14 },
  manga: { contrast: 2.0, brightness: 1.22, edge: 2.1, levels: 3, hatching: 0.18, grain: 0.0, vignette: 0.1 },
  sketch: { contrast: 1.3, brightness: 1.05, edge: 1.3, levels: 5, hatching: 0.45, grain: 0.12, vignette: 0.32 },
  noir: { contrast: 2.3, brightness: 1.0, edge: 1.9, levels: 2, hatching: 0.22, grain: 0.05, vignette: 0.48 },
};

const DEFAULTS: SettingsState = {
  preset: "cartoon",
  ...PRESETS.cartoon,
  quality: "high",
  volume: 0.6,
  color: "ink",
} as SettingsState;

const STORAGE_KEY = "inkbreak.settings.v2"; // bumped: default look is now "cartoon"

interface SliderDef {
  key: keyof SettingsState;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: "contrast", label: "contrast", min: 0.6, max: 2.6, step: 0.05 },
  { key: "brightness", label: "brightness", min: 0.7, max: 1.6, step: 0.02 },
  { key: "edge", label: "ink outline", min: 0, max: 3, step: 0.05 },
  { key: "levels", label: "tone bands", min: 2, max: 8, step: 1 },
  { key: "hatching", label: "hatching", min: 0, max: 1, step: 0.02 },
  { key: "grain", label: "grain", min: 0, max: 0.3, step: 0.01 },
  { key: "vignette", label: "vignette", min: 0, max: 0.8, step: 0.02 },
  { key: "volume", label: "volume", min: 0, max: 1, step: 0.05 },
];

export class Settings {
  state: SettingsState;
  private panel: HTMLElement;
  private apply: (s: SettingsState) => void;

  constructor(apply: (s: SettingsState) => void) {
    this.apply = apply;
    this.state = this.load();
    this.panel = document.getElementById("settings")!;
    this.buildUI();
  }

  private load(): SettingsState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return { ...DEFAULTS };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  /** Push current values to the game + persist. */
  commit() {
    this.apply(this.state);
    this.save();
  }

  private usePreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    this.state = { ...this.state, ...p, preset: name };
    this.commit();
    this.refreshControls();
  }

  private buildUI() {
    const sliderRows = SLIDERS.map(
      (s) => `
      <div class="set-row">
        <label>${s.label}</label>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" />
        <span class="set-val" data-val="${s.key}"></span>
      </div>`
    ).join("");

    const presetBtns = Object.keys(PRESETS)
      .map((p) => `<button class="set-preset" data-preset="${p}">${p}</button>`)
      .join("");

    this.panel.innerHTML = `
      <div class="set-inner">
        <h2>[ settings ]</h2>
        <div class="set-group">
          <h3>look · presets</h3>
          <div class="set-presets">${presetBtns}</div>
        </div>
        <div class="set-group">
          <h3>fine tune</h3>
          ${sliderRows}
        </div>
        <div class="set-group">
          <h3>palette</h3>
          <div class="set-quality">
            <button class="set-color" data-color="ink">ink (b&amp;w)</button>
            <button class="set-color" data-color="color">colour</button>
          </div>
        </div>
        <div class="set-group">
          <h3>quality</h3>
          <div class="set-quality">
            <button class="set-q" data-q="low">low</button>
            <button class="set-q" data-q="medium">medium</button>
            <button class="set-q" data-q="high">high</button>
          </div>
        </div>
        <div class="set-actions">
          <button id="set-reset" class="ghost">[ reset ]</button>
          <button id="set-close">[ back ]</button>
        </div>
      </div>`;

    // sliders
    this.panel.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((el) => {
      el.addEventListener("input", () => {
        const key = el.dataset.key as keyof SettingsState;
        (this.state[key] as number) = parseFloat(el.value);
        this.state.preset = "custom";
        this.updateValueLabel(key);
        this.commit();
      });
    });

    // presets
    this.panel.querySelectorAll<HTMLElement>(".set-preset").forEach((el) => {
      el.addEventListener("click", () => this.usePreset(el.dataset.preset!));
    });

    // quality
    this.panel.querySelectorAll<HTMLElement>(".set-q").forEach((el) => {
      el.addEventListener("click", () => {
        this.state.quality = el.dataset.q as SettingsState["quality"];
        this.commit();
        this.refreshControls();
      });
    });

    // palette (colour mode)
    this.panel.querySelectorAll<HTMLElement>(".set-color").forEach((el) => {
      el.addEventListener("click", () => {
        this.state.color = el.dataset.color as SettingsState["color"];
        this.commit();
        this.refreshControls();
      });
    });

    document.getElementById("set-reset")!.addEventListener("click", () => {
      this.state = { ...DEFAULTS };
      this.commit();
      this.refreshControls();
    });
    document.getElementById("set-close")!.addEventListener("click", () => this.hide());

    this.refreshControls();
  }

  private updateValueLabel(key: keyof SettingsState) {
    const span = this.panel.querySelector<HTMLElement>(`[data-val="${key}"]`);
    if (span) {
      const v = this.state[key] as number;
      span.textContent = Number.isInteger(v) ? `${v}` : v.toFixed(2);
    }
  }

  /** Sync UI controls to current state. */
  private refreshControls() {
    this.panel.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((el) => {
      const key = el.dataset.key as keyof SettingsState;
      el.value = String(this.state[key]);
      this.updateValueLabel(key);
    });
    this.panel.querySelectorAll<HTMLElement>(".set-q").forEach((el) => {
      el.classList.toggle("active", el.dataset.q === this.state.quality);
    });
    this.panel.querySelectorAll<HTMLElement>(".set-color").forEach((el) => {
      el.classList.toggle("active", el.dataset.color === this.state.color);
    });
    this.panel.querySelectorAll<HTMLElement>(".set-preset").forEach((el) => {
      el.classList.toggle("active", el.dataset.preset === this.state.preset);
    });
  }

  show() {
    this.refreshControls();
    this.panel.classList.remove("hidden");
  }
  hide() {
    this.panel.classList.add("hidden");
  }
  get isOpen() {
    return !this.panel.classList.contains("hidden");
  }
}
