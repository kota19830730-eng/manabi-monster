# 地図を 本物の 時計で はかる 道具（v13.4）

headless の virtual-time では performance.now() が 本当の 時間に ならない ので、Chrome を 遠隔操作（CDP）して はかる。

```
node tools/mapcheck/cdp2.js "file:///C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/tools/harness.html#map" 6 gpu tools/mapcheck/<式>.js
```
（3つめ＝待つ 秒・4つめ gpu＝GPU あり・5つめ＝ページで 実行する 式の ファイル。式の さいごの 値が 出る）

| 式 | 何を 出すか |
|---|---|
| `perf-map.js` | 学年 3→4→6→1→3 で 地図を 作る 時間（ms）と canvas の 大きさ。v13.4＝きりかえ 約110ms・同じ 学年 約30ms（PC・GPU） |
| `tower-pos.js` | さいごの塔（小4）の アンカー・城の 3D・看板の 位置（ステージ px）。島は アンカー t.y の −57〜+43 |
| `house-count.js` | 学年ごとの 3D の 家の 数・かさなり・x の はんい。v13.4.5＝1ゾーン 4けん・かさなり 0 |
| `v3-check.js` | りったい ON／OFF で 3D の 家・城・div の かざり・ドックの SVG の 数 |

位置や 大きさを 直す ときは **まず これで 数字を 出してから** 動かす（当てずっぽうで 動かさない）。
