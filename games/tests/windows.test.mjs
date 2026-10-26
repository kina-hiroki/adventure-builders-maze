import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { pattern01 } from '../src/maze/pattern01.ts';
import { wallKey } from '../src/maze/analyzeMaze.ts';
import { createOuterWallWindows } from '../src/maze/outerWallWindows.ts';
import { createWindowWallGeometry } from '../src/three/createWindowWallGeometry.ts';

test('入口・出口を除く外周26区間に1m間隔の窓を配置する', () => {
  const windows = createOuterWallWindows(pattern01);
  const expected = [];
  for (let index = 0; index < 7; index++) {
    expected.push(wallKey({ from: [index, 0], to: [index + 1, 0] }));
    expected.push(wallKey({ from: [0, index], to: [0, index + 1] }));
    expected.push(wallKey({ from: [7, index], to: [7, index + 1] }));
    if (index > 0 && index < 6) expected.push(wallKey({ from: [index, 7], to: [index + 1, 7] }));
  }
  assert.equal(windows.size, 26);
  assert.deepEqual([...windows.keys()].sort(), expected.sort());
  assert.equal(windows.has(wallKey({ from: [1, 0], to: [1, 1] })), false);
});

test('3種類の窓が混在し、再作成や壁データの並び替えでも配置が変わらない', () => {
  const windows = createOuterWallWindows(pattern01);
  assert.deepEqual([...new Set(windows.values())].sort(), ['circle', 'diamond', 'square']);
  assert.deepEqual(createOuterWallWindows(pattern01), windows);
  assert.deepEqual(createOuterWallWindows({ ...pattern01, walls: [...pattern01.walls].reverse() }), windows);
});

function withPanel(shape, check) {
  const geometry = createWindowWallGeometry(1, 1.5, 0.045, shape);
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.updateMatrixWorld(true);
  const ray = new Raycaster();
  const through = (x, yOffset, side = 1) => {
    ray.set(new Vector3(x, 0.9 - 1.5 / 2 + yOffset, side), new Vector3(0, 0, -side));
    return ray.intersectObject(mesh, false);
  };
  try { check({ geometry, mesh, ray, through }); }
  finally { geometry.dispose(); material.dispose(); }
}

test('3種類とも窓の中心を前後から貫通でき、壁の枠と穴の内側に厚みが残る', () => {
  for (const shape of ['circle', 'square', 'diamond']) {
    withPanel(shape, ({ geometry, mesh, ray, through }) => {
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new Vector3());
      assert.ok(Math.abs(size.x - 1) < 1e-6);
      assert.ok(Math.abs(size.y - 1.5) < 1e-6);
      assert.ok(Math.abs(size.z - 0.045) < 1e-6);
      for (const side of [-1, 1]) {
        assert.equal(through(0, 0, side).length, 0, `${shape}: 穴の中心`);
        assert.ok(through(0.35, 0, side).length > 0, `${shape}: 外側の枠`);
      }
      ray.set(new Vector3(0, 0.9 - 1.5 / 2, 0), new Vector3(1, 0, 0));
      const reveal = ray.intersectObject(mesh, false)[0];
      assert.ok(reveal, `${shape}: 穴の内側の断面`);
      assert.ok(Math.abs(reveal.distance - 0.2) < 1e-6);
    });
  }
});

test('窓の角付近の貫通判定で丸・正方形・ひし形を区別できる', () => {
  for (const shape of ['circle', 'square', 'diamond']) {
    withPanel(shape, ({ through }) => {
      assert.equal(through(0.15, 0.15).length === 0, shape === 'square', `${shape}: 正方形の角付近`);
      assert.equal(through(0.15, 0.1).length === 0, shape !== 'diamond', `${shape}: 丸とひし形の間`);
    });
  }
});
