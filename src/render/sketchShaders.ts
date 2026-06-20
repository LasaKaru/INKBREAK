/**
 * INKBREAK ink post-processing.
 *
 * A single full-screen pass that turns the rendered scene into a clean,
 * high-contrast black-and-white ink frame (think crisp manga, not muddy
 * pencil):
 *
 *   1. brightness + contrast curve            -> push tones apart
 *   2. posterize luminance into N ink tones    -> clean cel banding
 *   3. Sobel edge detection -> crisp black outlines
 *   4. optional cross-hatching in shadows, grain, vignette (all dialable)
 *
 * Every knob is a uniform so the in-game Settings panel can tune the look
 * live. No external textures — all noise is generated in-shader.
 */

export const SketchShader = {
  uniforms: {
    tDiffuse: { value: null as any },
    resolution: { value: [1, 1] as [number, number] },
    time: { value: 0 },
    edgeStrength: { value: 1.5 },
    hatchStrength: { value: 0.12 },
    grainStrength: { value: 0.03 },
    vignette: { value: 0.18 },
    contrast: { value: 1.5 },
    brightness: { value: 1.12 },
    levels: { value: 4.0 },
    inkColor: { value: [0.05, 0.05, 0.05] as [number, number, number] },
    paperColor: { value: [0.97, 0.97, 0.96] as [number, number, number] },
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
    uniform float vignette;
    uniform float contrast;
    uniform float brightness;
    uniform float levels;
    uniform vec3 inkColor;
    uniform vec3 paperColor;
    uniform float flash;

    float luma(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

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
      v += noise(uv * 14.0) * 1.2;
      return smoothstep(0.4, 0.5, abs(fract(v) - 0.5) * 2.0);
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
      edge = clamp(edge * edgeStrength * 1.6, 0.0, 1.0);
      edge = smoothstep(0.25, 0.6, edge);

      // --- tonal mapping: brightness, contrast, posterize ---
      float L = luma(base) * brightness;
      L = (L - 0.5) * contrast + 0.5;
      L = clamp(L, 0.0, 1.0);
      float lv = max(2.0, levels);
      float tone = floor(L * lv + 0.5) / lv; // clean ink bands

      // --- optional hatching, only in the darker bands ---
      float shade = 0.0;
      if (hatchStrength > 0.001 && tone < 0.5) {
        shade += hatch(vUv, 0.785, 0.10);
        if (tone < 0.26) shade += hatch(vUv, -0.6, 0.13);
        shade = clamp(shade * hatchStrength, 0.0, 1.0);
      }

      // clean grayscale: paper at the bright end, ink at the dark end
      vec3 col = mix(inkColor, paperColor, tone);
      col = mix(col, inkColor, shade);
      col = mix(col, inkColor, edge); // crisp outline on top

      // --- animated grain (subtle) ---
      if (grainStrength > 0.001) {
        float g = hash(vUv * resolution + fract(time) * 547.0);
        col += (g - 0.5) * grainStrength;
      }

      // --- vignette ---
      if (vignette > 0.001) {
        vec2 vd = vUv - 0.5;
        float vig = 1.0 - dot(vd, vd) * vignette * 2.2;
        col *= clamp(vig, 0.0, 1.0);
      }

      // --- impact flash (white-out) ---
      col = mix(col, vec3(1.0), clamp(flash, 0.0, 1.0));

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
