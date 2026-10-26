import type { MazePlan, Point, Wall } from './types.ts';

export function cellPoint(cell: string): Point {
  if (!/^[A-Z][1-9]\d*$/.test(cell)) throw new Error(`不正な区画座標: ${cell}`);
  return [cell.charCodeAt(0) - 65, Number(cell.slice(1)) - 1];
}

export function cellName(x: number, z: number): string {
  return `${String.fromCharCode(65 + x)}${z + 1}`;
}

export function wallKey(wall: Wall): string {
  return [wall.from.join(','), wall.to.join(',')].sort().join(':');
}

export function analyzeMaze(plan: MazePlan) {
  const keys = new Set<string>();
  for (const wall of plan.walls) {
    const [x1, z1] = wall.from;
    const [x2, z2] = wall.to;
    if (![x1, z1, x2, z2].every(Number.isInteger)
      || Math.abs(x1 - x2) + Math.abs(z1 - z2) !== 1
      || x1 < 0 || x2 < 0 || z1 < 0 || z2 < 0
      || x1 > plan.columns || x2 > plan.columns || z1 > plan.rows || z2 > plan.rows) {
      throw new Error('壁の座標・長さが不正です。');
    }
    const key = wallKey(wall);
    if (keys.has(key)) throw new Error('壁が重複しています。');
    keys.add(key);
  }
  const graph = new Map<string, string[]>();
  for (let z = 0; z < plan.rows; z++) {
    for (let x = 0; x < plan.columns; x++) graph.set(cellName(x, z), []);
  }
  for (let z = 0; z < plan.rows; z++) {
    for (let x = 0; x < plan.columns; x++) {
      const cell = cellName(x, z);
      for (const [nx, nz, barrier] of [
        [x + 1, z, { from: [x + 1, z], to: [x + 1, z + 1] }],
        [x, z + 1, { from: [x, z + 1], to: [x + 1, z + 1] }],
      ] as [number, number, Wall][]) {
        const next = cellName(nx, nz);
        if (!graph.has(next) || keys.has(wallKey(barrier))) continue;
        graph.get(cell)!.push(next);
        graph.get(next)!.push(cell);
      }
    }
  }
  if (!graph.has(plan.entry) || !graph.has(plan.exit)) throw new Error('入口・出口が範囲外です。');
  const previous = new Map<string, string | null>([[plan.entry, null]]);
  const queue = [plan.entry];
  for (let i = 0; i < queue.length; i++) {
    for (const next of graph.get(queue[i])!) {
      if (!previous.has(next)) {
        previous.set(next, queue[i]);
        queue.push(next);
      }
    }
  }
  if (!previous.has(plan.exit)) throw new Error('入口から出口に到達できません。');
  const route: string[] = [];
  let current: string | null = plan.exit;
  while (current !== null) {
    route.unshift(current);
    current = previous.get(current)!;
  }
  const directions = route.slice(1).map((cell, i) => {
    const a = cellPoint(route[i]);
    const b = cellPoint(cell);
    return `${b[0] - a[0]},${b[1] - a[1]}`;
  });
  const externalWalls = plan.walls.filter(({ from, to }) =>
    (from[0] === to[0] && (from[0] === 0 || from[0] === plan.columns))
    || (from[1] === to[1] && (from[1] === 0 || from[1] === plan.rows))).length;
  return {
    route,
    graph,
    connectedCells: previous.size,
    edges: [...graph.values()].reduce((sum, next) => sum + next.length, 0) / 2,
    branches: [...graph.values()].filter(next => next.length >= 3).length,
    turns: directions.slice(1).filter((dir, i) => dir !== directions[i]).length,
    externalWalls,
    internalWalls: plan.walls.length - externalWalls,
  };
}
