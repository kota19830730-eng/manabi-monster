# ひっさつわざを 見る 道具（v13.8）

ひっさつわざの 光と 3D（`js/ui/fxcanvas.js`）は 動きなので、静止画 1まいでは 分からない。
ここの 道具で ①流れを 1まいに ならべる ②本物の 時計で とちゅうを 撮る ③重さを はかる ④ユーザーに 見せる 動く 見本を 作る。

| ファイル | すること | 使い方 |
|---|---|---|
| `sheet.html` | fxcanvas.js だけを 読み、`seek(t)` を じゅんに 進めて 何まいも 1まいの 画像に ならべる（にせの てき＝紫の 四角・主人公＝青い 四角） | Chrome headless で `sheet.html#<わざ>:<ms,ms,…>[:<列の 数>]` を `--allow-file-access-from-files --window-size=1600,1040` で 撮る |
| `build_demo.js` | index.html の css/js を じゅんに インラインに して 動く 見本 `demo3d.html` を 作る（下に わざの ボタン）。`sounds.js`（`window.__SND = { old, neu }`・data URI）が あれば 音の 聞きくらべボタンも | `node build_demo.js` → できた `demo3d.html` を Artifact で 公開 |
| `rt.js` | `demo3d.html` を 本物の 時計で 動かし、わざの ボタンを 押して とちゅうを 撮る（CDP） | `node rt.js <わざ> <ms,ms,…> <名前> [W] [H]`（先に build_demo.js）|
| `perf.html` | わざごとに 1コマの Canvas の 描く 時間（平均・p95・いちばん 重い）を 出す | `node ../mapcheck/cdp2.js "file:///…/perf.html?src=<fxcanvas の ファイル>" 12 gpu <exprファイル>`（expr は `document.getElementById('log').textContent`）|

- `#fx:<わざ>:<秒>`（harness）は 8コンボ〜の わざで 画面を すぐ 広げる ので、てきの 位置が 下に ずれて 見える。位置は `rt.js` で たしかめる。
- PC が 混んで いる とき（Chrome 30こ いじょう）の 数字は ぶれる。前と あとを 同じ ときに はかって くらべる。
- `demo3d.html`・`sounds.js`・撮った png は git に 入れない。
