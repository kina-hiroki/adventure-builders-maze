import * as THREE from 'three';
import { mountSample } from './mountSample.ts';
import { createCardboardMountain, mountainDimensions } from '../three/createCardboardMountain.ts';

const { width, height, length } = mountainDimensions;
const sample = mountSample({
  id: 'mountain', number: '02', title: '山越えゾーン',
  intro: '上って、下って。中央の山を越えて進むパーツ。',
  description: '高さ50cm・幅1m・長さ2mの山越えゾーン。両端は床面で、中央に高さ50cmの頂点がある三角形の山型。隣に身長130cmの人物を表示。',
  note: '高さ50cm・幅1.0m・長さ2.0m。中央が頂点の山型で、前半1mを上り、後半1mを下ります。迷路内に配置する前の形状確認用サンプルです。',
  dimensions: [['幅', width.toFixed(1) + ' m'], ['高さ（頂点）', height.toFixed(1) + ' m'], ['長さ', length.toFixed(1) + ' m']],
  secondaryView: 'side',
  toggles: [{ id: 'show-dimensions', label: '寸法を表示', checked: true }],
  build(scene) {
    const { mountain } = createCardboardMountain();
    scene.add(mountain);
    const dimensions = new THREE.Group();
    scene.add(dimensions);
    function dimension(from: THREE.Vector3, to: THREE.Vector3, text: string, labelPosition: THREE.Vector3) {
      const material = new THREE.LineBasicMaterial({ color: '#47634f' });
      dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), material));
      const tick = Math.abs(to.y - from.y) > 0 ? new THREE.Vector3(0, 0, 0.07) : new THREE.Vector3(0, 0.07, 0);
      for (const point of [from, to]) dimensions.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([point.clone().sub(tick), point.clone().add(tick)]), material));
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('寸法の文字を描画できません。');
      context.font = '600 64px system-ui, Meiryo, sans-serif';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = '#365443'; context.fillText(text, 256, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
      label.scale.set(0.85, 0.2125, 1);
      label.position.copy(labelPosition);
      dimensions.add(label);
    }
    dimension(new THREE.Vector3(0.72, 0.035, -length / 2), new THREE.Vector3(0.72, 0.035, length / 2),
      '2.0 m', new THREE.Vector3(0.85, 0.035, 0.7));
    dimension(new THREE.Vector3(-width / 2, 0.035, 1.28), new THREE.Vector3(width / 2, 0.035, 1.28),
      '1.0 m', new THREE.Vector3(0, 0.035, 1.5));
    dimension(new THREE.Vector3(0.8, 0, 0), new THREE.Vector3(0.8, height, 0),
      '50 cm', new THREE.Vector3(1.06, height / 2, 0));
    return { 'show-dimensions': { object: dimensions } };
  },
});
if (import.meta.hot) import.meta.hot.dispose(sample.dispose);
