import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze, wallKey } from '../src/maze/analyzeMaze.ts';
import { createMazeCells, createRoutePoints } from '../src/maze/topology.ts';

const expectedRoute = 'A7 A6 A5 A4 B4 C4 C5 B5 B6 C6 C7 D7 D6E D5E E5 E4 D4 D3 C3 C2S B2S B3 A3 A2 A1 B1 C1 D1 D2 E2 E1 F1 G1 G2 G3 G4 F4 F5 G5 G6 F6 E6 E7 F7N G7'.split(' ');

test('壁パネル66枚・総延長64.5m・外周26区間・内部40区間になる', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(pattern01.walls.length, 66);
  assert.deepEqual(result.wallMaterials, { fullWidthPanels: 63, halfWidthPanels: 3, requiredSheets: 65 });
  assert.equal(result.externalWalls, 26);
  assert.equal(result.internalWalls, 40);
  assert.equal(pattern01.walls.reduce((sum, wall) => sum + Math.hypot(
    wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]), 0), 64.5);
  assert.equal(pattern01.cellSize, 1);
  assert.equal(pattern01.wallHeight, 1.5);
});

test('半幅パネル2枚は原板1枚から切り出し、奇数枚なら原板を切り上げる', () => {
  const walls = [
    { from: [0, 0], to: [0, 0.5] },
    { from: [0, 0.5], to: [0, 1] },
    { from: [0, 1], to: [0, 1.5] },
  ];
  assert.deepEqual(analyzeMaze({ ...pattern01, walls: walls.slice(0, 2) }).wallMaterials,
    { fullWidthPanels: 0, halfWidthPanels: 2, requiredSheets: 1 });
  assert.deepEqual(analyzeMaze({ ...pattern01, walls }).wallMaterials,
    { fullWidthPanels: 0, halfWidthPanels: 3, requiredSheets: 2 });
});

test('F2–G2・F3–G3間に指定された追加壁があり通過できない', () => {
  const result = analyzeMaze(pattern01);
  for (const row of [1, 2]) {
    assert.ok(pattern01.walls.some(w => wallKey(w) === wallKey({ from: [6, row], to: [6, row + 1] })));
    assert.ok(!result.graph.get(`F${row + 1}`).includes(`G${row + 1}`));
  }
});

test('D5・D6・B2・C2・F7を分割した54通行区画がつながり、循環3・分岐10・曲がり角32になる', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(result.connectedCells, 54);
  assert.equal(result.edges, 56);
  assert.equal(result.branches, 10);
  assert.equal(result.turns, 32);
  assert.deepEqual(result.route, expectedRoute);
  assert.deepEqual(pattern01.solution, expectedRoute);
});

test('F7中央に横1m・右辺下半分に縦50cmの壁があり、北側からG7へ進める', () => {
  const keys = new Set(pattern01.walls.map(wallKey));
  assert.ok(keys.has(wallKey({ from: [5, 6.5], to: [6, 6.5] })));
  assert.ok(keys.has(wallKey({ from: [6, 6.5], to: [6, 7] })));
  assert.equal(pattern01.wallHeight, 1.5);
  const cells = createMazeCells(pattern01);
  for (const id of ['F7N', 'F7S']) {
    const cell = cells.find(cell => cell.id === id);
    assert.equal(cell.to[0] - cell.from[0], 1);
    assert.equal(cell.to[1] - cell.from[1], 0.5);
  }
  const { graph, route, routePoints } = analyzeMaze(pattern01);
  assert.deepEqual(graph.get('F7S'), ['E7']);
  assert.deepEqual(graph.get('F7N'), ['E7', 'G7']);
  assert.deepEqual(route.slice(-3), ['E7', 'F7N', 'G7']);
  assert.ok(routePoints.some(([x, z]) => x === 6.5 && z === 6.25));
  assert.throws(() => createRoutePoints(pattern01, ['F7N', 'F7S']), /壁/);
  assert.throws(() => createRoutePoints(pattern01, ['F7S', 'G7']), /壁/);
});

test('正解線はB1・C1付近の幅1.5mの通路中央を直線で通る', () => {
  const { route, routePoints } = analyzeMaze(pattern01);
  assert.deepEqual(pattern01.solutionVia, ['B1', 'C1']);
  const index = route.indexOf('A2');
  assert.deepEqual(route.slice(index, index + 6), ['A2', 'A1', 'B1', 'C1', 'D1', 'D2']);
  const middle = (0 + 1.5) / 2;
  assert.equal(middle, 0.75);
  assert.ok(routePoints.slice(1).some((b, i) => routePoints[i][1] === middle && b[1] === middle
    && Math.min(routePoints[i][0], b[0]) === 0.5 && Math.max(routePoints[i][0], b[0]) === 3.5));
  for (const x of [1.5, 2.5]) {
    assert.ok(routePoints.slice(1).some((b, i) => routePoints[i][1] === middle && b[1] === middle
      && Math.min(routePoints[i][0], b[0]) <= x && Math.max(routePoints[i][0], b[0]) >= x));
  }
  const shortest = analyzeMaze({ ...pattern01, solutionVia: undefined });
  assert.equal(shortest.route.length, 43);
  assert.ok(shortest.route.includes('B2N') && shortest.route.includes('C2N'));
});

test('通過位置が区画外・壁面上・数値不正の場合は描画を拒否する', () => {
  for (const point of [[1.5, 1.25], [1.5, 1], [NaN, 0.75]]) {
    assert.throws(() => createRoutePoints({ ...pattern01,
      solutionCenters: { B1: point } }, pattern01.solution), /通過位置が不正/);
  }
});

test('不正または到達できない経由区画を検出する', () => {
  assert.throws(() => analyzeMaze({ ...pattern01, solutionVia: ['Z1'] }), /経由区画が不正/);
  const walls = [...pattern01.walls,
    { from: [1, 0], to: [1, 1] },
    { from: [2, 0], to: [2, 1] },
    { from: [1, 1], to: [2, 1] },
  ];
  assert.throws(() => analyzeMaze({ ...pattern01, walls }), /経由区画に到達できません/);
});

test('B2・C2上辺の壁を下へ50cm移動し、南側0.5mの通路に正解線を通す', () => {
  const keys = new Set(pattern01.walls.map(wallKey));
  const cells = createMazeCells(pattern01);
  const { graph, routePoints } = analyzeMaze(pattern01);
  for (const [x, column] of [[1, 'B'], [2, 'C']]) {
    assert.ok(keys.has(wallKey({ from: [x, 1.5], to: [x + 1, 1.5] })));
    assert.ok(!keys.has(wallKey({ from: [x, 1], to: [x + 1, 1] })));
    for (const suffix of ['N', 'S']) {
      const cell = cells.find(cell => cell.id === column + '2' + suffix);
      assert.equal(cell.to[0] - cell.from[0], 1);
      assert.equal(cell.to[1] - cell.from[1], 0.5);
    }
    assert.ok(graph.get(column + '1').includes(column + '2N'));
    assert.ok(!graph.get(column + '2N').includes(column + '2S'));
    assert.ok(graph.get(column + '2S').includes(column + '3'));
  }
  assert.ok(graph.get('B2N').includes('C2N'));
  assert.ok(graph.get('B2S').includes('C2S'));
  assert.ok(routePoints.some(([x, z]) => x === 1.5 && z === 1.75));
  assert.ok(routePoints.some(([x, z]) => x === 2.5 && z === 1.75));
  assert.throws(() => createRoutePoints(pattern01, ['B2N', 'B2S']), /壁/);
});

test('B2左端・C2右端は横壁より上の50cmだけを除き、下側の50cmを残す', () => {
  const keys = new Set(pattern01.walls.map(wallKey));
  const { graph } = analyzeMaze(pattern01);
  for (const x of [1, 3]) {
    assert.ok(keys.has(wallKey({ from: [x, 1.5], to: [x, 2] })));
    assert.ok(!pattern01.walls.some(wall => wall.from[0] === x && wall.to[0] === x
      && Math.min(...[wall.from[1], wall.to[1]]) < 1.5
      && Math.max(...[wall.from[1], wall.to[1]]) > 1));
  }
  assert.ok(graph.get('A2').includes('B2N'));
  assert.ok(graph.get('C2N').includes('D2'));
  assert.ok(!graph.get('A2').includes('B2S'));
  assert.ok(!graph.get('C2S').includes('D2'));
  const reversed = { ...pattern01, walls: pattern01.walls.map(wall =>
    ({ from: wall.to, to: wall.from })) };
  assert.deepEqual(analyzeMaze(reversed).route, expectedRoute);
});

test('入口A7・出口G7の下辺だけが外周の開口になっている', () => {
  const keys = new Set(pattern01.walls.map(wallKey));
  for (let i = 0; i < 7; i++) {
    assert.ok(keys.has(wallKey({ from: [i, 0], to: [i + 1, 0] })));
    assert.ok(keys.has(wallKey({ from: [0, i], to: [0, i + 1] })));
    assert.ok(keys.has(wallKey({ from: [7, i], to: [7, i + 1] })));
    assert.equal(keys.has(wallKey({ from: [i, 7], to: [i + 1, 7] })), i !== 0 && i !== 6);
  }
});

test('正解ルートの各移動が隣接する通行区画で、描画する線分も壁を横切らない', () => {
  const { graph } = analyzeMaze(pattern01);
  for (let i = 1; i < pattern01.solution.length; i++) {
    assert.ok(graph.get(pattern01.solution[i - 1]).includes(pattern01.solution[i]));
  }
  const points = createRoutePoints(pattern01, pattern01.solution);
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const vertical = a[0] === b[0];
    assert.ok(vertical || a[1] === b[1], 'すべての線分が水平または垂直');
    for (const wall of pattern01.walls) {
      const wallVertical = wall.from[0] === wall.to[0];
      if (vertical === wallVertical) {
        const fixed = vertical ? 0 : 1;
        const along = vertical ? 1 : 0;
        assert.ok(a[fixed] !== wall.from[fixed] || Math.min(Math.max(a[along], b[along]),
          Math.max(wall.from[along], wall.to[along])) <= Math.max(Math.min(a[along], b[along]),
          Math.min(wall.from[along], wall.to[along])), '正解線が壁と重ならない');
        continue;
      }
      const x = vertical ? a[0] : wall.from[0];
      const z = vertical ? wall.from[1] : a[1];
      const within = (value, p, q) => value >= Math.min(p, q) && value <= Math.max(p, q);
      assert.ok(!(within(x, a[0], b[0]) && within(z, a[1], b[1])
        && within(x, wall.from[0], wall.to[0]) && within(z, wall.from[1], wall.to[1])),
      `壁 ${wallKey(wall)} を横切らない`);
    }
  }
});

test('D5・D6の中央壁は2mで、左右0.5mに分かれ、左は行き止まり・右はE5へ進める', () => {
  for (const row of [4, 5]) assert.ok(pattern01.walls.some(wall =>
    wallKey(wall) === wallKey({ from: [3.5, row], to: [3.5, row + 1] })));
  const cells = createMazeCells(pattern01);
  for (const id of ['D5W', 'D5E', 'D6W', 'D6E']) {
    const cell = cells.find(cell => cell.id === id);
    assert.equal(cell.to[0] - cell.from[0], 0.5);
    assert.equal(cell.to[1] - cell.from[1], 1);
  }
  const result = analyzeMaze(pattern01);
  assert.deepEqual(result.graph.get('D5W'), ['D6W']);
  assert.ok(result.graph.get('D7').includes('D6W'));
  assert.ok(result.graph.get('D7').includes('D6E'));
  assert.ok(result.graph.get('D5E').includes('E5'));
  assert.ok(!result.graph.get('D6W').includes('D6E'));
  assert.throws(() => createRoutePoints(pattern01, ['D7', 'D6W', 'D6E']), /壁/);
});

test('D7上辺の左半分が赤✕、右半分が青〇で、正解線は右〇の中央を通る', () => {
  assert.deepEqual(pattern01.quizWalls.filter(wall => wall.cell === 'D7'), [
    { cell: 'D7', edge: 'top', span: [0, 0.5], symbol: '✕', color: '#dc2626' },
    { cell: 'D7', edge: 'top', span: [0.5, 1], symbol: '〇', color: '#2563eb' },
  ]);
  const points = createRoutePoints(pattern01, pattern01.solution);
  const crossings = points.slice(1).filter((b, i) => points[i][0] >= 3 && points[i][0] <= 4
    && points[i][1] > 6 && b[1] < 6);
  assert.deepEqual(crossings.map(point => point[0]), [3.75]);
});

test('F7と中央の壁追加・B2とC2の移動・縦壁の切り詰めを戻すと元の配置を再現する', () => {
  const restoredWalls = pattern01.walls.map(wall => {
    if (wall.from[1] === 1.5 && wall.to[1] === 1.5)
      return { from: [wall.from[0], 1], to: [wall.to[0], 1] };
    if ([1, 3].includes(wall.from[0]) && wall.from[0] === wall.to[0]
      && wall.from[1] === 1.5 && wall.to[1] === 2)
      return { from: [wall.from[0], 1], to: wall.to };
    return wall;
  });
  const original = { ...pattern01, solutionVia: [], solutionCenters: undefined, walls: restoredWalls.filter(wall =>
    [...wall.from, ...wall.to].every(Number.isInteger)) };
  const result = analyzeMaze(original);
  assert.equal(original.walls.length, 62);
  assert.equal(result.connectedCells, 49);
  assert.equal(result.edges, 48);
  assert.equal(result.branches, 2);
  assert.equal(result.turns, 31);
  assert.deepEqual(result.route, 'A7 A6 A5 A4 B4 C4 C5 B5 B6 C6 C7 D7 D6 D5 E5 E4 D4 D3 C3 C2 B2 B3 A3 A2 A1 B1 C1 D1 D2 E2 E1 F1 G1 G2 G3 G4 F4 F5 G5 G6 F6 E6 E7 F7 G7'.split(' '));
});

test('重複壁・範囲外の壁・出口に到達できない配置を検出する', () => {
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, pattern01.walls[0]] }), /重複/);
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [{ from: [-1, 0], to: [0, 0] }] }), /不正/);
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [{ from: [3.25, 4], to: [3.25, 5] }] }), /不正/);
  for (const wall of [
    { from: [1, 1], to: [1, 1] },
    { from: [1, 1], to: [1, 2.5] },
    { from: [1, 1], to: [1.5, 1.5] },
    { from: [1, 1.25], to: [1, 1.75] },
  ]) assert.throws(() => analyzeMaze({ ...pattern01, walls: [wall] }), /不正/);
  const closed = [
    { from: [1, 6], to: [1, 7] },
    { from: [0, 6], to: [1, 6] },
  ];
  const keys = new Set(pattern01.walls.map(wallKey));
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, ...closed.filter(w => !keys.has(wallKey(w)))] }), /到達/);
});
