# Adventure Builders（集会の裏で冒険仕込む仲間）

## プロジェクト

- 名称：Adventure Builders（集会の裏で冒険仕込む仲間）
- 段ボール迷路づくりを支援する、ブラウザー向けアプリのプロジェクトです。
- 技術構成は Vite + TypeScript + Three.js、開発環境は Windows、パッケージ管理は npm です。
- `games/` にパターン01の3D迷路を実装しています。F2–G2間・F3–G3間の壁追加を反映済みです。

## フォルダーの役割

現在のフォルダー構成です。node_modules/内部の依存ライブラリとキャッシュは省略しています。

```text
adventure-builders-project/
└─ games/
   ├─ src/
   │  ├─ maze/
   │  ├─ three/
   │  └─ assets/
   ├─ tests/
   ├─ public/
   │  └─ reference/
   ├─ dist/                 # ビルドで自動生成
   │  ├─ assets/
   │  └─ reference/
   └─ node_modules/         # npmで自動生成
```

| フォルダー | 役割 |
|---|---|
| `adventure-builders-project/` | プロジェクト全体のルートです。README.mdとAGENTS.mdを置きます。 |
| `games/` | Vite + TypeScript + Three.jsのアプリ開発ルートです。npmコマンドを実行します。 |
| `games/src/` | 画面・迷路データ・3D描画のソースとスタイルを配置します。 |
| `games/src/maze/` | Three.jsに依存しない迷路データ・型・通路の解析処理を配置します。 |
| `games/src/three/` | 3D描画・カメラ・表示操作・描画リソースの解放を配置します。 |
| `games/src/assets/` | コードから読み込み、Viteで処理する素材の配置先です。現在は未使用のテンプレート素材があります。 |
| `games/tests/` | 迷路データと経路の自動テストを配置します。 |
| `games/public/` | 固定のファイル名・URLで配信し、ビルド時にそのままコピーする素材を配置します。 |
| `games/public/reference/` | 画面から参照できる元図PDFを配置します。 |
| `games/dist/` | 本番用ビルドの生成先です。直接編集しません。 |
| `games/dist/assets/` | 最適化したJavaScriptとCSSを格納します。ファイル名にはハッシュが付きます。 |
| `games/dist/reference/` | public/reference/からコピーした元図PDFを格納します。 |
| `games/node_modules/` | npmが導入した依存ライブラリと開発用キャッシュです。 |

`node_modules/`と`dist/`は手動作成やGit登録を行いません。ビルドで使用しないsrc/assets/の素材は、すべてdist/へコピーされるわけではありません。

## ファイル一覧と役割

プロジェクト直下からの相対パスです。プロジェクトのファイル21件と、現在のビルド生成物6件を記載しています。node_modules/内部の外部ライブラリ・ライセンス・キャッシュはnpmが管理するため省略しています。

### プロジェクトのファイル

| ファイル名・配置先 | 役割・現在の使用状況 |
|---|---|
| [AGENTS.md](AGENTS.md) | 作業ルールと、導入・起動・テスト・ビルド・プレビューの手順を定めます。 |
| [README.md](README.md) | プロジェクト概要、構成、ファイルの役割、操作方法と確認結果をまとめます。 |
| [games/.gitignore](games/.gitignore) | node_modules・dist・ログ・エディター設定などをGit管理から除外します。 |
| [games/package.json](games/package.json) | 依存ライブラリとdev・test・build・previewコマンドを定義します。 |
| [games/package-lock.json](games/package-lock.json) | 依存関係の解決済みバージョンを固定し、npm ciで再現します。 |
| [games/tsconfig.json](games/tsconfig.json) | TypeScriptの型チェック・モジュール解決と、対象のsrc/を設定します。 |
| [games/index.html](games/index.html) | Webページの入口です。タイトル・描画先の#appを定義し、main.tsを読み込みます。 |
| [games/src/main.ts](games/src/main.ts) | 迷路の仕様と表示設定の画面を組み立て、UIと3D表示を連携します。起動時の迷路整合確認と開発中の後片付けも行います。 |
| [games/src/style.css](games/src/style.css) | 画面・3D表示領域・設定欄のレイアウトと、スマートフォン幅の表示を設定します。 |
| [games/src/maze/types.ts](games/src/maze/types.ts) | 迷路・壁の端点・寸法・入口と出口・正解ルートの型を定義します。 |
| [games/src/maze/pattern01.ts](games/src/maze/pattern01.ts) | 更新後の元図から取り込んだ壁62区間、正解ルート、寸法、出典名とPDFのSHA-256を保持します。 |
| [games/src/maze/analyzeMaze.ts](games/src/maze/analyzeMaze.ts) | 壁から通路の接続関係を求め、到達可能区画・最短ルート・分岐・曲がり角を計算し、不正な壁や到達不能を検出します。Three.jsには依存しません。 |
| [games/src/three/createMazeView.ts](games/src/three/createMazeView.ts) | Three.jsで壁・床・寸法・座標・正解ルートを描画します。視点・回転・拡大・透かし・縦の点線と、画面サイズ変更・リソース解放を扱います。 |
| [games/tests/maze.test.mjs](games/tests/maze.test.mjs) | Node.js組み込みテストで、元図の壁数・追加壁・経路・開口と不正データを6件検証します。 |
| [games/src/counter.ts](games/src/counter.ts) | Viteテンプレート由来のカウンターです。現在のmain.tsでは未使用です。 |
| [games/src/assets/hero.png](games/src/assets/hero.png) | 初期テンプレートの装飾画像です。現在は未使用です。 |
| [games/src/assets/typescript.svg](games/src/assets/typescript.svg) | 初期テンプレートのTypeScriptロゴです。現在は未使用です。 |
| [games/src/assets/vite.svg](games/src/assets/vite.svg) | 初期テンプレートのViteロゴです。現在は未使用です。 |
| [games/public/favicon.svg](games/public/favicon.svg) | 初期テンプレートのタブ用アイコンです。現在のindex.htmlからは未使用ですが配信対象です。 |
| [games/public/icons.svg](games/public/icons.svg) | 初期テンプレートのSVGアイコン集です。現在の画面では未使用ですが配信対象です。 |
| [games/public/reference/pattern01.pdf](games/public/reference/pattern01.pdf) | 壁追加を反映した元の平面図です。画面の「元の平面図を見る」から参照できます。元資料と同じ内容をコピーしています。 |

`vite.config.ts`は未作成です。Viteの標準設定と、起動コマンドの引数を使用しています。

### ビルド生成物

直接編集せず、ソースや素材を修正して再ビルドします。JavaScriptとCSSのファイル名は再ビルドで変更される場合があります。

| ファイル名・配置先 | 役割 |
|---|---|
| [games/dist/assets/index-g9Jho19f.js](games/dist/assets/index-g9Jho19f.js) | アプリとThree.js・OrbitControlsをまとめて最適化した公開用JavaScriptです。 |
| [games/dist/assets/index-DyvAES6e.css](games/dist/assets/index-DyvAES6e.css) | src/style.cssから生成した公開用CSSです。 |
| [games/dist/favicon.svg](games/dist/favicon.svg) | public/favicon.svgをそのままコピーした配信用ファイルです。 |
| [games/dist/icons.svg](games/dist/icons.svg) | public/icons.svgをそのままコピーした配信用ファイルです。 |
| [games/dist/index.html](games/dist/index.html) | 生成したJavaScriptとCSSを読み込む公開用HTMLです。 |
| [games/dist/reference/pattern01.pdf](games/dist/reference/pattern01.pdf) | public/reference/pattern01.pdfをそのままコピーした配信用ファイルです。 |

## パターン01の取り込み

- 「迷路の図形パターン01を確認」チャットの最終版を反映しています。
- 7m×7m、1区画1m、入口A7・出口G7は下辺の開口です。座標は左からA〜G、上から1〜7です。
- 壁は外周26区間＋内部36区間＝62枚相当です。元の60枚の配置へF2–G2間・F3–G3間の2区間を追加しています。
- 正解ルートは45セル、曲がり角31回、分岐2か所です。全49区画がつながり、循環はありません。
- 壁高1.5mは「迷路全体図を3D表示」チャットの指定を使用しています。壁厚は元図に指定がないため表示用の0.045mとし、7mの寸法は元図のグリッドを基準にしています。
- 壁データと元図の識別情報はpattern01.tsに保持しています。参照PDFはpublic/reference/pattern01.pdfです。

表示設定は迷路図の右側に、正解ルート→視点→回転→拡大率→透かし→縦の点線の順で縦に並びます。画面幅680px以下では迷路図の下へ回り込みます。正解ルートは床面に表示し、壁に隠れる箇所は「壁を透かす」か真上表示で確認できます。寸法・区画ラベルも表示します。

ドラッグで回転、ホイールで拡大、右ドラッグで移動します。タッチ操作は1本指で回転、2本指で拡大・移動です。canvasにフォーカスした状態では矢印キーで移動できます。視点は斜め・真上・真横・正面・右側・背面・左側から選べます。「全体表示に戻す」は視点・拡大率・位置を戻し、表示スイッチの状態は保持します。

## 必要な環境

- Node.js 24 LTS系（構築時：v24.22.1）
- npm（構築時：11.19.1）
- WebGL 2が利用できるブラウザー（Edge・Chromeなど）
- PowerShell

既存のJava環境はそのまま使用できます。Java用の環境変数は変更しません。Node.jsを他のプロジェクトでも使っている場合は、更新前にそのプロジェクトの対応バージョンを確認してください。

## 初回の依存ライブラリ導入

プロジェクト直下から実行します。構築済みの環境では再実行は不要です。

```powershell
Set-Location -LiteralPath '.\games'
npm.cmd ci
```

`package.json` と `package-lock.json` をセットで管理します。以降のコマンドも `games/` で実行します。

## 開発サーバー

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

表示されたURL（通常は `http://127.0.0.1:5173/`）をブラウザーで開きます。ポートが使用中なら `--port 5174` などに変更してください。停止は `Ctrl+C` です。

`src/main.ts` からパターン01の迷路を描画し、表示設定で視点・回転・拡大・正解ルート・壁の透かし・縦の点線を変更できます。画面サイズ変更にも対応し、開発中のモジュール更新ではイベントと描画リソースを解放します。

## 単体テスト

```powershell
npm.cmd test
```

Node.js組み込みのテストランナーで、迷路の接続・追加壁・ルート・開口・不正データを6件検証します。追加のテストパッケージは不要です。

## 型チェック・ビルド

```powershell
npm.cmd run build
```

`tsc && vite build` の順で、TypeScriptの型チェックと本番用ビルドを実行します。成果物は `games/dist/` に生成されます。

## ビルド結果の確認

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

表示されたURLをブラウザーで開きます。プレビューはローカル確認用です。停止は `Ctrl+C` です。

## 動作確認項目

- 開発サーバーでパターン01の迷路が表示されること。
- ブラウザーのコンソールにエラーが出ていないこと。
- 画面サイズを変更しても迷路が表示され、設定欄がはみ出さないこと。
- ソース保存後に変更が反映され、canvasが重複しないこと。
- 型チェックとビルドが成功し、プレビューでも迷路が表示されること。

単体テストはnpm testで実行します。E2Eテストの自動化ツールは未導入で、画面操作はブラウザーで確認します。

## 構築時の確認結果

2026-10-26に確認しました。

| 項目 | 結果 |
|---|---|
| 使用バージョン | Node.js v24.22.1 / npm 11.19.1 / Vite 8.3.5 / TypeScript 6.0.3 / Three.js 0.186.1 / @types/three 0.186.0 |
| Viteの初期画面 | 開発サーバーで表示を確認 |
| Three.jsの立方体 | 開発サーバー・ビルド後のプレビューで表示を確認 |
| ブラウザーのコンソール | アプリ画面でエラー・警告なし |
| 表示領域の変更 | 320×480から560×360へ変更し、再描画を確認 |
| ソース保存時の反映 | 立方体の角度変更が反映され、canvasが1つであることを確認。検証後に元の角度へ復元 |
| 型チェック・ビルド | `npm.cmd run build` 成功 |
| 依存ライブラリの監査 | 導入時のnpm監査で脆弱性0件 |
| Java | 既存のJava 25.0.4で `java -version` 成功。Java環境の設定変更なし |

ビルド時には、JavaScriptのチャンクが500 kBを超える警告が1件出ています（約524 kB、gzip圧縮後は約130 kB）。ビルドは成功しています。配信サイズの最適化は今後の検討事項です。

表示領域の確認に使用した一時ページは削除済みです。迷路の機能・単体テスト・E2Eテストは今回の構築範囲に含めていません。

## パターン01取り込みの確認結果

2026-10-26に確認しました。上記の「構築時の確認結果」は初期の立方体サンプルの履歴です。

- 元図と更新後の壁62区間・入口と出口・正解ルートの一致を確認しました。
- `npm.cmd test`の6件と、`npm.cmd run build`の型チェック・ビルドが成功しました。
- 斜め・真上・真横・正面・右側・背面・左側、正解ルート、回転、拡大率100〜300%、全体表示、透かし、縦の点線の操作を確認しました。
- デスクトップ幅1280pxとスマートフォン幅390pxで表示を確認し、狭い幅で横はみ出しがないことを確認しました。
- ソースの一時変更が画面に反映され、canvasが1つのままであることを確認し、検証後に元の内容へ復元しました。
- 開発サーバーとビルド済みプレビューで表示を確認し、アプリ画面のコンソールにエラー・警告がないことを確認しました。
- ビルド時の500 kB超の警告は継続しています。JavaScriptは約592 kB、gzip圧縮後は約149 kBです。警告を隠す設定変更はしていません。

E2E自動テスト、実機のタッチ操作、WebGL 2が使えない端末での確認は未実施です。操作は閲覧用で、壁の配置編集や資材計算は実装していません。
