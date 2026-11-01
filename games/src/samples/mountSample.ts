import './tunnel.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { withCleanup } from '../createCleanupScope.ts';
import { createFrameScheduler } from '../createFrameScheduler.ts';
import { createScalePerson } from '../three/createScalePerson.ts';
import { disposeObjectTree } from '../three/disposeObjectTree.ts';

interface SampleOptions {
  id: 'tunnel' | 'mountain';
  number: string;
  title: string;
  intro: string;
  description: string;
  note: string;
  dimensions: readonly (readonly [string, string])[];
  secondaryView: 'front' | 'side';
  toggles: readonly { id: string; label: string; checked?: boolean }[];
  build(scene: THREE.Scene): Record<string, { object: THREE.Object3D; inverted?: boolean }>;
}

export function mountSample(options: SampleOptions) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('サンプルの表示先が見つかりません。');
  const toggles = [...options.toggles, { id: 'show-person', label: '人物を表示（身長130cm）', checked: true }];
  app.innerHTML = `
    <main class="sample-page">
      <header class="sample-header"><span class="sample-brand">ADVENTURE BUILDERS</span><span class="sample-tag">ギミックのサンプル / ${options.number}</span></header>
      <section class="sample-intro"><p class="sample-kicker">CARDBOARD ${options.id.toUpperCase()}</p><h1>${options.title}</h1><p>${options.intro}</p></section>
      <div class="sample-layout">
        <section class="sample-viewer" aria-label="${options.title}の3Dプレビュー">
          <div id="${options.id}-stage" class="sample-stage"><span class="stage-caption">${options.id.toUpperCase()} / SAMPLE</span></div>
          <p class="sample-help" id="sample-help">ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動<br>タッチ：1本指で回転、2本指で拡大・移動</p>
        </section>
        <aside class="sample-settings" aria-label="サンプルの仕様と表示設定">
          <h2>サンプルの寸法</h2>
          <dl class="sample-dimensions">${options.dimensions.map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>
          <div class="sample-views" role="group" aria-label="視点"><button type="button" data-view="angled" aria-pressed="true">斜めから</button><button type="button" data-view="${options.secondaryView}" aria-pressed="false">${options.secondaryView === 'front' ? '入口から' : '真横から'}</button><button type="button" data-view="top" aria-pressed="false">真上から</button></div>
          ${toggles.map(toggle => `<label class="sample-toggle"><input id="${toggle.id}" type="checkbox"${toggle.checked ? ' checked' : ''}>${toggle.label}</label>`).join('')}
          <p class="sample-note">${options.note}</p>
          <p class="sample-note" id="sample-status" role="status" aria-live="polite">斜めから表示しています。</p>
        </aside>
      </div>
      <footer class="sample-footer"><span>ギミック単体の検討用サンプル</span><span>床の目盛り：0.5 m</span></footer>
    </main>`;
  const stage = app.querySelector<HTMLDivElement>('.sample-stage')!;
  let dispose = () => {};
  try {
    dispose = withCleanup(scope => {
      const events = new AbortController();
      scope.defer(() => events.abort());
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#eaece5');
      const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      scope.defer(() => { try { renderer.dispose(); } finally { renderer.domElement.remove(); } });
      scope.defer(() => disposeObjectTree(scene));
      const rendering = createFrameScheduler(() => renderer.render(scene, camera));
      scope.defer(rendering.dispose);
      const render = rendering.request;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', options.description);
      renderer.domElement.setAttribute('aria-describedby', 'sample-help');
      stage.prepend(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      scope.defer(() => controls.dispose());
      controls.maxPolarAngle = Math.PI / 2 - 0.015;
      controls.minDistance = 1.3;
      controls.maxDistance = 12;
      scene.add(new THREE.HemisphereLight(0xffffff, 0xa5a48d, 2.5));
      const sun = new THREE.DirectionalLight(0xfff7e6, 3);
      scope.defer(() => sun.shadow.dispose());
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
      const targets = options.build(scene);
      const person = createScalePerson();
      person.position.set(-1.1, 0, 0.85);
      person.traverse(node => { if (node instanceof THREE.Mesh) node.castShadow = true; });
      scene.add(person);
      targets['show-person'] = { object: person };
      const buttons = [...app.querySelectorAll<HTMLButtonElement>('[data-view]')];
      const status = app.querySelector<HTMLParagraphElement>('#sample-status')!;
      function setView(view: string) {
        controls.target.set(-0.15, 0.55, 0);
        const compact = stage.clientWidth < 500;
        if (view === 'front') {
          controls.target.set(0, 0.53, 0);
          camera.position.set(0, 0.55, compact ? 5.8 : 5.2);
        } else if (view === 'side') {
          controls.target.set(0, 0.53, 0);
          camera.position.set(compact ? 6.2 : 5.5, 0.53, 0);
        } else if (view === 'top') camera.position.set(-0.15, compact ? 7.5 : 6.2, 0.001);
        else camera.position.set(compact ? 4.3 : 3.5, compact ? 3.3 : 2.7, compact ? 5.8 : 4.8);
        controls.update();
        for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
        status.textContent = `${buttons.find(button => button.dataset.view === view)?.textContent ?? '自由な角度'}表示しています。`;
        render();
      }
      controls.addEventListener('change', render);
      scope.defer(() => controls.removeEventListener('change', render));
      const start = () => {
        for (const button of buttons) button.setAttribute('aria-pressed', 'false');
        status.textContent = '視点を操作しています。';
      };
      controls.addEventListener('start', start);
      scope.defer(() => controls.removeEventListener('start', start));
      for (const button of buttons) button.addEventListener('click', () => setView(button.dataset.view!), { signal: events.signal });
      for (const toggle of toggles) {
        const input = app.querySelector<HTMLInputElement>(`#${toggle.id}`)!;
        const target = targets[toggle.id];
        const update = () => { target.object.visible = target.inverted ? !input.checked : input.checked; render(); };
        input.addEventListener('change', update, { signal: events.signal });
        update();
      }
      let lastWidth = 0;
      let lastHeight = 0;
      const resizing = createFrameScheduler(() => {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height || (width === lastWidth && height === lastHeight)) return;
        lastWidth = width; lastHeight = height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        render();
      });
      scope.defer(resizing.dispose);
      const observer = new ResizeObserver(resizing.request);
      scope.defer(() => observer.disconnect());
      observer.observe(stage);
      resizing.request();
      setView('angled');
      window.addEventListener('pagehide', event => {
        if (!event.persisted) scope.dispose();
      }, { signal: events.signal });
      return scope.dispose;
    });
  } catch (error) {
    stage.innerHTML = '<p class="sample-error" role="alert">3D表示を開始できませんでした。WebGL 2が有効なChromeやEdgeで開き直してください。</p>';
    app.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.sample-settings input, .sample-settings button').forEach(element => { element.disabled = true; });
    console.error(`${options.title}の3D表示を開始できませんでした。`, error);
  }
  return { dispose() { dispose(); app.replaceChildren(); } };
}
