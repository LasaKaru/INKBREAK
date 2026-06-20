import * as THREE from "three";

/**
 * Procedural low-poly figures, built in code so the game ships with no model
 * assets. Returns a rig with named limb references so the Player / Enemy code
 * can animate them procedurally (the "drawn-by-hand" motion feel).
 */

export interface Figure {
  root: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weapon: THREE.Group; // attached to right hand; holds pistol + sword
  pistol: THREE.Group;
  sword: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
}

const SUIT_BLACK = 0x161311;
const SUIT_GRAY = 0x2c2825;
const SKIN_WHITE = 0xf2f0ea;
const ENEMY_WHITE = 0xdedcd5;
const ENEMY_DARK = 0x9b9892;

function limb(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  pivotTop = true
): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  // shift so the group's origin is at the top of the limb (shoulder/hip pivot)
  mesh.position.y = pivotTop ? -h / 2 : h / 2;
  g.add(mesh);
  return g;
}

export function buildFigure(kind: "player" | "enemy"): Figure {
  const root = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];

  const mk = (color: number, rough = 0.95) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: 0.0,
      flatShading: true,
    });
    materials.push(m);
    return m;
  };

  const bodyColor = kind === "player" ? SUIT_BLACK : ENEMY_WHITE;
  const limbColor = kind === "player" ? SUIT_GRAY : ENEMY_DARK;
  const headColor = kind === "player" ? SKIN_WHITE : ENEMY_WHITE;

  const bodyMat = mk(bodyColor);
  const limbMat = mk(limbColor);
  const headMat = mk(headColor, 0.6);

  // --- torso (tapered suit) ---
  const torsoGeo = new THREE.CylinderGeometry(0.26, 0.34, 0.95, 6);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.castShadow = true;
  torso.position.y = 1.18;
  root.add(torso);

  // little shoulder block for the suit silhouette
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.34), bodyMat);
  shoulders.position.y = 1.55;
  shoulders.castShadow = true;
  root.add(shoulders);

  // --- head: blank ovoid ---
  const headGeo = new THREE.SphereGeometry(0.27, 10, 8);
  headGeo.scale(0.92, 1.12, 0.92);
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  head.position.y = 1.86;
  root.add(head);

  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 6), headMat);
  neck.position.y = 1.66;
  root.add(neck);

  // --- arms ---
  const armL = limb(0.16, 0.78, 0.16, limbMat);
  armL.position.set(-0.42, 1.55, 0);
  root.add(armL);

  const armR = limb(0.16, 0.78, 0.16, limbMat);
  armR.position.set(0.42, 1.55, 0);
  root.add(armR);

  // --- legs ---
  const legL = limb(0.18, 0.92, 0.2, bodyMat);
  legL.position.set(-0.17, 0.92, 0);
  root.add(legL);

  const legR = limb(0.18, 0.92, 0.2, bodyMat);
  legR.position.set(0.17, 0.92, 0);
  root.add(legR);

  // --- weapon group on right hand ---
  const weapon = new THREE.Group();
  weapon.position.set(0, -0.72, 0.08); // at the hand
  armR.add(weapon);

  // pistol (blocky monochrome)
  const pistol = new THREE.Group();
  const gunMat = mk(0x0d0b0a, 0.5);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), gunMat);
  barrel.position.z = 0.2;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.12), gunMat);
  grip.position.set(0, -0.14, 0.02);
  grip.rotation.x = 0.3;
  pistol.add(barrel, grip);
  pistol.rotation.x = Math.PI / 2;
  weapon.add(pistol);

  // sword (thin blade)
  const sword = new THREE.Group();
  const bladeMat = mk(0x101010, 0.3);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.2), bladeMat);
  blade.position.z = 0.6;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.06), gunMat);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), gunMat);
  hilt.position.z = -0.1;
  sword.add(blade, guard, hilt);
  sword.rotation.x = Math.PI / 2;
  sword.visible = false;
  weapon.add(sword);

  // muzzle anchor for VFX
  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0, 0.45);
  pistol.add(muzzle);

  root.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  return {
    root,
    torso,
    head,
    armL,
    armR,
    legL,
    legR,
    weapon,
    pistol,
    sword,
    materials,
  };
}
