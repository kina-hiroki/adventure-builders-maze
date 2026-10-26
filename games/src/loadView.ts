export type ViewLoadFailure = 'load' | 'initialize';

// 遅れて完了した読み込みが、終了済みの画面を再作成しないようにする。
export function loadView<Module, View extends { dispose(): void }>(options: {
  load: () => Promise<Module>;
  create: (module: Module) => View;
  onReady: (view: View) => void;
  onError: (phase: ViewLoadFailure, error: unknown) => void;
}) {
  let closed = false;
  let view: View | undefined;
  const ready = (async () => {
    let module: Module;
    try {
      module = await options.load();
    } catch (error) {
      if (!closed) options.onError('load', error);
      return;
    }
    if (closed) return;
    try {
      const created = options.create(module);
      if (closed) { created.dispose(); return; }
      view = created;
      options.onReady(created);
    } catch (error) {
      view?.dispose();
      view = undefined;
      if (!closed) options.onError('initialize', error);
    }
  })();
  return {
    ready,
    dispose() {
      if (closed) return;
      closed = true;
      view?.dispose();
      view = undefined;
    },
  };
}
