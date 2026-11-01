import * as THREE from 'three';
import { withCleanup } from '../createCleanupScope.ts';
import { disposeObjectTree } from './disposeObjectTree.ts';

export const ballPoolDimensions = { width: 2, length: 2, depth: 0.5 } as const;
export const ballPoolDisplay = { enclosureHeight: 0.6, wallThickness: 0.05, ballDiameter: 0.07 } as const;

// Y=0が床面。迷路内では囲いを追加せず、既存の壁と出入口を使う。
export function createBallPool(
  dimensions: { width: number; length: number; depth: number } = ballPoolDimensions,
  { enclosure = true } = {},
) {
  const { width, length, depth } = dimensions;
  const { enclosureHeight, wallThickness, ballDiameter } = ballPoolDisplay;
  if (![width, length, depth].every(value => Number.isFinite(value) && value >= 2 * ballDiameter))
    throw new Error('ボールプールの寸法は表示ボール2個分（14cm）以上の有限値で指定してください。');
  return withCleanup(scope => {
    const pool = new THREE.Group();
    pool.name = 'ball-pool';
    scope.defer(() => disposeObjectTree(pool));
    const t = enclosure ? wallThickness : 0;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width + 2 * t, 0.008, length + 2 * t),
      new THREE.MeshStandardMaterial({ color: '#d7c49c', roughness: 1 }));
    floor.name = 'pool-floor';
    floor.position.y = -0.004;
    floor.receiveShadow = true;
    pool.add(floor);
    let enclosureMaterial: THREE.MeshStandardMaterial | undefined;
    if (enclosure) {
      enclosureMaterial = new THREE.MeshStandardMaterial({ color: '#c7a36b', roughness: 0.9,
        transparent: true, opacity: 0.22, depthWrite: false });
      for (const side of [-1, 1]) {
        const front = new THREE.Mesh(new THREE.BoxGeometry(width + 2 * t, enclosureHeight, t), enclosureMaterial);
        front.position.set(0, enclosureHeight / 2, side * (length + t) / 2);
        const flank = new THREE.Mesh(new THREE.BoxGeometry(t, enclosureHeight, length), enclosureMaterial);
        flank.position.set(side * (width + t) / 2, enclosureHeight / 2, 0);
        pool.add(front, flank);
      }
      const box = new THREE.BoxGeometry(width + 2 * t, enclosureHeight, length + 2 * t);
      const edges = new THREE.EdgesGeometry(box);
      box.dispose();
      const outline = new THREE.LineSegments(edges,
        new THREE.LineBasicMaterial({ color: '#8d7048', transparent: true, opacity: 0.6 }));
      outline.position.y = enclosureHeight / 2;
      pool.add(outline);
    }
    // 外から見える上面・側面だけをインスタンス描画。必要個数の算出には使わない。
    const radius = ballDiameter / 2;
    const columns = Math.max(2, Math.floor(width / (ballDiameter + 0.002)));
    const rows = Math.max(2, Math.floor(length / (ballDiameter + 0.002)));
    const layers = Math.floor(depth / ballDiameter);
    const count = columns * rows + (layers - 1) * (2 * columns + 2 * rows - 4);
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 16, 12),
      new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0 }), count);
    balls.name = 'display-balls';
    balls.raycast = () => {};
    pool.add(balls);
    const palette = ['#ef655b', '#428fcb', '#f6ce55', '#65bda5', '#b294ce', '#f3a26d'];
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let y = 0; y < layers; y++) for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++) {
      if (y !== layers - 1 && x !== 0 && x !== columns - 1 && z !== 0 && z !== rows - 1) continue;
      const margin = radius + 0.004;
      matrix.makeTranslation(-width / 2 + margin + x * (width - 2 * margin) / (columns - 1),
        radius + y * (depth - ballDiameter) / (layers - 1),
        -length / 2 + margin + z * (length - 2 * margin) / (rows - 1));
      balls.setMatrixAt(index, matrix);
      balls.setColorAt(index, new THREE.Color(palette[(x * 17 + z * 11 + y * 7 + x * z) % palette.length]));
      index++;
    }
    balls.instanceMatrix.needsUpdate = true;
    if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
    balls.computeBoundingBox();
    balls.computeBoundingSphere();
    // 吹き出しは単一のボリュームで判定し、全ボールの交差判定を避ける。
    const hitVolume = new THREE.Mesh(new THREE.BoxGeometry(width, depth, length),
      new THREE.MeshBasicMaterial({ visible: false }));
    hitVolume.name = 'pool-interaction-volume';
    hitVolume.position.y = depth / 2;
    pool.add(hitVolume);
    return { pool, setEnclosureTransparent(transparent: boolean) {
      if (!enclosureMaterial) return;
      enclosureMaterial.transparent = transparent;
      enclosureMaterial.opacity = transparent ? 0.22 : 1;
      enclosureMaterial.depthWrite = !transparent;
      enclosureMaterial.needsUpdate = true;
    } };
  });
}
