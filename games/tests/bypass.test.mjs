import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze, wallKey } from '../src/maze/analyzeMaze.ts';
import { createMazeCells } from '../src/maze/topology.ts';

test('北側の幅1m・横4mの抜け道はA1・D1だけに接続し、B1・C1は壁で分かれる', () => {
  const [passage] = pattern01.externalPassages;
  assert.deepEqual(passage.from, [0, -1]);
  assert.deepEqual(passage.to, [4, 0]);
  assert.equal((passage.to[0] - passage.from[0]) * pattern01.cellSize, 4);
  assert.equal((passage.to[1] - passage.from[1]) * pattern01.cellSize, 1);
  const cells = createMazeCells(pattern01).filter(cell => cell.id.startsWith('north-bypass-'));
  assert.equal(cells.length, 4);
  cells.forEach((cell, i) => {
    assert.deepEqual(cell.from, [i, -1]);
    assert.deepEqual(cell.to, [i + 1, 0]);
  });
  const { graph } = analyzeMaze(pattern01);
  assert.deepEqual(graph.get('north-bypass-1'), ['A1', 'north-bypass-2']);
  assert.deepEqual(graph.get('north-bypass-2'), ['north-bypass-1', 'north-bypass-3']);
  assert.deepEqual(graph.get('north-bypass-3'), ['north-bypass-2', 'north-bypass-4']);
  assert.deepEqual(graph.get('north-bypass-4'), ['D1', 'north-bypass-3']);
});

test('抜け道経由はA1から北側の中央を通ってD1・D2へ戻り、トンネル経由も維持する', () => {
  const { route, routePoints } = analyzeMaze(pattern01, pattern01.alternativeSolutions[0].via);
  assert.equal(route.length, 45);
  const start = route.indexOf('A1');
  assert.deepEqual(route.slice(start, start + 7), [
    'A1', 'north-bypass-1', 'north-bypass-2', 'north-bypass-3', 'north-bypass-4', 'D1', 'D2',
  ]);
  assert.ok(!route.includes('B1') && !route.includes('C1'));
  assert.ok(routePoints.some(([x, z], i) => x === 0.5 && z === -0.5
    && routePoints[i + 1]?.[0] === 3.5 && routePoints[i + 1]?.[1] === -0.5));
  const tunnel = analyzeMaze(pattern01);
  assert.deepEqual(tunnel.route, pattern01.solution);
  assert.ok(tunnel.route.includes('B1') && tunnel.route.includes('C1'));
  assert.deepEqual(route.slice(0, start), tunnel.route.slice(0, start));
  assert.deepEqual(route.slice(route.indexOf('D1')), tunnel.route.slice(tunnel.route.indexOf('D1')));
});

test('抜け道の開口を閉じると抜け道経由は到達できず、抜け道がない図面も従来どおり扱える', () => {
  const closed = { ...pattern01, walls: [...pattern01.walls,
    { from: [0, 0], to: [1, 0] }, { from: [3, 0], to: [4, 0] },
  ] };
  assert.throws(() => analyzeMaze(closed, pattern01.alternativeSolutions[0].via), /到達できません/);
  const before = analyzeMaze({ ...closed, externalPassages: undefined });
  assert.equal(before.connectedCells, 56);
  assert.deepEqual(before.route, pattern01.solution);
  assert.equal(new Set(closed.walls.map(wallKey)).size, 66);
});

test('抜け道の不正寸法・本体との重なり・離れた配置・重複区画を拒否する', () => {
  const passage = pattern01.externalPassages[0];
  for (const [from, to] of [
    [[0, -1], [0, 0]], [[0, -0.5], [4, 0]], [[NaN, -1], [4, 0]],
    [[0, 0], [4, 1]], [[0, -2], [4, -1]], [[8, -1], [9, 0]],
  ]) assert.throws(() => createMazeCells({ ...pattern01,
    externalPassages: [{ ...passage, from, to }] }), /配置・寸法/);
  assert.throws(() => createMazeCells({ ...pattern01,
    externalPassages: [passage, { ...passage, id: 'overlap' }] }), /重複/);
  assert.throws(() => createMazeCells({ ...pattern01,
    externalPassages: [{ ...passage, id: '' }] }), /配置・寸法/);
});
