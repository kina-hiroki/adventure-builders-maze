import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze } from '../src/maze/analyzeMaze.ts';
import { createMazeMountains } from '../src/three/createMazeMountains.ts';
import { createMazeTunnels } from '../src/three/createMazeTunnels.ts';

function dispose(group) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse(object => {
    if (object.isMesh || object.isLine) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
function withMountains(check) {
  const mountains = createMazeMountains(pattern01);
  try { mountains.group.updateMatrixWorld(true); check(mountains); }
  finally { dispose(mountains.group); }
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
}
function meshHits(group, origin, direction, far = Infinity) {
  return new THREE.Raycaster(origin, direction, 0, far).intersectObject(group, true)
    .filter(hit => hit.object.isMesh);
}
function materialStates(group) {
  const states = new Map();
  group.traverse(object => {
    if (object.isMesh || object.isLine) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        states.set(material, [material.opacity, material.transparent, material.depthWrite]);
      }
    }
  });
  return states;
}

test('A5〜A6に南北2m、F6に東西1mの山を配置し、幅1m・高さ50cmを保つ', () => {
  withMountains(({ group }) => {
    assert.deepEqual(group.children.map(part => part.name), ['a5-a6-mountain', 'f6-mountain']);
    const expected = [
      { min: [-3.5, 0, 0.5], max: [-2.5, 0.5, 2.5] },
      { min: [1.5, 0, 1.5], max: [2.5, 0.5, 2.5] },
    ];
    group.children.forEach((part, index) => {
      const box = new THREE.Box3().setFromObject(part);
      box.min.toArray().forEach((value, axis) => close(value, expected[index].min[axis]));
      box.max.toArray().forEach((value, axis) => close(value, expected[index].max[axis]));
    });
    assert.equal(group.visible, true);
    for (const state of materialStates(group).values()) assert.deepEqual(state, [1, false, true]);
  });
});

test('両方の山で進行方向に上り下りし、中央の頂点は50cm、端は床面へ続く', () => {
  withMountains(({ group }) => {
    for (const [index, spec] of pattern01.mountains.entries()) {
      for (const fraction of [0.001, 0.25, 0.5, 0.75, 0.999]) {
        const x = spec.from[0] + (spec.to[0] - spec.from[0]) * fraction - 3.5;
        const z = spec.from[1] + (spec.to[1] - spec.from[1]) * fraction - 3.5;
        const hit = meshHits(group.children[index], new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0))[0];
        assert.ok(hit);
        close(hit.point.y, spec.height * (1 - Math.abs(2 * fraction - 1)));
      }
    }
  });
});

test('山の追加は壁数や正解ルートを変えず、床上75cmの正解線と交差しない', () => {
  withMountains(({ group }) => {
    const analysis = analyzeMaze(pattern01);
    assert.deepEqual(analysis, analyzeMaze({ ...pattern01, mountains: undefined }));
    for (let i = 1; i < analysis.routePoints.length; i++) {
      const [ax, az] = analysis.routePoints[i - 1];
      const [bx, bz] = analysis.routePoints[i];
      const from = new THREE.Vector3(ax - 3.5, 0.75, az - 3.5);
      const to = new THREE.Vector3(bx - 3.5, 0.75, bz - 3.5);
      const direction = to.clone().sub(from);
      const length = direction.length();
      assert.equal(meshHits(group, from, direction.normalize(), length).length, 0);
    }
  });
});

test('山の透かしは本体と輪郭に反映され、繰り返しや非表示後も復元でき、トンネルに影響しない', () => {
  withMountains(({ group, setTransparent }) => {
    const before = materialStates(group);
    const tunnels = createMazeTunnels(pattern01);
    const tunnelBefore = materialStates(tunnels.group);
    try {
      setTransparent(true);
      setTransparent(true);
      for (const [material, [opacity]] of before) {
        assert.deepEqual([material.opacity, material.transparent, material.depthWrite], [opacity * 0.22, true, false]);
      }
      group.visible = false;
      setTransparent(false);
      setTransparent(true);
      group.visible = true;
      for (const [material, [opacity]] of before) close(material.opacity, opacity * 0.22);
      setTransparent(false);
      for (const [material, expected] of before) assert.deepEqual([material.opacity, material.transparent, material.depthWrite], expected);
      for (const [material, expected] of tunnelBefore) assert.deepEqual([material.opacity, material.transparent, material.depthWrite], expected);
    } finally { dispose(tunnels.group); }
  });
});

test('山越えゾーンがない図面も描画できる', () => {
  const mountains = createMazeMountains({ ...pattern01, mountains: undefined });
  assert.equal(mountains.group.children.length, 0);
  mountains.setTransparent(true);
  mountains.setTransparent(false);
});
