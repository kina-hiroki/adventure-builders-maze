import './style.css';
import { pattern01 } from './maze/pattern01.ts';
import { analyzeMaze } from './maze/analyzeMaze.ts';
import { createMazeView } from './three/createMazeView.ts';
import type { ViewMode } from './three/createMazeView.ts';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('描画先の #app が見つかりません。');
const analysis = analyzeMaze(pattern01);
if (analysis.route.join(' ') !== pattern01.solution.join(' ')) throw new Error('迷路データと正解ルートが一致しません。');

app.innerHTML = `
  <main class="page">
    <header class="page-header">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Adventure Builders ホーム"><span class="brand-mark" aria-hidden="true">AB</span> ADVENTURE BUILDERS</a>
      <span class="header-caption">集会の裏で冒険仕込む仲間</span>
    </header>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow">CARDBOARD MAZE / 01</p><h1 id="page-title">パターン01<span>迷路を、立体で。</span></h1>
      <p class="lead">平面図の壁配置をそのまま3Dへ。視点を変えて、通路と全体の形を確かめられます。</p></div>
      <span class="revision-badge"><span aria-hidden="true">●</span> 左右・背面に3種類の窓</span>
    </section>
    <dl class="specs" aria-label="迷路の仕様">
      <div><dt>縦 × 横</dt><dd>7 <span>×</span> 7 <small>m</small></dd></div>
      <div><dt>壁の高さ</dt><dd>1.5 <small>m</small></dd></div>
      <div><dt>壁パネル</dt><dd>${pattern01.walls.length} <small>枚</small></dd></div>
      <div><dt>1区画の大きさ</dt><dd>1 <small>m ×</small> 1 <small>m</small></dd></div>
    </dl>
    <div class="maze-layout">
    <section class="viewer-card" aria-labelledby="viewer-title">
      <div class="viewer-heading"><h2 id="viewer-title">3Dプレビュー</h2><span class="viewer-legend"><i class="start-dot"></i> 入口 A7 <i class="goal-dot"></i> 出口 G7</span></div>
      <div id="maze-stage" class="maze-stage"></div>
      <p id="navigation-help" class="navigation-help">ドラッグで回転 · ホイールで拡大 · 右ドラッグで移動<br>白い板にカーソルを合わせる・タップで説明（キーボード：迷路を選択してEnter、Escで閉じる）<span>タッチ操作：1本指で回転、2本指で拡大・移動</span></p>
    </section>
    <section class="settings" aria-labelledby="settings-title">
      <div class="section-heading"><h2 id="settings-title">表示設定</h2><p>見たい角度と表示に調整できます。</p></div>
      <div class="setting-row toggle-row"><div><label for="show-solution">正解ルートを表示</label><p>入口から出口までの通り道をオレンジ色で表示します。</p></div><input id="show-solution" type="checkbox" role="switch"></div>
      <div class="setting-row"><label for="view-mode">視点</label><select id="view-mode"><option value="angled">斜めから</option><option value="top">真上から</option><option value="side">真横から（自由回転）</option><option value="front">正面から</option><option value="right">右側から</option><option value="back">背面から</option><option value="left">左側から</option></select></div>
      <div class="setting-row"><label for="rotation">回転 <output id="rotation-value" for="rotation">45°</output></label><input id="rotation" type="range" min="0" max="359" step="1" value="45"></div>
      <div class="setting-row"><label for="zoom">拡大率 <output id="zoom-value" for="zoom">100%</output></label><input id="zoom" type="range" min="100" max="300" step="10" value="100"></div>
      <div class="setting-row toggle-row"><div><label for="transparent-walls">壁を透かす</label><p>奥の通路や、壁に隠れた正解ルートを確認できます。</p></div><input id="transparent-walls" type="checkbox" role="switch"></div>
      <div class="setting-row toggle-row"><div><label for="wall-grid">壁に1m間隔の縦の点線を表示</label><p>壁パネルの区切りを確認できます。</p></div><input id="wall-grid" type="checkbox" role="switch"></div>
      <div class="setting-row toggle-row"><div><label for="show-windows">外壁の窓を表示</label><p>正面以外の3面を、窓あり／窓なしに切り替えます。</p></div><input id="show-windows" type="checkbox" role="switch" checked></div>
      <div class="setting-row toggle-row"><div><label for="show-person">人物を表示</label><p>入口の左横に身長130cmの人物を表示し、大きさを比較できます。</p></div><input id="show-person" type="checkbox" role="switch" checked></div>
      <div class="setting-actions"><button id="reset-view" type="button">全体表示に戻す <span aria-hidden="true">↗</span></button><p id="view-status" role="status" aria-live="polite">斜めから全体を表示しています。</p></div>
    </section>
    </div>
    <aside class="source-note" aria-label="取り込んだ図面の情報"><div><strong>取り込んだ迷路案</strong><p>パターン01 · F2–G2間／F3–G3間の壁追加を反映</p><p class="route-summary">正解ルート ${analysis.route.length}セル · 曲がり角 ${analysis.turns}回 · 分岐 ${analysis.branches}か所</p></div><a href="${import.meta.env.BASE_URL}reference/pattern01.pdf" target="_blank" rel="noopener">元の平面図を見る <span aria-hidden="true">↗</span></a></aside>
    <footer class="page-footer">ADVENTURE BUILDERS <span>小さな段ボールから、大きな冒険を。</span></footer>
  </main>`;

function element<T extends HTMLElement>(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`画面要素が見つかりません: ${id}`);
  return node as T;
}
const events = new AbortController();
const rotation = element<HTMLInputElement>('rotation');
const zoom = element<HTMLInputElement>('zoom');
const mode = element<HTMLSelectElement>('view-mode');
const status = element<HTMLElement>('view-status');
const stage = element<HTMLDivElement>('maze-stage');
let view: ReturnType<typeof createMazeView> | undefined;

try {
  view = createMazeView(stage, pattern01, (angle, percent) => {
    rotation.value = String(angle);
    zoom.value = String(percent);
    element<HTMLOutputElement>('rotation-value').value = `${angle}°`;
    element<HTMLOutputElement>('zoom-value').value = `${percent}%`;
  });
  const bind = (id: string, event: string, callback: () => void) =>
    element(id).addEventListener(event, callback, { signal: events.signal });
  bind('show-solution', 'change', () => view!.setSolution(element<HTMLInputElement>('show-solution').checked));
  bind('view-mode', 'change', () => { view!.setView(mode.value as ViewMode); status.textContent = `${mode.selectedOptions[0].text}の視点に切り替えました。`; });
  bind('rotation', 'input', () => view!.setAngle(Number(rotation.value)));
  bind('zoom', 'input', () => view!.setZoom(Number(zoom.value)));
  bind('transparent-walls', 'change', () => view!.setTransparent(element<HTMLInputElement>('transparent-walls').checked));
  bind('wall-grid', 'change', () => view!.setWallGrid(element<HTMLInputElement>('wall-grid').checked));
  bind('show-windows', 'change', () => view!.setWindows(element<HTMLInputElement>('show-windows').checked));
  bind('show-person', 'change', () => view!.setPerson(element<HTMLInputElement>('show-person').checked));
  bind('reset-view', 'click', () => { mode.value = 'angled'; view!.reset(); status.textContent = '斜めからの全体表示に戻しました。'; });
} catch (error) {
  stage.innerHTML = '<p class="viewer-error" role="alert">3D表示を開始できませんでした。WebGL 2が有効なEdgeやChromeで開き直してください。</p>';
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('.settings input, .settings select, .settings button').forEach(node => { node.disabled = true; });
  status.textContent = '3D表示を利用できません。';
  console.error('迷路の3D表示を開始できませんでした。', error);
}

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    events.abort();
    view?.dispose();
    app.replaceChildren();
  });
}
