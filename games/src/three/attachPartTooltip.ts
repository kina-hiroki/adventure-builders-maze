import * as THREE from 'three';

export function attachPartTooltip(container: HTMLElement, canvas: HTMLCanvasElement,
  scene: THREE.Scene, camera: THREE.Camera, part: THREE.Mesh) {
  const events = new AbortController();
  const tooltip = document.createElement('div');
  tooltip.className = 'part-tooltip';
  tooltip.id = 'front-board-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  const size = document.createElement('p');
  size.className = 'part-tooltip-size';
  size.textContent = '高さ 1.5 m × 幅 5 m';
  const description = document.createElement('p');
  description.textContent = '子供たちに絵を書いてもらった段ボールを配置';
  tooltip.append(size, description);
  container.appendChild(tooltip);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const presses = new Map<number, { x: number; y: number; moved: boolean }>();
  const originalDescription = canvas.getAttribute('aria-describedby') ?? '';

  function hide() {
    tooltip.hidden = true;
    canvas.style.cursor = '';
    canvas.setAttribute('aria-describedby', originalDescription);
  }
  function show(clientX: number, clientY: number) {
    const bounds = container.getBoundingClientRect();
    tooltip.hidden = false;
    const x = Math.max(8, Math.min(clientX - bounds.left + 14, bounds.width - tooltip.offsetWidth - 8));
    const above = clientY - bounds.top - tooltip.offsetHeight - 16;
    const y = Math.max(8, Math.min(above >= 8 ? above : clientY - bounds.top + 18,
      bounds.height - tooltip.offsetHeight - 8));
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.dataset.placement = above >= 8 ? 'above' : 'below';
    canvas.style.cursor = 'pointer';
    canvas.setAttribute('aria-describedby', `${originalDescription} ${tooltip.id}`.trim());
  }
  function isPartAt(clientX: number, clientY: number) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1,
      -(clientY - bounds.top) / bounds.height * 2 + 1);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    // 裏側から壁越しに反応させず、実際に見えている一番手前の面を調べる。
    const meshes: THREE.Mesh[] = [];
    scene.traverseVisible(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    return raycaster.intersectObjects(meshes, false)[0]?.object === part;
  }
  function inspect(clientX: number, clientY: number) {
    if (isPartAt(clientX, clientY)) show(clientX, clientY);
    else hide();
  }
  canvas.addEventListener('pointerdown', event => {
    hide();
    presses.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: event.button !== 0 });
    if (presses.size > 1) for (const press of presses.values()) press.moved = true;
  }, { signal: events.signal });
  canvas.addEventListener('pointermove', event => {
    const press = presses.get(event.pointerId);
    if (press) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
      return;
    }
    if (event.pointerType === 'mouse' && !event.buttons && !presses.size) inspect(event.clientX, event.clientY);
  }, { signal: events.signal });
  canvas.addEventListener('pointerup', event => {
    const press = presses.get(event.pointerId);
    presses.delete(event.pointerId);
    if (press && !press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8)
      inspect(event.clientX, event.clientY);
  }, { signal: events.signal });
  canvas.addEventListener('pointercancel', event => { presses.delete(event.pointerId); hide(); }, { signal: events.signal });
  canvas.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') hide(); }, { signal: events.signal });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
    if (event.key === 'Enter') {
      event.preventDefault();
      const center = part.getWorldPosition(new THREE.Vector3()).project(camera);
      const bounds = canvas.getBoundingClientRect();
      show(bounds.left + (center.x + 1) * bounds.width / 2,
        bounds.top + (1 - center.y) * bounds.height / 2);
    }
  }, { signal: events.signal });
  canvas.addEventListener('blur', hide, { signal: events.signal });
  document.addEventListener('pointerdown', event => { if (event.target !== canvas) hide(); },
    { signal: events.signal, capture: true });
  return {
    hide,
    dispose() { events.abort(); presses.clear(); hide(); tooltip.remove(); },
  };
}
