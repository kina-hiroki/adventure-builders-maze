import * as THREE from 'three';
import type { MazePlan } from '../maze/types.ts';
import { withCleanup } from '../createCleanupScope.ts';
import { disposeObjectTree } from './disposeObjectTree.ts';
import { createBallPool } from './createBallPool.ts';

export function createMazeBallPools(plan: MazePlan) {
  return withCleanup(scope => {
    const group = new THREE.Group();
    group.name = 'maze-ball-pools';
    scope.defer(() => disposeObjectTree(group));
    for (const specification of plan.ballPools ?? []) {
      const { from, to, depth } = specification;
      if (![...from, ...to].every(Number.isFinite) || from[0] < 0 || from[1] < 0
        || to[0] > plan.columns || to[1] > plan.rows || to[0] <= from[0] || to[1] <= from[1])
        throw new Error('ボールプールの配置座標が不正です。');
      const { pool } = createBallPool({
        width: (to[0] - from[0]) * plan.cellSize,
        length: (to[1] - from[1]) * plan.cellSize, depth,
      }, { enclosure: false });
      pool.name = specification.id;
      pool.position.set(((from[0] + to[0]) / 2 - plan.columns / 2) * plan.cellSize,
        0, ((from[1] + to[1]) / 2 - plan.rows / 2) * plan.cellSize);
      group.add(pool);
    }
    return { group };
  });
}
