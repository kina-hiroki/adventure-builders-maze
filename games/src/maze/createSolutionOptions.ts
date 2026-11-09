import { analyzeMaze, cellPoint } from './analyzeMaze.ts';
import type { MazePlan, Point } from './types.ts';

const distance = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const epsilon = 1e-9;

// 同じ方向に重なる長さを、途中の頂点数に依存せず測る。
function sharedPrefix(a: readonly Point[], b: readonly Point[]) {
  if (distance(a[0], b[0]) > epsilon) return 0;
  let i = 1, j = 1, shared = 0;
  let fromA = a[0], fromB = b[0];
  while (i < a.length && j < b.length) {
    const lengthA = distance(fromA, a[i]), lengthB = distance(fromB, b[j]);
    const dxA = Math.sign(a[i][0] - fromA[0]), dzA = Math.sign(a[i][1] - fromA[1]);
    const dxB = Math.sign(b[j][0] - fromB[0]), dzB = Math.sign(b[j][1] - fromB[1]);
    if (dxA !== dxB || dzA !== dzB) break;
    const step = Math.min(lengthA, lengthB);
    shared += step;
    fromA = [fromA[0] + dxA * step, fromA[1] + dzA * step];
    fromB = [fromB[0] + dxB * step, fromB[1] + dzB * step];
    if (lengthA - step < epsilon) fromA = a[i++];
    if (lengthB - step < epsilon) fromB = b[j++];
  }
  return shared;
}

function branchPoints(primary: readonly Point[], alternative: readonly Point[]): Point[] {
  const from = sharedPrefix(primary, alternative);
  const length = alternative.slice(1).reduce((sum, point, i) => sum + distance(alternative[i], point), 0);
  const to = length - sharedPrefix([...primary].reverse(), [...alternative].reverse());
  const points: Point[] = [];
  const vertices = [...primary, ...alternative];
  let offset = 0;
  for (let i = 1; i < alternative.length; i++) {
    const a = alternative[i - 1], b = alternative[i];
    const segmentLength = distance(a, b);
    const start = Math.max(from, offset), end = Math.min(to, offset + segmentLength);
    if (end - start > epsilon) {
      for (const at of [start, end]) {
        const ratio = (at - offset) / segmentLength;
        const point: Point = [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
        // 距離の加算誤差で共通の頂点がわずかにずれないよう、元の座標へそろえる。
        const snapped = vertices.find(vertex => distance(vertex, point) < epsilon) ?? point;
        if (!points.length || distance(points.at(-1)!, snapped) > epsilon) points.push(snapped);
      }
    }
    offset += segmentLength;
  }
  return points;
}

export function createSolutionOptions(plan: MazePlan, primary = analyzeMaze(plan)) {
  const alternatives = (plan.alternativeSolutions ?? []).map(solution => ({
    ...solution, analysis: analyzeMaze(plan, solution.via),
  }));
  const fullPath = (points: readonly Point[]): Point[] => {
    const entry = cellPoint(plan.entry);
    const exit = cellPoint(plan.exit);
    return [[entry[0] + 0.5, entry[1] + 1.35], ...points, [exit[0] + 0.5, exit[1] + 1.35]];
  };
  const primaryPath = fullPath(primary.routePoints);
  const combined: Point[][] = [primaryPath];
  const tunnelAndBypass: Point[][] = [primaryPath];
  for (const alternative of alternatives) {
    // 描画座標で共通部分を切り出し、セル途中の正しい分岐点へ接続する。
    const branch = branchPoints(primaryPath, fullPath(alternative.analysis.routePoints));
    if (branch.length > 1) {
      combined.push(branch);
      if (alternative.id === 'bypass') tunnelAndBypass.push(branch);
    }
  }
  return new Map<string, { name: string; paths: readonly (readonly Point[])[] }>([
    ['all', { name: `すべて（${alternatives.length + 1}経路）`, paths: combined }],
    ['both', { name: '両方（トンネル・抜け道）', paths: tunnelAndBypass }],
    ['tunnel', { name: 'トンネル経由', paths: [primaryPath] }],
    ...alternatives.map(solution => [solution.id, {
      name: solution.name, paths: [fullPath(solution.analysis.routePoints)],
    }] as const),
  ]);
}
