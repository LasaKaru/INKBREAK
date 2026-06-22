# INKBREAK — a HelaO2 Studio game

A stylish, surreal, **monochromatic action prototype** set inside a shifting,
hand-drawn prison that feels like a living sketchbook. You play a faceless
figure in a sharp black suit with a blank white head, fighting waves of
minimalist white enemies in a grand, crumbling hall — until the prison breaks.

Built as a browser game with **Three.js + TypeScript + Vite**. No model or
texture assets — every figure, prop, particle and the pencil look itself is
generated in code.

![monochrome sketch prison](https://img.shields.io/badge/style-monochrome%20sketch-111)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # type-checks, then outputs to dist/
npm run preview
```

## Controls

| Action | Input |
| --- | --- |
| Move | `W A S D` |
| Aim / orbit camera | `Mouse` (click canvas to lock pointer) |
| Shoot (pistol) | `Left Click` — auto-locks the nearest target |
| Slash (sword) | `F` — executes `[open]` enemies instantly |
| Block / Counter | `Space` or `Right Click` — a *just-in-time* guard becomes `[countered] successful`; holding it drains **posture** |
| Dash (i-frames) | `Shift` — costs posture |
| Swap weapons | `Q` (ranged) · `E` (melee) |
| Consumables | `1` heal vial · `2` posture tonic |
| Inventory | `Tab` (pauses; click to equip) |
| Pause | `Esc` (releases the mouse) |

## v0.17 — "Score" (dynamic music)

- **Procedural music** (`src/audio/Music.ts`): a synthesized, self-scheduling
  score on the same WebAudio context — dark minor bass, arpeggio, percussion and
  a boss-tier high pad. A single **intensity** drives tempo / layering / volume,
  and the game ramps it with the **threat on screen**: calm exploring → swelling
  with each living enemy → full intensity during the **Warden**. No audio files;
  rides the **volume** slider.

## v0.16 — "Radar"

- **Corner minimap** (`src/ui/Minimap.ts`): a player-centred, north-up radar that
  plots **enemies** (hollow = airborne flyers), the **boss**, **ink shrines**, and
  the **secret door** — invaluable for the bigger worlds and for hunting the
  hidden door. Pure monochrome 2D canvas to match the cartoon look.

## v0.15 — "Swarm" (more enemies)

- **Exploder**: fragile rusher that primes a fuse and **detonates** in an ink
  blast if it reaches you — back off or kill it early.
- **Flying**: hovers above the ground (immune to pits/spikes), bobbing in to
  strike — shoot it down or catch it on the swing.
- **Summoner**: hangs back and **calls in reinforcements** on a timer — prioritize
  it before the field fills up.
- Wave composition now mixes all eight archetypes, escalating per wave.

## v0.14 — "The Long Page" (campaign + secrets)

- **Continuous campaign**: defeat a world's Warden and you now **advance straight
  into the next world** — keeping your weapons, perks, ink and upgrades — with an
  ink-wipe transition and a breather heal, all the way to a final victory.
- **Secret door**: a hidden, glowing door tucked against the rim of every world.
  Find it, press **`G`**, and warp into the secret world **The Ink Sanctum** —
  which grants the **legendary Voidedge blade** on entry. Clear it to rejoin the
  campaign.
- **Powerful new weapons**: **Ink Cannon** & **Railpen** (ranged) and the
  **Voidedge** (legendary blade) — all available from weapon crates / the shop's
  random unlock (Voidedge guaranteed from the secret).

## v0.13 — "Ink Arts" (perks)

- **Perk screen** (`src/game/Perks.ts`) reachable from the pause menu
  (`[ ink arts ]`) or the **`P`** key: spend ink on lasting, stacking buffs —
  Vigor, Endurance, Swiftness, Sharpened Ink (melee), Steady Hand (ranged),
  **Bloodletting** (lifesteal), Quickstep (dash cooldown), Ink Affinity (more
  ink). Costs rise per rank; perks last the run.
- Player gains perk multipliers wired into melee / ranged / blade-dash damage,
  move speed, dash cooldown, lifesteal healing, and ink gains.

## v0.12 — "Objectives"

- **Interactive ink shrines** (`src/game/Interactables.ts`): obelisks with a
  pulsing white core that block movement and must be **shattered with melee /
  finishers / the blade-dash**, bursting ink and dropping a reward.
- **Per-level objectives**: some worlds (Drowned Gallery, White Wastes) require
  you to **shatter every shrine before the Warden will appear** — tracked in the
  HUD (`objective · shatter the ink shrines [2/4]`). Others stay survive-to-boss.
  The boss now gates on a per-level `bossReady` condition.

## v0.11 — "Cartoon Cut" (HelaO2 Studio)

- **Cartoon look by default**: a new **`cartoon`** render preset (bright,
  3-tone cel banding, bold solid ink outlines, no grain/hatch/vignette) replaces
  the muddy default — pure-white surfaces, crisp black lines, high contrast.
  Brighter ambient light to match. (Old saved settings are reset so the new look
  shows; switch presets any time in **Settings**.)
- **HelaO2 Studio branding**: animated **studio splash** on load, a title-screen
  credit, and the in-game watermark.
- **Blade-flight dash** (warrior feel): `Shift` is now a **blade-dash** — you
  lunge in your move direction and **slice every enemy you sweep through**
  (executing the staggered), shearing cover too, with dash i-frames.

## v0.10 — "Hazards"

- **Ink pits** (`src/game/Hazards.ts`): dark pools on the floor that **slow you**
  and deal **damage over time** — to **enemies too**, so you can lure foes in.
- **Spike traps**: telegraphed plates that shudder, then erupt for heavy burst
  damage to anything standing on them (you or enemies), then reset.
- Per-level hazard counts, rebuilt with the world; dashing's i-frames carry you
  through safely.

## v0.9 — "Break & Advance"

- **Destructible cover** (`src/game/Destructibles.ts`): crates scattered per
  level that **block your movement** and **absorb enemy ink rounds** (real
  cover), and **shatter into ink + debris** when hit by melee, finishers, or
  sustained fire — dropping a little ink.
- **Campaign progression**: clear a world (defeat its Warden) to **unlock the
  next**. The world-select shows `[locked]` worlds; unlocks persist, and the
  victory screen names the world that bleeds through next.

## v0.8 — "Worlds"

- **Level system** (`src/game/Levels.ts`): the Arena + Environment are now
  data-driven, so locations differ in size, density, palette, fog and waves.
- **Bigger ground** across the board, and four distinct worlds:
  **The Sketch Prison**, **The Drowned Gallery** (flooded, monoliths),
  **The White Wastes** (huge open plain ringed by mountains), and
  **The Ink Void** (tight, fog-choked, boss-rush).
- **World-select screen** from the title menu (`[ select world ]`) with live
  preview; the choice persists.

## v0.7 — "Ink Flow"

Melee depth:

- **Combo system** (`src/game/Player.ts`): chain melee hits within a short
  window to build **flow** — damage ramps with the chain and swings alternate
  direction for a back-and-forth feel.
- **Finishers**: every 4th hit is an **ink-wave** — a wide sweeping AoE that hits
  everything around you, with knockback, a screen punch, hit-stop, and a small
  ink-drop style reward.
- **Flow meter HUD** (`x3 flow`) that pulses on finishers and decays if you stop
  attacking.

## v0.6 — "Spend & Slay"

Combat variety and a purpose for all those ink drops:

- **Enemy archetypes** (`src/game/balance.ts` + `Enemy.ts`): alongside the
  **grunt** and ranged **gunner**, waves now mix in **brutes** (slow, huge,
  hard-hitting, near-unflinching), **dashers** (fast, fragile, lunge to close
  the gap), and **shielded** figures that shrug off damage frontally until you
  **parry-stagger them open**. Composition escalates each wave.
- **Between-wave ink shop** (`src/game/Shop.ts`): clear a wave and spend
  ink-drop currency on heal vials, posture tonics, a random **new weapon**, or
  permanent **+max health / +max posture** upgrades, then `[ continue ]` into
  the next wave (or the final shop before the Warden).

## v0.5 — "Clean Ink"

A visual overhaul toward crisp, high-contrast black-and-white, plus full
player control over the look:

- **Reworked ink shader** (`src/render/sketchShaders.ts`): brightness +
  contrast curve → **posterized tone bands** → crisp Sobel outlines, with
  hatching / grain / vignette now *subtle and optional* instead of muddying
  every surface. The default reads as clean manga ink, not murky pencil.
- **Brighter scene**: white-paper background, stronger ambient + key light, and
  lightened floor / pillars / walls / mountains so surfaces land as white with
  dark ink accents (figure, cages, void).
- **Settings page** (`src/game/Settings.ts`): reachable from the **title menu**
  and the **pause menu**. Live-tunable look — contrast, brightness, ink-outline
  strength, tone bands, hatching, grain, vignette — plus **presets**
  (`clean` / `manga` / `sketch` / `noir`), **quality** (low/medium/high), and
  **volume**. Everything persists to `localStorage`.
- **Game menus**: title screen `[ begin ] / [ settings ]`, pause screen
  `[ resume ] / [ settings ] / [ restart ]`.

## v0.4 — "The Warden Awakens"

After three waves the prison stops pretending — the central void-smoke entity
descends as a boss (`src/game/Boss.ts`):

- **Three-phase fight** scaling with its health: aimed ink volleys, radial
  bullet-bursts, summoned figures, and (phase 2+) expanding **ground shockwaves**
  you must dash or block through.
- **Open windows**: after big attacks the Warden dips low and its eye swells —
  it takes **2× damage** and can be meleed, rewarding aggression.
- **Boss health bar** wired to the **prison-integrity meter**, so damaging the
  Warden literally breaks the prison toward the `[0%]` ending.
- Unified **targeting interface** (`Targetable`) so lock-on, shooting and melee
  work on enemies and the boss alike.

## v0.3 — "Arsenal"

A full progression layer:

- **Dual-slot weapons** (`src/game/Weapons.ts`): a ranged slot (Left-Click) and
  a melee slot (`F`), each swappable. Ships with the Inkbore Pistol + Ink Katana
  and adds the Heavy Revolver, Scribble SMG (auto-fire), Splatter Gun (shotgun
  spread), Slab Greatsword, and Ink Whip — all with distinct damage / cadence /
  reach.
- **Inventory screen** (`src/game/Inventory.ts`): `Tab` opens a pause-time panel
  to view and equip your weapons, see ink-drop currency, and check consumables.
- **Enemy drops & pickups** (`src/game/Pickups.ts`): erased enemies scatter
  floating **ink drops** (currency), **heal vials**, **posture tonics**, and the
  occasional **weapon crate**, which magnetize to you and are collected on touch.
- **Consumables**: `1` heals, `2` restores posture.
- **Loadout HUD strip** showing equipped weapons, consumable counts, and ink.

## v0.2 — "Broken Horizon"

The hall is now broken open onto a surreal monochrome landscape, and combat has
real depth:

- **Surrounding terrain** (`src/game/Environment.ts`): a vast **ink-water lake**
  with an animated pencil-ripple shader, two **mountain ranges** of jagged peaks
  fading into the white horizon, **standing-stone monoliths** rising from the
  water, and scattered **shore stones** — all glimpsed through the hall's
  now-ruined arches (`Arena.buildWalls`).
- **Stamina / posture system**: blocking drains posture; run out and your
  **guard breaks** (`[guard broken]`), leaving you open. Perfect parries refund
  posture, rewarding skill.
- **Hit-stop / time-dilation**: every connect, counter and execution briefly
  freezes time for punch (`Game` loop + `Balance.feel`).
- **Ranged gunner enemies**: white figures with pistols now hold range and fire
  travelling **ink rounds** you can block, deflect or dash through
  (`src/game/Projectiles.ts`).
- **Central balance config** (`src/game/balance.ts`): all combat tuning in one
  data-driven file.
- **Pause menu + quality presets** (low / medium / high) on the title card, and
  a **GitHub Pages deploy workflow** (`.github/workflows/deploy.yml`).

## What matches the source videos

- **Strict monochrome** palette — pure black, white, deep grays, no color.
- **Hand-drawn sketch post-processing**: Sobel ink outlines + procedural
  cross-hatching + animated paper grain + vignette, all in one shader pass
  (`src/render/sketchShaders.ts`).
- **Faceless figure**: black suit, blank white ovoid head, procedurally
  animated limbs (`src/game/Characters.ts`).
- **Bracketed UI feedback** exactly like the frames: `[45%]`,
  `[countered] successful`, `[attack blocked]`, `[erased]`, `[execution]`,
  with a circular targeting reticle and handwritten narrative monologue
  (`src/ui/HUD.ts`, `index.html`, `src/styles.css`).
- **Surreal elements**: floating hammerhead **sharks** drifting overhead
  (`src/game/Sharks.ts`) and a massive **black smoke / void entity** above the
  central altar (`src/game/VoidSmoke.ts`).
- **Grand prison hall**: instanced pillars, hanging birdcages on swaying
  chains, a central void column + halo, fog fading to white
  (`src/game/Arena.ts`).
- **Wave combat** with a `loading 2nd enemies` banner between rounds and a
  meta **"the prison stands firm at [100%]"** integrity meter that ticks down
  toward the ending (`src/game/EnemyManager.ts`, `src/game/Game.ts`).
- **Ink VFX**: muzzle smoke, sword sparks, and ink-splatter death bursts from
  a single pooled `THREE.Points` system (`src/game/Particles.ts`).
- Procedural **WebAudio** SFX — no audio files (`src/audio/Audio.ts`).

## Project structure

```
index.html              HUD overlay markup + title card
src/
  main.ts               boot
  styles.css            HUD / title / ink-wipe styling, handwritten fonts
  render/
    sketchShaders.ts    the pencil/ink post-process shader
    Postprocessing.ts   EffectComposer wiring + impact flash
  game/
    Game.ts             scene, lights, fog, intro beat, main loop
    Player.ts           camera rig + shoot/slash/block/counter/dash
    Enemy.ts            white enemy state machine (approach→windup→strike)
    EnemyManager.ts     escalating waves + narrative beats
    Characters.ts       procedural figure builder
    Arena.ts            hall: floor, pillars, cages, central void structure
    Sharks.ts           floating hammerhead sharks
    VoidSmoke.ts        central black smoke entity
    Particles.ts        pooled ink/smoke/spark particle system
    Input.ts            keyboard + pointer-lock mouse
    types.ts            shared GameContext
  audio/
    Audio.ts            procedural WebAudio SFX
  ui/
    HUD.ts              world→screen floating text, reticle, health, monologue
```

## Roadmap

This is the Week-1→5 combat prototype from the design blueprint. Natural next
steps: animated rigged characters via `AnimationMixer`, destructible debris,
more arenas, scripted cinematic camera angles for key moments, and a fuller
story progression around the prison-integrity mechanic.

---

*INKBREAK — a sketch in motion.*
