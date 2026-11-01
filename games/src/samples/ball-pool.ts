import './ball-pool.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScalePerson } from '../three/createScalePerson.ts';
import { createBallPool, ballPoolDimensions } from '../three/createBallPool.ts';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('サンプルの表示先が見つかりません。');
const { width, depth, length } = ballPoolDimensions;
app.innerHTML = `
  <main class="sample-page">
    <header class="sample-header"><a class="sample-brand" href="./">ADVENTURE BUILDERS</a><span class="sample-tag">ギミックのサンプル / 03</span></header>
    <section class="sample-intro"><p class="sample-kicker">BALL POOL</p><h1>ボールプール</h1><p>カラフルなボールの中を進む、2m四方の冒険ゾーン。</p></section>
    <div class="sample-layout">
      <section class="sample-viewer" aria-label="ボールプールの3Dプレビュー">
        <div id="ball-pool-stage" class="sample-stage"><span class="stage-caption">BALL POOL / 2 × 2 m</span></div>
        <p class="sample-help" id="sample-help">ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動<br>タッチ：1本指で回転、2本指で拡大・移動</p>
      </section>
      <aside class="sample-settings" aria-label="サンプルの仕様と表示設定">
        <h2>サンプルの寸法</h2>
        <dl class="sample-dimensions"><div><dt>横（内寸）</dt><dd>${width.toFixed(1)} m</dd></div><div><dt>ボールの深さ</dt><dd>50 cm</dd></div><div><dt>縦（内寸）</dt><dd>${length.toFixed(1)} m</dd></div></dl>
        <div class="sample-views" role="group" aria-label="視点"><button type="button" data-view="angled" aria-pressed="true">斜めから</button><button type="button" data-view="side" aria-pressed="false">真横から</button><button type="button" data-view="top" aria-pressed="false">真上から</button></div>
        <label class="sample-toggle"><input id="show-dimensions" type="checkbox" checked>寸法を表示</label>
        <label class="sample-toggle"><input id="transparent-enclosure" type="checkbox" checked>囲いを透かす（内部確認用）</label>
        <label class="sample-toggle"><input id="show-person" type="checkbox" checked>人物を表示（身長130cm）</label>
        <p class="sample-note">内寸2.0m × 2.0m、床からボール上面まで50cm（空間の容積2.0m³）。囲いの高さ60cm・表示ボール直径7cmは仮設定です。単体サンプルの出入口・素材は検討中。迷路内ではB5〜C6に配置します。ボールの動きと必要個数は再現していません。</p>
        <button class="sample-action" id="save-image" type="button">この視点を画像で保存 ↓</button>
        <p class="sample-note" id="sample-status" role="status" aria-live="polite">斜めから表示しています。</p>
      </aside>
    </div>
    <figure class="sample-concept"><img src="./reference/ball-pool-concept.png" alt="段ボール迷路内の2m四方のボールプール。ボールの深さ50cmと、平面・断面を示した計画イメージ。" width="1536" height="1024" loading="lazy"><figcaption>計画イメージ（画像生成）／寸法の確認は上の3Dサンプルをご利用ください。<a href="./reference/ball-pool-concept.png" target="_blank" rel="noopener">イメージ図を開く ↗</a></figcaption></figure>
    <footer class="sample-footer"><span>ギミック単体の検討用サンプル</span><span>床の目盛り：0.5 m</span></footer>
  </main>`;

const stage = document.querySelector<HTMLDivElement>('#ball-pool-stage')!;
const events = new AbortController();
const cleanup: (() => void)[] = [() => events.abort()];
let disposed = false;
const dispose = () => {
  if (disposed) return;
  disposed = true;
  for (const release of cleanup.reverse()) release();
};

try {
  const scene = new THREE.Scene();
  const labelTextures: THREE.Texture[] = [];
  cleanup.push(() => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(node => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Sprite) {
        if (!(node instanceof THREE.Sprite)) geometries.add(node.geometry);
        if (node instanceof THREE.InstancedMesh) node.dispose();
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    labelTextures.forEach(texture => texture.dispose());
  });
  scene.background = new THREE.Color('#eaece5');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  cleanup.push(() => { renderer.dispose(); renderer.domElement.remove(); });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '内寸縦2m・横2m、床から50cmまでボールが入ったボールプール。囲いは高さ60cmの仮設定。隣に身長130cmの人物を表示。');
  renderer.domElement.setAttribute('aria-describedby', 'sample-help');
  stage.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  cleanup.push(() => controls.dispose());
  controls.maxPolarAngle = Math.PI / 2 - 0.015;
  controls.minDistance = 1.3;
  controls.maxDistance = 12;
  controls.target.set(-0.15, 0.55, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa5a48d, 2.5));
  const sun = new THREE.DirectionalLight(0xfff7e6, 3);
  cleanup.push(() => sun.shadow.dispose());
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
  const { pool, setEnclosureTransparent } = createBallPool();
  scene.add(pool);
  const person = createScalePerson();
  person.position.set(-1.55, 0, 0.55);
  person.traverse(node => { if (node instanceof THREE.Mesh) node.castShadow = true; });
  scene.add(person);

  const dimensions = new THREE.Group();
  function dimension(from: THREE.Vector3, to: THREE.Vector3, text: string, labelPosition: THREE.Vector3) {
    const material = new THREE.LineBasicMaterial({ color: '#47634f' });
    dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), material));
    const tick = Math.abs(to.y - from.y) > 0 ? new THREE.Vector3(0, 0, 0.07) : new THREE.Vector3(0, 0.07, 0);
    for (const point of [from, to]) dimensions.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([point.clone().sub(tick), point.clone().add(tick)]), material));
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('寸法の文字を描画できません。');
    context.font = '600 64px system-ui, Meiryo, sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#365443'; context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    labelTextures.push(texture);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    label.scale.set(0.85, 0.2125, 1);
    label.position.copy(labelPosition);
    dimensions.add(label);
  }
  dimension(new THREE.Vector3(1.32, 0.02, -length / 2), new THREE.Vector3(1.32, 0.02, length / 2),
    '2.0 m', new THREE.Vector3(1.65, 0.03, 0));
  dimension(new THREE.Vector3(-width / 2, 0.02, 1.3), new THREE.Vector3(width / 2, 0.02, 1.3),
    '2.0 m', new THREE.Vector3(0, 0.02, 1.58));
  dimension(new THREE.Vector3(1.18, 0, 1.04), new THREE.Vector3(1.18, depth, 1.04),
    '50 cm', new THREE.Vector3(1.65, depth / 2 + 0.12, 1.04));
  scene.add(dimensions);
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const status = document.querySelector<HTMLParagraphElement>('#sample-status')!;
  function setView(view: string) {
    controls.target.set(-0.15, 0.55, 0);
    const compact = stage.clientWidth < 500;
    if (view === 'side') {
      controls.target.set(0, 0.53, 0);
      camera.position.set(compact ? 9.4 : 8.2, 0.53, 0);
    } else if (view === 'top') {
      camera.position.set(-0.15, compact ? 9.6 : 7.8, 0.001);
    } else {
      camera.position.set(compact ? 5.8 : 4.8, compact ? 4.7 : 3.9, compact ? 7.4 : 6.2);
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
  document.querySelector<HTMLInputElement>('#show-dimensions')!.addEventListener('change', event => {
    dimensions.visible = (event.target as HTMLInputElement).checked;
    render();
  }, { signal: events.signal });
  document.querySelector<HTMLInputElement>('#transparent-enclosure')!.addEventListener('change', event => {
    setEnclosureTransparent((event.target as HTMLInputElement).checked);
    render();
  }, { signal: events.signal });
  document.querySelector<HTMLButtonElement>('#save-image')!.addEventListener('click', () => {
    render();
    const link = document.createElement('a');
    link.download = 'ball-pool-2m-2m-depth50cm.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    status.textContent = '現在の視点の画像を保存しました。';
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
  cleanup.push(() => resize.disconnect());
  resize.observe(stage);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  setView('angled');


} catch (error) {
  dispose();
  stage.innerHTML = '<p class="sample-error" role="alert">3D表示を開始できませんでした。WebGL 2が有効なChromeやEdgeで開き直してください。</p>';
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.sample-settings input, .sample-settings button').forEach(element => { element.disabled = true; });
  console.error('ボールプールの3D表示を開始できませんでした。', error);
}

window.addEventListener('pagehide', () => dispose(), { once: true, signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); app.replaceChildren(); });
