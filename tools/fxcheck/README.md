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

## 重さの 犯人さがし（v13.10）

| ファイル | すること | 使い方 |
|---|---|---|
| `paintwho.js` | 何が 描き直されて いるか（Paint の 回数を 要素ごとに） | `node paintwho.js battle 4 3`（何も して いない たたかい）・`node paintwho.js perffx:fire 2.5 3.5`（わざ）。`|css=…` を つなげると 部品を 外して くらべられる |
| `ab.js` | 部品を 1つずつ 外して メイン／GPU の いそがしさ・描き直しの 回数を くらべる（dpr 2・800×1280） | `node ab.js starburst 3 base= noci="|css=.ci{display:none!important}"` |
| `trace.js` / `prof.js` | Chrome の トレース／JS の 重い 関数 | `node prof.js perffx:starburst 3 8` |
| `diff.html` | 2まいの 画像の ちがう 画素を 数える | `diff.html?a=<まえ>&b=<あと>` を `--allow-file-access-from-files` で |

- **時間は PC の 混みぐあいで 1.6ばい ぶれる**。くらべる ときは 描き直しの 回数（paintwho）か、画素の ちがい（diff）で。
- 前の 版と くらべる：`git worktree add -f <一時フォルダ> HEAD --detach` → 同じ 道具で 撮る（harness に `|js=` で `Math.random` を 種つきに）。おわったら `git worktree remove`。


## わざの 出だしの ひっかかり（v14.2.1）

| ファイル | すること | 使い方 |
|---|---|---|
| `fontsdiff.js` | わざの あいだに あとから よみこんだ 字の まとまり（0 が 合格。あると 画面ぜんたいの 計算し直し） | `node fontsdiff.js set-capsule` |
| `whyl.js` | わざを 出した あとの Style／Layout を 時間じゅんに・なぜ 計算し直したか（要素と 理由と 関数） | `node whyl.js set-capsule`（`NTH=1` で 2回めの わざ）|
| `startcut.js` | わざの 出だし 0.7秒の 長い 仕事・Layout と Paint の 数（CPU を おそく して タブレットの まね） | `QUIET=1 node startcut.js set-capsule 3 4` |

- 1コマの 時間は この PC では ぶれる ので、**Paint・Layout の 回数、dirty の 数、字の まとまりの 数** で くらべる。
