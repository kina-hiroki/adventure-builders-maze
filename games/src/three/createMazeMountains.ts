import { withCleanup } from '../createCleanupScope.ts';
import { disposeObjectTree } from './disposeObjectTree.ts';
import { createTransparencyControl } from './createTransparencyControl.ts';
import * as THREE from 'three';
import type { MazePlan } from '../maze/types.ts';
import { createCardboardMountain } from './createCardboardMountain.ts';

export function createMazeMountains(plan: MazePlan) {
  return withCleanup(scope => {
    const group = new THREE.Group();
    scope.defer(() => disposeObjectTree(group));
    group.name = 'maze-mountains';
    for (const specification of plan.mountains ?? []) {
      const dx = specification.to[0] - specification.from[0];
      const dz = specification.to[1] - specification.from[1];
      const { mountain } = createCardboardMountain({
        width: specification.width, height: specification.height,
        length: Math.hypot(dx, dz) * plan.cellSize,
      });
      mountain.name = specification.id;
      mountain.rotation.y = Math.atan2(dx, dz);
      mountain.position.set(
        ((specification.from[0] + specification.to[0]) / 2 - plan.columns / 2) * plan.cellSize,
        0,
        ((specification.from[1] + specification.to[1]) / 2 - plan.rows / 2) * plan.cellSize,
      );
      group.add(mountain);
    }

    return { group, setTransparent: createTransparencyControl(group) };
  });
}
