import * as THREE from 'three';

export function createTransparencyControl(group: THREE.Object3D) {
  const materials = new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
      }
    }
  });
  return (value: boolean) => {
    for (const [material, original] of materials) {
      const transparent = value || original.transparent;
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      material.opacity = value ? original.opacity * 0.22 : original.opacity;
      material.depthWrite = value ? false : original.depthWrite;
    }
  };
}
