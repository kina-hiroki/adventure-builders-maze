import * as THREE from 'three';

export const ANT_SPACING = 0.45;

/** 経路上に小さな蟻を並べる。胴体と脚をそれぞれ一括描画する。 */
export function createSolutionAnts() {
  const group = new THREE.Group();
  group.name = 'solution';
  const bodyGeometry = new THREE.SphereGeometry(1, 8, 6);
  const legGeometry = new THREE.CylinderGeometry(0.005, 0.005, 1, 5);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: '#e88128' });
  const legMaterial = new THREE.MeshBasicMaterial({ color: '#98501c' });
  let bodies: THREE.InstancedMesh | undefined;
  let legs: THREE.InstancedMesh | undefined;
  let routes: { segments: { from: THREE.Vector3; direction: THREE.Vector3; end: number }[];
    length: number; count: number }[] = [];
  let displacement = 0;
  const transform = new THREE.Object3D();
  const pose = new THREE.Matrix4();
  const origin = new THREE.Vector3();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const bodyParts = [
    [-0.075, 0.044, 0.033, 0.065], [0, 0.03, 0.028, 0.035], [0.065, 0.038, 0.032, 0.038],
  ];

  function clearInstances() {
    for (const mesh of [bodies, legs]) {
      if (mesh) { group.remove(mesh); mesh.dispose(); }
    }
    bodies = legs = undefined;
  }

  function update(distance: number) {
    displacement = distance % ANT_SPACING;
    if (!bodies || !legs) return;
    let ant = 0;
    for (const route of routes) {
      for (let i = 0; i < route.count; i++, ant++) {
        const position = i * ANT_SPACING + displacement;
        // 列の末尾はGOALで消え、周期が戻るとSTARTから次の蟻が現れる。
        if (position > route.length) {
          for (let part = 0; part < 3; part++) bodies.setMatrixAt(ant * 3 + part, hidden);
          for (let part = 0; part < 12; part++) legs.setMatrixAt(ant * 12 + part, hidden);
          continue;
        }
        const segment = route.segments.find(segment => position <= segment.end)!;
        const previous = segment.end - segment.direction.length();
        origin.copy(segment.from).addScaledVector(segment.direction, (position - previous) / segment.direction.length());
        pose.makeRotationY(Math.atan2(segment.direction.x, segment.direction.z));
        pose.setPosition(origin);
        for (let part = 0; part < bodyParts.length; part++) {
          const [z, xSize, ySize, zSize] = bodyParts[part];
          transform.position.set(0, 0, z);
          transform.quaternion.identity();
          transform.scale.set(xSize, ySize, zSize);
          transform.updateMatrix();
          bodies.setMatrixAt(ant * 3 + part, transform.matrix.premultiply(pose));
        }
        // 左右交互の三脚歩行。移動距離に合わせて脚を振る。
        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? -1 : 1;
          for (let foot = 0; foot < 3; foot++) {
            const swing = Math.sin(distance / ANT_SPACING * Math.PI * 4 + (side + foot) * Math.PI);
            const z = (foot - 1) * 0.035;
            start.set(sign * 0.02, -0.008, z);
            end.set(sign * 0.065, -0.006, z + (foot - 1) * 0.028 + swing * 0.015);
            for (let half = 0; half < 2; half++) {
              if (half === 1) {
                start.copy(end);
                end.set(sign * 0.095, -0.04 + Math.max(0, swing) * 0.015, start.z + swing * 0.015);
              }
              direction.subVectors(end, start);
              transform.position.copy(start).add(end).multiplyScalar(0.5);
              const length = direction.length();
              transform.quaternion.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
              transform.scale.set(1, length, 1);
              transform.updateMatrix();
              legs.setMatrixAt(ant * 12 + side * 6 + foot * 2 + half, transform.matrix.premultiply(pose));
            }
          }
        }
      }
    }
    bodies.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    update,
    setPaths(paths: readonly (readonly THREE.Vector3[])[]) {
      clearInstances();
      routes = paths.map(points => {
        let length = 0;
        const segments = points.slice(1).flatMap((to, i) => {
          const direction = to.clone().sub(points[i]);
          if (direction.lengthSq() === 0) return [];
          length += direction.length();
          return [{ from: points[i].clone(), direction, end: length }];
        });
        return { segments, length, count: segments.length ? Math.floor(length / ANT_SPACING) + 1 : 0 };
      });
      const count = routes.reduce((total, route) => total + route.count, 0);
      bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, count * 3);
      legs = new THREE.InstancedMesh(legGeometry, legMaterial, count * 12);
      for (const mesh of [bodies, legs]) {
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // 毎フレーム動くため、初期位置の境界球によるカリングは使わない。
        mesh.frustumCulled = false;
        group.add(mesh);
      }
      update(displacement);
    },
    dispose() {
      clearInstances();
      bodyGeometry.dispose(); legGeometry.dispose();
      bodyMaterial.dispose(); legMaterial.dispose();
    },
  };
}
