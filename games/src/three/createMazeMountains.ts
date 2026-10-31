import * as THREE from 'three';
import type { MazePlan } from '../maze/types.ts';
import { createCardboardMountain } from './createCardboardMountain.ts';

export function createMazeMountains(plan: MazePlan) {
  const group = new THREE.Group();
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

  const materials = new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
      }
    }
  });
  return {
    group,
    setTransparent(value: boolean) {
      for (const [material, original] of materials) {
        material.transparent = value || original.transparent;
        material.opacity = value ? original.opacity * 0.22 : original.opacity;
        material.depthWrite = value ? false : original.depthWrite;
        material.needsUpdate = true;
      }
    },
  };
}
