import * as THREE from 'three';
import type { QuizWall } from '../maze/types.ts';

export function createQuizSymbolCache() {
  const materials = new Map<string, THREE.MeshBasicMaterial>();
  return {
    get(symbol: QuizWall['symbol'], color: string) {
      const key = `${symbol}:${color}`;
      let material = materials.get(key);
      if (material) return material;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('クイズの記号の描画領域を作成できません。');
      context.strokeStyle = color;
      context.lineWidth = 20;
      context.lineCap = 'round';
      context.beginPath();
      if (symbol === '〇') context.arc(128, 128, 72, 0, Math.PI * 2);
      else {
        context.moveTo(66, 66); context.lineTo(190, 190);
        context.moveTo(190, 66); context.lineTo(66, 190);
      }
      context.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
      materials.set(key, material);
      return material;
    },
    values: () => materials.values(),
  };
}
