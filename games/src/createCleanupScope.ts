// 初期化途中の失敗と通常終了で、同じ後始末を逆順に一度だけ実行する。
export function createCleanupScope() {
  const callbacks: (() => void)[] = [];
  let disposed = false;
  return {
    get disposed() { return disposed; },
    defer(callback: () => void) {
      if (disposed) callback();
      else callbacks.push(callback);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      while (callbacks.length) {
        try { callbacks.pop()!(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, '表示の後始末に失敗しました。');
    },
  };
}

export function withCleanup<T>(initialize: (scope: ReturnType<typeof createCleanupScope>) => T): T {
  const scope = createCleanupScope();
  try { return initialize(scope); }
  catch (error) {
    try { scope.dispose(); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], '初期化と後始末に失敗しました。'); }
    throw error;
  }
}
