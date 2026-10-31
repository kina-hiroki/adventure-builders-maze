import * as THREE from 'three';

export const mountainDimensions = { width: 1, height: 0.5, length: 2 } as const;

// ローカルXが幅、Zが進行方向。床の両端から中央の頂点へ上る対称な山型。
export function createCardboardMountain(dimensions: { width: number; height: number; length: number } = mountainDimensions) {
  const { width, height, length } = dimensions;
  if (![width, height, length].every(value => Number.isFinite(value) && value > 0))
    throw new Error('山越えゾーンの寸法は正の有限値で指定してください。');
  const mountain = new THREE.Group();
  mountain.name = 'cardboard-mountain';
  const section = new THREE.Shape();
  section.moveTo(-length / 2, 0);
  section.lineTo(length / 2, 0);
  section.lineTo(0, height);
  section.closePath();
  const geometry = new THREE.ExtrudeGeometry(section, { depth: width, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -width / 2);
  geometry.rotateY(Math.PI / 2);
  const body = new THREE.Mesh(geometry, [
    new THREE.MeshStandardMaterial({ color: '#bd8d52', roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: '#d1aa74', roughness: 1 }),
  ]);
  body.name = 'mountain-body';
  body.castShadow = body.receiveShadow = true;
  mountain.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: '#896338' }));
  edges.name = 'mountain-edges';
  mountain.add(edges);
  return { mountain };
}
