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


## 画面が 広がる わざ（v14.3）

| ファイル | すること | 使い方 |
|---|---|---|
| `growcut.js` | わざの はじめの 仕事を 名前ごとに 交互に はかる（画面に 出た コマ・止まった いちばん 長い あいだ・GPU の ラスター・Paint／Layout の 回数）。部品を かくして くらべる | `WIN=700 node growcut.js bolt 3 1 base= noci="|css=.ci{display:none!important}"`・前の 版は `old=@C:/mqtold` |
| `growtrace.js` | 広がる 動き（0.28秒）の あいだに 画面に 出た コマと メインの コマを 数える（trace の Display::DrawAndSwap と ページの 動きの はじまりの 時間を あわせる） | `node growtrace.js bolt 4 4 @C:/mqt143` |
| `gpuwho.js` | わざの はじめ 0.7秒の GPU・メイン・コンポジター・viz の 10ms こえの 仕事と 画面に 描いた 時間 | `node gpuwho.js bolt` |

- harness `#growshot:<わざ>:<ms>`＝広がる とちゅうを 止めて 撮る（前の 版と 画素で くらべる。`|css=.fxc{visibility:hidden!important}` と 乱数の 種を つける）。
- ~~わかった こと：わざの はじめが 重いのは カットインの 3D の 主人公~~ → **はかり直した（2026-09-14 午後）**：主人公だけ かくしても 止まる 長さは ほぼ 同じ（この PC は ぶれる）。
  **カットインまるごと**（かくすと GPU の ラスター 307 → 180ms・止まる 241 → 152ms）と **技名の 光る 字**（→ 216ms）が 大きい。
  主人公は **メインの Paint**（CPU ×4 で 238 → 63ms）＝タブレットの CPU で 効く。1つの 部品では なく「1コマめに ぜんぶ 描く」のが 重さの 正体。
- Element Timing（画面に 出た 時間）は headless では ほぼ 来なかった（8回 中 0回）。rAF の 間かくでは GPU の おくれは 見えない。
- `growcut.js` の `GW=<はじめms>,<おわりms>`＝その あいだの GPU の ラスターも 出す（あとから 出る カットインの ぶん）。`|js=` で `MQ.ui.battle.ciOption(...)` を たたかいの あとに よぶと 案を 切りかえて はかれる。

### カットインを 軽く する 案（v14.3 案A・B・C）

| ファイル | すること | 使い方 |
|---|---|---|
| `build_cidemo.js` | 案を 見くらべる 動く 見本 `cidemo.html`（下の パネルで いま／案A／案B／案C と わざを えらぶ・止まった いちばん 長い じかんの メーター）。ゲームは パネルの 上に おさめる | `node build_cidemo.js C:/mqtNNN`（git archive HEAD ＋ 自分の ファイル＝ほかの セッションの 作りかけを まぜない）→ Artifact |
| `cidemo_panel.js` | 見本の パネル（build_cidemo.js が 入れる） | — |
| `cidemo_check.js` | 見本を 本物の 時計で 動かす。すてる 1回の あと 案の じゅんばんを かえながら まわして 中央の 値（＋さいしょの まわりで カットインを 撮る） | `node cidemo_check.js <出す フォルダ> bolt 650 4 800 1280 4`（CPU ×4＝タブレットの まね） |
| `snapcost.js` | 案B の 絵を ポーズごとに 作る 時間（内わけ style／atlas／gl・50ms こえの しごと） | `node snapcost.js 4` |

- harness `#cisnap[:<大きさ>[:<ポーズ,…>]]`＝左に いつもの 3D・右に 1まいの 絵（js/ui/cisnap.js）を ポーズごとに ならべる。
- **はじめての わざは 字・音・Canvas の 用意で おそい**。案を くらべる ときは すてる 1回を 出してから・じゅんばんを かえて 何回も（cidemo_check.js）。
- `cidemo.html` は git に 入れない（3MB）。
