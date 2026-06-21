# INKBREAK — Development Roadmap

A living list of features and systems to grow INKBREAK from a combat prototype
into a full game. Each item notes **effort** (S / M / L / XL), **priority**, and
which existing module it builds on.

Legend — Effort: `S` ≤1 day · `M` a few days · `L` ~1–2 weeks · `XL` 3+ weeks.

---

## ✅ Shipped

- **v0.1** — core combat prototype: sketch post-processing, faceless figure,
  shoot/slash/block/counter/dash, white-enemy state machine, waves, bracketed
  HUD, sharks, void smoke, ink particles, procedural audio, prison-integrity.
- **v0.2 "Broken Horizon"** — surrounding terrain (ink lake + mountains +
  standing stones), **stamina/posture** with guard-break, **hit-stop**,
  **ranged gunner enemies + projectiles**, **central balance config**, **pause
  menu + quality presets**, **GitHub Pages deploy workflow**.
- **v0.3 "Arsenal"** — **inventory system**, dual-slot **weapon variety**
  (pistol/revolver/SMG/shotgun, katana/greatsword/whip) with swapping, **enemy
  loot drops + pickups**, **ink-drop currency**, **consumables** (heal / posture),
  and a loadout HUD strip.
- **v0.4 "The Warden Awakens"** — multi-phase **boss fight** (the void entity)
  with aimed/radial ink volleys, summons, ground shockwaves, open-window
  double-damage, a **boss health bar** tied to prison integrity, and a unified
  `Targetable` lock-on interface.
- **v0.5 "Clean Ink"** — reworked posterized high-contrast B&W shader, brighter
  scene + lighter materials, and a full **Settings page** (live look tuning +
  presets + quality + volume, persisted) reachable from **title + pause menus**.
- **v0.6 "Spend & Slay"** — **enemy archetypes** (brute / dasher / shielded
  alongside grunt / gunner) with escalating wave composition, and a
  **between-wave ink shop** (consumables, random new weapon, +max health/posture
  upgrades) spending the ink-drop currency.
- **v0.7 "Ink Flow"** — melee **combo system** with ramping damage, alternating
  swings, every-4th-hit **ink-wave finishers** (AoE + knockback + style reward),
  and a flow-meter HUD.
- **v0.8 "Worlds"** — data-driven **level system**, **bigger ground**, four
  distinct worlds (Prison / Drowned Gallery / White Wastes / Ink Void), and a
  **world-select screen** (persisted).
- **v0.9 "Break & Advance"** — **destructible cover** (crates block you, absorb
  ink rounds, shatter into ink) and **campaign progression** (clear a world to
  unlock the next; locked worlds in the select screen; persists).
- **v0.10 "Hazards"** — **ink pits** (slow + damage-over-time to player *and*
  enemies) and telegraphed **spike traps** (burst damage), per-level.

---

## ★ Master backlog (build one by one)

Status: ✅ done · 🔜 next up · ⬜ todo · ⚙️ needs backend. Effort S/M/L.

### World & Environment
- ✅ Bigger ground / larger play area
- ✅ Multiple worlds + world-select screen
- ✅ Destructible cover & props (crates block you / absorb fire / shatter into ink)
- ✅ Hazards — ink pits (slow + DoT) and spike traps (collapsing floor still todo)
- 🔜 Interactive objects (levers, breakable cages release pickups) — M
- ⬜ Weather / atmosphere layers (rain streaks, ink-fog banks, wind) — M
- ⬜ Day/night or "page-aging" lighting shifts — M
- ⬜ Procedural arena variation (seeded layouts) — L

### Worlds / Levels / Progression
- ✅ Level/location select
- ✅ Campaign progression (beat a world → unlock the next, persisted)
- 🔜 Per-level objectives (survive N, defend point, hunt target) — M
- ⬜ Hub world / sketchbook map between levels — L
- ⬜ Endless & time-attack modes with scoring — M
- ⬜ Daily seeded run — M

### Combat & Weapons
- ✅ Dual-slot weapons + variety (pistol/revolver/SMG/shotgun, katana/greatsword/whip)
- ✅ Block / parry / counter, dash, stamina/posture, hit-stop
- ✅ Melee combo system + finishers
- ⬜ Weapon mods/upgrades (fire-rate, lifesteal, ink-element) — M
- ⬜ Charged & special attacks / abilities on cooldown — M
- ⬜ Aim modes: free-aim vs lock-on toggle, manual reload — S–M
- ⬜ Status effects (ink-blind, slow, bleed) — M

### Enemies & AI
- ✅ Ranged enemies (gunners), archetypes (brute/dasher/shielded), boss
- 🔜 Pathfinding — navigate around props instead of pushing through — L
- ⬜ More archetypes — exploder, flying, summoner — M
- ⬜ Spawn director — adaptive difficulty from player performance — M
- ⬜ Ragdoll / death physics — M

### Player Systems
- ✅ Inventory, currency & between-wave shop, +max health/posture upgrades
- 🔜 Perks / skill tree (faster reload, lifesteal, more health) — M
- ⬜ Loadout screen — pick primary/secondary/perks before a run — M
- ⬜ Leveling & XP, account/profile unlocks — M
- ⬜ Classes (Assault / Medic / Sniper) with unique abilities — L
- ⬜ Sprint meter, crouch & slide, jump/vault — S–M

### Multiplayer & Social ⚙️ (needs backend)
- ⬜ Live chat (global/room, WebSocket) — M ⚙️
- ⬜ In-game quick-comms / preset callouts — S–M ⚙️
- ⬜ Co-op 2–4 players (authoritative server + netcode) — L ⚙️
- ⬜ PvP modes (team deathmatch, last-man-standing) — L ⚙️
- ⬜ Online leaderboards (currently none) — M ⚙️
- ⬜ Friends / parties / lobbies, voice (WebRTC) — L ⚙️
- ⬜ Accounts & cloud saves — M ⚙️

### "More Realistic" / Visual Fidelity
- ✅ Sketch/ink post FX, posterize, vignette, grain (live-tunable)
- 🔜 Post-processing: bloom, SSAO, motion blur, color grading — M
- ⬜ PBR materials (textures, normal/roughness maps) — M
- ⬜ Skeletal animations — rigged glTF characters/enemies — L
- ⬜ Better imported models (weapons/enemies/buildings) — L
- ⬜ Ground blood/ink decals, richer particles — M
- ⬜ Volumetric god-rays, reflections, lighting polish — M
- ⬜ Screen FX — ink-on-screen when hurt, scope glint, heat haze — S

### UI / UX
- ✅ Settings menu (look/quality/volume), pause + menus, flow/boss HUD
- 🔜 Minimap / radar — enemy blips, objectives, pickups — M
- ⬜ FOV slider + mouse sensitivity in settings — S
- ⬜ Key rebinding + gamepad support — M
- ⬜ Objective markers & compass — S
- ⬜ Damage numbers, hitmarker variety, kill cam — S–M
- ⬜ Mobile / touch controls — L

### Audio & Music
- ✅ Procedural SFX + master volume
- 🔜 Music — menu + dynamic combat tracks that escalate with waves — M
- ⬜ Ambient soundscape (wind, distant noise) — S
- ⬜ Spatial/3D positional audio — M
- ⬜ Voice lines / announcer ("wave incoming", streaks) — S

### Tech / Performance / Balancing
- ✅ Central balance config, quality presets, object pooling (particles/projectiles)
- 🔜 Physics engine (cannon-es/rapier) for collisions, ragdolls, debris — L
- ⬜ Code-split the bundle, stats overlay, automated tests + CI — S–M
- ⬜ Live deploy (GitHub Pages workflow exists; enable Pages) — S
- ⬜ Telemetry for balancing — M

---

## 1. Player Progression & Inventory

| Feature | Effort | Priority | Notes / builds on |
| --- | --- | --- | --- |
| **Inventory system** (grid/list UI) | M | High | New `src/game/Inventory.ts` + HTML panel. Items: weapons, ink-charges, keys, relics. |
| Item pickups in the world (drops from enemies / cages) | M | High | Spawn from `Enemy.die()`; add `Pickup` entity. |
| **Equipment slots** (primary, secondary, charm) | M | High | Swap weapons on `Player` via inventory. |
| Weapon variety (revolver, SMG, katana, ink-whip) | L | High | Extend `Characters.ts` weapon group + `Player` fire modes. |
| Weapon upgrades / mods (damage, fire-rate, parry window) | M | Medium | Stat object on weapons; persisted. |
| Consumables (heal ink-vial, smoke bomb, slow-time charge) | M | Medium | Hotbar keys 1–4. |
| **XP, levels & skill tree** (combat / movement / ink) | L | Medium | `PlayerStats` module; affects damage, stamina. |
| Currency ("ink drops") + shop between waves | M | Medium | Ties into Inventory + Economy. |
| Save / load (localStorage, then cloud) | M | Medium | Serialize inventory, progress, settings. |

## 2. Social — Chat, Co-op, Live

| Feature | Effort | Priority | Notes |
| --- | --- | --- | --- |
| **In-game chat box** (single-player log / commands) | S | Medium | HTML overlay; also drives the narrative monologue. |
| **Live multiplayer chat** (lobby + in-match) | L | Medium | WebSocket server (Node + `ws`/Socket.IO). |
| **Co-op combat** (2–4 players vs waves) | XL | Medium | Authoritative server, state sync, interpolation. |
| PvP duel arena (parry-counter focused) | XL | Low | Built on co-op netcode. |
| Spectator / replay sharing | M | Low | Record input timeline, playback. |
| Emotes & ping system | S | Low | Quick wheel; networked. |
| Leaderboards (wave survived, time, integrity %) | M | Medium | Backend API + table UI. |
| Friends / party system | L | Low | Account system required first. |

> **Infra note:** chat + co-op need a backend. Recommended: a small Node service
> (Express + Socket.IO) and an account layer (Auth provider or simple JWT).

## 3. World, Environments & Levels

| Feature | Effort | Priority | Notes / builds on |
| --- | --- | --- | --- |
| **Multiple arenas / worlds** (level select) | L | High | Refactor `Arena.ts` into a `Level` interface + loader. |
| **Mountains & cliffs** (sketch ridgelines on the horizon) | M | High | Heightmap or noise-displaced plane, kept monochrome. |
| **Rocks & stones** (scatter, destructible boulders) | M | High | Instanced meshes + simple fracture on hit. |
| **Water** (rivers, flooded halls, reflective ink-pools) | M | High | Custom shader: animated normals + sketch-line reflection. |
| Bridges, stairs, multi-level platforming arenas | L | Medium | Extends the intro platform idea from video 1. |
| Weather & atmosphere (rain streaks, ink-fog, wind) | M | Medium | Particle layers + post-process tweaks. |
| Day/night or "page-aging" lighting shifts | M | Low | Animate light + paper tint over time. |
| Interactive props (levers, breakable walls, swinging cages) | M | Medium | Build on swaying `cages` in `Arena.ts`. |
| Hub world / sketchbook map between levels | L | Medium | Navigate worlds as pages of a book. |
| Procedural arena variation (seeded layouts) | L | Low | Randomize pillar/cage/prop placement. |

## 4. Visual Fidelity — "More Realistic" (while staying monochrome)

| Feature | Effort | Priority | Notes / builds on |
| --- | --- | --- | --- |
| Rigged characters + skeletal animation (`AnimationMixer`) | L | High | Replace procedural limbs in `Characters.ts` with GLTF rigs. |
| Improved sketch shader (variable line weight, smudge, ink bleed) | M | High | Extend `sketchShaders.ts`; depth/normal-based edges. |
| Contact shadows & ambient occlusion (SSAO pass) | M | Medium | Add to `Postprocessing.ts` composer. |
| Cloth / cape sim on the suit | M | Low | Verlet cloth or bone physics. |
| Better destruction (mesh fracture, debris physics) | L | Medium | Pair with a physics engine. |
| Volumetric god-rays through pillars | M | Medium | Light-shaft post pass (matches video lighting). |
| Motion blur & speed-lines on dash | S | Medium | Post-process + on dash in `Player.dash()`. |
| Cinematic camera director (scripted angles for key beats) | M | High | Camera-state machine layered over `Player.updateCamera`. |
| Higher-detail props (carved pillars, ornate cages) | M | Low | Asset modeling pass. |

## 5. Combat Depth & Balancing

| Feature | Effort | Priority | Notes / builds on |
| --- | --- | --- | --- |
| **Central balance config** (data-driven tuning) | S | High | Extract magic numbers from `Player`/`Enemy` into `balance.ts`. |
| Stamina / posture system (block has a cost; guard-break) | M | High | New meter on `Player`; enemies too. |
| Combo system + finishers | M | High | Chain melee in `Player.slash()`. |
| Enemy variety (brute, sniper, dasher, shielded, summoner) | L | High | Subclass / config `Enemy.ts` archetypes. |
| **Boss fights** (multi-phase, the void entity awakens) | XL | High | Use `VoidSmoke` as a boss; phase state machine. |
| Difficulty modes + dynamic difficulty scaling | M | Medium | Scale wave size/health in `EnemyManager`. |
| Hit-stop / time-dilation on heavy hits | S | High | Briefly scale `dt`; big game-feel win. |
| Status effects (ink-blind, slow, bleed) | M | Medium | Effect component on actors. |
| Aim modes: free-aim vs lock-on toggle | M | Medium | Extend `acquireTarget` in `Player`. |
| Ranged enemy projectiles + dodging | M | High | Currently gun enemies are melee-only. |

## 6. Game Modes & Loop

| Feature | Effort | Priority | Notes |
| --- | --- | --- | --- |
| Story campaign (chaptered levels + cutscene text) | XL | High | Narrative system already started in `HUD.say`. |
| Endless / survival mode with scoring | M | High | Variant of current wave loop. |
| Challenge / time-attack rooms | M | Medium | Modifiers + leaderboard. |
| Daily seeded run | M | Low | Procedural + shared seed. |
| Boss rush | M | Low | After bosses exist. |

## 7. Audio

| Feature | Effort | Priority | Notes / builds on |
| --- | --- | --- | --- |
| Adaptive music (intensity layers by combat state) | M | Medium | Add to `Audio.ts` or integrate Howler.js. |
| Richer SFX (sample-based via Howler) | M | Medium | Optional asset pipeline. |
| Spatial / positional audio | M | Low | `PositionalAudio` on enemies. |
| Voice-style narration / stinger SFX for text beats | M | Low | Tied to monologue. |

## 8. UI / UX & Accessibility

| Feature | Effort | Priority | Notes |
| --- | --- | --- | --- |
| Pause menu + settings (volume, sensitivity, quality) | S | High | Overlay; toggle pointer-lock. |
| Graphics quality presets (shadow res, particle count, DPR) | S | High | Big perf lever for low-end devices. |
| Remappable controls + gamepad support | M | Medium | Extend `Input.ts`. |
| **Mobile / touch controls** (virtual stick + buttons) | L | Medium | On-screen HUD controls; `Input` abstraction. |
| Damage numbers toggle, colorblind-safe (already mono), text scale | S | Low | Accessibility. |
| Tutorial / onboarding sequence | M | High | Guided first room teaching parry. |
| Minimap / objective markers | M | Low | World→screen like `HUD` reticle. |

## 9. Technical / Engineering

| Feature | Effort | Priority | Notes |
| --- | --- | --- | --- |
| **Physics engine** (`cannon-es` / `rapier`) | L | Medium | Real collisions, ragdolls, debris, water buoyancy. |
| ECS or cleaner entity architecture | L | Medium | As entity count grows. |
| Asset pipeline (GLTF, Draco, texture atlases) | M | Medium | When moving beyond procedural meshes. |
| Object pooling for enemies/particles (extend existing pool) | S | High | `Particles` already pools; do the same for `Enemy`. |
| Performance budget + stats overlay (`stats.js`) | S | High | Profiling. |
| Code-split bundle (currently one 514 kB chunk) | S | Medium | `manualChunks` for `three`. |
| Automated tests for combat math + CI | M | Medium | Vitest + GitHub Actions. |
| **Deploy** (GitHub Pages / Netlify) so it's playable from a URL | S | High | `vite build` → static host. |
| Analytics / telemetry for balancing | M | Low | Wave reached, deaths, weapon usage. |

---

## Suggested next 5 milestones (recommended order)

1. **Polish the core loop** — balance config, hit-stop, stamina, pause/settings, deploy to a URL. *(mostly S/M, highest game-feel ROI)*
2. **Worlds & terrain** — `Level` loader, mountains, rocks, water; 2–3 distinct arenas.
3. **Progression** — inventory, pickups, weapon variety, currency, save/load.
4. **Depth** — enemy archetypes, ranged projectiles, first boss (the void entity).
5. **Social** — single-player chat/console first, then WebSocket co-op + leaderboards.

> Want me to start on any of these? Good first picks that land fast and visibly:
> **mountains + rocks + water terrain**, an **inventory system**, **hit-stop +
> stamina balancing**, or a **deploy workflow** so it's playable online.
