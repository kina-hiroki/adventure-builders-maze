import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { attachPartTooltip } from '../src/three/attachPartTooltip.ts';

// DOMの最小の代替でイベントを送り、交差判定は実際のThree.jsで確認する。
class Element extends EventTarget {
  children = [];
  attributes = new Map();
  style = {};
  dataset = {};
  hidden = false;
  offsetWidth = 240;
  offsetHeight = 60;
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  remove() { this.removed = true; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 400 }; }
}

function withTooltip(check) {
  const previousDocument = globalThis.document;
  globalThis.document = Object.assign(new Element(), { createElement: () => new Element() });
  const container = new Element();
  const canvas = new Element();
  canvas.setAttribute('aria-describedby', 'navigation-help');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20);
  camera.position.z = 4;
  const geometry = new THREE.BoxGeometry(0.8, 1.5, 0.045);
  const material = new THREE.MeshBasicMaterial();
  const board = new THREE.Mesh(geometry, material);
  board.position.x = -1;
  const quiz = new THREE.Group();
  const red = new THREE.Mesh(geometry, material);
  red.position.x = 0.5;
  const blue = new THREE.Mesh(geometry, material);
  blue.position.x = 1.5;
  const symbol = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), material);
  symbol.position.z = 0.03;
  red.add(symbol);
  quiz.add(red, blue);
  scene.add(board, quiz);
  const tooltip = attachPartTooltip(container, canvas, scene, camera, [
    { part: board, id: 'board', size: '高さ 1.5 m × 幅 5 m', description: '白い板の説明' },
    { part: red, id: 'red-quiz', description: '○×クイズ' },
    { part: blue, id: 'blue-quiz', description: '○×クイズ' },
  ]);
  const bubble = container.children[0];
  const send = (type, x = 250, extra = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      clientX: x, clientY: 200, pointerType: 'mouse', pointerId: 1, button: 0, buttons: 0, ...extra,
    });
    canvas.dispatchEvent(event);
  };
  try { check({ canvas, bubble, quiz, red, scene, send, tooltip }); }
  finally {
    tooltip.dispose();
    geometry.dispose(); symbol.geometry.dispose(); material.dispose();
    globalThis.document = previousDocument;
  }
}

test('両方のクイズ壁と記号へのホバーで○×クイズを表示し、白い板の説明も保持する', () => {
  withTooltip(({ canvas, bubble, send }) => {
    for (const [x, id] of [[250, 'red-quiz'], [350, 'blue-quiz']]) {
      send('pointermove', x);
      assert.equal(bubble.hidden, false);
      assert.equal(bubble.id, id);
      assert.equal(bubble.children[0].hidden, true);
      assert.equal(bubble.children[1].textContent, '○×クイズ');
      assert.equal(canvas.getAttribute('aria-describedby'), `navigation-help ${id}`);
    }
    send('pointermove', 100);
    assert.equal(bubble.id, 'board');
    assert.equal(bubble.children[0].hidden, false);
    assert.equal(bubble.children[1].textContent, '白い板の説明');
    send('pointerleave');
    assert.equal(bubble.hidden, true);
    assert.equal(canvas.getAttribute('aria-describedby'), 'navigation-help');
  });
});

test('非表示のクイズと手前の壁に隠れたクイズにはホバーで反応しない', () => {
  withTooltip(({ bubble, quiz, scene, red, send, tooltip }) => {
    send('pointermove');
    tooltip.hide(); quiz.visible = false;
    send('pointermove');
    assert.equal(bubble.hidden, true);
    quiz.visible = true;
    const blocker = new THREE.Mesh(red.geometry, red.material);
    blocker.position.set(0.5, 0, 1);
    scene.add(blocker);
    send('pointermove');
    assert.equal(bubble.hidden, true);
    blocker.removeFromParent();
    send('pointermove');
    assert.equal(bubble.hidden, false);
  });
});

test('タップとドラッグを区別し、非表示を除いてEnterで切り替え、終了時にイベントを解除する', () => {
  withTooltip(({ canvas, bubble, quiz, send, tooltip }) => {
    send('pointerdown'); send('pointerup');
    assert.equal(bubble.hidden, false);
    send('pointerdown'); send('pointermove', 280); send('pointerup', 280);
    assert.equal(bubble.hidden, true);
    for (const id of ['board', 'red-quiz', 'blue-quiz']) {
      send('keydown', 0, { key: 'Enter' });
      assert.equal(bubble.id, id);
    }
    tooltip.hide(); quiz.visible = false;
    send('keydown', 0, { key: 'Enter' });
    assert.equal(bubble.id, 'board');
    send('keydown', 0, { key: 'Escape' });
    assert.equal(bubble.hidden, true);
    tooltip.dispose();
    send('pointermove', 100);
    assert.equal(bubble.hidden, true);
    assert.equal(bubble.removed, true);
    assert.equal(canvas.getAttribute('aria-describedby'), 'navigation-help');
  });
});
