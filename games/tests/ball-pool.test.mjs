import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze, wallKey } from '../src/maze/analyzeMaze.ts';
import { createBallPool } from '../src/three/createBallPool.ts';
import { createMazeBallPools } from '../src/three/createMazeBallPools.ts';
import { disposeObjectTree } from '../src/three/disposeObjectTree.ts';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);

test('B5・B6・C5・C6の内側の壁だけを除き、4マスを一つの2m四方の空間にする', () => {
  assert.deepEqual(pattern01.ballPools, [{ id: 'b5-c6-ball-pool', name: 'B5・B6・C5・C6のボールプール',
    from: [1, 4], to: [3, 6], depth: 0.5 }]);
  const keys = new Set(pattern01.walls.map(wallKey));
  assert.ok(!keys.has(wallKey({ from: [2, 5], to: [3, 5] })));
  // 外周の既存壁を保ち、C4↔C5とC6↔C7の通路を残す。
  for (const wall of [
    { from: [1, 4], to: [1, 5] }, { from: [1, 5], to: [1, 6] },
    { from: [3, 4], to: [3, 5] }, { from: [3, 5], to: [3, 6] },
    { from: [1, 4], to: [2, 4] }, { from: [1, 6], to: [2, 6] },
  ]) assert.ok(keys.has(wallKey(wall)));
  const { graph, route } = analyzeMaze(pattern01);
  for (const [a, b] of [['B5', 'C5'], ['B5', 'B6'], ['B6', 'C6'], ['C5', 'C6'], ['C4', 'C5'], ['C6', 'C7']])
    assert.ok(graph.get(a).includes(b));
  assert.deepEqual(route.slice(route.indexOf('C4'), route.indexOf('C4') + 4), ['C4', 'C5', 'C6', 'C7']);
});

test('グリッド[1,4]〜[3,6]に収まり、全表示ボールが床0mから深さ50cm以内に入る', () => {
  const { group } = createMazeBallPools(pattern01);
  try {
    const bounds = new THREE.Box3().setFromObject(group);
    bounds.min.toArray().forEach((v, i) => close(v, [-2.5, -0.008, 0.5][i]));
    bounds.max.toArray().forEach((v, i) => close(v, [-0.5, 0.5, 2.5][i]));
    const balls = group.getObjectByName('display-balls');
    assert.ok(balls instanceof THREE.InstancedMesh);
    assert.ok(balls.count < 2000, '見えない内部のボールを描画しない');
    const matrix = new THREE.Matrix4();
    const geometryBox = new THREE.Box3().setFromBufferAttribute(balls.geometry.getAttribute('position'));
    for (let i = 0; i < balls.count; i++) {
      balls.getMatrixAt(i, matrix);
      const box = geometryBox.clone().applyMatrix4(matrix);
      assert.ok(box.min.x >= -1 && box.max.x <= 1 && box.min.z >= -1 && box.max.z <= 1);
      assert.ok(box.min.y >= -1e-6 && box.max.y <= 0.500001);
    }
    close(balls.boundingBox.min.y, 0);
    close(balls.boundingBox.max.y, 0.5);
  } finally { disposeObjectTree(group); }
});

test('表示用データは経路解析を変えず、床上75cmの正解線はプールの上を通る', () => {
  assert.deepEqual(analyzeMaze(pattern01), analyzeMaze({ ...pattern01, ballPools: undefined }));
  const { group } = createMazeBallPools(pattern01);
  try {
    const hit = new THREE.Raycaster(new THREE.Vector3(-1, 0.75, 0), new THREE.Vector3(0, 0, 1), 0, 3)
      .intersectObject(group, true);
    assert.equal(hit.length, 0);
    group.updateMatrixWorld(true);
    const picking = new THREE.Raycaster(new THREE.Vector3(-1.5, 3, 1.5), new THREE.Vector3(0, -1, 0))
      .intersectObject(group, true);
    assert.equal(picking[0].object.name, 'pool-interaction-volume');
    close(picking[0].point.y, 0.5);
  } finally { disposeObjectTree(group); }
});

test('ボールプールなしの図面と不正寸法・範囲外の配置を扱う', () => {
  const empty = createMazeBallPools({ ...pattern01, ballPools: undefined });
  assert.equal(empty.group.children.length, 0);
  for (const value of [0, -1, 0.05, NaN, Infinity])
    for (const key of ['width', 'length', 'depth'])
      assert.throws(() => createBallPool({ width: 2, length: 2, depth: 0.5, [key]: value }), /寸法/);
  for (const change of [{ from: [-1, 4] }, { to: [8, 6] }, { from: [3, 4] }, { depth: -1 }])
    assert.throws(() => createMazeBallPools({ ...pattern01, ballPools: [{ ...pattern01.ballPools[0], ...change }] }), /配置|寸法/);
});

test('ボールのインスタンス・共有ジオメトリ・マテリアルを一度ずつ回収する', () => {
  const { group } = createMazeBallPools(pattern01);
  const resources = new Set();
  group.traverse(object => {
    if (object.isInstancedMesh) resources.add(object);
    if (object.isMesh || object.isLine) {
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    }
  });
  const counts = new Map([...resources].map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  disposeObjectTree(group);
  assert.equal(group.children.length, 0);
  for (const count of counts.values()) assert.equal(count, 1);
});
