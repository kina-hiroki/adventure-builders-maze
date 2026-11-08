import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSolutionAnts, ANT_SPACING } from '../src/three/createSolutionAnts.ts';

const position = (mesh, index) => {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
};

test('蟻は経路の曲がり角をたどり、常に進行方向へ頭を向ける', t => {
  const ants = createSolutionAnts();
  t.after(ants.dispose);
  ants.setPaths([[new THREE.Vector3(0, 0.75, 0), new THREE.Vector3(0.2, 0.75, 0), new THREE.Vector3(0.2, 0.75, 1)]]);
  const [bodies, legs] = ants.group.children;
  assert.equal(legs.count, bodies.count * 4, '胴体3個と6本の二節の脚');
  ants.update(0.1);
  let thorax = position(bodies, 1);
  let head = position(bodies, 2);
  assert.ok(Math.abs(thorax.x - 0.1) < 1e-6);
  assert.ok(head.x > thorax.x && Math.abs(head.z) < 1e-6);
  ants.update(0.3);
  thorax = position(bodies, 1); head = position(bodies, 2);
  assert.ok(Math.abs(thorax.x - 0.2) < 1e-6 && Math.abs(thorax.z - 0.1) < 1e-6);
  assert.ok(head.z > thorax.z && Math.abs(head.x - thorax.x) < 1e-6);
  assert.ok(Math.abs(thorax.y - 0.75) < 1e-6);
});

test('蟻の列は一定間隔で複数経路を進み、1周期後も連続する', t => {
  const ants = createSolutionAnts();
  t.after(ants.dispose);
  ants.setPaths([
    [new THREE.Vector3(), new THREE.Vector3(2, 0, 0)],
    [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 3)],
  ]);
  const [bodies, legs] = ants.group.children;
  const initial = Array.from(legs.instanceMatrix.array);
  ants.update(0.05);
  assert.notDeepEqual(Array.from(legs.instanceMatrix.array), initial, '脚の歩行姿勢も変化する');
  assert.ok(Math.abs(position(bodies, 4).x - position(bodies, 1).x - ANT_SPACING) < 1e-6);
  assert.ok(position(bodies, 16).z > 1, '第2経路も先頭から末尾へ進む');
  ants.update(ANT_SPACING);
  assert.ok(position(bodies, 1).length() < 1e-6, '次の蟻がSTARTに現れる');
});

test('経路の切替と終了時にインスタンスと共有GPU資源を解放する', () => {
  const ants = createSolutionAnts();
  ants.setPaths([[new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]]);
  let instances = 0, geometries = 0, materials = 0;
  for (const mesh of ants.group.children) {
    mesh.addEventListener('dispose', () => instances++);
    mesh.geometry.addEventListener('dispose', () => geometries++);
    mesh.material.addEventListener('dispose', () => materials++);
  }
  ants.setPaths([[new THREE.Vector3(), new THREE.Vector3(0, 0, 2)]]);
  assert.equal(instances, 2);
  assert.equal(geometries, 0, '経路変更では共有資源を再利用する');
  ants.dispose();
  assert.equal(ants.group.children.length, 0);
  assert.equal(geometries, 2);
  assert.equal(materials, 2);
});
