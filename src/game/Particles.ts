import * as THREE from "three";

interface P {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  spin: number;
  grav: number;
}

/**
 * A single pooled THREE.Points system that drives every burst in the game:
 * ink explosions, muzzle smoke, sword sparks, debris. Pure black points on
 * the pale world read exactly like the ink splatter in the videos.
 */
export class Particles {
  points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private positions: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private pool: P[] = [];
  private active: P[] = [];
  private max: number;

  constructor(max = 1200) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    this.geo.setAttribute("alpha", new THREE.BufferAttribute(this.alphas, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        color: { value: new THREE.Color(0x0a0908) },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d);
          if (r > 0.25) discard;
          // soft, slightly irregular ink dot
          float a = smoothstep(0.25, 0.02, r) * vAlpha;
          gl_FragColor = vec4(color, a);
        }
      `,
    });

    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;

    for (let i = 0; i < max; i++) {
      this.pool.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 1,
        spin: 0,
        grav: 0,
      });
    }
  }

  private spawn(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    life: number,
    size: number,
    grav: number
  ) {
    const p = this.pool.pop();
    if (!p) return;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.grav = grav;
    this.active.push(p);
  }

  /** Big ink splatter — enemy death / heavy hit. */
  inkBurst(pos: THREE.Vector3, scale = 1) {
    const n = Math.floor(60 * scale);
    for (let i = 0; i < n; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.9 + 0.1,
        Math.random() - 0.5
      ).normalize();
      const speed = (2 + Math.random() * 6) * scale;
      this.spawn(
        pos,
        dir.multiplyScalar(speed),
        0.5 + Math.random() * 0.7,
        (4 + Math.random() * 10) * scale,
        9
      );
    }
  }

  /** Quick smoke puff at a muzzle. */
  muzzle(pos: THREE.Vector3, dir: THREE.Vector3) {
    for (let i = 0; i < 10; i++) {
      const v = dir
        .clone()
        .multiplyScalar(2 + Math.random() * 4)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5
          )
        );
      this.spawn(pos, v, 0.18 + Math.random() * 0.18, 3 + Math.random() * 5, 0.5);
    }
  }

  /** Sword swing sparks / debris hit. */
  hitSpark(pos: THREE.Vector3, scale = 1) {
    for (let i = 0; i < 18 * scale; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.6,
        Math.random() - 0.5
      ).normalize();
      this.spawn(pos, dir.multiplyScalar(3 + Math.random() * 5), 0.25 + Math.random() * 0.3, 2 + Math.random() * 4, 6);
    }
  }

  /** Rising ink smoke (ambient void). */
  emberRise(pos: THREE.Vector3) {
    this.spawn(
      pos,
      new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4),
      1.4 + Math.random() * 1.2,
      6 + Math.random() * 8,
      -0.4
    );
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vel.y -= p.grav * dt;
      p.vel.multiplyScalar(1 - 1.6 * dt); // drag
      p.pos.addScaledVector(p.vel, dt);
      // floor bounce-ish
      if (p.pos.y < 0.02) {
        p.pos.y = 0.02;
        p.vel.y *= -0.2;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
      }
    }

    const count = Math.min(this.active.length, this.max);
    for (let i = 0; i < count; i++) {
      const p = this.active[i];
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.sizes[i] = p.size;
      this.alphas[i] = Math.min(1, (p.life / p.maxLife) * 1.6);
    }
    this.geo.setDrawRange(0, count);
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
  }
}
