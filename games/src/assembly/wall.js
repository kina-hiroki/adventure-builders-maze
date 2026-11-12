import { wallGeometry as geometryAt, wallSolidFaces, DISPLAY_SHEET_THICKNESS, orderedFaces, mix, add, mul } from './geometry.js';
import { addCardboardPattern, drawCorrugation } from './material.js';
import { createSvgRenderer } from './svgRenderer.js';
export function mountWall() {
    const events = new AbortController();
    let disposed = false;
    function listen(target, type, callback) { target.addEventListener(type, callback, { signal: events.signal }); }
    const root = document.getElementById('join-opened-boxes');
    const svg = root.querySelector('[data-scene]');
    const button = root.querySelector('[data-play]');
    const slider = root.querySelector('[data-progress]');
    const percent = root.querySelector('[data-percent]');
    const stage = root.querySelector('[data-stage]');
    const status = root.querySelector('[data-status]');
    const hatchLabel = root.querySelector('[data-hatch-label]');
    const jumps = [...root.querySelectorAll('[data-jump]')];
    const renderer = createSvgRenderer(svg), make = renderer.make;
    let lastProgress = -1, lastWidth = -1;
    let progress = 0, frame = 0, running = false, lastStage = -1;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw() {
        if (disposed)
            return;
        const width = Math.max(240, svg.clientWidth || root.clientWidth), height = Math.max(360, Math.min(520, width * .58 + 90));
        if (progress === lastProgress && width === lastWidth) return;
        svg.setAttribute('height', String(height));
        renderer.begin();
        const g = geometryAt(progress), ca = Math.cos(g.azimuth), sa = Math.sin(g.azimuth), ce = Math.cos(g.elevation), se = Math.sin(g.elevation);
        root.dataset.joined = String(g.join === 1);
        function project(p) { return [p[0] * ca - p[2] * sa, -p[1] * ce + (p[0] * sa + p[2] * ca) * se]; }
        function bounds(faces) {
            const ps = faces.flatMap(f => f.points.map(project));
            return [Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))];
        }
        const one = bounds(g.faces.filter(f => f.unit === 0)), all = bounds(g.faces);
        const box = one.map((v, i) => mix(v, all[i], g.reveal));
        const topPadding = mix(75, 140, g.reveal), bottomPadding = mix(75, 100, g.reveal);
        const scale = Math.min((width - 132) / (box[2] - box[0]), (height - topPadding - bottomPadding) / (box[3] - box[1]));
        const offsetX = width / 2 - (box[0] + box[2]) * scale / 2;
        const offsetY = (height + topPadding - bottomPadding) / 2 - (box[1] + box[3]) * scale / 2;
        const screen = p => { const q = project(p); return [q[0] * scale + offsetX, q[1] * scale + offsetY]; };
        function line(a, b, attrs = {}, parent = svg) { return make('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dimension', ...attrs }, undefined, parent); }
        function text(x, y, value, attrs = {}, parent = svg) { return make('text', { x, y, 'text-anchor': 'middle', ...attrs }, value, parent); }
        const defs = make('defs');
        addCardboardPattern(make, defs, 'wall-cardboard-kraft');
        const pattern = make('pattern', { id: 'wall-overlap-hatch', width: 9, height: 9, patternUnits: 'userSpaceOnUse' }, undefined, defs);
        make('path', { d: 'M-2 2L2-2M0 9L9 0M7 11L11 7', fill: 'none', stroke: 'var(--foreground)', 'stroke-opacity': '.20', 'stroke-width': 1 }, undefined, pattern);
        const shown = wallSolidFaces({ ...g, faces: g.faces.filter(f => f.unit === 0 || g.reveal > 0) });
        const view = [sa * ce, se, ca * ce];
        let piece = 0;
        for (const face of orderedFaces(shown, view)) {
            const points = face.points.map(p => screen(p).join(',')).join(' ');
            make('polygon', { points, class: face.surface === 'edge' ? 'cardboard-edge' : face.which + '-' + (face.zone === 1 ? 'body' : 'flap'), 'data-surface': face.surface });
            const id = 'wall-piece-' + piece++;
            const clip = make('clipPath', { id }, undefined, defs);
            make('polygon', { points }, undefined, clip);
            const detail = make('g', { 'clip-path': 'url(#' + id + ')' });
            if (face.surface === 'edge') {
                drawCorrugation(face, screen, make, detail);
                continue;
            }
            function hatch(x0, x1, y0, y1) {
                if (x1 <= x0 || y1 <= y0)
                    return;
                make('polygon', { points: [[x0, y0, face.z], [x1, y0, face.z], [x1, y1, face.z], [x0, y1, face.z]].map(p => screen(p).join(',')).join(' '), fill: 'url(#wall-overlap-hatch)' }, undefined, detail);
            }
            if (face.which === 'upper' && progress < .68)
                hatch(face.ox, face.ox + 260, g.upperBottom, 90);
            if (face.unit > 0 && !face.foot) {
                const previous = g.starts[face.unit - 1] + 260;
                hatch(face.ox, previous, 0, 150);
            }
            for (const edge of face.edges) {
                const internalVertical = Math.abs(edge.a[0] - edge.b[0]) < 1e-6 && Math.abs(edge.a[0] - face.ox) > 1e-6 && Math.abs(edge.a[0] - face.ox - 260) > 1e-6;
                if (g.reveal > 0 && internalVertical && !face.foot)
                    continue;
                line(screen(edge.a), screen(edge.b), { class: edge.type, 'stroke-opacity': g.reveal > 0 && edge.type === 'fold' ? .55 : 1 }, detail);
            }
        }
        const visibleLeft = offsetX + box[0] * scale, visibleRight = offsetX + box[2] * scale;
        const visibleTop = offsetY + box[1] * scale;
        function vDim(x, y0, y1, label, right = false) {
            line([x, y0], [x, y1]);
            for (const y of [y0, y1])
                line([x - 4, y], [x + 4, y]);
            text(x + (right ? 8 : -8), (y0 + y1) / 2 + 4, label, { 'text-anchor': right ? 'start' : 'end' });
        }
        function hDim(x0, x1, y, label, below = false) {
            const from = screen([0, 0, 0]), to = screen([1, 0, 0]);
            const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
            const normal = [-dy / length, dx / length], slope = dy / dx, center = (x0 + x1) / 2;
            const a = [x0, y + (x0 - center) * slope], b = [x1, y + (x1 - center) * slope];
            line(a, b, { 'data-width-dimension': 'true' });
            for (const p of [a, b])
                line([p[0] - 4 * normal[0], p[1] - 4 * normal[1]], [p[0] + 4 * normal[0], p[1] + 4 * normal[1]]);
            const offset = below ? 18 : -8, tx = center + normal[0] * offset, ty = y + normal[1] * offset;
            const degrees = Math.atan2(dy, dx) * 180 / Math.PI;
            text(tx, ty, label, { transform: 'rotate(' + degrees + ' ' + tx + ' ' + ty + ')', 'data-width-label': 'true' });
            return { a, b, normal };
        }
        const upperTop = g.upperBottom + 120;
        if (progress < .38) {
            let px = 0;
            for (const part of [70, 60, 70, 60]) {
                const a = screen([px, upperTop, DISPLAY_SHEET_THICKNESS]), b = screen([px + part, upperTop, DISPLAY_SHEET_THICKNESS]);
                hDim(a[0], b[0], visibleTop - 24, part + 'cm');
                px += part;
            }
            if (g.join === 0) {
                const rows = [[90, 120, '30cm'], [30, 90, '60cm'], [0, 30, '30cm']];
                for (const [a, b, label] of rows) {
                    vDim(visibleLeft - 12, screen([0, g.upperBottom + a, DISPLAY_SHEET_THICKNESS])[1], screen([0, g.upperBottom + b, DISPLAY_SHEET_THICKNESS])[1], label);
                }
                for (const [dy, label] of [[105, '上ふた'], [60, '側面'], [15, '下ふた']]) {
                    const at = screen([35, g.upperBottom + dy, DISPLAY_SHEET_THICKNESS]);
                    if (70 * scale >= 43)
                        text(at[0], at[1] + 4, label);
                }
                vDim(visibleRight + 12, screen([260, g.upperBottom, DISPLAY_SHEET_THICKNESS])[1], screen([260, upperTop, DISPLAY_SHEET_THICKNESS])[1], '120cm', true);
                vDim(visibleRight + 12, screen([260, -30, 0])[1], screen([260, 90, 0])[1], '120cm', true);
            }
            else if (g.join === 1) {
                vDim(visibleLeft - 12, screen([0, -30, 0])[1], screen([0, 150, 0])[1], '180cm');
                vDim(visibleRight + 12, screen([260, 30, DISPLAY_SHEET_THICKNESS])[1], screen([260, 90, DISPLAY_SHEET_THICKNESS])[1], '60cm', true);
                text(visibleRight + 8, screen([260, 90, DISPLAY_SHEET_THICKNESS])[1] - 12, '重ね代', { 'text-anchor': 'start' });
            }
        }
        else {
            const y0 = progress < .42 ? -30 : 0;
            vDim(visibleLeft - 12, screen([0, y0, 0])[1], screen([0, 150, 0])[1], y0 === 0 ? '150cm' : '180cm');
            text(visibleLeft - 20, screen([0, 150, 0])[1] - 12, '高さ', { 'text-anchor': 'end' });
        }
        if (progress >= .42 && progress < .68) {
            const a = screen([260, 0, 0]), b = screen([260, -30 * Math.cos(g.angle), 30 * Math.sin(g.angle)]);
            const aa = [a[0] + 12, a[1]], bb = [b[0] + 12, b[1]];
            line(aa, bb);
            for (const p of [aa, bb])
                line([p[0] - 4, p[1]], [p[0] + 4, p[1]]);
            text(Math.max(aa[0], bb[0]) + 8, (aa[1] + bb[1]) / 2 + 4, '30cm', { 'text-anchor': 'start' });
        }
        if (g.fold === 1 && (g.reveal === 0 || g.reveal === 1)) {
            const unit = g.reveal === 1 ? 2 : 0, edgeX = g.starts[unit] + 260, z = unit * DISPLAY_SHEET_THICKNESS * 2;
            const size = Math.min(22, Math.max(8, 8 / scale));
            const corner = screen([edgeX, 0, z]);
            const up = screen([edgeX, size, z]), elbow = screen([edgeX, size, z + size]), inward = screen([edgeX, 0, z + size]);
            const marker = make('g', { 'data-right-angle': 'true', 'aria-label': '壁と足元の直角90度' });
            line(up, elbow, {}, marker);
            line(elbow, inward, {}, marker);
            const labelX = Math.max(corner[0], inward[0]) + 14, labelY = corner[1] - 25;
            line(elbow, [labelX - 4, labelY + 4], { 'stroke-opacity': '.6' }, marker);
            text(labelX, labelY, '90°', { 'text-anchor': 'start' }, marker);
        }
        if (g.reveal === 0) {
            const a = screen([0, -30 * Math.cos(g.angle), 30 * Math.sin(g.angle)]);
            const b = screen([260, -30 * Math.cos(g.angle), 30 * Math.sin(g.angle)]);
            hDim(a[0], b[0], (a[1] + b[1]) / 2 + 24, '横260cm', true);
        }
        else if (g.reveal === 1) {
            for (let i = 0; i < 3; i++) {
                const a = screen([g.starts[i], 150, i * DISPLAY_SHEET_THICKNESS * 2 + DISPLAY_SHEET_THICKNESS]), b = screen([g.starts[i] + 260, 150, i * DISPLAY_SHEET_THICKNESS * 2 + DISPLAY_SHEET_THICKNESS]);
                const y = visibleTop - 22 - i * 27;
                const dim = hDim(a[0], b[0], y, '260cm');
                line(a, add(dim.a, mul(dim.normal, 5)), { 'stroke-opacity': '.35' });
                line(b, add(dim.b, mul(dim.normal, 5)), { 'stroke-opacity': '.35' });
            }
            if (g.connect === 1) {
                for (let i = 1; i < 3; i++) {
                    const a = screen([g.starts[i], 150, i * DISPLAY_SHEET_THICKNESS * 2 + DISPLAY_SHEET_THICKNESS]), b = screen([g.starts[i - 1] + 260, 150, i * DISPLAY_SHEET_THICKNESS * 2 + DISPLAY_SHEET_THICKNESS]);
                    const dim = hDim(a[0], b[0], visibleTop - 110, '40cm');
                    line(a, add(dim.a, mul(dim.normal, 5)), { 'stroke-opacity': '.35' });
                    line(b, add(dim.b, mul(dim.normal, 5)), { 'stroke-opacity': '.35' });
                }
                const a = screen([0, 0, 30]), b = screen([700, 0, 30 + DISPLAY_SHEET_THICKNESS * 4]);
                hDim(a[0], b[0], (a[1] + b[1]) / 2 + 70, '全長700cm（7m）', true);
            }
        }
        slider.value = String(Math.round(progress * 100));
        percent.textContent = Math.round(progress * 100) + '%';
        const phase = progress < .12 ? 0 : progress < .30 ? 1 : progress < .38 ? 2 : progress < .42 ? 3 : progress < .58 ? 4 : progress < .68 ? 5 : progress < .84 ? 6 : progress < .96 ? 7 : 8;
        if (phase !== lastStage) {
            stage.textContent = ['展開図の寸法', '縦に60cm重ねる', '重ね代60cm・全高180cm', '下ふた30cmの折り目を見る', '下ふた30cmを内側へ90°', '壁150cm・足元の奥行30cm', '幅260cmの壁を3組並べる', '横に40cmずつ重ねる', '幅700cm・高さ150cm'][phase];
            status.textContent = ['1枚：縦120cm × 横260cm／ふた各30cm・側面60cm', '縦の重ね代60cm／横幅260cm', '重ねた全高180cm／下ふた30cmは、次に折る部分', '下ふた30cmを内側へ折り、壁の高さを150cmにする', '壁の高さ150cm／折るふたの長さ30cm', '1組：高さ150cm × 幅260cm／足元の奥行30cm', '1組2枚 × 3組＝段ボール6枚', '横の重ね代40cmが2か所／各組の幅260cm', '完成：高さ150cm × 全長700cm／段ボール6枚'][phase];
            hatchLabel.textContent = progress < .68 ? '斜線：縦の重なり' : '斜線：横の重なり';
            lastStage = phase;
        }
        const selected = progress < .12 ? 0 : progress < .42 ? 1 : progress < .68 ? 2 : 3;
        jumps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
        renderer.end();
        lastProgress = progress;
        lastWidth = width;
    }
    function stop() { cancelAnimationFrame(frame); running = false; button.textContent = progress === 1 ? 'もう一度再生' : progress > 0 ? '続きを再生' : '壁を作る動きを再生'; }
    function animate() {
        stop();
        if (progress === 1)
            progress = 0;
        if (reduced.matches) {
            progress = 1;
            draw();
            stop();
            return;
        }
        running = true;
        button.textContent = '一時停止';
        const from = progress, start = performance.now();
        function tick(now) { progress = Math.min(1, from + (now - start) / 21000); draw(); if (progress < 1)
            frame = requestAnimationFrame(tick);
        else {
            stop();
        } }
        draw();
        frame = requestAnimationFrame(tick);
    }
    listen(button, 'click', () => { if (running) {
        stop();
    }
    else
        animate(); });
    listen(slider, 'input', () => { progress = Number(slider.value) / 100; stop(); draw(); });
    jumps.forEach(button => listen(button, 'click', () => { progress = Number(button.getAttribute('data-jump')); stop(); draw(); }));
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
        setProgress(value) {
            if (running) stop();
            progress = Math.max(0, Math.min(1, value));
            draw();
        },
        dispose() { if (disposed)
            return; stop(); disposed = true; events.abort(); observer.disconnect(); cancelAnimationFrame(resizeFrame); } };
}
