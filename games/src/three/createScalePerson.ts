import * as THREE from 'three';
import { cellPoint } from '../maze/analyzeMaze.ts';
import type { MazePlan } from '../maze/types.ts';

// 全パーツをメートル単位で作り、足裏0m・頭頂1.30mにそろえる。
export function createScalePerson() {
  const person = new THREE.Group();
  person.name = 'scale-person-130cm';
  const skin = new THREE.MeshStandardMaterial({ color: '#e8b48e', roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#287fa6', roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#344b68', roughness: 0.9 });
  const shoes = new THREE.MeshStandardMaterial({ color: '#253143', roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: '#48372e', roughness: 1 });
  const eyes = new THREE.MeshStandardMaterial({ color: '#302a27', roughness: 1 });
  function part(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    person.add(mesh);
    return mesh;
  }
  function limb(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
    const mesh = part(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), material, 0, 0);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  for (const side of [-1, 1]) {
    part(new THREE.BoxGeometry(0.13, 0.07, 0.25), shoes, side * 0.095, 0.035, 0.035);
    limb(new THREE.Vector3(side * 0.095, 0.07, 0), new THREE.Vector3(side * 0.095, 0.64, 0), 0.062, trousers);
    limb(new THREE.Vector3(side * 0.16, 0.97, 0), new THREE.Vector3(side * 0.225, 0.78, 0), 0.058, shirt);
    limb(new THREE.Vector3(side * 0.225, 0.78, 0), new THREE.Vector3(side * 0.255, 0.61, 0.02), 0.043, skin);
    part(new THREE.SphereGeometry(0.048, 16, 12), skin, side * 0.255, 0.60, 0.02);
    part(new THREE.SphereGeometry(0.012, 12, 8), eyes, side * 0.044, 1.18, 0.121);
  }
  part(new THREE.CylinderGeometry(0.16, 0.135, 0.44, 16), shirt, 0, 0.82);
  part(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 12), skin, 0, 1.04);
  part(new THREE.SphereGeometry(0.13, 24, 20), skin, 0, 1.17);
  // 後頭部は頭頂を超えない形状にする。
  part(new THREE.SphereGeometry(0.125, 24, 16), hair, 0, 1.17, -0.025);
  return person;
}

// パターン01の入口は下辺。正面から見て入口の左横、外側へ配置する。
export function scalePersonPosition(plan: MazePlan) {
  const [entryX] = cellPoint(plan.entry);
  return new THREE.Vector3((entryX + 0.5) * plan.cellSize - plan.columns * plan.cellSize / 2 - 0.95,
    0, plan.rows * plan.cellSize / 2 + 0.4);
}
