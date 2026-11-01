interface Frames {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
}

// 同じフレームに届く描画・ホバー要求は、最後の状態で一度だけ処理する。
export function createFrameScheduler(callback: () => void, frames: Frames = window) {
  let pending: number | undefined;
  let disposed = false;
  function cancel() {
    if (pending !== undefined) frames.cancelAnimationFrame(pending);
    pending = undefined;
  }
  return {
    request() {
      if (disposed || pending !== undefined) return;
      pending = frames.requestAnimationFrame(() => {
        pending = undefined;
        if (!disposed) callback();
      });
    },
    cancel,
    dispose() { disposed = true; cancel(); },
  };
}
