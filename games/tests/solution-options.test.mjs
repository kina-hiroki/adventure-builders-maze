import test from 'node:test';
import assert from 'node:assert/strict';
import { pattern01 } from '../src/maze/pattern01.ts';
import { analyzeMaze } from '../src/maze/analyzeMaze.ts';
import { createSolutionOptions } from '../src/maze/createSolutionOptions.ts';

test('初期選択は両方で、個別表示の完全な正解ルートも選べる', () => {
  const options = createSolutionOptions(pattern01);
  assert.deepEqual([...options.keys()], ['both', 'tunnel', 'bypass']);
  assert.equal(options.get('both').paths.length, 2);
  for (const [id, via] of [['tunnel', pattern01.solutionVia], ['bypass', pattern01.alternativeSolutions[0].via]]) {
    const [path] = options.get(id).paths;
    assert.deepEqual(path, [[0.5, 7.35], ...analyzeMaze(pattern01, via).routePoints, [6.5, 7.35]]);
  }
});

test('両方表示は共通区間を重ねず、A1からD1までの抜け道を追加する', () => {
  const options = createSolutionOptions(pattern01);
  const [primary, branch] = options.get('both').paths;
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
