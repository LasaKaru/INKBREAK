/**
 * Weapon definitions for INKBREAK. The player carries one ranged weapon
 * (Left-Click) and one melee weapon (F); pickups grant new ones that slot into
 * the matching category. All stats are data so they can be tuned freely.
 */
export type WeaponKind = "ranged" | "melee";

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  cooldown: number; // seconds between attacks
  vulnMult: number; // damage multiplier vs a staggered/[open] enemy
  range?: number; // ranged: max lock distance
  reach?: number; // melee: hit radius
  auto?: boolean; // ranged: fires while the button is held
  pellets?: number; // ranged: shots per trigger (shotgun-style)
  meshScale: number; // visual scale applied to the held mesh
  blurb: string; // inventory flavor
}

export const WEAPONS: Record<string, WeaponDef> = {
  // ---- ranged ----
  pistol: {
    id: "pistol",
    name: "Inkbore Pistol",
    kind: "ranged",
    damage: 26,
    cooldown: 0.22,
    vulnMult: 2.3,
    range: 24,
    meshScale: 1,
    blurb: "Reliable. Draws a clean black line.",
  },
  revolver: {
    id: "revolver",
    name: "Heavy Revolver",
    kind: "ranged",
    damage: 58,
    cooldown: 0.62,
    vulnMult: 2.0,
    range: 26,
    meshScale: 1.25,
    blurb: "Slow, but it punches a hole in the page.",
  },
  smg: {
    id: "smg",
    name: "Scribble SMG",
    kind: "ranged",
    damage: 11,
    cooldown: 0.07,
    vulnMult: 1.8,
    range: 18,
    auto: true,
    meshScale: 1.1,
    blurb: "Hold to spray a storm of dashes.",
  },
  scattergun: {
    id: "scattergun",
    name: "Splatter Gun",
    kind: "ranged",
    damage: 16,
    cooldown: 0.7,
    vulnMult: 2.0,
    range: 12,
    pellets: 5,
    meshScale: 1.2,
    blurb: "Up close, it blots everything out.",
  },

  // ---- melee ----
  katana: {
    id: "katana",
    name: "Ink Katana",
    kind: "melee",
    damage: 34,
    cooldown: 0.5,
    vulnMult: 1,
    reach: 3.0,
    meshScale: 1,
    blurb: "One stroke, one line.",
  },
  greatsword: {
    id: "greatsword",
    name: "Slab Greatsword",
    kind: "melee",
    damage: 72,
    cooldown: 0.95,
    vulnMult: 1,
    reach: 3.8,
    meshScale: 1.6,
    blurb: "Heavy enough to crack the prison itself.",
  },
  inkwhip: {
    id: "inkwhip",
    name: "Ink Whip",
    kind: "melee",
    damage: 22,
    cooldown: 0.4,
    vulnMult: 1,
    reach: 4.6,
    meshScale: 0.8,
    blurb: "Long, lashing, and loud.",
  },
};

export const ALL_WEAPON_IDS = Object.keys(WEAPONS);
export const RANGED_IDS = ALL_WEAPON_IDS.filter((id) => WEAPONS[id].kind === "ranged");
export const MELEE_IDS = ALL_WEAPON_IDS.filter((id) => WEAPONS[id].kind === "melee");
