export function mountSequence() {
    const events = new AbortController();
    let disposed = false;
    function listen(target, type, callback) { target.addEventListener(type, callback, { signal: events.signal }); }
    const root = document.getElementById('complete-maze-sequence');
    const play = root.querySelector('[data-sequence-play]'), phase = root.querySelector('[data-sequence-phase]');
    const scene = root.querySelector('[data-sequence-scene]'), slider = root.querySelector('[data-sequence-progress]');
    const percent = root.querySelector('[data-sequence-percent]'), detail = root.querySelector('[data-sequence-detail]');
    const view = root.querySelector('[data-sequence-view]'), top = root.querySelector('[data-sequence-top]');
    const jumps = [...root.querySelectorAll('[data-sequence-jump]')];
    const join = document.getElementById('join-opened-boxes'), square = document.getElementById('square-walls-demo');
    const joinSlider = join.querySelector('[data-progress]'), squareSlider = square.querySelector('[data-progress]');
    const squareTop = square.querySelector('[data-top]');
    // 既存の2つの描画処理を、一つの再生ボタンと時系列で制御する。
    for (const engine of [join, square]) {
        const canvas = engine.querySelector('[data-scene]'), controls = document.createElement('div');
        controls.hidden = true;
        for (const child of [...engine.children])
            if (child !== canvas && child.tagName !== 'STYLE' && child.tagName !== 'SCRIPT')
                controls.appendChild(child);
        engine.prepend(controls);
    }
    let progress = 0, frame = 0, running = false, lastPhase = -1;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = p => Math.max(0, Math.min(1, p));
    function draw() {
        if (disposed)
            return;
        const isSquare = progress >= .64;
        join.hidden = isSquare;
        square.hidden = !isSquare;
        scene.style.minHeight = Math.max(380, Math.min(590, root.clientWidth * .72 + 90)) + 'px';
        const local = isSquare ? clamp((progress - .60) / .40) : clamp(progress / .56);
        view.hidden = !isSquare || local < .30;
        if (!isSquare || local < .30)
            top.checked = false;
        const engineSlider = isSquare ? squareSlider : joinSlider;
        squareTop.checked = top.checked;
        engineSlider.value = String(local * 100);
        engineSlider.dispatchEvent(new Event('input', { bubbles: true }));
        const active = progress < .0672 ? 0 : progress < .2352 ? 1 : progress < .3808 ? 2 : progress < .64 ? 3 : progress < .784 ? 4 : 5;
        if (active !== lastPhase) {
            phase.textContent = ['① 段ボール2枚の寸法', '① 2枚を縦に60cm重ねる', '② 下ふた30cmを内側へ90°', '③ 幅700cmの壁1枚を作る', '④ 同じ700cmの壁を4枚並べる', '⑤ 4枚をまとめて動かし、正方形に組む'][active];
            lastPhase = active;
        }
        detail.textContent = (isSquare ? square : join).querySelector('[data-status]').textContent;
        slider.value = String(progress * 100);
        percent.textContent = (progress * 100).toFixed(1).replace(/\.0$/, '') + '%';
        jumps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
    }
    function stop() { cancelAnimationFrame(frame); running = false; play.textContent = progress === 1 ? '最初からもう一度' : progress > 0 ? '続きを連続再生' : '最初から連続再生'; }
    function animate() {
        stop();
        if (progress === 1) {
            progress = 0;
            top.checked = false;
        }
        if (reduced.matches) {
            progress = 1;
            draw();
            stop();
            return;
        }
        running = true;
        play.textContent = '一時停止';
        const from = progress, start = performance.now();
        function tick(now) { progress = Math.min(1, from + (now - start) / 40000); draw(); if (progress < 1)
            frame = requestAnimationFrame(tick);
        else {
            stop();
        } }
        draw();
        frame = requestAnimationFrame(tick);
    }
    listen(play, 'click', () => { if (running) {
        stop();
    }
    else
        animate(); });
    listen(slider, 'input', () => { progress = Number(slider.value) / 100; stop(); draw(); });
    listen(top, 'change', () => { draw(); });
    jumps.forEach(button => listen(button, 'click', () => { progress = Number(button.getAttribute('data-sequence-jump')); stop(); draw(); }));
    let resizeFrame = 0;
    // サイズ通知中の高さ変更が、親要素の再通知を引き起こさないようにする。
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; draw(); });
    });
    observer.observe(root);
    draw();
    stop();
    return { pause: stop, refresh: draw, dispose() { if (disposed)
            return; stop(); disposed = true; events.abort(); observer.disconnect(); cancelAnimationFrame(resizeFrame); } };
}
