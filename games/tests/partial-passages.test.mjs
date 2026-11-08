import test from 'node:test';
import assert from 'node:assert/strict';
import { openPassage, isPassageBlocked, createRoutePoints } from '../src/maze/topology.ts';
import { pattern01 } from '../src/maze/pattern01.ts';

test('境界の左半分だけを壁でふさいでも右半分を通行でき、壁の向きに依存しない', () => {
  const boundary = { from: [4, 4], to: [5, 4] };
  const wall = { from: [4, 4], to: [4.5, 4] };
  for (const candidate of [wall, { from: wall.to, to: wall.from }]) {
    assert.equal(isPassageBlocked(boundary, [candidate]), false);
    assert.deepEqual(openPassage(boundary, [candidate]), { from: [4.5, 4], to: [5, 4] });
  }
  assert.deepEqual(openPassage({ from: boundary.to, to: boundary.from }, [wall]),
    { from: [4.5, 4], to: [5, 4] });
});

test('縦の境界の部分開口と、2枚の半幅壁による完全な閉鎖を判別する', () => {
  const boundary = { from: [4, 4], to: [4, 5] };
  const walls = [{ from: [4, 4], to: [4, 4.5] }, { from: [4, 4.5], to: [4, 5] }];
  assert.deepEqual(openPassage(boundary, walls.slice(0, 1)), { from: [4, 4.5], to: [4, 5] });
  assert.equal(isPassageBlocked(boundary, walls), true);
  assert.equal(openPassage(boundary, walls), undefined);
});

test('離れた壁と端点だけ接する壁は通行を妨げず、開口を閉じると経路を拒否する', () => {
  const boundary = { from: [4, 4], to: [5, 4] };
  assert.deepEqual(openPassage(boundary, [
    { from: [3.5, 4], to: [4, 4] }, { from: [5, 4], to: [5.5, 4] },
    { from: [4, 3], to: [5, 3] }, { from: [4, 4], to: [4, 5] },
  ]), boundary);
  const closed = { ...pattern01, walls: [...pattern01.walls, { from: [4.5, 4], to: [5, 4] }] };
  assert.throws(() => createRoutePoints(closed, ['E5', 'E4']), /壁/);
});
