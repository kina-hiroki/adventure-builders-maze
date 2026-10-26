import * as THREE from 'three';
import { attachPartTooltip } from './attachPartTooltip.ts';
import { createScalePerson, scalePersonPosition } from './createScalePerson.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cellPoint, wallKey } from '../maze/analyzeMaze.ts';
import { createOuterWallWindows } from '../maze/outerWallWindows.ts';
import type { WindowShape } from '../maze/outerWallWindows.ts';
import type { MazePlan } from '../maze/types.ts';
import { createWindowOutlineGeometry, createWindowWallGeometry } from './createWindowWallGeometry.ts';

export type ViewMode = 'angled' | 'top' | 'side' | 'front' | 'right' | 'back' | 'left';

export function createMazeView(container: HTMLElement, plan: MazePlan,
  onChange: (angle: number, zoom: number) => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f7fa');
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 150);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('role', 'img');
  const mazeDescription = `${plan.name}、${plan.columns * plan.cellSize}m×${plan.rows * plan.cellSize}m、壁高${plan.wallHeight}mの迷路。入口${plan.entry}、出口${plan.exit}。`;
  const windowDescription = '正面を除く外壁に丸・正方形・ひし形の窓。';
  const personDescription = '入口の左横に身長130cmの人物。';
  let windowsVisible = true;
  let personVisible = true;
  function updateDescription() {
    renderer.domElement.setAttribute('aria-label', mazeDescription
      + (windowsVisible ? windowDescription : '窓なし。')
      + (personVisible ? personDescription : '人物は非表示。')
      + '正面の壁に高さ1.5m・幅5mの白い板。');
  }
  updateDescription();
  renderer.domElement.setAttribute('tabindex', '0');
  renderer.domElement.setAttribute('aria-describedby', 'navigation-help');
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7a38a, 1.8));
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(-5, 13, 8);
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.4, 0);
  controls.minPolarAngle = 0.001;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minZoom = 1;
  controls.maxZoom = 3;
  controls.screenSpacePanning = true;
  controls.listenToKeyEvents(renderer.domElement);
  const textures: THREE.Texture[] = [];
  const width = plan.columns * plan.cellSize;
  const depth = plan.rows * plan.cellSize;
  const h = plan.wallHeight;
  const thickness = 0.045; // 元図に壁厚の指定がないため、表示用の厚さ。
  const world = (x: number, y: number, z: number) =>
    new THREE.Vector3(x * plan.cellSize - width / 2, y, z * plan.cellSize - depth / 2);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#e9e4d9', roughness: 1 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.12, depth + 0.2), floorMaterial);
  floor.position.y = -0.065;
  scene.add(floor);

  const gridPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= plan.columns; i++) gridPoints.push(world(i, 0.004, 0), world(i, 0.004, plan.rows));
  for (let i = 0; i <= plan.rows; i++) gridPoints.push(world(0, 0.004, i), world(plan.columns, 0.004, i));
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPoints),
    new THREE.LineBasicMaterial({ color: '#c9c3b6', transparent: true, opacity: 0.65 }));
  scene.add(grid);

  const wallMaterials = [
    new THREE.MeshStandardMaterial({ color: '#d1aa74', roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: '#bd8d52', roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: '#9a7448', roughness: 0.95 }),
  ];
  const [sideMaterial, addedMaterial, topMaterial] = wallMaterials;
  const walls = new THREE.Group();
  walls.name = 'maze-walls';
  const windowedWalls = new THREE.Group();
  windowedWalls.name = 'windowed-outer-walls';
  const solidWindowWalls = new THREE.Group();
  solidWindowWalls.name = 'solid-outer-walls';
  solidWindowWalls.visible = false;
  walls.add(windowedWalls, solidWindowWalls);
  const outerWindows = createOuterWallWindows(plan);
  const windowGeometries = new Map<WindowShape, THREE.ExtrudeGeometry>();
  const windowOutlines = new Map<WindowShape, THREE.BufferGeometry>();
  const windowEdgeMaterial = new THREE.LineBasicMaterial({ color: '#78512f', depthWrite: false });
  const verticalMarkers = new Map<string, THREE.Vector3[]>();
  for (const wall of plan.walls) {
    const vertical = wall.from[0] === wall.to[0];
    const added = vertical && wall.from[0] === 6 && (wall.from[1] === 1 || wall.from[1] === 2);
    const material = added ? addedMaterial : sideMaterial;
    const windowShape = outerWindows.get(wallKey(wall));
    let geometry: THREE.BufferGeometry;
    if (windowShape) {
      let windowGeometry = windowGeometries.get(windowShape);
      if (!windowGeometry) {
        windowGeometry = createWindowWallGeometry(plan.cellSize, h, thickness, windowShape);
        windowGeometries.set(windowShape, windowGeometry);
      }
      geometry = windowGeometry;
    } else {
      geometry = new THREE.BoxGeometry(vertical ? thickness : plan.cellSize, h,
        vertical ? plan.cellSize : thickness);
    }
    const mesh = new THREE.Mesh(geometry, windowShape ? [material, topMaterial]
      : [material, material, topMaterial, material, material, material]);
    if (windowShape) {
      let outline = windowOutlines.get(windowShape);
      if (!outline) {
        outline = createWindowOutlineGeometry(h, thickness, windowShape);
        windowOutlines.set(windowShape, outline);
      }
      mesh.add(new THREE.LineSegments(outline, windowEdgeMaterial));
    }
    if (windowShape && vertical) mesh.rotation.y = Math.PI / 2;
    mesh.position.copy(world((wall.from[0] + wall.to[0]) / 2, h / 2,
      (wall.from[1] + wall.to[1]) / 2));
    mesh.name = windowShape ? `outer-wall-${windowShape}-window` : added ? 'added-wall' : 'wall';
    if (windowShape) {
      windowedWalls.add(mesh);
      const solidMesh = new THREE.Mesh(new THREE.BoxGeometry(plan.cellSize, h, thickness),
        [material, material, topMaterial, material, material, material]);
      solidMesh.rotation.copy(mesh.rotation);
      solidMesh.position.copy(mesh.position);
      solidMesh.name = 'closed-outer-wall';
      solidWindowWalls.add(solidMesh);
    } else {
      walls.add(mesh);
    }
    for (const [x, z] of [wall.from, wall.to]) {
      for (const sign of [-1, 1]) {
        const offset = sign * (thickness / 2 + 0.003);
        const bottom = world(x, 0.015, z);
        if (vertical) bottom.x += offset;
        else bottom.z += offset;
        verticalMarkers.set(bottom.toArray().join(','), [bottom, bottom.clone().setY(h - 0.01)]);
      }
    }
  }
  // 正面のB7〜F7に密着させ、両端の入口A7・出口G7を空けておく。
  const frontBoardThickness = 0.02; // 板厚の指定がないため、表示用に2cmとする。
  const frontBoardMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
  wallMaterials.push(frontBoardMaterial);
  const frontBoard = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, frontBoardThickness), frontBoardMaterial);
  frontBoard.name = 'front-art-board';
  frontBoard.position.set(0, 0.75, depth / 2 + thickness / 2 + frontBoardThickness / 2);
  const frontBoardGuideMaterial = new THREE.LineDashedMaterial({ color: '#000000',
    dashSize: 0.07, gapSize: 0.05, transparent: true, depthWrite: false });
  const frontBoardGuidePoints: THREE.Vector3[] = [];
  for (let x = 1; x < 5; x++) {
    const z = frontBoardThickness / 2 + 0.002;
    frontBoardGuidePoints.push(new THREE.Vector3(x - 2.5, -0.75, z),
      new THREE.Vector3(x - 2.5, 0.75, z));
  }
  const frontBoardGuides = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(frontBoardGuidePoints), frontBoardGuideMaterial);
  frontBoardGuides.name = 'front-board-one-metre-guides';
  frontBoardGuides.computeLineDistances();
  frontBoard.add(frontBoardGuides);
  walls.add(frontBoard);
  scene.add(walls);
  const wallGrid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([...verticalMarkers.values()].flat()),
    new THREE.LineDashedMaterial({ color: '#745337', dashSize: 0.055, gapSize: 0.045,
      transparent: true, opacity: 0.8, depthTest: false }));
  wallGrid.computeLineDistances();
  wallGrid.renderOrder = 3;
  wallGrid.visible = false;
  scene.add(wallGrid);

  function label(text: string, color: string, size = 0.8, flat = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('文字の描画領域を作成できません。');
    context.font = '600 78px system-ui, "Meiryo", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, 256, 80);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    if (flat) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 160 / 512),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture,
      transparent: true, depthTest: false, depthWrite: false }));
    sprite.scale.set(size, size * 160 / 512, 1);
    sprite.renderOrder = 4;
    return sprite;
  }

  for (let z = 0; z < plan.rows; z++) {
    for (let x = 0; x < plan.columns; x++) {
      const tag = label(`${String.fromCharCode(65 + x)}${z + 1}`, '#7d7467', 0.95, true);
      tag.position.copy(world(x + 0.24, 0.012, z + 0.22));
      scene.add(tag);
    }
  }
  const solution = new THREE.Group();
  solution.name = 'solution';
  const routeCurve = new THREE.CurvePath<THREE.Vector3>();
  const routePoints = [world(0.5, 0.045, 7.35),
    ...plan.solution.map(cell => { const [x, z] = cellPoint(cell); return world(x + 0.5, 0.045, z + 0.5); }),
    world(6.5, 0.045, 7.35)];
  for (let i = 1; i < routePoints.length; i++) routeCurve.add(new THREE.LineCurve3(routePoints[i - 1], routePoints[i]));
  solution.add(new THREE.Mesh(new THREE.TubeGeometry(routeCurve, 450, 0.035, 6, false),
    new THREE.MeshBasicMaterial({ color: '#e88128' })));
  solution.visible = false;
  scene.add(solution);

  for (const [x, color, text] of [[0, '#25836b', 'START'], [6, '#bf584b', 'GOAL']] as const) {
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false }));
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(world(x + 0.5, 0.015, 6.5));
    scene.add(marker);
    const tag = label(text, color, 1.6);
    tag.position.copy(world(x + 0.5, 0.06, 7.48));
    scene.add(tag);
  }

  const person = createScalePerson();
  person.position.copy(scalePersonPosition(plan));
  const personTag = label('130 cm', '#216987', 1.35);
  personTag.position.set(0, 1.62, 0);
  person.add(personTag);
  scene.add(person);

  const dimensions = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#788aa0' });
  function dimension(a: THREE.Vector3, b: THREE.Vector3, text: string, offset: THREE.Vector3) {
    dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMaterial));
    const horizontal = Math.abs(a.y - b.y) < 0.001;
    const direction = b.clone().sub(a).normalize();
    const tick = horizontal ? new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(0.12)
      : new THREE.Vector3(0.12, 0, 0);
    for (const point of [a, b]) dimensions.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([point.clone().sub(tick), point.clone().add(tick)]), lineMaterial));
    const tag = label(text, '#3d526b', 1.6);
    tag.position.copy(a.clone().add(b).multiplyScalar(0.5).add(offset));
    dimensions.add(tag);
  }
  dimension(world(0, 0.02, 7.95), world(7, 0.02, 7.95), '7 m', new THREE.Vector3(0, 0, 0.22));
  dimension(world(-0.75, 0.02, 0), world(-0.75, 0.02, 7), '7 m', new THREE.Vector3(-0.26, 0.05, 0));
  dimension(world(7.4, 0, 6.5), world(7.4, h, 6.5), '1.5 m', new THREE.Vector3(0.42, 0.1, 0));
  scene.add(dimensions);

  const partTooltip = attachPartTooltip(container, renderer.domElement, scene, camera, frontBoard);

  let disposed = false;
  let resizeFrame = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let view: ViewMode = 'angled';
  let angle = 45;
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const w = Math.round(bounds.width);
    const ht = Math.round(bounds.height);
    if (w <= 0 || ht <= 0 || (w === lastWidth && ht === lastHeight)) return;
    partTooltip.hide();
    lastWidth = w;
    lastHeight = ht;
    const aspect = w / ht;
    const span = aspect >= 1.5 ? 10.2 : aspect < 1 ? 12.4 : 11.5;
    const viewHeight = span / Math.min(aspect, 1);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, ht, false);
    render();
  }
  function scheduleResize() {
    if (disposed || resizeFrame) return;
    // 観測通知の中でレイアウトを更新せず、同じフレームの通知をまとめる。
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  }
  function updatePosition() {
    const theta = THREE.MathUtils.degToRad(angle);
    const elevation = view === 'top' ? Math.PI / 2 - 0.001 : view === 'angled' ? Math.PI / 3.3 : 0;
    camera.position.set(Math.sin(theta) * Math.cos(elevation) * 18,
      Math.sin(elevation) * 18 + controls.target.y, Math.cos(theta) * Math.cos(elevation) * 18);
    controls.update();
    render();
  }
  const changed = () => {
    partTooltip.hide();
    angle = (THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()) + 360) % 360;
    onChange(Math.round(angle) % 360, Math.round(camera.zoom * 100));
    render();
  };
  controls.addEventListener('change', changed);
  const observer = new ResizeObserver(scheduleResize);
  observer.observe(container);
  updatePosition();
  resize();

  return {
    setView(next: ViewMode) {
      view = next;
      controls.target.set(0, 0.4, 0);
      if (next === 'front') angle = 0;
      if (next === 'right') angle = 90;
      if (next === 'back') angle = 180;
      if (next === 'left') angle = 270;
      if (next === 'angled') angle = 45;
      if (next === 'top') angle = 0;
      updatePosition();
    },
    setAngle(value: number) { angle = value; updatePosition(); },
    setZoom(value: number) { camera.zoom = value / 100; camera.updateProjectionMatrix(); controls.update(); changed(); },
    setSolution(value: boolean) { solution.visible = value; render(); },
    setWindows(value: boolean) {
      windowedWalls.visible = value;
      solidWindowWalls.visible = !value;
      windowsVisible = value;
      updateDescription();
      render();
    },
    setPerson(value: boolean) {
      person.visible = value;
      personVisible = value;
      updateDescription();
      render();
    },
    setTransparent(value: boolean) {
      for (const material of wallMaterials) {
        material.transparent = value;
        material.opacity = value ? 0.22 : 1;
        material.depthWrite = !value;
        material.needsUpdate = true;
      }
      windowEdgeMaterial.transparent = value;
      windowEdgeMaterial.opacity = value ? 0.22 : 1;
      frontBoardGuideMaterial.opacity = value ? 0.22 : 1;
      windowEdgeMaterial.needsUpdate = true;
      render();
    },
    setWallGrid(value: boolean) { wallGrid.visible = value; render(); },
    reset() { camera.zoom = 1; camera.updateProjectionMatrix(); controls.target.set(0, 0.4, 0); view = 'angled'; angle = 45; updatePosition(); changed(); },
    dispose() {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
      controls.removeEventListener('change', changed);
      controls.dispose();
      partTooltip.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          if ('geometry' in object) geometries.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
