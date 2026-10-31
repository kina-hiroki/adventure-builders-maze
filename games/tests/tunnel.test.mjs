import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze } from '../src/maze/analyzeMaze.ts';
import { createMazeTunnels } from '../src/three/createMazeTunnels.ts';
import { createCardboardTunnel } from '../src/three/createCardboardTunnel.ts';

function withTunnels(check) {
  const tunnels = createMazeTunnels(pattern01);
  try { tunnels.group.updateMatrixWorld(true); check(tunnels); }
  finally { dispose(tunnels.group); }
}

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

function meshHits(group, origin, direction, far = Infinity) {
  return new THREE.Raycaster(origin, direction, 0, far).intersectObject(group, true)
    .filter(hit => hit.object.isMesh);
}

test('B1〜C1の東西2mに幅1.5mのトンネルがあり、床面0m・中央高さ1m・半円断面になる', () => {
  withTunnels(({ group }) => {
    assert.equal(group.children.length, 1);
    const specification = pattern01.tunnels[0];
    assert.deepEqual(specification.from, [1, 0.75]);
    assert.deepEqual(specification.to, [3, 0.75]);
    assert.equal(specification.width, 1.5);
    const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(Math.abs(bounds.min.x - (1 - 3.5)) < 0.002);
    assert.ok(Math.abs(bounds.max.x - (3 - 3.5)) < 0.002);
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    // B1中央で天井内面を見上げ、内半径0.75mの円に沿うことを検証。
    for (const offset of [0, -0.45, 0.45]) {
      const hit = meshHits(group, new THREE.Vector3(-2, 0.251, -2.75 + offset), new THREE.Vector3(0, 1, 0))[0];
      assert.ok(hit);
      const expected = 0.25 + Math.sqrt(0.75 ** 2 - offset ** 2);
      assert.ok(Math.abs(hit.point.y - expected) < 0.001);
    }
  });
});

test('天井・側壁・継ぎ目が既存の壁の外面を越えず、外側にトンネルの面が残らない', () => {
  withTunnels(({ group }) => {
    const northFace = -3.5 - 0.045 / 2;
    const southFace = -2 + 0.045 / 2;
    const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(bounds.min.z >= northFace, '北側の外壁より外にはみ出さない');
    assert.ok(bounds.max.z <= southFace, '南側の壁より外にはみ出さない');
    // 継ぎ目も含め、従来はみ出していた幅の範囲を全長で調べる。
    for (const x of [-2.49, -2, -1.5, -1, -0.51]) {
      for (const z of [northFace - 0.005, southFace + 0.005]) {
        assert.equal(meshHits(group, new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0), 3).length, 0);
      }
    }
  });
});

test('トンネルの両端が開き、床上75cmの正解ルート全体がトンネルの壁や天井を横切らない', () => {
  withTunnels(({ group }) => {
    for (const [x, direction] of [[-3, 1], [0, -1]]) {
      assert.equal(meshHits(group, new THREE.Vector3(x, 0.75, -2.75), new THREE.Vector3(direction, 0, 0), 3).length, 0);
    }
    const analysis = analyzeMaze(pattern01);
    const baseline = analyzeMaze({ ...pattern01, tunnels: undefined });
    assert.deepEqual(analysis.route, baseline.route);
    assert.equal(pattern01.walls.length, 67);
    for (let i = 1; i < analysis.routePoints.length; i++) {
      const [ax, az] = analysis.routePoints[i - 1];
      const [bx, bz] = analysis.routePoints[i];
      const start = new THREE.Vector3(ax - 3.5, 0.75, az - 3.5);
      const end = new THREE.Vector3(bx - 3.5, 0.75, bz - 3.5);
      const direction = end.clone().sub(start);
      const distance = direction.length();
      assert.equal(meshHits(group, start, direction.normalize(), distance).length, 0, `正解ルート区間 ${i}`);
    }
  });
});

test('トンネルの透かし設定で天井・側壁・輪郭が透け、解除すると元の状態に戻る', () => {
  withTunnels(({ group, setTransparent }) => {
    const before = new Map();
    group.traverse(object => {
      if (object.isMesh || object.isLine) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        before.set(material, [material.opacity, material.transparent, material.depthWrite]);
      }
    });
    setTransparent(true);
    for (const [material, [opacity]] of before) {
      assert.equal(material.opacity, opacity * 0.22);
      assert.equal(material.transparent, true);
      assert.equal(material.depthWrite, false);
    }
    setTransparent(false);
    for (const [material, expected] of before) assert.deepEqual([material.opacity, material.transparent, material.depthWrite], expected);
  });
});

test('単体サンプルは従来の幅1m・中央高さ1m・長さ2mを保つ', () => {
  const { tunnel } = createCardboardTunnel();
  try {
    tunnel.updateMatrixWorld(true);
    const hit = meshHits(tunnel, new THREE.Vector3(0, 0.51, 0.25), new THREE.Vector3(0, 1, 0))[0];
    assert.ok(Math.abs(hit.point.y - 1) < 0.001);
    const bounds = new THREE.Box3().setFromObject(tunnel);
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).z - 2) < 0.003);
    const sideHit = meshHits(tunnel, new THREE.Vector3(0, 0.25, 0.25), new THREE.Vector3(1, 0, 0))[0];
    assert.ok(Math.abs(sideHit.point.x - 0.5) < 0.001);
  } finally { dispose(tunnel); }
});
