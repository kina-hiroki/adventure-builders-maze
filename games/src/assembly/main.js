import '../style.css';
import './assembly.css';
import './animation.css';
import markup from './view.html?raw';
import { createCleanupScope } from '../createCleanupScope.ts';
import { mountWall } from './wall.js';
import { mountSquare } from './square.js';
import { mountSequence } from './sequence.js';

const app = document.getElementById('app');
if (!app) throw new Error('描画先の #app が見つかりません。');
const base = import.meta.env.BASE_URL;
app.innerHTML = `
  <main class="page assembly-page">
    <header class="page-header">
      <a class="brand" href="${base}" aria-label="Adventure Builders ホーム"><span class="brand-mark" aria-hidden="true">AB</span> ADVENTURE BUILDERS</a>
      <a class="assembly-back" href="${base}">← 3D迷路へ戻る</a>
    </header>
    <section class="intro" aria-labelledby="assembly-title">
      <div><p class="eyebrow">CARDBOARD MAZE / ASSEMBLY</p>
        <h1 id="assembly-title">組み立てアニメーション</h1>
        <p class="lead">2枚を重ねるところから、下ふたを90°に折り、7mの壁4面で正方形を作るまでを連続再生します。場面ボタンや進行バーで、寸法と動きを確認できます。</p>
      </div>
    </section>
    <section class="assembly-viewer" aria-label="段ボールの組み立て手順">${markup}</section>
    <p class="assembly-scope">24枚は、ここで示す外周4面の構成例です。迷路内部の仕切り壁やギミックの材料は含みません。厚みは見やすさのため強調しています（実測値ではありません）。</p>
    <footer class="page-footer">ADVENTURE BUILDERS <a href="${base}">3D迷路へ戻る</a></footer>
  </main>`;

const scope = createCleanupScope();
try {
  const wall = mountWall();
  scope.defer(wall.dispose);
  const square = mountSquare();
  scope.defer(square.dispose);
  const sequence = mountSequence({ wall, square });
  scope.defer(sequence.dispose);
  const events = new AbortController();
  scope.defer(() => events.abort());
  const options = { signal: events.signal };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sequence.pause();
  }, options);
  window.addEventListener('pagehide', event => {
    sequence.pause();
    if (!event.persisted) scope.dispose();
  }, options);
  window.addEventListener('pageshow', event => {
    if (event.persisted) sequence.refresh();
  }, options);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', () => {
    if (motion.matches) sequence.pause();
  }, options);
} catch (error) {
  scope.dispose();
  app.innerHTML = `<main class="page"><h1>組み立て画面を表示できませんでした。</h1><p>ページを再読み込みしてください。</p><a href="${base}">3D迷路へ戻る</a></main>`;
  console.error('組み立てアニメーションの初期化に失敗しました。', error);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scope.dispose();
    app.replaceChildren();
  });
}
