import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCleanupScope, withCleanup } from '../src/createCleanupScope.ts';
import { createFrameScheduler } from '../src/createFrameScheduler.ts';
import { disposeObjectTree } from '../src/three/disposeObjectTree.ts';
import { createQuizSymbolCache } from '../src/three/createQuizSymbolCache.ts';
import { createMazeMountains } from '../src/three/createMazeMountains.ts';
import { createMazeTunnels } from '../src/three/createMazeTunnels.ts';
import { pattern01 } from '../src/maze/pattern01.ts';
import { frameClock } from './helpers/frameClock.mjs';

test('同じフレームの複数の表示変更を最後の状態で一度だけ描画する', () => {
  const clock = frameClock();
  const rendered = [];
  let value = 0;
  const scheduler = createFrameScheduler(() => rendered.push(value), clock);
  for (value of [1, 2, 3]) scheduler.request();
  assert.equal(clock.size, 1);
  assert.deepEqual(rendered, []);
  clock.flush();
  assert.deepEqual(rendered, [3]);
  value = 4; scheduler.request(); clock.flush();
  assert.deepEqual(rendered, [3, 4]);
  scheduler.dispose();
});

test('描画予約の取消・終了で古い画面を描かず、終了後も再開しない', () => {
  const clock = frameClock();
  let renders = 0;
  const scheduler = createFrameScheduler(() => renders++, clock);
  scheduler.request(); scheduler.cancel(); clock.flush();
  assert.equal(renders, 0);
  scheduler.request(); scheduler.dispose(); scheduler.dispose();
  scheduler.request(); clock.flush();
  assert.equal(renders, 0);
  assert.equal(clock.size, 0);
});

test('初期化失敗時にイベント・描画予約・作成済みの3D資源を回収する', () => {
  const clock = frameClock();
  const target = new EventTarget();
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  scene.add(new THREE.Mesh(geometry, material));
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  material.addEventListener('dispose', () => disposed++);
  assert.throws(() => withCleanup(scope => {
    scope.defer(() => disposeObjectTree(scene));
    const events = new AbortController();
    scope.defer(() => events.abort());
    target.addEventListener('change', () => assert.fail('stale event'), { signal: events.signal });
    const scheduler = createFrameScheduler(() => assert.fail('stale render'), clock);
    scope.defer(scheduler.dispose);
    scheduler.request();
    throw new Error('寸法ラベルの初期化失敗');
  }), /寸法ラベル/);
  target.dispatchEvent(new Event('change')); clock.flush();
  assert.equal(disposed, 2);
  assert.equal(scene.children.length, 0);
});

test('途中の後始末が失敗しても残りを逆順に実行し、重複終了を防ぐ', () => {
  const scope = createCleanupScope();
  const calls = [];
  scope.defer(() => calls.push('first'));
  scope.defer(() => { calls.push('second'); throw new Error('cleanup failure'); });
  scope.defer(() => calls.push('third'));
  assert.throws(scope.dispose, AggregateError);
  scope.dispose();
  scope.defer(() => calls.push('late'));
  assert.deepEqual(calls, ['third', 'second', 'first', 'late']);
});

test('2個目のパーツの初期化に失敗しても、先に作成した山・トンネルを回収する', t => {
  const add = THREE.Group.prototype.add;
  const resources = new Map();
  let root;
  t.mock.method(THREE.Group.prototype, 'add', function (...objects) {
    const result = add.apply(this, objects);
    if (this.name === 'maze-mountains' || this.name === 'maze-tunnels') {
      root = this;
      this.traverse(object => {
        if (object.isMesh || object.isLine) {
          const owned = [object.geometry, ...(Array.isArray(object.material) ? object.material : [object.material])];
          for (const resource of owned) if (!resources.has(resource)) {
            resources.set(resource, 0);
            resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
          }
        }
      });
    }
    return result;
  });
  for (const [create, property] of [[createMazeMountains, 'mountains'], [createMazeTunnels, 'tunnels']]) {
    resources.clear(); root = undefined;
    const first = pattern01[property][0];
    assert.throws(() => create({ ...pattern01, [property]: [first, { ...first, width: -1 }] }), /寸法/);
    assert.ok(resources.size > 0);
    for (const count of resources.values()) assert.equal(count, 1);
    assert.equal(root.children.length, 0);
  }
});

test('寸法線・Spriteのマテリアル・共有テクスチャ・未接続資源を一度だけ解放する', t => {
  const root = new THREE.Group();
  const texture = new THREE.Texture();
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial();
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const unusedMaterial = new THREE.MeshBasicMaterial({ map: texture });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  const sprite = new THREE.Sprite(spriteMaterial);
  root.add(line, new THREE.Line(lineGeometry, lineMaterial), sprite, new THREE.Sprite(spriteMaterial));
  const resources = [texture, lineGeometry, lineMaterial, spriteMaterial, unusedMaterial];
  const counts = new Map(resources.map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  const spriteDisposed = () => assert.fail('shared Sprite geometry must remain available to other views');
  sprite.geometry.addEventListener('dispose', spriteDisposed);
  t.after(() => sprite.geometry.removeEventListener('dispose', spriteDisposed));
  disposeObjectTree(root, [unusedMaterial, lineGeometry]);
  for (const count of counts.values()) assert.equal(count, 1);
  assert.equal(root.children.length, 0);
});

test('クイズ8枚の記号を赤✕・青〇の2種類で共有し、シーン未接続でも解放できる', t => {
  const previousDocument = globalThis.document;
  let canvases = 0;
  const commands = [];
  globalThis.document = { createElement() {
    canvases++;
    return { getContext: () => ({ beginPath() {}, stroke() {},
      arc() { commands.push('circle'); }, moveTo() {}, lineTo() { commands.push('line'); } }) };
  } };
  t.after(() => { globalThis.document = previousDocument; });
  const cache = createQuizSymbolCache();
  const red = cache.get('✕', '#dc2626');
  const blue = cache.get('〇', '#2563eb');
  for (let i = 0; i < 4; i++) {
    assert.equal(cache.get('✕', '#dc2626'), red);
    assert.equal(cache.get('〇', '#2563eb'), blue);
  }
  assert.equal(canvases, 2);
  assert.deepEqual(commands, ['line', 'line', 'circle']);
  assert.equal(red.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(blue.transparent, true);
  let disposed = 0;
  for (const material of cache.values()) {
    material.addEventListener('dispose', () => disposed++);
    material.map.addEventListener('dispose', () => disposed++);
  }
  disposeObjectTree(new THREE.Group(), cache.values());
  assert.equal(disposed, 4);
});
