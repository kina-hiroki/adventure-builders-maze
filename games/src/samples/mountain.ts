import './tunnel.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScalePerson } from '../three/createScalePerson.ts';
import { createCardboardMountain, mountainDimensions } from '../three/createCardboardMountain.ts';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('サンプルの表示先が見つかりません。');
const { width, height, length } = mountainDimensions;
app.innerHTML = `
  <main class="sample-page">
    <header class="sample-header"><span class="sample-brand">ADVENTURE BUILDERS</span><span class="sample-tag">ギミックのサンプル / 02</span></header>
    <section class="sample-intro"><p class="sample-kicker">CARDBOARD MOUNTAIN</p><h1>山越えゾーン</h1><p>上って、下って。中央の山を越えて進むパーツ。</p></section>
    <div class="sample-layout">
      <section class="sample-viewer" aria-label="山越えゾーンの3Dプレビュー">
        <div id="mountain-stage" class="sample-stage"><span class="stage-caption">MOUNTAIN / SAMPLE</span></div>
        <p class="sample-help" id="sample-help">ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動<br>タッチ：1本指で回転、2本指で拡大・移動</p>
      </section>
      <aside class="sample-settings" aria-label="サンプルの仕様と表示設定">
        <h2>サンプルの寸法</h2>
        <dl class="sample-dimensions"><div><dt>幅</dt><dd>${width.toFixed(1)} m</dd></div><div><dt>高さ（頂点）</dt><dd>${height.toFixed(1)} m</dd></div><div><dt>長さ</dt><dd>${length.toFixed(1)} m</dd></div></dl>
        <div class="sample-views" role="group" aria-label="視点"><button type="button" data-view="angled" aria-pressed="true">斜めから</button><button type="button" data-view="side" aria-pressed="false">真横から</button><button type="button" data-view="top" aria-pressed="false">真上から</button></div>
        <label class="sample-toggle"><input id="show-dimensions" type="checkbox" checked>寸法を表示</label>
        <label class="sample-toggle"><input id="show-person" type="checkbox" checked>人物を表示（身長130cm）</label>
        <p class="sample-note">高さ50cm・幅1.0m・長さ2.0m。中央が頂点の山型で、前半1mを上り、後半1mを下ります。迷路内に配置する前の形状確認用サンプルです。</p>
        <p class="sample-note" id="sample-status" role="status" aria-live="polite">斜めから表示しています。</p>
      </aside>
    </div>
    <footer class="sample-footer"><span>ギミック単体の検討用サンプル</span><span>床の目盛り：0.5 m</span></footer>
  </main>`;

const stage = document.querySelector<HTMLDivElement>('#mountain-stage')!;
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
  renderer.domElement.setAttribute('aria-label', '高さ50cm・幅1m・長さ2mの山越えゾーン。両端は床面で、中央に高さ50cmの頂点がある三角形の山型。隣に身長130cmの人物を表示。');
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
  const { mountain } = createCardboardMountain();
  scene.add(mountain);
  const person = createScalePerson();
  person.position.set(-1.1, 0, 0.85);
  person.traverse(node => { if (node instanceof THREE.Mesh) node.castShadow = true; });
  scene.add(person);

  const dimensions = new THREE.Group();
  const labelTextures: THREE.Texture[] = [];
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
  dimension(new THREE.Vector3(0.72, 0.035, -length / 2), new THREE.Vector3(0.72, 0.035, length / 2),
    '2.0 m', new THREE.Vector3(0.85, 0.035, 0.7));
  dimension(new THREE.Vector3(-width / 2, 0.035, 1.28), new THREE.Vector3(width / 2, 0.035, 1.28),
    '1.0 m', new THREE.Vector3(0, 0.035, 1.5));
  dimension(new THREE.Vector3(0.8, 0, 0), new THREE.Vector3(0.8, height, 0),
    '50 cm', new THREE.Vector3(1.06, height / 2, 0));
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
      camera.position.set(compact ? 6.2 : 5.5, 0.53, 0);
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
  document.querySelector<HTMLInputElement>('#show-dimensions')!.addEventListener('change', event => {
    dimensions.visible = (event.target as HTMLInputElement).checked;
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
    labelTextures.forEach(texture => texture.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
} catch (error) {
  stage.innerHTML = '<p class="sample-error" role="alert">3D表示を開始できませんでした。WebGL 2が有効なChromeやEdgeで開き直してください。</p>';
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.sample-settings input, .sample-settings button').forEach(element => { element.disabled = true; });
  console.error('山越えゾーンの3D表示を開始できませんでした。', error);
}

window.addEventListener('pagehide', () => dispose(), { once: true, signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); app.replaceChildren(); });
