import * as THREE from "three";
import { Input } from "./Input";
import { Particles } from "./Particles";
import { HUD } from "../ui/HUD";
import { Audio } from "../audio/Audio";
import { Postprocessing } from "../render/Postprocessing";

export interface GameContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  input: Input;
  particles: Particles;
  hud: HUD;
  audio: Audio;
  post: Postprocessing;
  /** live accessor so Player can query current enemies without a cycle */
  getEnemies: () => import("./Enemy").Enemy[];
  /** report destruction so prison integrity ticks down */
  onDestruction: (amount: number) => void;
}
