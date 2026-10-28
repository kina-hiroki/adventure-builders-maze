import * as THREE from 'three';

export interface CardboardTunnelDimensions {
  width: number;
  height: number;
  length: number;
  thickness: number;
}

// 単体サンプルの初期寸法。高さはアーチ中央の内寸、長さは入口から出口まで。
export const tunnelDimensions: Readonly<CardboardTunnelDimensions> = { width: 1, height: 1, length: 2, thickness: 0.045 };

export function createCardboardTunnel(dimensions: Partial<CardboardTunnelDimensions> = {},
  options: { outerWidth?: number } = {}) {
  const { width, height, length, thickness } = { ...tunnelDimensions, ...dimensions };
  const radius = width / 2;
  const wallHeight = height - radius;
  if (![width, height, length, thickness].every(Number.isFinite)
    || width <= 0 || length <= 0.004 || thickness <= 0 || wallHeight < 0)
    throw new Error('トンネルの寸法が不正です。高さは幅の半分以上にしてください。');
  if (options.outerWidth !== undefined && (!Number.isFinite(options.outerWidth) || options.outerWidth <= width))
    throw new Error('トンネルの外幅は内幅より大きくしてください。');
  const halfOuterWidth = options.outerWidth === undefined ? Infinity : options.outerWidth / 2;
  const sideThickness = Math.min(thickness, halfOuterWidth - radius);
  const tunnel = new THREE.Group();
  tunnel.name = 'cardboard-tunnel';
  const roof = new THREE.Group();
  roof.name = 'removable-tunnel-roof';
  const cardboard = new THREE.MeshStandardMaterial({ color: '#cba16b', roughness: 0.96 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: '#d9b783', roughness: 0.96 });
  const tape = new THREE.MeshStandardMaterial({ color: '#b18a58', roughness: 1 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#89613c', transparent: true, opacity: 0.62 });

  function part(parent: THREE.Group, geometry: THREE.BufferGeometry,
    position: [number, number, number], material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = parent !== roof;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), edgeMaterial));
    parent.add(mesh);
  }

  // 厚みのある半円環だけを長手方向へ押し出し、入口・出口はふさがない。
  function arch(innerRadius: number, shellThickness: number, depth: number) {
    const outerRadius = innerRadius + shellThickness;
    const outerX = Math.min(outerRadius, halfOuterWidth);
    const innerX = Math.min(innerRadius, halfOuterWidth);
    const outerAngle = Math.acos(outerX / outerRadius);
    const innerAngle = Math.acos(innerX / innerRadius);
    // 外面と内面をそれぞれ壁の外幅で切り、通路側の半円は維持する。
    const cutBase = halfOuterWidth < outerRadius && halfOuterWidth > innerRadius;
    const section = new THREE.Shape();
    section.moveTo(outerX, outerRadius * Math.sin(outerAngle));
    section.absarc(0, 0, outerRadius, outerAngle, Math.PI - outerAngle, false);
    if (cutBase) section.lineTo(-outerX, 0);
    section.lineTo(-innerX, innerRadius * Math.sin(innerAngle));
    section.absarc(0, 0, innerRadius, Math.PI - innerAngle, innerAngle, true);
    if (cutBase) section.lineTo(outerX, 0);
    section.closePath();
    const geometry = new THREE.ExtrudeGeometry(section, {
      depth, bevelEnabled: false, curveSegments: 64, steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  }

  for (const side of [-1, 1]) {
    for (const z of [-length / 4, length / 4]) {
      part(tunnel, new THREE.BoxGeometry(sideThickness, wallHeight, length / 2 - 0.002),
        [side * (radius + sideThickness / 2), wallHeight / 2, z], cardboard);
    }
    part(tunnel, new THREE.BoxGeometry(0.002, wallHeight, 0.035),
      [side * Math.min(radius + thickness + 0.002, halfOuterWidth - 0.001), wallHeight / 2, 0], tape);
  }
  for (const z of [-length / 4, length / 4]) {
    part(roof, arch(radius, thickness, length / 2 - 0.002),
      [0, wallHeight, z], roofMaterial);
  }
  // 継ぎ目のテープも天井の半円に沿わせる。
  part(roof, arch(radius + thickness + 0.001, 0.002, 0.045), [0, wallHeight, 0], tape);
  tunnel.add(roof);
  return { tunnel, roof };
}
