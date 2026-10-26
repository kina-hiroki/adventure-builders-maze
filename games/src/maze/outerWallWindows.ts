import { wallKey } from './analyzeMaze.ts';
import type { MazePlan } from './types.ts';

export type WindowShape = 'circle' | 'square' | 'diamond';

const shapes: readonly WindowShape[] = ['circle', 'square', 'diamond'];

export function createOuterWallWindows(plan: MazePlan): Map<string, WindowShape> {
  const keys = plan.walls.filter(({ from: [x1, z1], to: [x2, z2] }) =>
    (x1 === x2 && (x1 === 0 || x1 === plan.columns))
    || (z1 === z2 && (z1 === 0 || z1 === plan.rows)))
    .map(wallKey).sort();

  // プランごとに再現できるランダム配置にし、視点変更や再読み込みで窓が変わるのを防ぐ。
  let state = 2166136261;
  for (const character of plan.id) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  const assigned = keys.map((_, index) => shapes[index % shapes.length]);
  for (let index = assigned.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const other = Math.floor(state / 0x100000000 * (index + 1));
    [assigned[index], assigned[other]] = [assigned[other], assigned[index]];
  }
  const windows = new Map(keys.map((key, index) => [key, assigned[index]]));
  // 他の3面の形を変えずに、入口・出口がある正面だけを窓の対象から外す。
  for (const wall of plan.walls) {
    if (wall.from[1] === plan.rows && wall.to[1] === plan.rows) windows.delete(wallKey(wall));
  }
  return windows;
}
