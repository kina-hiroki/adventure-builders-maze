import * as THREE from 'three';
import type { MazePlan } from '../maze/types.ts';
import { createCardboardTunnel } from './createCardboardTunnel.ts';

export function createMazeTunnels(plan: MazePlan, wallThickness = 0.045) {
  const group = new THREE.Group();
  group.name = 'maze-tunnels';
  for (const specification of plan.tunnels ?? []) {
    const dx = specification.to[0] - specification.from[0];
    const dz = specification.to[1] - specification.from[1];
    const { tunnel } = createCardboardTunnel({ width: specification.width, height: specification.height,
      length: Math.hypot(dx, dz) * plan.cellSize }, {
      // 壁の外面から0.1mm内側で切り、同一面のちらつきも避ける。
      outerWidth: specification.width + wallThickness - 0.0002,
    });
    tunnel.name = specification.id;
    // モデルの長手方向（ローカルZ軸）を入口から出口の向きに合わせる。
    tunnel.rotation.y = Math.atan2(dx, dz);
    tunnel.position.set(
      ((specification.from[0] + specification.to[0]) / 2 - plan.columns / 2) * plan.cellSize,
      0,
      ((specification.from[1] + specification.to[1]) / 2 - plan.rows / 2) * plan.cellSize,
    );
    group.add(tunnel);
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
