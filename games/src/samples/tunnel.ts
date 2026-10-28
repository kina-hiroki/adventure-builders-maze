import './tunnel.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScalePerson } from '../three/createScalePerson.ts';
import { createCardboardTunnel, tunnelDimensions } from '../three/createCardboardTunnel.ts';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('サンプルの表示先が見つかりません。');
const { width, height, length } = tunnelDimensions;
app.innerHTML = `
  <main class="sample-page">
    <header class="sample-header"><span class="sample-brand">ADVENTURE BUILDERS</span><span class="sample-tag">ギミックのサンプル / 01</span></header>
    <section class="sample-intro"><p class="sample-kicker">CARDBOARD TUNNEL</p><h1>トンネル</h1><p>入口から出口まで、くぐって進む段ボールの通路。</p></section>
    <div class="sample-layout">
      <section class="sample-viewer" aria-label="トンネルの3Dプレビュー">
        <div id="tunnel-stage"><span class="stage-caption">TUNNEL / SAMPLE</span></div>
        <p class="sample-help" id="sample-help">ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動<br>タッチ：1本指で回転、2本指で拡大・移動</p>
      </section>
      <aside class="sample-settings" aria-label="サンプルの仕様と表示設定">
        <h2>サンプルの寸法</h2>
        <dl class="sample-dimensions"><div><dt>幅（内寸）</dt><dd>${width.toFixed(1)} m</dd></div><div><dt>中央高さ（内寸）</dt><dd>${height.toFixed(1)} m</dd></div><div><dt>長さ</dt><dd>${length.toFixed(1)} m</dd></div></dl>
        <div class="sample-views" role="group" aria-label="視点"><button type="button" data-view="angled" aria-pressed="true">斜めから</button><button type="button" data-view="front" aria-pressed="false">入口から</button><button type="button" data-view="top" aria-pressed="false">真上から</button></div>
        <label class="sample-toggle"><input id="remove-roof" type="checkbox">天井を外して見る</label>
        <label class="sample-toggle"><input id="show-person" type="checkbox" checked>人物を表示（身長130cm）</label>
        <p class="sample-note">高さ50cmの側壁に、半径50cmの半円型の天井を載せています。両端は開いています。寸法は検討用の仮設定です。</p>
        <p class="sample-note" id="sample-status" role="status" aria-live="polite">斜めから表示しています。</p>
      </aside>
    </div>
    <footer class="sample-footer"><span>ギミック単体の検討用サンプル</span><span>床の目盛り：0.5 m</span></footer>
  </main>`;

const stage = document.querySelector<HTMLDivElement>('#tunnel-stage')!;
const events = new AbortController();
let dispose = () => events.abort();

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eaece5');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '内寸幅1m・中央高さ1m・長さ2mの段ボールトンネル。高さ50cmの側壁の上に半径50cmの半円型の天井があり、天井は取り外せます。入口と出口は開いています。');
  renderer.domElement.setAttribute('aria-describedby', 'sample-help');
  stage.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2 - 0.015;
  controls.minDistance = 1.3;
  controls.maxDistance = 12;
  controls.target.set(-0.15, 0.55, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa5a48d, 2.5));
  const sun = new THREE.DirectionalLight(0xfff7e6, 3);
  sun.position.set(-3, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -4;
  sun.shadow.camera.right = sun.shadow.camera.top = 4;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 4.5),
    new THREE.MeshStandardMaterial({ color: '#deded0', roughness: 1 }));
  ground.position.y = -0.032;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(4.5, 9, '#b4bcac', '#b4bcac');
  grid.position.y = 0.002;
  scene.add(grid);
  const { tunnel, roof } = createCardboardTunnel();
  scene.add(tunnel);
  const person = createScalePerson();
  person.position.set(-1.1, 0, 0.85);
  person.traverse(node => { if (node instanceof THREE.Mesh) node.castShadow = true; });
  scene.add(person);

  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const status = document.querySelector<HTMLParagraphElement>('#sample-status')!;
  function setView(view: string) {
    controls.target.set(-0.15, 0.55, 0);
    const compact = stage.clientWidth < 500;
    if (view === 'front') {
      controls.target.set(0, 0.53, 0);
      camera.position.set(0, 0.55, compact ? 5.8 : 5.2);
    } else if (view === 'top') {
      camera.position.set(-0.15, compact ? 7.5 : 6.2, 0.001);
    } else {
      camera.position.set(compact ? 4.3 : 3.5, compact ? 3.3 : 2.7, compact ? 5.8 : 4.8);
    }
    controls.update();
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    const title = buttons.find(button => button.dataset.view === view)?.textContent ?? '自由な角度';
    status.textContent = `${title}表示しています。`;
    render();
  }
  for (const button of buttons) button.addEventListener('click', () => setView(button.dataset.view!), { signal: events.signal });
  controls.addEventListener('start', () => {
    for (const button of buttons) button.setAttribute('aria-pressed', 'false');
    status.textContent = '視点を操作しています。';
  });
  document.querySelector<HTMLInputElement>('#remove-roof')!.addEventListener('change', event => {
    roof.visible = !(event.target as HTMLInputElement).checked;
    render();
  }, { signal: events.signal });
  document.querySelector<HTMLInputElement>('#show-person')!.addEventListener('change', event => {
    person.visible = (event.target as HTMLInputElement).checked;
    render();
  }, { signal: events.signal });
  const resize = new ResizeObserver(() => {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    render();
  });
  resize.observe(stage);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  setView('angled');

  dispose = () => {
    events.abort();
    resize.disconnect();
    controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(node => {
      if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
        geometries.add(node.geometry);
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
} catch (error) {
  stage.innerHTML = '<p class="sample-error" role="alert">3D表示を開始できませんでした。WebGL 2が有効なChromeやEdgeで開き直してください。</p>';
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.sample-settings input, .sample-settings button').forEach(element => { element.disabled = true; });
  console.error('トンネルの3D表示を開始できませんでした。', error);
}

window.addEventListener('pagehide', () => dispose(), { once: true, signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); app.replaceChildren(); });
