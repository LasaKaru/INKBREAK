import * as THREE from "three";

/**
 * The massive black smoke / void entity hanging above the central structure.
 * A clump of displaced, billowing dark blobs plus a slow swirl of points —
 * reads like the ink storm in the videos.
 */
export class VoidSmoke {
  group = new THREE.Group();
  private blobs: { mesh: THREE.Mesh; phase: number; baseScale: number; off: THREE.Vector3 }[] = [];
  private swirl: THREE.Points;
  private swirlGeo: THREE.BufferGeometry;
  private base: Float32Array;

  constructor(center = new THREE.Vector3(0, 15, 0)) {
    this.group.position.copy(center);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0908,
      roughness: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });

    for (let i = 0; i < 14; i++) {
      const r = 1.2 + Math.random() * 1.6;
      const geo = new THREE.IcosahedronGeometry(r, 1);
      // jitter vertices for an irregular billow
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        pos.setXYZ(
          v,
          pos.getX(v) * (1 + (Math.random() - 0.5) * 0.4),
          pos.getY(v) * (1 + (Math.random() - 0.5) * 0.4),
          pos.getZ(v) * (1 + (Math.random() - 0.5) * 0.4)
        );
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      const off = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6
      );
      mesh.position.copy(off);
      this.group.add(mesh);
      this.blobs.push({ mesh, phase: Math.random() * Math.PI * 2, baseScale: 1, off });
    }

    // swirling ink points around the mass
    const N = 400;
    this.base = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 5;
      const h = (Math.random() - 0.5) * 6;
      this.base[i * 3] = Math.cos(a) * r;
      this.base[i * 3 + 1] = h;
      this.base[i * 3 + 2] = Math.sin(a) * r;
      sizes[i] = 1 + Math.random() * 3;
    }
    this.swirlGeo = new THREE.BufferGeometry();
    this.swirlGeo.setAttribute("position", new THREE.BufferAttribute(this.base.slice(), 3));
    this.swirlGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const pmat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { color: { value: new THREE.Color(0x0a0908) } },
      vertexShader: `
        attribute float size;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = size * (260.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 color;
        void main(){
          vec2 d = gl_PointCoord-0.5;
          if(dot(d,d)>0.25) discard;
          gl_FragColor = vec4(color, 0.5);
        }`,
    });
    this.swirl = new THREE.Points(this.swirlGeo, pmat);
    this.group.add(this.swirl);
  }

  update(_dt: number, t: number) {
    for (const b of this.blobs) {
      const s = 1 + Math.sin(t * 0.8 + b.phase) * 0.12;
      b.mesh.scale.setScalar(s);
      b.mesh.position.y = b.off.y + Math.sin(t * 0.5 + b.phase) * 0.4;
      b.mesh.rotation.y += 0.002;
    }
    const pos = this.swirlGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.base[i * 3];
      const bz = this.base[i * 3 + 2];
      const ang = t * 0.3 + i * 0.01;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      pos.setXYZ(i, bx * ca - bz * sa, this.base[i * 3 + 1] + Math.sin(t + i) * 0.3, bx * sa + bz * ca);
    }
    pos.needsUpdate = true;
  }
}
