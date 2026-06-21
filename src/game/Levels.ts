/**
 * Level / location definitions. Each drives the Arena + Environment builders
 * and the scene atmosphere, so worlds feel distinct while sharing one engine.
 * All stay strictly monochrome.
 */
export interface LevelConfig {
  id: string;
  name: string;
  subtitle: string;
  blurb: string;

  // arena
  floorSize: number; // ground plane extent
  boundary: number; // player play radius
  pillarRing: number;
  pillarCount: number;
  wallRing: number;
  cageCount: number;

  // palette
  floorColor: number;
  pillarColor: number;
  wallColor: number;

  // environment
  water: boolean;
  mountains: boolean;
  monoliths: number;
  shoreStones: number;
  crates: number;

  // atmosphere
  bg: number;
  fogNear: number;
  fogFar: number;

  // gameplay
  wavesBeforeBoss: number;
}

export const LEVELS: LevelConfig[] = [
  {
    id: "prison",
    name: "The Sketch Prison",
    subtitle: "where it begins",
    blurb: "A vast broken hall of pillars and hanging cages over an ink lake.",
    floorSize: 150,
    boundary: 44,
    pillarRing: 26,
    pillarCount: 16,
    wallRing: 38,
    cageCount: 10,
    floorColor: 0xe8e6df,
    pillarColor: 0xd6d3cc,
    wallColor: 0xd2cfc8,
    water: true,
    mountains: true,
    monoliths: 16,
    shoreStones: 50,
    crates: 12,
    bg: 0xf4f3ef,
    fogNear: 60,
    fogFar: 260,
    wavesBeforeBoss: 3,
  },
  {
    id: "gallery",
    name: "The Drowned Gallery",
    subtitle: "a flooded ruin",
    blurb: "Few pillars, endless ink water, monoliths rising through the mist.",
    floorSize: 130,
    boundary: 40,
    pillarRing: 22,
    pillarCount: 8,
    wallRing: 34,
    cageCount: 5,
    floorColor: 0xdedbd3,
    pillarColor: 0xcac7c0,
    wallColor: 0xc6c3bc,
    water: true,
    mountains: false,
    monoliths: 30,
    shoreStones: 26,
    crates: 7,
    bg: 0xeeece7,
    fogNear: 34,
    fogFar: 150,
    wavesBeforeBoss: 3,
  },
  {
    id: "wastes",
    name: "The White Wastes",
    subtitle: "open ground",
    blurb: "A huge bright plain ringed by towering mountains. Nowhere to hide.",
    floorSize: 220,
    boundary: 70,
    pillarRing: 40,
    pillarCount: 10,
    wallRing: 60,
    cageCount: 4,
    floorColor: 0xf0eee8,
    pillarColor: 0xdedbd4,
    wallColor: 0xd8d5ce,
    water: false,
    mountains: true,
    monoliths: 8,
    shoreStones: 70,
    crates: 16,
    bg: 0xf7f6f2,
    fogNear: 90,
    fogFar: 340,
    wavesBeforeBoss: 4,
  },
  {
    id: "void",
    name: "The Ink Void",
    subtitle: "the final page",
    blurb: "A tight, fog-choked arena. Just you, the dark, and the Warden.",
    floorSize: 90,
    boundary: 30,
    pillarRing: 18,
    pillarCount: 12,
    wallRing: 26,
    cageCount: 8,
    floorColor: 0xcecbc4,
    pillarColor: 0xbbb8b1,
    wallColor: 0xb4b1aa,
    water: false,
    mountains: false,
    monoliths: 4,
    shoreStones: 18,
    crates: 6,
    bg: 0xe7e5e0,
    fogNear: 18,
    fogFar: 80,
    wavesBeforeBoss: 2,
  },
];

export function getLevel(id: string): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
