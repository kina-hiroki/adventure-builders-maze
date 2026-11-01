import { mountSample } from './mountSample.ts';
import { createCardboardTunnel, tunnelDimensions } from '../three/createCardboardTunnel.ts';

const { width, height, length } = tunnelDimensions;
const sample = mountSample({
  id: 'tunnel', number: '01', title: 'トンネル',
  intro: '入口から出口まで、くぐって進む段ボールの通路。',
  description: '内寸幅1m・中央高さ1m・長さ2mの段ボールトンネル。高さ50cmの側壁の上に半径50cmの半円型の天井があり、天井は取り外せます。入口と出口は開いています。',
  note: '高さ50cmの側壁に、半径50cmの半円型の天井を載せています。両端は開いています。寸法は検討用の仮設定です。',
  dimensions: [['幅（内寸）', width.toFixed(1) + ' m'], ['中央高さ（内寸）', height.toFixed(1) + ' m'], ['長さ', length.toFixed(1) + ' m']],
  secondaryView: 'front',
  toggles: [{ id: 'remove-roof', label: '天井を外して見る' }],
  build(scene) {
    const { tunnel, roof } = createCardboardTunnel();
    scene.add(tunnel);
    return { 'remove-roof': { object: roof, inverted: true } };
  },
});
if (import.meta.hot) import.meta.hot.dispose(sample.dispose);
