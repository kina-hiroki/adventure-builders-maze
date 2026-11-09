import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze } from '../src/maze/analyzeMaze.ts';
import { createSolutionOptions } from '../src/maze/createSolutionOptions.ts';

test('初期選択はすべてで、各経路の個別表示も選べる', () => {
  const options = createSolutionOptions(pattern01);
  assert.deepEqual([...options.keys()], ['all', 'tunnel', 'bypass', 'via-e3']);
  assert.equal(options.get('all').paths.length, 3);
  for (const [id, via] of [['tunnel', pattern01.solutionVia], ...pattern01.alternativeSolutions.map(solution => [solution.id, solution.via])]) {
    const [path] = options.get(id).paths;
    assert.deepEqual(path, [[0.5, 7.35], ...analyzeMaze(pattern01, via).routePoints, [6.5, 7.35]]);
  }
});

test('すべて表示には共通区間を重ねずA1からD1までの抜け道が含まれる', () => {
  const options = createSolutionOptions(pattern01);
  const [primary, branch] = options.get('all').paths;
  assert.deepEqual(primary, options.get('tunnel').paths[0]);
  assert.deepEqual(branch, [[0.5, 0.75], [0.5, -0.5], [3.5, -0.5], [3.5, 0.75]]);
  const segments = path => path.slice(1).map((end, i) => [path[i], end]);
  for (const [a, b] of segments(primary)) {
    for (const [c, d] of segments(branch)) {
      for (const fixed of [0, 1]) {
        const along = 1 - fixed;
        if (a[fixed] !== b[fixed] || c[fixed] !== d[fixed] || a[fixed] !== c[fixed]) continue;
        assert.ok(Math.min(Math.max(a[along], b[along]), Math.max(c[along], d[along]))
          <= Math.max(Math.min(a[along], b[along]), Math.min(c[along], d[along])), '共通区間を二重描画しない');
      }
    }
  }
});

test('E3→F3→F2経由はD3で分岐してF1へ合流し、D7の〇側を通る', () => {
  const specification = pattern01.alternativeSolutions.find(solution => solution.id === 'via-e3');
  const analysis = analyzeMaze(pattern01, specification.via);
  const index = analysis.route.indexOf('D3');
  assert.deepEqual(analysis.route.slice(index, index + 5), ['D3', 'E3', 'F3', 'F2', 'F1']);
  assert.equal(analysis.route.length, 37);
  assert.equal(new Set(analysis.route).size, analysis.route.length, '同じ区画へ逆戻りしない');
  assert.ok(analysis.route.includes('C7') && !analysis.route.includes('D5W'));
  assert.ok(!analysis.route.includes('A1') && !analysis.route.includes('B1'));
  const options = createSolutionOptions(pattern01);
  assert.deepEqual(options.get('all').paths[2], [
    [3.75, 2.5], [3.75, 2.25], [4.5, 2.25], [4.5, 2.75], [5.5, 2.75], [5.5, 0.5],
  ]);
  assert.deepEqual(options.get('via-e3').paths[0],
    [[0.5, 7.35], ...analysis.routePoints, [6.5, 7.35]]);
});

test('3経路同時表示は共通部分を二重描画せず、すべてSTARTからGOAL方向へ進む', () => {
  const paths = createSolutionOptions(pattern01).get('all').paths;
  const segments = path => path.slice(1).map((end, i) => [path[i], end]);
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
    for (const [a, b] of segments(paths[i])) for (const [c, d] of segments(paths[j])) {
      for (const fixed of [0, 1]) {
        const along = 1 - fixed;
        if (a[fixed] !== b[fixed] || c[fixed] !== d[fixed] || a[fixed] !== c[fixed]) continue;
        assert.ok(Math.min(Math.max(a[along], b[along]), Math.max(c[along], d[along]))
          <= Math.max(Math.min(a[along], b[along]), Math.min(c[along], d[along])), '共通部分を二重描画しない');
      }
    }
  }
  assert.deepEqual(paths[2][0], [3.75, 2.5]);
  assert.deepEqual(paths[2].at(-1), [5.5, 0.5]);
});

test('D4からD3→E3へ曲がる線に、左へ戻る段差や共通経路との切れ目がない', () => {
  const options = createSolutionOptions(pattern01);
  const single = options.get('via-e3').paths[0];
  const corner = single.findIndex(([x, z]) => x === 3.75 && z === 3.5);
  assert.deepEqual(single.slice(corner, corner + 3), [[3.75, 3.5], [3.75, 2.25], [4.5, 2.25]]);
  assert.ok(!single.some(([x, z]) => x === 3.5 && z >= 2.25 && z <= 2.5), 'D3中心へ左折して戻らない');
  const [primary, , branch] = options.get('all').paths;
  assert.ok(primary.some(([x, z]) => x === branch[0][0] && z === branch[0][1]), '共通経路の曲がり角で分岐する');
  assert.deepEqual(branch.slice(0, 3), [[3.75, 2.5], [3.75, 2.25], [4.5, 2.25]]);
  assert.equal(analyzeMaze(pattern01, pattern01.alternativeSolutions.find(solution => solution.id === 'via-e3').via).turns, 24);
});
