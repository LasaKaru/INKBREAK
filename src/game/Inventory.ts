import { WeaponDef, WEAPONS, WeaponKind } from "./Weapons";

export type ConsumableType = "heal" | "posture";

/**
 * Player inventory: owned ranged + melee weapons, the currently equipped index
 * in each category, ink-drop currency, and consumable counts. Also renders its
 * own pause-time panel (#inventory) and binds equip clicks.
 */
export class Inventory {
  ranged: string[] = ["pistol"];
  melee: string[] = ["katana"];
  rangedIdx = 0;
  meleeIdx = 0;
  inkDrops = 0;
  consumables: Record<ConsumableType, number> = { heal: 1, posture: 1 };

  /** Fired whenever loadout changes so the Player can refresh visuals/HUD. */
  onChange: (() => void) | null = null;

  private panel: HTMLElement;

  constructor() {
    this.panel = document.getElementById("inventory")!;
  }

  get rangedWeapon(): WeaponDef {
    return WEAPONS[this.ranged[this.rangedIdx]];
  }
  get meleeWeapon(): WeaponDef {
    return WEAPONS[this.melee[this.meleeIdx]];
  }

  private listFor(kind: WeaponKind) {
    return kind === "ranged" ? this.ranged : this.melee;
  }

  /** Add a weapon (from a pickup). Returns true if it was new. Auto-equips. */
  addWeapon(id: string): boolean {
    const def = WEAPONS[id];
    if (!def) return false;
    const list = this.listFor(def.kind);
    let isNew = false;
    if (!list.includes(id)) {
      list.push(id);
      isNew = true;
    }
    const idx = list.indexOf(id);
    if (def.kind === "ranged") this.rangedIdx = idx;
    else this.meleeIdx = idx;
    this.onChange?.();
    return isNew;
  }

  cycleRanged(dir = 1) {
    if (this.ranged.length < 2) return;
    this.rangedIdx = (this.rangedIdx + dir + this.ranged.length) % this.ranged.length;
    this.onChange?.();
  }
  cycleMelee(dir = 1) {
    if (this.melee.length < 2) return;
    this.meleeIdx = (this.meleeIdx + dir + this.melee.length) % this.melee.length;
    this.onChange?.();
  }

  equip(kind: WeaponKind, id: string) {
    const list = this.listFor(kind);
    const idx = list.indexOf(id);
    if (idx < 0) return;
    if (kind === "ranged") this.rangedIdx = idx;
    else this.meleeIdx = idx;
    this.onChange?.();
    this.render();
  }

  addInk(n: number) {
    this.inkDrops += n;
    this.onChange?.();
  }

  /** Consume one of a type if available. */
  use(type: ConsumableType): boolean {
    if (this.consumables[type] > 0) {
      this.consumables[type]--;
      this.onChange?.();
      return true;
    }
    return false;
  }

  addConsumable(type: ConsumableType, n = 1) {
    this.consumables[type] += n;
    this.onChange?.();
  }

  // ---------------- UI ----------------

  show() {
    this.render();
    this.panel.classList.remove("hidden");
  }
  hide() {
    this.panel.classList.add("hidden");
  }

  private weaponRow(kind: WeaponKind, id: string, equipped: boolean): string {
    const w = WEAPONS[id];
    return `
      <button class="inv-item ${equipped ? "equipped" : ""}" data-kind="${kind}" data-id="${id}">
        <span class="inv-name">${w.name}</span>
        <span class="inv-stat">dmg ${w.damage} · ${
      w.kind === "ranged" ? `rng ${w.range}` : `reach ${w.reach}`
    }${w.auto ? " · auto" : ""}${w.pellets ? ` · x${w.pellets}` : ""}</span>
        <span class="inv-blurb">${w.blurb}</span>
        ${equipped ? `<span class="inv-eq">[equipped]</span>` : ""}
      </button>`;
  }

  private render() {
    const rangedRows = this.ranged
      .map((id) => this.weaponRow("ranged", id, id === this.ranged[this.rangedIdx]))
      .join("");
    const meleeRows = this.melee
      .map((id) => this.weaponRow("melee", id, id === this.melee[this.meleeIdx]))
      .join("");

    this.panel.innerHTML = `
      <div class="inv-inner">
        <h2>[ inventory ]</h2>
        <div class="inv-currency">ink drops &nbsp;<b>[${this.inkDrops}]</b></div>
        <div class="inv-cols">
          <div class="inv-col">
            <h3>ranged &middot; <span class="key">L-Click</span> / cycle <span class="key">Q</span></h3>
            ${rangedRows}
          </div>
          <div class="inv-col">
            <h3>melee &middot; <span class="key">F</span> / cycle <span class="key">E</span></h3>
            ${meleeRows}
          </div>
        </div>
        <div class="inv-consumables">
          <span>consumables &middot; use <span class="key">1</span>/<span class="key">2</span></span>
          <span class="inv-cons">heal vial <b>[${this.consumables.heal}]</b></span>
          <span class="inv-cons">posture tonic <b>[${this.consumables.posture}]</b></span>
        </div>
        <p class="inv-hint">click a weapon to equip &middot; <span class="key">Tab</span> to close</p>
      </div>`;

    this.panel.querySelectorAll<HTMLElement>(".inv-item").forEach((el) => {
      el.addEventListener("click", () => {
        const kind = el.dataset.kind as WeaponKind;
        const id = el.dataset.id!;
        this.equip(kind, id);
      });
    });
  }
}
