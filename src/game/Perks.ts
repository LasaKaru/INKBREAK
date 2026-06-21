import type { Player } from "./Player";

export interface PerkFx {
  getInk: () => number;
  spend: (n: number) => boolean;
  player: Player;
  toast: (msg: string) => void;
}

interface PerkDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  maxRank: number;
  apply: (p: Player) => void;
}

/**
 * Ink Arts — a per-run perk screen. Spend ink on lasting buffs that stack in
 * ranks; cost rises each rank. Resets when the page reloads (roguelite-style).
 */
export class Perks {
  private panel: HTMLElement;
  private ranks: Record<string, number> = {};

  private defs: PerkDef[] = [
    { id: "vigor", name: "Vigor", desc: "+20 max health (full heal)", baseCost: 40, maxRank: 4, apply: (p) => p.upgradeMaxHealth() },
    { id: "endurance", name: "Endurance", desc: "+20 max posture", baseCost: 35, maxRank: 4, apply: (p) => p.upgradeMaxStamina() },
    { id: "swiftness", name: "Swiftness", desc: "+12% move speed", baseCost: 45, maxRank: 3, apply: (p) => (p.speedMult += 0.12) },
    { id: "sharpened", name: "Sharpened Ink", desc: "+20% melee damage", baseCost: 50, maxRank: 4, apply: (p) => (p.meleeMult += 0.2) },
    { id: "steady", name: "Steady Hand", desc: "+20% ranged damage", baseCost: 50, maxRank: 4, apply: (p) => (p.rangedMult += 0.2) },
    { id: "bloodletting", name: "Bloodletting", desc: "+4 lifesteal per melee hit", baseCost: 60, maxRank: 3, apply: (p) => (p.lifesteal += 4) },
    { id: "quickstep", name: "Quickstep", desc: "-15% dash cooldown", baseCost: 40, maxRank: 3, apply: (p) => (p.dashCdMult *= 0.85) },
    { id: "affinity", name: "Ink Affinity", desc: "+25% ink gained", baseCost: 45, maxRank: 3, apply: (p) => (p.inkMult += 0.25) },
  ];

  constructor(private fx: PerkFx, private onClose: () => void) {
    this.panel = document.getElementById("perks")!;
  }

  private cost(def: PerkDef) {
    return Math.round(def.baseCost * (1 + (this.ranks[def.id] ?? 0) * 0.6));
  }

  private render() {
    const ink = this.fx.getInk();
    const rows = this.defs
      .map((d) => {
        const rank = this.ranks[d.id] ?? 0;
        const maxed = rank >= d.maxRank;
        const c = this.cost(d);
        const afford = !maxed && ink >= c;
        const pips = "●".repeat(rank) + "○".repeat(d.maxRank - rank);
        return `
        <button class="perk-item ${afford ? "" : "broke"} ${maxed ? "maxed" : ""}" data-id="${d.id}">
          <span class="perk-name">${d.name} <span class="perk-pips">${pips}</span></span>
          <span class="perk-desc">${d.desc}</span>
          <span class="perk-cost">${maxed ? "[maxed]" : `[${c} ink]`}</span>
        </button>`;
      })
      .join("");

    this.panel.innerHTML = `
      <div class="perk-inner">
        <h2>[ ink arts ]</h2>
        <div class="perk-currency">you carry &nbsp;<b>[${ink} ink]</b></div>
        <div class="perk-list">${rows}</div>
        <p class="perk-hint">spend ink on lasting power — it fades when the page is redrawn.</p>
        <button id="perk-close">[ done ]</button>
      </div>`;

    this.panel.querySelectorAll<HTMLElement>(".perk-item").forEach((el) => {
      el.addEventListener("click", () => this.buy(el.dataset.id!));
    });
    document.getElementById("perk-close")!.addEventListener("click", () => {
      this.hide();
      this.onClose();
    });
  }

  private buy(id: string) {
    const def = this.defs.find((d) => d.id === id);
    if (!def) return;
    const rank = this.ranks[id] ?? 0;
    if (rank >= def.maxRank) return;
    const c = this.cost(def);
    if (this.fx.getInk() < c) {
      this.fx.toast("not enough ink");
      return;
    }
    if (!this.fx.spend(c)) return;
    this.ranks[id] = rank + 1;
    def.apply(this.fx.player);
    this.fx.toast(`${def.name} ${this.ranks[id]}`);
    this.render();
  }

  show() {
    this.render();
    this.panel.classList.remove("hidden");
  }
  hide() {
    this.panel.classList.add("hidden");
  }
  get isOpen() {
    return !this.panel.classList.contains("hidden");
  }
}
