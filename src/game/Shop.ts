import { Balance } from "./balance";

export interface ShopEffects {
  getInk: () => number;
  spend: (n: number) => boolean;
  addConsumable: (t: "heal" | "posture", n: number) => void;
  unlockWeapon: () => string | null; // returns weapon name, or null if all owned
  upgradeHealth: () => void;
  upgradeStamina: () => void;
  toast: (msg: string) => void;
}

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  buy: (fx: ShopEffects) => boolean; // returns true on success
}

/**
 * Between-wave ink shop. Spend ink-drop currency on consumables, a random new
 * weapon, or permanent max-health / max-posture upgrades, then continue.
 */
export class Shop {
  private panel: HTMLElement;

  private items: ShopItem[] = [
    {
      id: "heal",
      name: "Heal Vial",
      desc: "restores health when used",
      cost: Balance.shop.healVial,
      buy: (fx) => {
        fx.addConsumable("heal", 1);
        return true;
      },
    },
    {
      id: "posture",
      name: "Posture Tonic",
      desc: "restores posture when used",
      cost: Balance.shop.postureTonic,
      buy: (fx) => {
        fx.addConsumable("posture", 1);
        return true;
      },
    },
    {
      id: "weapon",
      name: "Unmarked Weapon Crate",
      desc: "unlocks a random new weapon",
      cost: Balance.shop.weapon,
      buy: (fx) => {
        const name = fx.unlockWeapon();
        if (!name) {
          fx.toast("nothing new to find");
          return false; // refunded
        }
        fx.toast(`acquired ${name}`);
        return true;
      },
    },
    {
      id: "hp",
      name: "Reinforced Frame",
      desc: "+20 max health (and full heal)",
      cost: Balance.shop.maxHealthUp,
      buy: (fx) => {
        fx.upgradeHealth();
        return true;
      },
    },
    {
      id: "sta",
      name: "Iron Resolve",
      desc: "+20 max posture",
      cost: Balance.shop.maxStaminaUp,
      buy: (fx) => {
        fx.upgradeStamina();
        return true;
      },
    },
  ];

  constructor(private fx: ShopEffects, private onContinue: () => void) {
    this.panel = document.getElementById("shop")!;
  }

  private render() {
    const ink = this.fx.getInk();
    const rows = this.items
      .map((it) => {
        const afford = ink >= it.cost;
        return `
        <button class="shop-item ${afford ? "" : "broke"}" data-id="${it.id}">
          <span class="shop-name">${it.name}</span>
          <span class="shop-desc">${it.desc}</span>
          <span class="shop-cost">[${it.cost} ink]</span>
        </button>`;
      })
      .join("");

    this.panel.innerHTML = `
      <div class="shop-inner">
        <h2>[ ink shop ]</h2>
        <div class="shop-currency">you carry &nbsp;<b>[${ink} ink]</b></div>
        <div class="shop-list">${rows}</div>
        <p class="shop-hint">the prison gathers itself between breaths.</p>
        <button id="shop-continue">[ continue ]</button>
      </div>`;

    this.panel.querySelectorAll<HTMLElement>(".shop-item").forEach((el) => {
      el.addEventListener("click", () => this.purchase(el.dataset.id!));
    });
    document.getElementById("shop-continue")!.addEventListener("click", () => {
      this.hide();
      this.onContinue();
    });
  }

  private purchase(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    if (this.fx.getInk() < item.cost) {
      this.fx.toast("not enough ink");
      return;
    }
    if (!this.fx.spend(item.cost)) return;
    const ok = item.buy(this.fx);
    if (!ok) this.fx.spend(-item.cost); // refund on a no-op purchase
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
