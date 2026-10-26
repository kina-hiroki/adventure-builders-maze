import * as THREE from 'three';

interface TooltipPart {
  part: THREE.Object3D;
  id: string;
  size?: string;
  description: string;
}

export function attachPartTooltip(container: HTMLElement, canvas: HTMLCanvasElement,
  scene: THREE.Scene, camera: THREE.Camera, parts: TooltipPart[]) {
  const events = new AbortController();
  const tooltip = document.createElement('div');
  tooltip.className = 'part-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  const size = document.createElement('p');
  size.className = 'part-tooltip-size';
  const description = document.createElement('p');
  tooltip.append(size, description);
  container.appendChild(tooltip);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const presses = new Map<number, { x: number; y: number; moved: boolean }>();
  const originalDescription = canvas.getAttribute('aria-describedby') ?? '';
  let keyboardIndex = -1;

  function hide() {
    tooltip.hidden = true;
    canvas.style.cursor = '';
    canvas.setAttribute('aria-describedby', originalDescription);
  }
  function show(target: TooltipPart, clientX: number, clientY: number) {
    const bounds = container.getBoundingClientRect();
    tooltip.id = target.id;
    size.textContent = target.size ?? '';
    size.hidden = !target.size;
    description.textContent = target.description;
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
  function partAt(clientX: number, clientY: number) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return undefined;
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1,
      -(clientY - bounds.top) / bounds.height * 2 + 1);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    // 裏側から壁越しに反応させず、実際に見えている一番手前の面を調べる。
    const meshes: THREE.Mesh[] = [];
    scene.traverseVisible(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    let hit: THREE.Object3D | null = raycaster.intersectObjects(meshes, false)[0]?.object ?? null;
    // 壁に貼った〇✕の記号に当たった場合も、親のクイズ壁を対象にする。
    while (hit) {
      const target = parts.find(target => target.part === hit);
      if (target) return target;
      hit = hit.parent;
    }
    return undefined;
  }
  function inspect(clientX: number, clientY: number) {
    const target = partAt(clientX, clientY);
    if (target) show(target, clientX, clientY);
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
      const visibleParts = parts.filter(({ part }) => {
        for (let object: THREE.Object3D | null = part; object; object = object.parent)
          if (!object.visible) return false;
        return true;
      });
      if (!visibleParts.length) { hide(); return; }
      keyboardIndex = (keyboardIndex + 1) % visibleParts.length;
      const target = visibleParts[keyboardIndex];
      const center = target.part.getWorldPosition(new THREE.Vector3()).project(camera);
      const bounds = canvas.getBoundingClientRect();
      show(target, bounds.left + (center.x + 1) * bounds.width / 2,
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
