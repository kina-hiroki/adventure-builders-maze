// 紙の繊維と切り口の波形をSVGで描く。画像ファイルや外部通信は不要。
export function addCardboardPattern(make, defs, id) {
    const pattern = make('pattern', { id, width: 96, height: 64, patternUnits: 'userSpaceOnUse' }, undefined, defs);
    make('rect', { width: 96, height: 64, fill: '#cfa36c' }, undefined, pattern);
    make('path', { d: 'M3 8l19-1m17 7l31 1m-61 9l40-1m17 8l23-1M5 43l25 1m19-4l34-1M12 56l41-1m17 5l18-1',
        fill: 'none', stroke: '#8e643a', 'stroke-width': '.65', 'stroke-opacity': '.22' }, undefined, pattern);
    make('path', { d: 'M19 4l7 1m32 4l12-1M4 33l19-1m18 3l12 1m20 14l17-1M30 60l9-1',
        fill: 'none', stroke: '#f7dfb2', 'stroke-width': '.9', 'stroke-opacity': '.55' }, undefined, pattern);
    for (const [x, y] of [[8, 14], [32, 9], [81, 19], [57, 29], [16, 39], [40, 48], [66, 57], [91, 45]]) {
        make('ellipse', { cx: x, cy: y, rx: '.8', ry: '.35', fill: '#80572f', opacity: '.2' }, undefined, pattern);
    }
}

export function drawCorrugation(face, screen, make, parent) {
    const [a, b, c, d] = face.corrugation.map(screen);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const segments = Math.max(2, Math.ceil(length / 3));
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments, across = i % 2 ? .82 : .18;
        const front = a.map((value, j) => value + (b[j] - value) * t);
        const back = d.map((value, j) => value + (c[j] - value) * t);
        points.push(front.map((value, j) => value + (back[j] - value) * across));
    }
    make('path', { d: points.map((point, i) => `${i ? 'L' : 'M'}${point.join(',')}`).join(' '),
        class: 'cardboard-flutes', 'data-corrugation': 'true' }, undefined, parent);
}
