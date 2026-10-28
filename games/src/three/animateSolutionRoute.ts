import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/** 点線の位相を進め、経路の先頭（START）から末尾（GOAL）へ流す。 */
export function animateSolutionRoute(material: Pick<LineMaterial, 'dashOffset' | 'dashSize' | 'gapSize'>,
  render: () => void) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let enabled = false;
  let disposed = false;
  let frame = 0;
  let previousTime: number | undefined;
  let distance = 0;
  const canAnimate = () => enabled && !disposed && !document.hidden && !reducedMotion.matches;

  function stop() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = undefined;
  }
  function tick(time: number) {
    frame = 0;
    if (!canAnimate()) return;
    if (previousTime !== undefined) {
      const elapsed = Math.min((time - previousTime) / 1000, 0.1);
      distance = (distance + elapsed * 0.6) % (material.dashSize + material.gapSize);
      material.dashOffset = -distance;
    }
    previousTime = time;
    render();
    frame = window.requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    if (canAnimate()) frame = window.requestAnimationFrame(tick);
  }
  reducedMotion.addEventListener('change', sync, { signal: events.signal });
  document.addEventListener('visibilitychange', sync, { signal: events.signal });

  return {
    setVisible(value: boolean) {
      if (disposed) return;
      enabled = value;
      if (!value) {
        distance = 0;
        material.dashOffset = 0;
      }
      sync();
    },
    dispose() {
      disposed = true;
      stop();
      events.abort();
    },
  };
}
