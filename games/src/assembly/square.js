import { squareGeometry as geometryAt, squareSolidFaces, orderedFaces as ordered, ease, add, sub, mul, dot } from './geometry.js';
import { addCardboardPattern, drawCorrugation } from './material.js';
import { createSvgRenderer } from './svgRenderer.js';
export function mountSquare() {
    const events = new AbortController();
    let disposed = false;
    function listen(target, type, callback) { target.addEventListener(type, callback, { signal: events.signal }); }
    const root = document.getElementById('square-walls-demo'), svg = root.querySelector('[data-scene]');
    const play = root.querySelector('[data-play]'), finish = root.querySelector('[data-finish]'), top = root.querySelector('[data-top]');
    const slider = root.querySelector('[data-progress]'), percent = root.querySelector('[data-percent]'), status = root.querySelector('[data-status]');
    const renderer = createSvgRenderer(svg), make = renderer.make;
    const names = ['A', 'B', 'C', 'D'];
    let lastProgress = -1, lastWidth = -1, lastTop;
    let progress = 0, frame = 0, running = false, lastStatus = '';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw() {
        if (disposed)
            return;
        const width = Math.max(240, svg.clientWidth || root.clientWidth), g = geometryAt(progress);
        if (progress === lastProgress && width === lastWidth && top.checked === lastTop) return;
        const fromHeight = Math.max(360, Math.min(520, width * .58 + 90)), toHeight = Math.max(380, Math.min(590, width * .72 + 90));
        const height = fromHeight + (toHeight - fromHeight) * g.intro;
        svg.setAttribute('height', String(height));
        renderer.begin();
        const completion = ease((progress - .46) / .51);
        const az = top.checked ? 0 : -.23 - .49 * g.intro;
        const referenceElevation = top.checked ? Math.PI / 2 : .46 + .49 * g.intro;
        const el = referenceElevation - (top.checked ? 0 : .25 * completion);
        const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
        function project(p) { return [p[0] * ca - p[2] * sa, -p[1] * ce + (p[0] * sa + p[2] * ca) * se]; }
        const focus = [350, 75, 15];
        const anchors = [[-140, 0, -140], [840, 0, -140], [840, 0, 840], [-140, 0, 840], [0, 200, 0], [700, 200, 700]].map(p => add(focus, mul(sub(p, focus), g.intro)));
        const framePoints = g.faces.flatMap(f => f.points).concat(anchors);
        const ps = framePoints.map(project), xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        const padding = 132 + ((width < 480 ? 92 : 130) - 132) * g.intro;
        const topPadding = 140 - 90 * g.intro, bottomPadding = 100 - 50 * g.intro;
        // 角度変更前の倍率を基準にし、完成図の横幅を従来の1.25倍にする。
        const referenceYs = framePoints.map(p => -p[1] * Math.cos(referenceElevation) + (p[0] * sa + p[2] * ca) * Math.sin(referenceElevation));
        const referenceHeight = Math.max(...referenceYs) - Math.min(...referenceYs);
        const scale = Math.min((width - padding) / (maxX - minX), (height - topPadding - bottomPadding) / referenceHeight) * (1 + .25 * completion);
        const tx = width / 2 - (minX + maxX) * scale / 2;
        const ty = (height + topPadding - bottomPadding) / 2 - (minY + maxY) * scale / 2 + (top.checked ? 20 * completion : 0);
        const screen = p => { const q = project(p); return [q[0] * scale + tx, q[1] * scale + ty]; };
        function line(a, b, attrs = {}, parent = svg) { return make('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dimension', ...attrs }, undefined, parent); }
        function text(x, y, value, attrs = {}) { return make('text', { x, y, 'text-anchor': 'middle', ...attrs }, value); }
        const defs = make('defs'), pattern = make('pattern', { id: 'square-joint-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, undefined, defs);
        make('path', { d: 'M-2 2L2-2M0 8L8 0M6 10L10 6', fill: 'none', stroke: 'var(--foreground)', 'stroke-opacity': '.18' }, undefined, pattern);
        addCardboardPattern(make, defs, 'square-cardboard-kraft');
        let piece = 0;
        for (const face of ordered(squareSolidFaces(g), [sa * ce, se, ca * ce])) {
            const points = face.points.map(p => screen(p).join(',')).join(' ');
            make('polygon', { points, class: face.surface === 'edge' ? 'cardboard-edge' : face.kind, 'data-surface': face.surface });
            const id = 'square-piece-' + piece++, clip = make('clipPath', { id }, undefined, defs);
            make('polygon', { points }, undefined, clip);
            const details = make('g', { 'clip-path': 'url(#' + id + ')' });
            if (face.surface === 'edge') {
                drawCorrugation(face, screen, make, details);
                continue;
            }
            if (face.kind !== 'foot') {
                for (const u of [220, 440])
                    make('polygon', { points: [face.map(u, 0, 0), face.map(u + 40, 0, 0), face.map(u + 40, 150, 0), face.map(u, 150, 0)].map(p => screen(p).join(',')).join(' '), fill: 'url(#square-joint-hatch)' }, undefined, details);
            }
            for (let i = 0; i < face.outline.length; i++)
                line(screen(face.outline[i]), screen(face.outline[(i + 1) % face.outline.length]), { class: 'edge' }, details);
            if (face.kind !== 'foot')
                for (const u of [220, 260, 440, 480])
                    line(screen(face.map(u, 0, 0)), screen(face.map(u, 150, 0)), { class: 'fold' }, details);
        }
        for (let i = 0; i < g.visibleCount && (!g.complete || top.checked); i++) {
            const at = screen(g.walls[i].map(350, 195, 0));
            text(at[0], at[1], '壁' + names[i] + (g.complete ? '' : ' 700cm'));
        }
        if (g.complete) {
            const center = screen([350, 0, 350]);
            function dimension(wa, wb, refA, refB) {
                const a = screen(wa), b = screen(wb), dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
                let n = [-dy / length, dx / length];
                const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                if (dot(n, sub(mid, center)) < 0)
                    n = mul(n, -1);
                line(a, b);
                for (const p of [a, b])
                    line(sub(p, mul(n, 4)), add(p, mul(n, 4)));
                line(screen(refA), a, { 'stroke-opacity': '.4' });
                line(screen(refB), b, { 'stroke-opacity': '.4' });
                const pos = add(mid, mul(n, 17));
                let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle > 90)
                    angle -= 180;
                if (angle < -90)
                    angle += 180;
                text(pos[0], pos[1] + 4, '700cm（7m）', { transform: 'rotate(' + angle + ' ' + pos[0] + ' ' + (pos[1] + 4) + ')' });
            }
            dimension([0, 0, -110], [700, 0, -110], [0, 0, 0], [700, 0, 0]);
            dimension([-110, 0, 0], [-110, 0, 700], [0, 0, 0], [0, 0, 700]);
            const level = top.checked ? 0 : 150;
            const mark = [[45, level, 700], [45, level, 655], [0, level, 655]].map(screen);
            line(mark[0], mark[1]);
            line(mark[1], mark[2]);
            const label = screen([100, level + 25, 600]);
            text(label[0], label[1], '90°');
            if (!top.checked) {
                const a = screen([700, 0, 700]), b = screen([700, 150, 700]), x = a[0] + 13;
                line([x, a[1]], [x, b[1]]);
                for (const y of [a[1], b[1]])
                    line([x - 4, y], [x + 4, y]);
                const tight = x + 64 > width;
                text(tight ? Math.min(x + 48, width - 6) : x + 8, tight ? b[1] - 12 : (a[1] + b[1]) / 2 + 4,
                    '150cm', { 'text-anchor': tight ? 'end' : 'start' });
            }
        }
        slider.value = String(Math.round(progress * 100));
        percent.textContent = Math.round(progress * 100) + '%';
        const active = g.amounts.findIndex(v => v < 1), key = g.complete ? 'complete' : progress < .1 ? 'one' : progress < .3 ? 'reveal' : progress < .46 ? 'four' : String(active);
        if (key !== lastStatus) {
            status.textContent = g.complete ? '完成：700cm × 700cm／高さ150cm／段ボール24枚' : progress < .1 ? '完成した700cmの壁1枚／高さ150cm' : progress < .3 ? '同じ幅700cmの壁を4枚用意する' : progress < .46 ? '700cmの壁4枚を平行に並べた状態／計24枚' :
                '壁4枚を同時に持ち上げ、向きを変えて配置する／各幅700cm・高さ150cm';
            lastStatus = key;
        }
        renderer.end();
        lastProgress = progress;
        lastWidth = width;
        lastTop = top.checked;
    }
    function stop() { cancelAnimationFrame(frame); running = false; play.textContent = progress === 1 ? 'もう一度組み立てる' : progress > 0 ? '続きを再生' : '4面を組み立てる'; }
    function animate() { stop(); if (progress === 1)
        progress = 0; if (reduced.matches) {
        progress = 1;
        draw();
        stop();
        return;
    } running = true; play.textContent = '一時停止'; const start = performance.now(), from = progress; function tick(now) { progress = Math.min(1, from + (now - start) / 11000); draw(); if (progress < 1)
        frame = requestAnimationFrame(tick);
    else {
        stop();
    } } draw(); frame = requestAnimationFrame(tick); }
    listen(play, 'click', () => { if (running) {
        stop();
    }
    else
        animate(); });
    listen(finish, 'click', () => { progress = 1; stop(); draw(); });
    listen(top, 'change', () => { draw(); });
    listen(slider, 'input', () => { progress = Number(slider.value) / 100; stop(); draw(); });
    let resizeFrame = 0;
    // サイズ通知中の高さ変更が、親要素の再通知を引き起こさないようにする。
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; draw(); });
    });
    observer.observe(root);
    draw();
    stop();
    return { pause: stop, refresh: draw,
        setProgress(value, topView = top.checked) {
            if (running) stop();
            progress = Math.max(0, Math.min(1, value));
            top.checked = topView;
            draw();
        },
        dispose() { if (disposed)
            return; stop(); disposed = true; events.abort(); observer.disconnect(); cancelAnimationFrame(resizeFrame); } };
}
