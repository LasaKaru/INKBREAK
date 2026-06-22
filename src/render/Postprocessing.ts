import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SketchShader } from "./sketchShaders";

/**
 * Wraps the EffectComposer with the INKBREAK sketch pass and exposes a couple
 * of art-direction knobs (impact flash, time) used by the game.
 */
export class Postprocessing {
  composer: EffectComposer;
  sketchPass: ShaderPass;
  private flashTarget = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.sketchPass = new ShaderPass(SketchShader as any);
    this.sketchPass.renderToScreen = true;
    this.composer.addPass(this.sketchPass);

    this.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  }

  setSize(w: number, h: number, pr: number) {
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.sketchPass.uniforms.resolution.value = [w * pr, h * pr];
  }

  /** Briefly punch the screen white (used on heavy hits / executions). */
  punchFlash(amount = 0.6) {
    this.flashTarget = Math.max(this.flashTarget, amount);
  }

  /** Toggle the colour cel path (vs monochrome ink). */
  setColorMode(on: boolean) {
    this.sketchPass.uniforms.colorMode.value = on ? 1 : 0;
  }

  /** Apply art-direction look values from Settings. */
  setLook(o: {
    contrast: number;
    brightness: number;
    edge: number;
    levels: number;
    hatching: number;
    grain: number;
    vignette: number;
  }) {
    const u = this.sketchPass.uniforms;
    u.contrast.value = o.contrast;
    u.brightness.value = o.brightness;
    u.edgeStrength.value = o.edge;
    u.levels.value = o.levels;
    u.hatchStrength.value = o.hatching;
    u.grainStrength.value = o.grain;
    u.vignette.value = o.vignette;
  }

  update(dt: number, elapsed: number) {
    this.sketchPass.uniforms.time.value = elapsed;
    // ease flash back to zero
    const u = this.sketchPass.uniforms.flash;
    u.value = THREE.MathUtils.lerp(u.value, this.flashTarget, 1 - Math.exp(-dt * 22));
    this.flashTarget = THREE.MathUtils.lerp(this.flashTarget, 0, 1 - Math.exp(-dt * 10));
  }

  render() {
    this.composer.render();
  }
}
