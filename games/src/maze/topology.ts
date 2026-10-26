import type { MazePlan, Point, Wall } from './types.ts';

export interface MazeCell {
  id: string;
  from: Point;
  to: Point;
}

// 1m区画の中央を通る壁がある場合だけ、通行区画を左右／上下に分ける。
// W/Eは西／東、N/Sは北／南。元の区画座標は維持する。
export function createMazeCells(plan: MazePlan): MazeCell[] {
  const cells: MazeCell[] = [];
  for (let z = 0; z < plan.rows; z++) {
    for (let x = 0; x < plan.columns; x++) {
      const splitX = plan.walls.some(wall => wall.from[0] === x + 0.5 && wall.to[0] === x + 0.5
        && Math.min(wall.from[1], wall.to[1]) <= z && Math.max(wall.from[1], wall.to[1]) >= z + 1);
      const splitZ = plan.walls.some(wall => wall.from[1] === z + 0.5 && wall.to[1] === z + 0.5
        && Math.min(wall.from[0], wall.to[0]) <= x && Math.max(wall.from[0], wall.to[0]) >= x + 1);
      const nx = splitX ? 2 : 1;
      const nz = splitZ ? 2 : 1;
      for (let iz = 0; iz < nz; iz++) {
        for (let ix = 0; ix < nx; ix++) {
          const suffix = (splitZ ? (iz ? 'S' : 'N') : '') + (splitX ? (ix ? 'E' : 'W') : '');
          cells.push({ id: `${String.fromCharCode(65 + x)}${z + 1}${suffix}`,
            from: [x + ix / nx, z + iz / nz], to: [x + (ix + 1) / nx, z + (iz + 1) / nz] });
        }
      }
    }
  }
  return cells;
}

export function passageBetween(a: MazeCell, b: MazeCell): Wall | undefined {
  const left = Math.max(a.from[0], b.from[0]);
  const right = Math.min(a.to[0], b.to[0]);
  const top = Math.max(a.from[1], b.from[1]);
  const bottom = Math.min(a.to[1], b.to[1]);
  if ((a.to[0] === b.from[0] || b.to[0] === a.from[0]) && bottom > top)
    return { from: [left, top], to: [left, bottom] };
  if ((a.to[1] === b.from[1] || b.to[1] === a.from[1]) && right > left)
    return { from: [left, top], to: [right, top] };
  return undefined;
}

export function isPassageBlocked(passage: Wall, walls: Wall[]): boolean {
  const vertical = passage.from[0] === passage.to[0];
  const fixed = vertical ? 0 : 1;
  const along = vertical ? 1 : 0;
  return walls.some(wall => wall.from[fixed] === passage.from[fixed]
    && wall.to[fixed] === passage.from[fixed]
    && Math.min(Math.max(wall.from[along], wall.to[along]), passage.to[along])
      > Math.max(Math.min(wall.from[along], wall.to[along]), passage.from[along]));
}

export function createRoutePoints(plan: MazePlan, route: string[]): Point[] {
  const cells = new Map(createMazeCells(plan).map(cell => [cell.id, cell]));
  const center = (cell: MazeCell): Point => [(cell.from[0] + cell.to[0]) / 2, (cell.from[1] + cell.to[1]) / 2];
  const points: Point[] = [];
  function add(point: Point) {
    const previous = points.at(-1);
    if (previous && previous[0] === point[0] && previous[1] === point[1]) return;
    while (points.length >= 2) {
      const a = points.at(-2)!;
      const b = points.at(-1)!;
      if ((a[0] === b[0] && b[0] === point[0]) || (a[1] === b[1] && b[1] === point[1])) points.pop();
      else break;
    }
    points.push(point);
  }
  for (let i = 0; i < route.length; i++) {
    const cell = cells.get(route[i]);
    if (!cell) throw new Error(`正解ルートの区画が不正です: ${route[i]}`);
    const nextCenter = center(cell);
    if (i) {
      const previous = cells.get(route[i - 1])!;
      const previousCenter = center(previous);
      const passage = passageBetween(previous, cell);
      if (!passage || isPassageBlocked(passage, plan.walls)) throw new Error('正解ルートが壁を横切っています。');
      if (passage.from[0] === passage.to[0]) {
        const z = (passage.from[1] + passage.to[1]) / 2;
        add([previousCenter[0], z]); add([nextCenter[0], z]);
      } else {
        const x = (passage.from[0] + passage.to[0]) / 2;
        add([x, previousCenter[1]]); add([x, nextCenter[1]]);
      }
    }
    add(nextCenter);
  }
  return points;
}
