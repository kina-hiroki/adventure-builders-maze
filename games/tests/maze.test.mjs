import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze, wallKey } from '../src/maze/analyzeMaze.ts';
import { createMazeCells, createRoutePoints } from '../src/maze/topology.ts';

const expectedRoute = 'A7 A6 A5 A4 B4 C4 C5 B5 B6 C6 C7 D7 D6E D5E E5 E4 D4 D3 C3 C2 B2 B3 A3 A2 A1 B1 C1 D1 D2 E2 E1 F1 G1 G2 G3 G4 F4 F5 G5 G6 F6 E6 E7 F7 G7'.split(' ');

test('中央壁2枚を追加し、壁用段ボール64枚・外周26区間・内部38区間になる', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(pattern01.walls.length, 64);
  assert.equal(result.externalWalls, 26);
  assert.equal(result.internalWalls, 38);
  assert.equal(pattern01.walls.reduce((sum, wall) => sum + Math.hypot(
    wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]), 0), 64);
  assert.equal(pattern01.cellSize, 1);
  assert.equal(pattern01.wallHeight, 1.5);
});

test('F2–G2・F3–G3間に指定された追加壁があり通過できない', () => {
  const result = analyzeMaze(pattern01);
  for (const row of [1, 2]) {
    assert.ok(pattern01.walls.some(w => wallKey(w) === wallKey({ from: [6, row], to: [6, row + 1] })));
    assert.ok(!result.graph.get(`F${row + 1}`).includes(`G${row + 1}`));
  }
});

test('左右に分けたD5・D6を含む51通行区画がつながり、循環なし・分岐3・曲がり角31になる', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(result.connectedCells, 51);
  assert.equal(result.edges, 50);
  assert.equal(result.branches, 3);
  assert.equal(result.turns, 31);
  assert.deepEqual(result.route, expectedRoute);
  assert.deepEqual(pattern01.solution, expectedRoute);
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

test('中央壁を除いた元の配置でも、49区画・62枚と従来の正解ルートを再現する', () => {
  const original = { ...pattern01, walls: pattern01.walls.filter(wall =>
    [...wall.from, ...wall.to].every(Number.isInteger)) };
  const result = analyzeMaze(original);
  assert.equal(original.walls.length, 62);
  assert.equal(result.connectedCells, 49);
  assert.equal(result.edges, 48);
  assert.equal(result.branches, 2);
  assert.equal(result.turns, 31);
  assert.deepEqual(result.route, expectedRoute.map(cell => cell.replace(/[WE]$/, '')));
});

test('重複壁・範囲外の壁・出口に到達できない配置を検出する', () => {
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, pattern01.walls[0]] }), /重複/);
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [{ from: [-1, 0], to: [0, 0] }] }), /不正/);
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [{ from: [3.25, 4], to: [3.25, 5] }] }), /不正/);
  const closed = [
    { from: [1, 6], to: [1, 7] },
    { from: [0, 6], to: [1, 6] },
  ];
  const keys = new Set(pattern01.walls.map(wallKey));
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, ...closed.filter(w => !keys.has(wallKey(w)))] }), /到達/);
});
