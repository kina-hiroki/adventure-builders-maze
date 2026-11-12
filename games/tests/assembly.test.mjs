import test from 'node:test';
import assert from 'node:assert/strict';
import { wallGeometry, squareGeometry, wallSolidFaces, squareSolidFaces, DISPLAY_SHEET_THICKNESS } from '../src/assembly/geometry.js';

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('縦60cm重ね・下ふた30cmの90度折りで、高さ150cm・幅260cmになる', () => {
  const wall = wallGeometry(.63);
  near(wall.upperBottom, 30);
  near(wall.angle, Math.PI / 2);
  near(wall.wallHeight, 150);
  near(wall.starts[0], 0);
  for (const foot of wall.faces.filter(face => face.foot)) {
    near(distance(foot.points[0], foot.points[3]), 30);
    foot.points.forEach(point => near(point[1], 0));
  }
});

test('3組を40cmずつ2か所で重ねると、幅700cmになる', () => {
  const wall = wallGeometry(1);
  assert.deepEqual(wall.starts, [0, 220, 440]);
  near(wall.width, 700);
  near(260 - (wall.starts[1] - wall.starts[0]), 40);
  near(260 - (wall.starts[2] - wall.starts[1]), 40);
});

test('下ふたを折る間は正面から30度の視点になり、7mの壁へ滑らかに戻る', () => {
  const folded = wallGeometry(.63);
  const fullWall = wallGeometry(1);
  near(folded.azimuth, -Math.PI / 6);
  near(folded.elevation, Math.PI / 6);
  near(wallGeometry(.5).azimuth, folded.azimuth);
  near(wallGeometry(.68).azimuth, fullWall.azimuth);
});

test('折る途中も板の表裏間隔を保ち、完成した4面にも切り口と厚みがある', () => {
  for (const progress of [0, .49, .63, 1]) {
    const geometry = wallGeometry(progress), solids = wallSolidFaces(geometry);
    for (const source of geometry.faces) {
      const index = solids.findIndex(face => face.surface === 'front' && face.points === source.points);
      const front = solids[index], back = solids[index + 1];
      const delta = front.points[0].map((value, i) => value - back.points[0][i]);
      near(Math.hypot(...delta), DISPLAY_SHEET_THICKNESS);
      for (const vertex of front.points.slice(1)) {
        near(delta.reduce((sum, value, i) => sum + value * (vertex[i] - front.points[0][i]), 0), 0);
      }
    }
    assert.ok(solids.some(face => face.surface === 'edge' && face.corrugation.length === 4));
  }
  const square = squareGeometry(1), solids = squareSolidFaces(square);
  for (const source of square.faces) {
    const index = solids.findIndex(face => face.surface === 'front' && face.points === source.points);
    near(distance(solids[index].points[0], solids[index + 1].points[0]), DISPLAY_SHEET_THICKNESS * (source.kind === 'foot' ? 1 : 2));
  }
});

test('壁1枚から4枚を平行に用意し、その後4枚が同時に動く', () => {
  assert.equal(squareGeometry(.1).visibleCount, 1);
  const parallel = squareGeometry(.4);
  assert.equal(parallel.visibleCount, 4);
  for (const wall of parallel.walls) {
    near(wall.b[0] - wall.a[0], 700);
    near(wall.b[2] - wall.a[2], 0);
  }
  for (const progress of [.5, .7, .9]) {
    const moving = squareGeometry(progress);
    moving.amounts.forEach(amount => near(amount, moving.amounts[0]));
    moving.walls.forEach((wall, i) => {
      assert.ok(distance(wall.a, parallel.walls[i].a) > 1);
      near(distance(wall.a, wall.b), 700);
    });
  }
});

test('完成した4面は700cm四方で閉じ、角は直角、足元はすべて内側になる', () => {
  const square = squareGeometry(1);
  assert.equal(square.complete, true);
  for (let i = 0; i < 4; i++) {
    const wall = square.walls[i], next = square.walls[(i + 1) % 4];
    near(distance(wall.b, next.a), 0);
    near(distance(wall.a, wall.b), 700);
    const a = wall.b.map((value, j) => value - wall.a[j]);
    const b = next.b.map((value, j) => value - next.a[j]);
    near(a.reduce((sum, value, j) => sum + value * b[j], 0), 0);
    const foot = wall.map(350, 0, 30);
    assert.ok(foot[0] > 0 && foot[0] < 700 && foot[2] > 0 && foot[2] < 700);
    near(wall.map(0, 150, 0)[1], 150);
  }
});
