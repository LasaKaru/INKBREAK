# INKBREAK

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
| Block / Counter | `Space` or `Right Click` — a *just-in-time* guard becomes `[countered] successful` |
| Dash (i-frames) | `Shift` |

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
