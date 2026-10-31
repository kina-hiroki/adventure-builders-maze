import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCardboardMountain, mountainDimensions } from '../src/three/createCardboardMountain.ts';

function withMountain(check, dimensions = mountainDimensions) {
  const { mountain } = createCardboardMountain(dimensions);
  try {
    mountain.updateMatrixWorld(true);
    check(mountain);
  } finally {
    const geometries = new Set();
    const materials = new Set();
    mountain.traverse(object => {
      if (object.isMesh || object.isLine) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
}

test('山越えパーツの外寸は幅1m・高さ50cm・長さ2mで、床面から始まる', () => {
  withMountain(mountain => {
    const bounds = new THREE.Box3().setFromObject(mountain);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 1) < 1e-6);
    assert.ok(Math.abs(size.y - 0.5) < 1e-6);
    assert.ok(Math.abs(size.z - 2) < 1e-6);
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
  });
});

test('幅全体に連続した上り下りの面があり、中央が頂点になる', () => {
  withMountain(mountain => {
    for (const x of [-0.49, 0, 0.49]) {
      for (const z of [-0.99, -0.75, -0.5, 0, 0.5, 0.75, 0.99]) {
        const hits = new THREE.Raycaster(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0))
          .intersectObject(mountain, true).filter(hit => hit.object.isMesh);
        assert.ok(hits.length, '上面が表向きで描画される');
        assert.ok(Math.abs(hits[0].point.y - 0.5 * (1 - Math.abs(z))) < 1e-6);
      }
    }
  });
});

test('迷路配置用に寸法を変更でき、不正な寸法は拒否する', () => {
  withMountain(mountain => {
    const size = new THREE.Box3().setFromObject(mountain).getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 1.5) < 1e-6);
    assert.ok(Math.abs(size.y - 0.75) < 1e-6);
    assert.ok(Math.abs(size.z - 3) < 1e-6);
  }, { width: 1.5, height: 0.75, length: 3 });
  for (const value of [0, -1, Infinity, NaN]) {
    for (const key of ['width', 'height', 'length']) {
      assert.throws(() => createCardboardMountain({ ...mountainDimensions, [key]: value }), /寸法/);
    }
  }
});
