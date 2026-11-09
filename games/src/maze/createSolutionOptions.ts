import { analyzeMaze, cellPoint } from './analyzeMaze.ts';
import { createRoutePoints } from './topology.ts';
import type { MazePlan, Point } from './types.ts';

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
    const route = alternative.analysis.route;
    let first = 0;
    while (first + 1 < Math.min(primary.route.length, route.length)
      && primary.route[first + 1] === route[first + 1]) first++;
    let last = route.length - 1;
    let primaryLast = primary.route.length - 1;
    while (last > first && primaryLast > first && primary.route[primaryLast - 1] === route[last - 1]) {
      last--;
      primaryLast--;
    }
    // 共通の入口・出口側を重ねず、分岐から合流までの経路だけを足す。
    if (first < last) {
      const branch = createRoutePoints(plan, route.slice(first, last + 1));
      combined.push(branch);
      if (alternative.id === 'bypass') tunnelAndBypass.push(branch);
    }
  }
  return new Map<string, { name: string; paths: readonly (readonly Point[])[] }>([
    ['both', { name: '両方（トンネル・抜け道）', paths: tunnelAndBypass }],
    ['all', { name: `すべて（${alternatives.length + 1}経路）`, paths: combined }],
    ['tunnel', { name: 'トンネル経由', paths: [primaryPath] }],
    ...alternatives.map(solution => [solution.id, {
      name: solution.name, paths: [fullPath(solution.analysis.routePoints)],
    }] as const),
  ]);
}
