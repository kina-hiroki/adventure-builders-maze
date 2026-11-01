export function frameClock() {
  const pending = new Map();
  let nextId = 0;
  return {
    requestAnimationFrame(callback) { const id = nextId++; pending.set(id, callback); return id; },
    cancelAnimationFrame(id) { pending.delete(id); },
    get size() { return pending.size; },
    flush(time = 0) {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(callback => callback(time));
    },
  };
}
