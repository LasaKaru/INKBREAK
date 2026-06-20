import * as THREE from "three";

interface Shot {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  active: boolean;
}

/**
 * Travelling "ink rounds" fired by gunner enemies. A small pool of dark
 * spheres; on reaching the player they fire a resolve callback (so the Player
 * can block / take damage) and otherwise expire by lifetime or on the ground.
 */
export class Projectiles {
  group = new THREE.Group();
  private shots: Shot[] = [];
  private speed: number;

  constructor(speed = 16, max = 40) {
    this.speed = speed;
    const geo = new THREE.SphereGeometry(0.18, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0908,
      roughness: 0.4,
      emissive: 0x000000,
    });
    for (let i = 0; i < max; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = true;
      this.group.add(mesh);
      this.shots.push({ mesh, vel: new THREE.Vector3(), life: 0, damage: 0, active: false });
    }
  }

  spawn(origin: THREE.Vector3, dir: THREE.Vector3, damage: number) {
    const s = this.shots.find((x) => !x.active);
    if (!s) return;
    s.active = true;
    s.life = 4;
    s.damage = damage;
    s.mesh.visible = true;
    s.mesh.position.copy(origin);
    s.vel.copy(dir).normalize().multiplyScalar(this.speed);
  }

  /**
   * @param onHit called with (damage, fromPosition) when a shot reaches the
   *              player; the Player decides block vs damage.
   */
  update(
    dt: number,
    playerPos: THREE.Vector3,
    onHit: (damage: number, from: THREE.Vector3) => void,
    onMiss?: (at: THREE.Vector3) => void
  ) {
    const playerCenter = playerPos.clone().add(new THREE.Vector3(0, 1.1, 0));
    for (const s of this.shots) {
      if (!s.active) continue;
      s.life -= dt;
      s.mesh.position.addScaledVector(s.vel, dt);

      if (s.mesh.position.distanceTo(playerCenter) < 0.9) {
        onHit(s.damage, s.mesh.position.clone());
        this.retire(s);
        continue;
      }
      if (s.life <= 0 || s.mesh.position.y < 0.05) {
        onMiss?.(s.mesh.position.clone());
        this.retire(s);
      }
    }
  }

  private retire(s: Shot) {
    s.active = false;
    s.mesh.visible = false;
  }
}
