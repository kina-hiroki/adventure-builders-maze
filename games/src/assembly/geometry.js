const clamp = t => Math.max(0, Math.min(1, t));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// 実測値ではなく、切り口を読めるように強調した表示上の厚み。
export const DISPLAY_SHEET_THICKNESS = 2;
export function wallGeometry(p) {
    const join = ease((p - .12) / .18), turn = ease((p - .38) / .04);
    const fold = ease((p - .42) / .16), reveal = ease((p - .68) / .10), connect = ease((p - .84) / .12);
    const angle = fold * Math.PI / 2, upperBottom = mix(115, 30, join);
    const starts = [0, mix(380, 220, connect), mix(760, 440, connect)];
    const faces = [];
    function addFace(points, edges, which, zone, unit, ox, z, foot = false) {
        faces.push({ points, edges, which, zone, unit, ox, z, foot });
    }
    for (let unit = 0; unit < 3; unit++) {
        const ox = starts[unit], baseZ = unit * DISPLAY_SHEET_THICKNESS * 2;
        for (const which of ['lower', 'upper']) {
            const bottom = which === 'lower' ? -30 : upperBottom;
            const z = baseZ + (which === 'upper' ? DISPLAY_SHEET_THICKNESS : 0);
            let x = ox;
            for (const panelWidth of [70, 60, 70, 60]) {
                for (let zone = 0; zone < 3; zone++) {
                    const y0 = bottom + [0, 30, 90][zone], y1 = bottom + [30, 90, 120][zone];
                    const foot = which === 'lower' && zone === 0;
                    function point(px, py) {
                        if (foot)
                            return [px, py * Math.cos(angle), z - py * Math.sin(angle)];
                        return [px, py, z];
                    }
                    const a = point(x, y0), b = point(x + panelWidth, y0), c = point(x + panelWidth, y1), d = point(x, y1);
                    const vertical = zone === 1 ? 'fold' : 'cut';
                    const edges = [{ a, b, type: zone === 0 ? 'cut' : 'fold' }, { a: b, b: c, type: x + panelWidth === ox + 260 ? 'cut' : vertical }, { a: c, b: d, type: zone === 2 ? 'cut' : 'fold' }, { a: d, b: a, type: x === ox ? 'cut' : vertical }];
                    addFace([a, b, c, d], edges, which, zone, unit, ox, z, foot);
                }
                x += panelWidth;
            }
        }
    }
    const foldView = ease((p - .38) / .04) * (1 - ease((p - .64) / .04));
    return { faces, join, turn, fold, reveal, connect, angle, upperBottom, starts, wallHeight: 150 + 30 * Math.cos(angle), width: starts[2] + 260,
        azimuth: mix(-.23 * turn, -Math.PI / 6, foldView), elevation: mix(.46 * turn, Math.PI / 6, foldView) };
}
export function squareGeometry(p) {
    const intro = ease((p - .10) / .20), amounts = [0, 0, 0, 0];
    const faces = [], walls = [];
    for (let wall = 0; wall < 4; wall++) {
        const step = Math.max(0, Math.min(1, (p - .46) / .51));
        amounts[wall] = ease(step);
        const move = ease((step - .22) / .56);
        const lift = step < .22 ? 180 * ease(step / .22) : step > .78 ? 180 * (1 - ease((step - .78) / .22)) : 180;
        const destination = [[350, 0], [700, 350], [350, 700], [0, 350]][wall];
        const arc = Math.sin(Math.PI * move);
        const centerX = 350 + (destination[0] - 350) * move + (wall === 1 ? 400 : wall === 3 ? -400 : 0) * arc;
        const startZ = (wall * 260 - 160) * intro, centerZ = startZ + (destination[1] - startZ) * move + (wall === 2 ? 200 : 0) * arc;
        const angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][wall] * move, cs = Math.cos(angle), sn = Math.sin(angle);
        function map(u, y, v) {
            return [centerX + (u - 350) * cs - v * sn, y + lift, centerZ + (u - 350) * sn + v * cs];
        }
        walls.push({ map, amount: amounts[wall], a: map(0, 0, 0), b: map(700, 0, 0) });
        if (wall > 0 && intro === 0)
            continue;
        for (const [y0, y1, kind] of [[0, 30, 'lower-body'], [30, 60, 'upper-flap'], [60, 120, 'upper-body'], [120, 150, 'upper-flap']]) {
            const points = [map(0, y0, 0), map(700, y0, 0), map(700, y1, 0), map(0, y1, 0)];
            faces.push({ points, outline: points, kind, wall, map, y0, y1 });
        }
        const points = [map(0, 0, 0), map(700, 0, 0), map(700, 0, 30), map(0, 0, 30)];
        faces.push({ points, outline: points, kind: 'foot', wall, map });
    }
    return { faces, walls, amounts, intro, visibleCount: intro === 0 ? 1 : 4, complete: p >= .97 };
}

function thickenFace(face, offset, exposedEdges) {
    const shift = point => add(point, offset);
    const back = { ...face, surface: 'back', points: face.points.map(shift) };
    if (face.edges) back.edges = face.edges.map(edge => ({ ...edge, a: shift(edge.a), b: shift(edge.b) }));
    if (face.outline) back.outline = face.outline.map(shift);
    if (face.map) back.map = (...args) => shift(face.map(...args));
    if (face.z !== undefined) back.z = face.z + offset[2];
    const result = [{ ...face, surface: 'front' }, back];
    for (const index of exposedEdges) {
        const a = face.points[index], b = face.points[(index + 1) % face.points.length];
        const points = [a, b, shift(b), shift(a)];
        result.push({ ...face, surface: 'edge', points, corrugation: points });
    }
    return result;
}

export function wallSolidFaces(g) {
    return g.faces.flatMap(face => {
        const offset = face.foot
            ? [0, -Math.sin(g.angle) * DISPLAY_SHEET_THICKNESS, -Math.cos(g.angle) * DISPLAY_SHEET_THICKNESS]
            : [0, 0, -DISPLAY_SHEET_THICKNESS];
        const cuts = face.edges.flatMap((edge, index) => edge.type === 'cut' ? [index] : []);
        return thickenFace(face, offset, cuts);
    });
}

export function squareSolidFaces(g) {
    return g.faces.flatMap(face => {
        const foot = face.kind === 'foot';
        const offset = foot ? [0, -DISPLAY_SHEET_THICKNESS, 0]
            : sub(face.map(0, 0, -DISPLAY_SHEET_THICKNESS * 2), face.map(0, 0, 0));
        const cuts = foot ? [1, 2, 3] : [1, 3, ...(face.y0 === 0 ? [0] : []), ...(face.y1 === 150 ? [2] : [])];
        return thickenFace(face, offset, cuts);
    });
}
function planeOf(points) {
    const a = points[0];
    for (let i = 1; i < points.length - 1; i++) {
        const n = cross(sub(points[i], a), sub(points[i + 1], a)), length = Math.hypot(...n);
        if (length > 1e-7) {
            const normal = mul(n, 1 / length);
            return { normal, offset: dot(normal, a) };
        }
    }
    return null;
}
export function orderedFaces(faces, view) {
    const eps = 1e-6;
    function build(list) {
        if (!list.length)
            return null;
        const first = list[0], plane = planeOf(first.points);
        if (!plane)
            return build(list.slice(1));
        const { normal, offset } = plane, same = [first], front = [], back = [];
        for (const face of list.slice(1)) {
            const ds = face.points.map(p => dot(normal, p) - offset);
            const pos = ds.some(d => d > eps), neg = ds.some(d => d < -eps);
            if (!pos && !neg) {
                same.push(face);
                continue;
            }
            if (!neg) {
                front.push(face);
                continue;
            }
            if (!pos) {
                back.push(face);
                continue;
            }
            const f = [], b = [];
            for (let i = 0; i < face.points.length; i++) {
                const j = (i + 1) % face.points.length, p = face.points[i], q = face.points[j], dp = ds[i], dq = ds[j];
                if (dp >= -eps)
                    f.push(p);
                if (dp <= eps)
                    b.push(p);
                if ((dp > eps && dq < -eps) || (dp < -eps && dq > eps)) {
                    const hit = add(p, mul(sub(q, p), dp / (dp - dq)));
                    f.push(hit);
                    b.push(hit);
                }
            }
            if (f.length >= 3 && planeOf(f))
                front.push({ ...face, points: f });
            if (b.length >= 3 && planeOf(b))
                back.push({ ...face, points: b });
        }
        return { normal, same, front: build(front), back: build(back) };
    }
    const result = [];
    function visit(tree) {
        if (!tree)
            return;
        const front = dot(tree.normal, view) >= 0;
        visit(front ? tree.back : tree.front);
        result.push(...tree.same);
        visit(front ? tree.front : tree.back);
    }
    visit(build(faces));
    return result;
}
export { clamp, ease, mix, add, sub, mul, dot };
