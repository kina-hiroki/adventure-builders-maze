import * as THREE from 'three';

export type SceneResource = THREE.BufferGeometry | THREE.Material | THREE.Texture;

// 共有資源を重複解放せず、Line・Sprite・まだシーンに付けていない資源も回収する。
export function disposeObjectTree(root: THREE.Object3D, extra: Iterable<SceneResource> = []) {
  const resources = new Set<SceneResource>(extra);
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) resources.add(object.geometry);
    // SpriteのgeometryはThree.jsが共有しているため、この表示では所有しない。
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    }
  });
  for (const resource of resources) {
    if (resource instanceof THREE.Material) {
      for (const value of Object.values(resource)) if (value instanceof THREE.Texture) resources.add(value);
    }
  }
  const errors: unknown[] = [];
  for (const resource of resources) {
    try { resource.dispose(); } catch (error) { errors.push(error); }
  }
  root.clear();
  if (errors.length) throw new AggregateError(errors, '3D資源の解放に失敗しました。');
}
