/**
 * Central, data-driven balance configuration for INKBREAK.
 *
 * Every gameplay magic-number lives here so combat can be tuned in one place
 * without hunting through the actor code. Keep this file pure data.
 */
export const Balance = {
  player: {
    maxHealth: 100,
    moveSpeed: 6,
    accel: 10, // movement acceleration multiplier
    damping: 9, // velocity damping per second

    // combat
    shootCooldown: 0.22,
    shootDamage: 26,
    shootDamageVulnerable: 60,
    slashCooldown: 0.5,
    slashDamage: 34,
    slashReach: 3.0,
    dashCooldown: 0.9,
    dashImpulse: 22,
    dashInvuln: 0.35,

    // block / counter / posture
    parryWindow: 0.32, // seconds after raising guard that a parry counts
    blockChipDamage: 4, // damage taken through a normal block
    hitDamage: 14, // damage taken from an unblocked strike

    // stamina (posture)
    maxStamina: 100,
    staminaRegen: 26, // per second when recovered
    staminaRegenDelay: 0.6, // delay before regen kicks in after spending
    staminaBlockDrain: 9, // per second while guard is up
    staminaBlockHit: 16, // cost to absorb a normal blocked strike
    staminaDashCost: 24,
    staminaParryRefund: 18, // reward for a perfect parry
    guardBreakStun: 1.1, // seconds of vulnerability on guard break
  },

  enemy: {
    health: 100,
    speed: 2.6,
    attackRange: 2.6,
    windupTime: 0.85,
    staggerTime: 2.2,
    meleeDamage: 14,
    // projectile (ranged) enemies
    projectileSpeed: 16,
    projectileDamage: 10,
    rangedFireRange: 14,
    rangedCooldown: 2.4,
  },

  waves: {
    baseCount: 2, // wave N spawns baseCount + N enemies
    spawnInterval: 0.35,
    betweenWaves: 4.5,
    gunnerChance: 0.35, // chance an enemy is a ranged gunner (wave > 1)
  },

  /**
   * Enemy archetypes — stat multipliers + behaviour flags layered over the base
   * `enemy` numbers. Keeps wave composition varied without new classes.
   */
  archetypes: {
    grunt: { health: 1.0, speed: 1.0, damage: 1.0, scale: 1.0, ranged: false, dasher: false, shielded: false, brute: false },
    gunner: { health: 0.8, speed: 0.9, damage: 1.0, scale: 1.0, ranged: true, dasher: false, shielded: false, brute: false },
    brute: { health: 2.6, speed: 0.55, damage: 1.7, scale: 1.5, ranged: false, dasher: false, shielded: false, brute: true },
    dasher: { health: 0.5, speed: 1.7, damage: 0.9, scale: 0.85, ranged: false, dasher: true, shielded: false, brute: false },
    shielded: { health: 1.5, speed: 0.8, damage: 1.1, scale: 1.12, ranged: false, dasher: false, shielded: true, brute: false },
  },

  shop: {
    healVial: 30,
    postureTonic: 25,
    weapon: 90, // unlock a random new weapon
    maxHealthUp: 70, // +20 max health
    maxStaminaUp: 60, // +20 max posture
  },

  prison: {
    integrity: 100,
    perKill: 4, // integrity lost per enemy erased
  },

  feel: {
    hitStop: 0.05, // light hit (shot/slash connect)
    hitStopHeavy: 0.11, // execution / counter
    timeScaleFloor: 0.04, // how far time slows during hit-stop
  },
} as const;

export type BalanceConfig = typeof Balance;
