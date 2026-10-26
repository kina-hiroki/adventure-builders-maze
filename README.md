# Adventure Builders（集会の裏で冒険仕込む仲間）

段ボール迷路「パターン01」を立体で確認する、ブラウザー向けの3Dアプリです。
Vite・TypeScript・Three.jsを使用し、アプリのソースは `games/` にまとめています。

## 主な機能

- 縦7m × 横7m、壁高1.5mの迷路と寸法・区画座標を表示
- 正解ルートの表示・非表示を切り替え
- 斜め・真上・真横・正面・右側・背面・左側への視点切り替え
- 回転、拡大率100〜300%、全体表示へのリセット
- 壁の透かし、壁に1m間隔の縦の点線を表示する機能
- 元の平面図PDFの参照

設定欄は迷路図の右側に、正解ルート → 視点 → 回転 → 拡大率 → 透かし → 縦の点線の順で並びます。
画面幅680px以下では迷路図の下に配置します。

## 迷路の仕様

| 項目 | 内容 |
|---|---|
| 外寸・区画 | 7m × 7m、7行 × 7列、1区画1m |
| 壁の高さ | 1.5m |
| 壁の区間数 | 外周26区間 ＋ 内部36区間 ＝ 62区間 |
| 追加した壁 | F2–G2間、F3–G3間 |
| 入口・出口 | 入口A7、出口G7。どちらも下辺に開口 |
| 正解ルート | 45セル、曲がり角31回、分岐2か所 |

座標は左からA〜G、上から1〜7です。全49区画がつながり、循環はありません。
壁厚は表示用に0.045mとしています。7mの寸法は元図のグリッドを基準にしています。

元図は [pattern01.pdf](games/public/reference/pattern01.pdf) です。
壁配置・正解ルートと元図のSHA-256は [pattern01.ts](games/src/maze/pattern01.ts) に保持しています。

## 必要な環境

- Node.js 24 LTS系とnpm
- WebGL 2が利用できるブラウザー
- 以下のコマンド例はWindowsのPowerShell用

## ローカルで起動する

プロジェクト直下から実行します。

```powershell
Set-Location -LiteralPath '.\games'
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

[http://127.0.0.1:5173/adventure-builders-maze/](http://127.0.0.1:5173/adventure-builders-maze/) をブラウザーで開きます。
`npm.cmd ci` は初回取得時や依存関係の入れ直し時に実行します。導入済みで変更がなければ再実行は不要です。
以降のnpmコマンドも `games/` で実行します。

ポートが使用中なら `--port 5174` などへ変更してください。サーバーは `Ctrl+C` で停止します。

## 操作方法

| 操作 | 方法 |
|---|---|
| 回転 | 迷路をドラッグ、または回転スライダー |
| 拡大・縮小 | マウスホイール、または拡大率スライダー |
| 平行移動 | 右ドラッグ。迷路にフォーカスした状態では矢印キーも使用可能 |
| タッチ操作 | 1本指で回転、2本指で拡大・移動 |
| 初期の視点へ戻す | 「全体表示に戻す」ボタン |

全体表示へ戻しても、正解ルート・透かし・縦の点線の表示状態は保持します。
壁に隠れた正解ルートは、透かしか真上表示で確認できます。

## テスト・ビルド

```powershell
npm.cmd test
npm.cmd run build
```

単体テスト6件で壁数、追加壁、全区画の接続と正解ルート、入口・出口の開口、不正データの検出を確認します。
ビルドはTypeScriptの型チェック後にViteで実行し、`games/dist/` に出力します。

ビルド結果をブラウザーで確認する場合は、次を実行します。

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

[http://127.0.0.1:4173/adventure-builders-maze/](http://127.0.0.1:4173/adventure-builders-maze/) を開きます。プレビューはローカル確認用です。

## GitHub Pages向けのパス設定

[vite.config.ts](games/vite.config.ts) の `base` を `/adventure-builders-maze/` に設定しています。
開発サーバー・ビルド後のプレビューでも、このパスを使用します。
この設定を追加する前から開発サーバーを起動していた場合は、再起動して設定を読み込み直してください。
ホームと参照PDFへのリンクは `import.meta.env.BASE_URL` を使用し、公開先のパスに合わせます。
設定方法は [Viteの公開パスの説明](https://vite.dev/guide/build.html#public-base-path) を参照してください。

GitHub Pagesの公開設定が完了した後のURLは `https://kina-hiroki.github.io/adventure-builders-maze/` です。

## プロジェクト構成

```text
.
├─ AGENTS.md                  # 作業ルール・確認手順
├─ README.md
└─ games/
   ├─ .gitignore
   ├─ package.json
   ├─ package-lock.json       # 依存関係の固定
   ├─ tsconfig.json
   ├─ vite.config.ts          # GitHub Pages向けの公開パス
   ├─ index.html             # ページの入口
   ├─ src/
   │  ├─ main.ts             # 画面と表示設定の連携
   │  ├─ style.css           # レイアウト・見た目
   │  ├─ maze/
   │  │  ├─ types.ts         # 迷路データの型
   │  │  ├─ pattern01.ts     # 壁配置・正解ルート・元図の識別情報
   │  │  └─ analyzeMaze.ts   # 通路・経路・整合性の解析
   │  └─ three/
   │     └─ createMazeView.ts # 3D描画・カメラ・リソースの解放
   ├─ tests/
   │  └─ maze.test.mjs
   └─ public/
      └─ reference/
         └─ pattern01.pdf    # 参照用の平面図
```

迷路のデータ・解析処理とThree.jsによる描画処理を分けています。
`node_modules/` と `dist/` は自動生成されるためGit管理の対象外です。

## 現在の制限

- ビルド時にJavaScriptのチャンクが500kBを超える警告が出ます。型チェック・ビルドは成功しています。
- E2E自動テストは未導入です。実機のタッチ操作とWebGL 2非対応端末での確認は未実施です。
- 壁配置の編集・資材計算は未実装です。
- GitHub Pages向けの自動公開ワークフローは未追加です。
