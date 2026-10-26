import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { pattern01 } from '../src/maze/pattern01.ts';
import { createScalePerson, scalePersonPosition } from '../src/three/createScalePerson.ts';

function withPerson(check) {
  const person = createScalePerson();
  try { check(person); }
  finally {
    const geometries = new Set();
    const materials = new Set();
    person.traverse(object => {
      if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
}

test('人物の足裏が床面0m、頭頂が1.30mで、壁高1.5mと同じ縮尺になる', () => {
  withPerson(person => {
    const bounds = new Box3().setFromObject(person);
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    assert.ok(Math.abs(bounds.max.y - 1.3) < 1e-6);
    assert.ok(Math.abs(bounds.getSize(new Vector3()).y / pattern01.wallHeight - 1.3 / 1.5) < 1e-6);
  });
});

test('人物全体が入口A7の左横かつ迷路の外に収まり、入口と重ならない', () => {
  withPerson(person => {
    person.position.copy(scalePersonPosition(pattern01));
    const bounds = new Box3().setFromObject(person);
    assert.equal(pattern01.entry, 'A7');
    assert.ok(bounds.max.x < -3.5, '入口の左端よりも左に全身を置く');
    assert.ok(bounds.min.z > 3.5 + 0.045 / 2, '正面の外壁よりも外側に全身を置く');
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
  });
});
