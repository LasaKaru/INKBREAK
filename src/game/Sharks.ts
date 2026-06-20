import * as THREE from "three";

/**
 * Floating hammerhead-ish sharks drifting through the air — the dream-logic
 * surreal element from the first video. Built from primitives, animated with
 * sine waves so they "swim" lazily over the hall.
 */
export class Sharks {
  group = new THREE.Group();
  private sharks: { mesh: THREE.Group; speed: number; phase: number; radius: number; y: number }[] = [];

  constructor(count = 4) {
    for (let i = 0; i < count; i++) {
      const s = this.buildShark();
      const radius = 18 + Math.random() * 10;
      const y = 12 + Math.random() * 8;
      s.position.set(radius, y, 0);
      this.group.add(s);
      this.sharks.push({
        mesh: s,
        speed: 0.06 + Math.random() * 0.08,
        phase: (i / count) * Math.PI * 2,
        radius,
        y,
      });
    }
  }

  private mat(c: number) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
  }

  private buildShark(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 6), this.mat(0x7d7a74));
    body.rotation.z = -Math.PI / 2;
    g.add(body);

    // hammer head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 2.2), this.mat(0x6e6b65));
    head.position.x = 2.4;
    g.add(head);

    // tail fin
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), this.mat(0x6e6b65));
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -2.6;
    g.add(tail);

    // dorsal fin
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 4), this.mat(0x6e6b65));
    dorsal.position.set(0, 0.8, 0);
    g.add(dorsal);

    g.scale.setScalar(0.9 + Math.random() * 0.6);
    g.traverse((o: THREE.Object3D) => ((o as THREE.Mesh).castShadow = true));
    return g;
  }

  update(_dt: number, t: number) {
    for (const s of this.sharks) {
      const a = t * s.speed + s.phase;
      s.mesh.position.x = Math.cos(a) * s.radius;
      s.mesh.position.z = Math.sin(a) * s.radius;
      s.mesh.position.y = s.y + Math.sin(t * 0.5 + s.phase) * 1.2;
      // face direction of travel
      s.mesh.rotation.y = -a + Math.PI / 2;
      // gentle bank
      s.mesh.rotation.z = Math.sin(t * 0.5 + s.phase) * 0.15;
    }
  }
}
