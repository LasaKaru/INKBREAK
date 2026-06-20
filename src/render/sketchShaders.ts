/**
 * INKBREAK sketch / pencil post-processing.
 *
 * A single full-screen pass that turns the rendered (already-monochrome)
 * scene into a hand-drawn sketchbook frame:
 *
 *   1. Sobel edge detection on luminance  -> imperfect ink outlines
 *   2. Procedural cross-hatching driven by scene luminance -> shading
 *   3. Animated paper grain + fibre noise  -> "alive sketch" feel
 *   4. Vignette + paper tint               -> cinematic, aged look
 *
 * No external textures required — all noise is generated in-shader so the
 * whole game ships as code.
 */

export const SketchShader = {
  uniforms: {
    tDiffuse: { value: null as any },
    resolution: { value: [1, 1] as [number, number] },
    time: { value: 0 },
    edgeStrength: { value: 1.0 },
    hatchStrength: { value: 0.55 },
    grainStrength: { value: 0.12 },
    inkColor: { value: [0.08, 0.07, 0.06] as [number, number, number] },
    paperColor: { value: [0.913, 0.905, 0.882] as [number, number, number] },
    vignette: { value: 0.55 },
    flash: { value: 0.0 }, // white impact flash, briefly raised on hits
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time;
    uniform float edgeStrength;
    uniform float hatchStrength;
    uniform float grainStrength;
    uniform vec3 inkColor;
    uniform vec3 paperColor;
    uniform float vignette;
    uniform float flash;

    float luma(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    // cheap hash noise
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // a single hatch layer at a given angle/scale
    float hatch(vec2 uv, float angle, float scale) {
      vec2 dir = vec2(cos(angle), sin(angle));
      float v = dot(uv * resolution, dir) * scale;
      // jitter the lines a touch so they read as hand-drawn
      v += noise(uv * 14.0) * 1.6;
      return smoothstep(0.35, 0.5, abs(fract(v) - 0.5) * 2.0);
    }

    void main() {
      vec2 texel = 1.0 / resolution;
      vec3 base = texture2D(tDiffuse, vUv).rgb;

      // --- Sobel edge detection on luminance ---
      float tl = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0,  1.0)).rgb);
      float  t = luma(texture2D(tDiffuse, vUv + texel * vec2( 0.0,  1.0)).rgb);
      float tr = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0,  1.0)).rgb);
      float  l = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0,  0.0)).rgb);
      float  r = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0,  0.0)).rgb);
      float bl = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0, -1.0)).rgb);
      float  b = luma(texture2D(tDiffuse, vUv + texel * vec2( 0.0, -1.0)).rgb);
      float br = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0, -1.0)).rgb);

      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
      float gy =  tl + 2.0 * t + tr - bl - 2.0 * b - br;
      float edge = sqrt(gx * gx + gy * gy);
      // break the outline up so it looks penciled, not vector-clean
      edge *= 0.8 + 0.6 * noise(vUv * resolution * 0.5 + time * 0.3);
      edge = clamp(edge * edgeStrength * 1.4, 0.0, 1.0);
      edge = smoothstep(0.18, 0.7, edge);

      // --- tonal shading via cross-hatching in shadow regions ---
      float L = luma(base);
      float shade = 0.0;
      if (L < 0.78) shade += hatch(vUv, 0.785, 0.10) * (1.0 - smoothstep(0.55, 0.78, L));
      if (L < 0.5)  shade += hatch(vUv, -0.6, 0.13)  * (1.0 - smoothstep(0.30, 0.55, L));
      if (L < 0.28) shade += hatch(vUv, 0.2, 0.16)   * (1.0 - smoothstep(0.05, 0.28, L));
      shade = clamp(shade * hatchStrength, 0.0, 1.0);

      // --- paper fibres: faint vertical pencil streaks like the videos ---
      float fibre = noise(vec2(vUv.x * resolution.x * 0.5, vUv.y * 40.0)) ;
      fibre = smoothstep(0.6, 1.0, fibre) * 0.05;

      // start from the scene tone, but quantize slightly for a drawn look
      float tone = floor(L * 5.0) / 5.0;
      tone = mix(L, tone, 0.35);

      vec3 col = mix(paperColor, vec3(tone), 0.85);
      col = mix(col, inkColor, shade);     // hatching darkens
      col = mix(col, inkColor, edge);      // ink outline
      col -= fibre;

      // --- animated grain ---
      float g = hash(vUv * resolution + fract(time) * 547.0);
      col += (g - 0.5) * grainStrength;

      // --- vignette ---
      vec2 vd = vUv - 0.5;
      float vig = 1.0 - dot(vd, vd) * vignette * 2.2;
      col *= clamp(vig, 0.0, 1.0);

      // --- impact flash (white-out) ---
      col = mix(col, vec3(1.0), clamp(flash, 0.0, 1.0));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
