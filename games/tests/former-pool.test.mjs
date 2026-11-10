import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { openPassage } from '../src/maze/topology.ts';
import { wallKey } from '../src/maze/analyzeMaze.ts';

test('旧ボールプールの壁が第2案集08の9区間と一致し、総延長4.5mになる', () => {
  const expected = [
    { from: [2, 4], to: [2, 4.5] },
    { from: [2, 4.5], to: [2.5, 4.5] },
    { from: [1.5, 4.5], to: [1.5, 5] },
    { from: [1.5, 5], to: [2, 5] },
    { from: [2, 5], to: [2.5, 5] },
    { from: [1.5, 5], to: [1.5, 5.5] },
    { from: [2, 5], to: [2, 5.5] },
    { from: [2, 5.5], to: [2.5, 5.5] },
    { from: [2, 5.5], to: [2, 6] },
  ];
  const inside = pattern01.walls.filter(wall => {
    const x = (wall.from[0] + wall.to[0]) / 2;
    const z = (wall.from[1] + wall.to[1]) / 2;
    return x > 1 && x < 3 && z > 4 && z < 6;
  });
  assert.deepEqual(inside.map(wallKey).sort(), expected.map(wallKey).sort());
  assert.equal(inside.reduce((sum, wall) => sum + Math.hypot(
    wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]), 0), 4.5);
});

test('案08は50cm区画で孤立なく通り抜けられ、4.5mと0.5mの袋小路ができる', () => {
  // 幅1mの入口・出口の部屋はそれぞれ一つにまとめ、室内の50cm通路を調べる。
  const id = index => index === 2 || index === 3 ? 'S'
    : index === 14 || index === 15 ? 'T' : String(index);
  const nodes = [...new Set(Array.from({ length: 16 }, (_, i) => id(i)))];
  const graph = new Map(nodes.map(node => [node, new Set()]));
  for (let z = 0; z < 4; z++) for (let x = 0; x < 4; x++) {
    for (const [nx, nz] of [[x + 1, z], [x, z + 1]]) {
      if (nx >= 4 || nz >= 4) continue;
      const a = id(z * 4 + x), b = id(nz * 4 + nx);
      const boundary = nx !== x
        ? { from: [1 + nx / 2, 4 + z / 2], to: [1 + nx / 2, 4 + (z + 1) / 2] }
        : { from: [1 + x / 2, 4 + nz / 2], to: [1 + (x + 1) / 2, 4 + nz / 2] };
      if (a !== b && openPassage(boundary, pattern01.walls)) {
        graph.get(a).add(b); graph.get(b).add(a);
      }
    }
  }
  const previous = new Map([['S', null]]), queue = ['S'];
  for (let i = 0; i < queue.length; i++) for (const next of graph.get(queue[i])) {
    if (!previous.has(next)) { previous.set(next, queue[i]); queue.push(next); }
  }
  assert.equal(previous.size, 14, '全ての区画へ到達できる');
  assert.deepEqual(nodes.filter(node => !['S', 'T'].includes(node) && graph.get(node).size === 1), ['9', '10']);
  const path = [];
  for (let at = 'T'; at !== null; at = previous.get(at)) path.unshift(at);
  assert.deepEqual(path, ['S', '7', '11', 'T']);
  for (const [branch, metres] of [
    [['7', '6', '5', '1', '0', '4', '8', '12', '13', '9'], 4.5],
    [['11', '10'], 0.5],
  ]) {
    for (let i = 1; i < branch.length; i++) assert.ok(graph.get(branch[i - 1]).has(branch[i]));
    assert.equal((branch.length - 1) * 0.5, metres);
  }
});
