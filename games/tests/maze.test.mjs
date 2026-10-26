import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze, cellPoint, wallKey } from '../src/maze/analyzeMaze.ts';

const expectedRoute = 'A7 A6 A5 A4 B4 C4 C5 B5 B6 C6 C7 D7 D6 D5 E5 E4 D4 D3 C3 C2 B2 B3 A3 A2 A1 B1 C1 D1 D2 E2 E1 F1 G1 G2 G3 G4 F4 F5 G5 G6 F6 E6 E7 F7 G7'.split(' ');

test('更新後の図と同じ壁62区間・外周26区間・内部36区間を持つ', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(pattern01.walls.length, 62);
  assert.equal(result.externalWalls, 26);
  assert.equal(result.internalWalls, 36);
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

test('全49区画がつながり、循環なし・分岐2・曲がり角31で元図の経路と一致する', () => {
  const result = analyzeMaze(pattern01);
  assert.equal(result.connectedCells, 49);
  assert.equal(result.edges, 48);
  assert.equal(result.branches, 2);
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

test('正解ルートの各移動が1セル隣で、壁を横切らない', () => {
  const { graph } = analyzeMaze(pattern01);
  for (let i = 1; i < pattern01.solution.length; i++) {
    assert.ok(graph.get(pattern01.solution[i - 1]).includes(pattern01.solution[i]));
    const a = cellPoint(pattern01.solution[i - 1]);
    const b = cellPoint(pattern01.solution[i]);
    assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1);
  }
});

test('重複壁・範囲外の壁・出口に到達できない配置を検出する', () => {
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, pattern01.walls[0]] }), /重複/);
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [{ from: [-1, 0], to: [0, 0] }] }), /不正/);
  const closed = [
    { from: [1, 6], to: [1, 7] },
    { from: [0, 6], to: [1, 6] },
  ];
  const keys = new Set(pattern01.walls.map(wallKey));
  assert.throws(() => analyzeMaze({ ...pattern01, walls: [...pattern01.walls, ...closed.filter(w => !keys.has(wallKey(w)))] }), /到達/);
});
