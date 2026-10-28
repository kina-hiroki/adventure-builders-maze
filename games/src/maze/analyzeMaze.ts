import type { MazePlan, Point, Wall } from './types.ts';
import { createMazeCells, createRoutePoints, isPassageBlocked, passageBetween } from './topology.ts';

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
    if (![x1, z1, x2, z2].every(value => Number.isInteger(value * 2))
      || ![0.5, 1].includes(Math.abs(x1 - x2) + Math.abs(z1 - z2))
      || (x1 !== x2 && z1 !== z2)
      || x1 < 0 || x2 < 0 || z1 < 0 || z2 < 0
      || x1 > plan.columns || x2 > plan.columns || z1 > plan.rows || z2 > plan.rows) {
      throw new Error('壁の座標・長さが不正です。');
    }
    const key = wallKey(wall);
    if (keys.has(key)) throw new Error('壁が重複しています。');
    keys.add(key);
  }
  const graph = new Map<string, string[]>();
  const cells = createMazeCells(plan);
  for (const cell of cells) graph.set(cell.id, []);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const passage = passageBetween(cells[i], cells[j]);
      if (!passage || isPassageBlocked(passage, plan.walls)) continue;
      graph.get(cells[i].id)!.push(cells[j].id);
      graph.get(cells[j].id)!.push(cells[i].id);
    }
  }
  if (!graph.has(plan.entry) || !graph.has(plan.exit)) throw new Error('入口・出口が範囲外です。');
  function searchFrom(start: string) {
    const previous = new Map<string, string | null>([[start, null]]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      for (const next of graph.get(queue[i])!) {
        if (!previous.has(next)) {
          previous.set(next, queue[i]);
          queue.push(next);
        }
      }
    }
    return previous;
  }
  const previous = searchFrom(plan.entry);
  if (!previous.has(plan.exit)) throw new Error('入口から出口に到達できません。');
  const route: string[] = [];
  let start = plan.entry;
  for (const target of [...(plan.solutionVia ?? []), plan.exit]) {
    if (!graph.has(target)) throw new Error(`正解ルートの経由区画が不正です: ${target}`);
    const paths = start === plan.entry ? previous : searchFrom(start);
    if (!paths.has(target)) throw new Error(`正解ルートの経由区画に到達できません: ${target}`);
    const leg: string[] = [];
    let current: string | null = target;
    while (current !== null) {
      leg.unshift(current);
      current = paths.get(current)!;
    }
    route.push(...(route.length ? leg.slice(1) : leg));
    start = target;
  }
  const routePoints = createRoutePoints(plan, route);
  const externalWalls = plan.walls.filter(({ from, to }) =>
    (from[0] === to[0] && (from[0] === 0 || from[0] === plan.columns))
    || (from[1] === to[1] && (from[1] === 0 || from[1] === plan.rows))).length;
  return {
    route,
    routePoints,
    graph,
    connectedCells: previous.size,
    edges: [...graph.values()].reduce((sum, next) => sum + next.length, 0) / 2,
    branches: [...graph.values()].filter(next => next.length >= 3).length,
    turns: Math.max(0, routePoints.length - 2),
    externalWalls,
    internalWalls: plan.walls.length - externalWalls,
  };
}
