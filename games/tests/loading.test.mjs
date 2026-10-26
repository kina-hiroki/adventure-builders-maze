import test from 'node:test';
import assert from 'node:assert/strict';
import { loadView } from '../src/loadView.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('読み込み完了後にだけ画面を作成し、終了時は一度だけ解放する', async () => {
  const pending = deferred();
  const calls = [];
  const loader = loadView({
    load: () => pending.promise,
    create: module => { calls.push(module); return { dispose: () => calls.push('dispose') }; },
    onReady: () => calls.push('ready'),
    onError: () => assert.fail('unexpected error'),
  });
  assert.deepEqual(calls, []);
  pending.resolve('module');
  await loader.ready;
  assert.deepEqual(calls, ['module', 'ready']);
  loader.dispose(); loader.dispose();
  assert.deepEqual(calls, ['module', 'ready', 'dispose']);
});

test('読み込み中に終了した画面は、遅れて完了しても作成しない', async () => {
  const pending = deferred();
  const loader = loadView({ load: () => pending.promise,
    create: () => assert.fail('closed screen recreated'),
    onReady: () => assert.fail('closed screen enabled'),
    onError: () => assert.fail('closed screen reported an error') });
  loader.dispose(); pending.resolve({}); await loader.ready;
});

test('読み込み失敗と3D初期化失敗を区別して通知する', async () => {
  for (const expected of ['load', 'initialize']) {
    const failure = new Error(expected);
    const errors = [];
    const loader = loadView({
      load: async () => { if (expected === 'load') throw failure; return {}; },
      create: () => { throw failure; },
      onReady: () => assert.fail('failed screen enabled'),
      onError: (phase, error) => errors.push([phase, error]),
    });
    await loader.ready;
    assert.deepEqual(errors, [[expected, failure]]);
    loader.dispose();
  }
});

test('終了後の読み込み失敗は古い画面へ通知しない', async () => {
  const pending = deferred();
  const loader = loadView({ load: () => pending.promise,
    create: () => assert.fail('unexpected creation'), onReady: () => assert.fail('unexpected ready'),
    onError: () => assert.fail('stale failure reported') });
  loader.dispose(); pending.reject(new Error('late failure')); await loader.ready;
});

test('初期化中に終了した場合も作成したリソースを解放する', async () => {
  let disposed = 0;
  const loader = loadView({ load: async () => ({}),
    create: () => { loader.dispose(); return { dispose: () => disposed++ }; },
    onReady: () => assert.fail('closed screen enabled'), onError: () => assert.fail('unexpected failure') });
  await loader.ready;
  assert.equal(disposed, 1);
});

test('設定の接続に失敗した場合も作成済みの3D表示を解放する', async () => {
  let disposed = 0;
  const errors = [];
  const loader = loadView({ load: async () => ({}), create: () => ({ dispose: () => disposed++ }),
    onReady: () => { throw new Error('binding failed'); }, onError: phase => errors.push(phase) });
  await loader.ready; loader.dispose();
  assert.equal(disposed, 1);
  assert.deepEqual(errors, ['initialize']);
});
