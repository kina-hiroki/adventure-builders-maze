import test from 'node:test';
import assert from 'node:assert/strict';
import { animateSolutionRoute } from '../src/three/animateSolutionRoute.ts';

function setup(t, reduce = false) {
  const frames = new Map();
  let nextId = 0;
  const media = Object.assign(new EventTarget(), { matches: reduce });
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const previous = { window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document') };
  const win = { matchMedia: () => media,
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id) };
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true });
  const material = { dashOffset: 0, dashSize: 0.22, gapSize: 0.12 };
  let renders = 0;
  const animation = animateSolutionRoute(material, () => renders++);
  t.after(() => {
    animation.dispose();
    for (const key of ['window', 'document']) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else delete globalThis[key];
    }
  });
  return { animation, material, frames, media, doc, renders: () => renders,
    step(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); } };
}

test('表示中だけ点線がSTARTからGOAL方向へ進み、フレームレートに依存しない', t => {
  const scene = setup(t);
  assert.equal(scene.frames.size, 0);
  scene.animation.setVisible(true);
  scene.step(0);
  scene.step(100);
  assert.ok(scene.material.dashOffset < 0, '負の位相で経路の距離が増える方向へ進む');
  const first = scene.material.dashOffset;
  scene.step(150); scene.step(200);
  assert.ok(Math.abs(scene.material.dashOffset - first * 2) < 1e-10);
  assert.equal(scene.frames.size, 1);
  assert.equal(scene.renders(), 4);
});

test('非表示で停止し、再表示は先頭の点線配置から再開する', t => {
  const scene = setup(t);
  scene.animation.setVisible(true); scene.step(0); scene.step(100);
  scene.animation.setVisible(false);
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.material.dashOffset, 0);
  const count = scene.renders(); scene.step(200);
  assert.equal(scene.renders(), count);
  scene.animation.setVisible(true); scene.step(500); scene.step(600);
  assert.ok(scene.material.dashOffset < 0);
});

test('動きを減らす設定とバックグラウンドタブでは停止し、復帰時に時間が飛ばない', t => {
  const scene = setup(t, true);
  scene.animation.setVisible(true);
  assert.equal(scene.frames.size, 0);
  scene.media.matches = false; scene.media.dispatchEvent(new Event('change'));
  scene.step(0); scene.step(100);
  const offset = scene.material.dashOffset;
  scene.doc.hidden = true; scene.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(scene.frames.size, 0);
  scene.doc.hidden = false; scene.doc.dispatchEvent(new Event('visibilitychange'));
  scene.step(10000);
  assert.equal(scene.material.dashOffset, offset);
  scene.media.matches = true; scene.media.dispatchEvent(new Event('change'));
  assert.equal(scene.frames.size, 0);
});

test('終了時にフレームとイベントを解除し、表示や設定変更で再開しない', t => {
  const scene = setup(t);
  scene.animation.setVisible(true); scene.step(0);
  scene.animation.dispose(); scene.animation.dispose();
  scene.animation.setVisible(true);
  scene.doc.dispatchEvent(new Event('visibilitychange'));
  scene.media.dispatchEvent(new Event('change'));
  assert.equal(scene.frames.size, 0);
  const count = scene.renders(); scene.step(100);
  assert.equal(scene.renders(), count);
});
