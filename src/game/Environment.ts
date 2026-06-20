import * as THREE from "three";

/**
 * The surreal monochrome landscape surrounding the prison hall, glimpsed
 * through its broken arches: a vast ink lake, jagged mountain ridges fading
 * into the white horizon, and standing stones / monoliths rising from the
 * water. All low-poly + fog, so it stays cheap and reads as a sketch.
 */
export class Environment {
  group = new THREE.Group();
  private water!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;

  constructor() {
    this.buildWater();
    this.buildMountains();
    this.buildMonoliths();
    this.buildShoreStones();
  }

  private mat(color: number, rough = 1) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
  }

  // ---------------- ink lake ----------------
  private buildWater() {
    const geo = new THREE.PlaneGeometry(900, 900, 1, 1);
    geo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        time: { value: 0 },
        deep: { value: new THREE.Color(0x23211e) },
        crest: { value: new THREE.Color(0xb9b6af) },
        ...THREE.UniformsLib.fog,
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv * 60.0;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float time;
        uniform vec3 deep;
        uniform vec3 crest;
        varying vec2 vUv;
        varying vec3 vWorld;
        #include <fog_pars_fragment>

        float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                     mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        void main() {
          // drifting ripple lines (penciled water)
          float n = noise(vUv + vec2(time*0.05, time*0.03));
          n += 0.5 * noise(vUv*2.3 - vec2(time*0.04, 0.0));
          float lines = smoothstep(0.45,0.5,abs(fract(vUv.y*0.5 + n*1.3)-0.5)*2.0);
          vec3 col = mix(deep, crest, lines*0.5 + n*0.15);
          // glints
          float glint = step(0.985, noise(vUv*8.0 + time*0.2));
          col += glint*0.25;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });

    this.water = new THREE.Mesh(geo, this.waterMat);
    this.water.position.y = -1.4;
    this.water.receiveShadow = false;
    this.group.add(this.water);
  }

  // ---------------- mountains ----------------
  private jaggedPeak(radiusTop: number, height: number, color: number): THREE.Mesh {
    const geo = new THREE.ConeGeometry(radiusTop, height, 7, 3);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // jitter sides more than the tip for a craggy silhouette
      const f = (y + height / 2) / height; // 0 base .. 1 tip
      const j = (1 - f) * 0.4;
      pos.setX(i, pos.getX(i) * (1 + (Math.random() - 0.5) * j));
      pos.setZ(i, pos.getZ(i) * (1 + (Math.random() - 0.5) * j));
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, this.mat(color, 1));
    return m;
  }

  private buildMountains() {
    // two rings of peaks: a darker near range and a paler far range that the
    // fog washes toward white for depth.
    const make = (ringR: number, count: number, hMin: number, hMax: number, color: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
        const r = ringR + (Math.random() - 0.5) * ringR * 0.25;
        const h = hMin + Math.random() * (hMax - hMin);
        const peak = this.jaggedPeak(h * 0.55, h, color);
        peak.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
        peak.rotation.y = Math.random() * Math.PI;
        this.group.add(peak);
      }
    };
    make(120, 26, 30, 70, 0x8d8a84); // far range
    make(80, 20, 18, 42, 0x6f6c66); // near range
  }

  // ---------------- monoliths in the lake ----------------
  private buildMonoliths() {
    const count = 14;
    const geo = new THREE.BoxGeometry(2.2, 12, 2.2);
    // chip the top so each reads like a broken standing stone
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        pos.setX(i, pos.getX(i) * (0.5 + Math.random() * 0.5));
        pos.setZ(i, pos.getZ(i) * (0.5 + Math.random() * 0.5));
        pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 2);
      }
    }
    geo.computeVertexNormals();

    const inst = new THREE.InstancedMesh(geo, this.mat(0x4f4c47), count);
    inst.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 42 + Math.random() * 38;
      const scale = 0.6 + Math.random() * 1.4;
      p.set(Math.cos(a) * r, scale * 4 - 3, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.18, Math.random() * Math.PI, (Math.random() - 0.5) * 0.18));
      s.set(scale, scale, scale);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }

  // ---------------- scattered shore stones ----------------
  private buildShoreStones() {
    const count = 40;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const inst = new THREE.InstancedMesh(geo, this.mat(0x9a978f), count);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 16; // just outside the hall
      const scale = 0.4 + Math.random() * 1.6;
      p.set(Math.cos(a) * r, scale * 0.4 - 1.2, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
      s.set(scale, scale * (0.6 + Math.random() * 0.6), scale);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }

  update(_dt: number, t: number) {
    this.waterMat.uniforms.time.value = t;
  }
}
