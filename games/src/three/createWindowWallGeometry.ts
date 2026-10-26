import { BufferGeometry, ExtrudeGeometry, Path, Shape, Vector3 } from 'three';
import type { WindowShape } from '../maze/outerWallWindows.ts';

export const WINDOW_SIZE_M = 0.4;
export const WINDOW_CENTER_HEIGHT_M = 0.9;

function createWindowPath(height: number, windowShape: WindowShape): Path {
  const radius = WINDOW_SIZE_M / 2;
  const centerY = WINDOW_CENTER_HEIGHT_M - height / 2;
  const hole = new Path();
  // 穴は外枠と逆向きに描き、前面・背面を貫通する開口とする。
  if (windowShape === 'circle') {
    hole.absarc(0, centerY, radius, 0, Math.PI * 2, true);
  } else if (windowShape === 'square') {
    hole.moveTo(-radius, centerY - radius);
    hole.lineTo(-radius, centerY + radius);
    hole.lineTo(radius, centerY + radius);
    hole.lineTo(radius, centerY - radius);
  } else {
    hole.moveTo(0, centerY + radius);
    hole.lineTo(radius, centerY);
    hole.lineTo(0, centerY - radius);
    hole.lineTo(-radius, centerY);
  }
  hole.closePath();
  return hole;
}

export function createWindowWallGeometry(width: number, height: number, thickness: number,
  windowShape: WindowShape): ExtrudeGeometry {
  const panel = new Shape();
  panel.moveTo(-width / 2, -height / 2);
  panel.lineTo(width / 2, -height / 2);
  panel.lineTo(width / 2, height / 2);
  panel.lineTo(-width / 2, height / 2);
  panel.closePath();
  panel.holes.push(createWindowPath(height, windowShape));

  const geometry = new ExtrudeGeometry(panel, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function createWindowOutlineGeometry(height: number, thickness: number,
  windowShape: WindowShape): BufferGeometry {
  const outline = createWindowPath(height, windowShape).getPoints(24);
  const points: Vector3[] = [];
  for (const side of [-1, 1]) {
    const z = side * (thickness / 2 + 0.001);
    for (let index = 1; index < outline.length; index++) {
      points.push(new Vector3(outline[index - 1].x, outline[index - 1].y, z),
        new Vector3(outline[index].x, outline[index].y, z));
    }
  }
  return new BufferGeometry().setFromPoints(points);
}
