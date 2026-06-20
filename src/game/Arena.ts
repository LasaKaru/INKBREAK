import * as THREE from "three";

/**
 * The grand, crumbling prison hall: tiled floor, instanced pillars, hanging
 * birdcages (some numbered with roman numerals, like the videos), chains,
 * and a central altar/void structure. Everything is monochrome and lit for
 * strong, high-contrast shadows.
 */
export class Arena {
  group = new THREE.Group();
  readonly radius = 26; // play boundary
  cages: { mesh: THREE.Object3D; baseY: number; phase: number }[] = [];

  constructor() {
    this.buildFloor();
    this.buildPillars();
    this.buildCages();
    this.buildCentralStructure();
    this.buildWalls();
  }

  private mat(color: number, rough = 0.9) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: 0,
      flatShading: true,
    });
  }

  private buildFloor() {
    const geo = new THREE.PlaneGeometry(80, 80, 40, 40);
    geo.rotateX(-Math.PI / 2);
    // subtle warping so the tiles feel hand-drawn / uneven
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.4) * 0.03 + Math.cos(z * 0.5) * 0.03);
    }
    geo.computeVertexNormals();
    const floor = new THREE.Mesh(geo, this.mat(0xe8e6df, 1));
    floor.receiveShadow = true;
    this.group.add(floor);

    // grid of darker tile seams for the drawn parquet look
    const grid = new THREE.GridHelper(80, 48, 0x4a4743, 0x8f8c86);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.01;
    this.group.add(grid);
  }

  private buildPillars() {
    const count = 12;
    const geo = new THREE.CylinderGeometry(0.9, 1.1, 16, 8);
    const inst = new THREE.InstancedMesh(geo, this.mat(0xd6d3cc), count);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const m = new THREE.Matrix4();
    const ringR = 16;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * ringR;
      const z = Math.sin(a) * ringR;
      m.makeTranslation(x, 8, z);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);

    // capitals on top of pillars
    const capGeo = new THREE.BoxGeometry(2.6, 0.7, 2.6);
    const capInst = new THREE.InstancedMesh(capGeo, this.mat(0xccc9c2), count);
    capInst.castShadow = true;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      m.makeTranslation(Math.cos(a) * ringR, 16, Math.sin(a) * ringR);
      capInst.setMatrixAt(i, m);
    }
    capInst.instanceMatrix.needsUpdate = true;
    this.group.add(capInst);
  }

  private makeCage(): THREE.Group {
    const cage = new THREE.Group();
    const barMat = this.mat(0x2a2724, 0.6);
    const r = 0.9;
    const bars = 8;
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 4), barMat);
      bar.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      cage.add(bar);
    }
    const ringTop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 16), barMat);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = 1.1;
    const ringBot = ringTop.clone();
    ringBot.position.y = -1.1;
    cage.add(ringTop, ringBot);

    // dome cap + hook
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), barMat);
    cap.position.y = 1.1;
    cage.add(cap);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 10), barMat);
    hook.position.y = 1.7;
    cage.add(hook);

    return cage;
  }

  private buildCages() {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.3;
      const r = 9 + (i % 3) * 2.5;
      const cage = this.makeCage();
      const baseY = 7 + (i % 4) * 1.2;
      cage.position.set(Math.cos(a) * r, baseY, Math.sin(a) * r);

      // chain up to the ceiling
      const chainLen = 8;
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, chainLen, 4),
        this.mat(0x33302c, 0.6)
      );
      chain.position.set(0, 1.7 + chainLen / 2, 0);
      cage.add(chain);

      this.group.add(cage);
      this.cages.push({ mesh: cage, baseY, phase: Math.random() * Math.PI * 2 });
    }
  }

  private buildCentralStructure() {
    const center = new THREE.Group();

    // stepped altar base
    for (let i = 0; i < 4; i++) {
      const s = 7 - i * 1.4;
      const step = new THREE.Mesh(new THREE.BoxGeometry(s, 0.5, s), this.mat(0xd0cdc6));
      step.position.y = 0.25 + i * 0.5;
      step.castShadow = true;
      step.receiveShadow = true;
      center.add(step);
    }

    // central monolith / void column rising up
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.6, 9, 6),
      this.mat(0x1a1714, 0.8)
    );
    col.position.y = 6.5;
    col.castShadow = true;
    center.add(col);

    // floating ringed halo (icosahedron-ish) near the top
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.12, 8, 24),
      this.mat(0x222020, 0.5)
    );
    halo.position.y = 11.5;
    halo.rotation.x = Math.PI / 2.2;
    halo.name = "halo";
    center.add(halo);

    this.group.add(center);
    this.centralStructure = center;
  }

  centralStructure!: THREE.Group;

  private buildWalls() {
    // A ruined outer colonnade with gaps — the hall is broken open so the ink
    // lake, the standing stones and the mountains beyond are all visible.
    const stone = this.mat(0xd2cfc8);
    const ringR = 23;
    const count = 16;
    for (let i = 0; i < count; i++) {
      // leave roughly a third of the segments missing / collapsed
      const roll = (i * 7) % 10;
      if (roll < 3) continue;

      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * ringR;
      const z = Math.sin(a) * ringR;
      const frame = new THREE.Group();

      const broken = roll < 5; // some arches are snapped short
      const h = broken ? 5 + Math.random() * 3 : 12;

      const postGeo = new THREE.BoxGeometry(1, h, 1);
      const left = new THREE.Mesh(postGeo, stone);
      left.position.set(-1.6, h / 2, 0);
      left.castShadow = true;
      const right = new THREE.Mesh(postGeo, stone);
      right.position.set(1.6, h / 2, 0);
      right.castShadow = true;
      frame.add(left, right);

      if (!broken) {
        // arch lintel on intact frames
        const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 1), stone);
        beam.position.y = h + 0.4;
        beam.castShadow = true;
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(1.7, 0.5, 6, 12, Math.PI),
          stone
        );
        arch.position.y = h;
        arch.castShadow = true;
        frame.add(beam, arch);
      }

      // rubble at the base
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random(), 0), stone);
      rubble.position.set((Math.random() - 0.5) * 3, 0.3, 1 + Math.random());
      frame.add(rubble);

      frame.position.set(x, 0, z);
      frame.lookAt(0, h / 2, 0);
      this.group.add(frame);
    }
  }

  update(dt: number, t: number) {
    // gently sway the hanging cages
    for (const c of this.cages) {
      c.mesh.position.y = c.baseY + Math.sin(t * 0.6 + c.phase) * 0.25;
      c.mesh.rotation.z = Math.sin(t * 0.4 + c.phase) * 0.05;
    }
    // slowly rotate the halo
    const halo = this.centralStructure.getObjectByName("halo");
    if (halo) halo.rotation.z += dt * 0.2;
  }
}
