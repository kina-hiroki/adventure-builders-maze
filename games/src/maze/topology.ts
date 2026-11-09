import type { MazePlan, Point, Wall } from './types.ts';

export interface MazeCell {
  id: string;
  from: Point;
  to: Point;
}

// 1m区画の中央に壁がかかる場合、部分的な壁でも左右／上下に分ける。
// W/Eは西／東、N/Sは北／南。両方向に壁がある場合は50cm四方の4区画。
export function createMazeCells(plan: MazePlan): MazeCell[] {
  const cells: MazeCell[] = [];
  for (let z = 0; z < plan.rows; z++) {
    for (let x = 0; x < plan.columns; x++) {
      const splitX = plan.walls.some(wall => wall.from[0] === x + 0.5 && wall.to[0] === x + 0.5
        && Math.min(wall.from[1], wall.to[1]) < z + 1 && Math.max(wall.from[1], wall.to[1]) > z);
      const splitZ = plan.walls.some(wall => wall.from[1] === z + 0.5 && wall.to[1] === z + 0.5
        && Math.min(wall.from[0], wall.to[0]) < x + 1 && Math.max(wall.from[0], wall.to[0]) > x);
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
  for (const passage of plan.externalPassages ?? []) {
    const [x1, z1] = passage.from;
    const [x2, z2] = passage.to;
    const touchesNorthOrSouth = (z2 === 0 || z1 === plan.rows)
      && Math.min(x2, plan.columns) > Math.max(x1, 0);
    const touchesWestOrEast = (x2 === 0 || x1 === plan.columns)
      && Math.min(z2, plan.rows) > Math.max(z1, 0);
    if (!passage.id || ![x1, z1, x2, z2].every(Number.isInteger)
      || x1 >= x2 || z1 >= z2 || !(touchesNorthOrSouth || touchesWestOrEast))
      throw new Error('抜け道の配置・寸法が不正です。');
    for (let z = z1; z < z2; z++) {
      for (let x = x1; x < x2; x++) {
        const id = passage.id + '-' + ((z - z1) * (x2 - x1) + x - x1 + 1);
        if (cells.some(cell => cell.id === id
          || (Math.min(cell.to[0], x + 1) > Math.max(cell.from[0], x)
            && Math.min(cell.to[1], z + 1) > Math.max(cell.from[1], z))))
          throw new Error('抜け道の区画が重複しています。');
        cells.push({ id, from: [x, z], to: [x + 1, z + 1] });
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

// 境界の一部だけに壁がある場合は、残っている最も広い開口を使う。
export function openPassage(passage: Wall, walls: Wall[]): Wall | undefined {
  const vertical = passage.from[0] === passage.to[0];
  const fixed = vertical ? 0 : 1;
  const along = vertical ? 1 : 0;
  let openings = [[Math.min(passage.from[along], passage.to[along]),
    Math.max(passage.from[along], passage.to[along])]];
  for (const wall of walls) {
    if (wall.from[fixed] !== passage.from[fixed] || wall.to[fixed] !== passage.from[fixed]) continue;
    const from = Math.min(wall.from[along], wall.to[along]);
    const to = Math.max(wall.from[along], wall.to[along]);
    openings = openings.flatMap(([a, b]) => {
      if (to <= a || from >= b) return [[a, b]];
      return [...(a < from ? [[a, from]] : []), ...(to < b ? [[to, b]] : [])];
    });
  }
  const opening = openings.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  if (!opening) return undefined;
  const point = (value: number): Point => vertical
    ? [passage.from[fixed], value] : [value, passage.from[fixed]];
  return { from: point(opening[0]), to: point(opening[1]) };
}

export function isPassageBlocked(passage: Wall, walls: Wall[]): boolean {
  return !openPassage(passage, walls);
}

export function createRoutePoints(plan: MazePlan, route: string[], mazeCells = createMazeCells(plan)): Point[] {
  const cells = new Map(mazeCells.map(cell => [cell.id, cell]));
  const center = (cell: MazeCell): Point => {
    const point: Point = plan.solutionCenters?.[cell.id]
      ?? [(cell.from[0] + cell.to[0]) / 2, (cell.from[1] + cell.to[1]) / 2];
    if (!point.every(Number.isFinite) || point[0] <= cell.from[0] || point[0] >= cell.to[0]
      || point[1] <= cell.from[1] || point[1] >= cell.to[1])
      throw new Error(`正解ルートの通過位置が不正です: ${cell.id}`);
    return point;
  };
  const crossing = (a: number, b: number, from: number, to: number) =>
    a === b && a > from && a < to ? a : (from + to) / 2;
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
  const routeCells = route.map(id => {
    const cell = cells.get(id);
    if (!cell) throw new Error(`正解ルートの区画が不正です: ${id}`);
    return cell;
  });
  const centers = routeCells.map(center);
  const portals = routeCells.slice(1).map((cell, i) => {
    const boundary = passageBetween(routeCells[i], cell);
    const passage = boundary && openPassage(boundary, plan.walls);
    if (!passage) throw new Error('正解ルートが壁を横切っています。');
    const vertical = passage.from[0] === passage.to[0];
    const point: Point = vertical
      ? [passage.from[0], crossing(centers[i][1], centers[i + 1][1], passage.from[1], passage.to[1])]
      : [crossing(centers[i][0], centers[i + 1][0], passage.from[0], passage.to[0]), passage.from[1]];
    return { vertical, point };
  });
  for (let i = 0; i < routeCells.length; i++) {
    const entry = portals[i - 1];
    const exit = portals[i];
    const from = entry?.point ?? centers[i];
    const to = exit?.point ?? centers[i];
    add(from);
    if (from[0] !== to[0] && from[1] !== to[1]) {
      // 隣り合う辺へ曲がるときは、開口同士を1つの曲がり角で結ぶ。
      // セル中心へ寄り道するとD3のような半幅開口で余分な折り返しができる。
      if (entry && exit && entry.vertical === exit.vertical) {
        if (entry.vertical) {
          add([centers[i][0], from[1]]); add([centers[i][0], to[1]]);
        } else {
          add([from[0], centers[i][1]]); add([to[0], centers[i][1]]);
        }
      } else if (entry ? entry.vertical : !exit!.vertical) {
        add([to[0], from[1]]);
      } else {
        add([from[0], to[1]]);
      }
    }
    add(to);
  }
  return points;
}
