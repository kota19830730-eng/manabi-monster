# BGM・効果音を 書き出して 聞きくらべる 道具（v14.0）

音は 耳で 聞かないと 分からない。Claude は 音を 聞けない ので、**本物の Chrome で 書き出して WAV に し、数字（音量・低音・高音・左右の 広がり・重さ）を 出す**。
ユーザーには WAV を 並べた アーティファクトの ページで 聞いて もらう（**実装・公開の 前に 聞かせる**＝ユーザーの きまり）。

## 使い方（このフォルダで）

```
# 前の 版を 用意（例：公開中の HEAD）
git show HEAD:js/core/bgm.js > bgm_old.js
git show HEAD:js/core/sfx.js > sfx_old.js
cp ../../js/core/bgm.js bgm_new.js
cp ../../js/core/sfx.js sfx_new.js

# 曲：node run.js <bgmのファイル> <曲> <秒> <もりあがり0-2> <おこり0/1> <出す.wav>
node run.js bgm_new.js title 27 0 0 v14_title.wav
node run.js bgm_new.js boss 14 2 1 v14_boss.wav      # ボス・コンボMAX・おこり

# 効果音：node runsfx.js <sfxのファイル> <名前,名前,...> <出す.wav>（0.6秒おきに 鳴らす）
node runsfx.js sfx_new.js slash,slash,slash,crit v14_atk.wav
node runsfx.js sfx_new.js correct,correct,wrong v14_dojo.wav

# ページ：build.js の clips 表を 直して → template.html に 埋めこむ（22kHz・前は モノラル・16MB 以下）
node build.js    # → bgm-kikikurabe.html を Artifact で 公開
```

出る 数字：`peak`（1 を こえると われる）`rms`（音量）`low` `high`（低音・高音の 量）`width`（左右の 広がり。0＝モノラル）`render=Xs(Y%)`（**重さ**：この PC で 1秒の 音を 作るのに かかった 割合）。

## 重さの めやす（2026-09-12・この PC）

- 前の エンジン（v13.4）：2〜6%。v14.0：9〜18%（いちばん 重い サビで 約14%）。**v14.1（録音して おく）で 3〜5%**（同じ 日の くらべで 30〜45% へった）。
- **タブレットは PC の 3〜4倍 おそい** → 25% を こえたら 軽く する。
- **長く 鳴らす ほど 重く なる なら もれ**（おわった 音を 外して いない）。10秒・16秒・27秒で 割合が 同じか 見る。v14.0 で 13→33→47% と ふえた → `retire()`（出口の disconnect）で 直った。
- リバーブ（ConvolverNode）は 長さで 重さが 大きく 変わる。1.6秒で 重さの 半分 → 0.8秒に した。

## わな

- `--virtual-time-budget` では OfflineAudioContext の 書き出しが おわらない → `cdpwait.js`（CDP で 本当の 時計・`#out` が `wait` で なくなるまで 待つ）。
- ぜんぶの 音を 先に 作ると 長い 曲で おわらない → `render.html` は `suspend()` で 0.2秒ずつ 作る（本番と 同じ）。`resume` を 上書き して いるので `realResume` を 使う。
- 大きな WAV を 1回で 返すと CDP が とまる → `window.__wav` に おいて 1MB ずつ 取る。
- アーティファクトの assets に 音声は 上げられない → data URI で 埋めこむ（22kHz・前の 音は モノラルで 半分）。

## 重さを はかる・音が 変わって いないか たしかめる（v14.1）

```
# どこが 重いか：部品ごとに 切れる コピーを 作って、切った とき どれだけ 軽く なるか
node parts.js ../../js/core/bgm.js bgm_x.js
# jobs.json に [{ "name": "boss", "src": "bgm_x.js", "song": "boss", "sec": 14, "lv": 2, "enrage": 1, "reps": 3, "off": "pad" }, …]
node bench.js jobs.json          # min=（いちばん 小さい 重さ）js=（画面がわの 仕事）prep=（録音の 時間）

# 音が 変わって いないか：同じ 乱数（seed）で 書き出して、耳に 近い くらべ方で
#   jobs に "wav": "a.wav" を つける（float32）。"nosmp": 1 で 録音を 使わない（その場で 作る）
node specdiff.js a.wav b.wav     # 「大きい所の重み」が 目やす
```

**specdiff の 目やす（2026-09-13 に はかった）**：同じ 曲で 乱数（ドラムの ノイズ）だけ ちがう＝0.28dB／ビブラートを 切る＝0.01dB／アルペジオを 消す＝0.17dB／**同じ 曲を 0.8ミリ秒 ずらしただけ＝ベースだけで 3.4dB**。
→ **波の はじまりの 位置（位相）が ちがう だけでも 数字は 大きく 出る**。帯ごとの へいきん（`bandlv` 相当）と 1音ごとの 大きさも あわせて 見る。

**わな（v14.1 で 見つけた）**
- **`osc.frequency.setValueAtTime(f, t)` と `osc.frequency.value = f` は 音が ちがう**。予定表（setValueAtTime）だと 音の はじめの 128サンプルの 中の のこりが 440Hz（ふつうの 高さ）で 鳴る（Chrome）。音量の 立ち上がりの 下なので 聞こえないが、そのあとの 波の 位置が 変わる。**公開して いる 音は 予定表の ほう → 変えない**。録音（bank）も 予定表で 作る。
- **録音した 音を サンプルの さかいめの あいだから 再生すると 高い 音が こもる**（Chrome は となりの 点を まぜて 読む。8k〜13kHz で −2dB）。`start()` の 時間は `onFrame()` で さかいめに そろえる。
- PC が 混んで いる とき（Chrome 30こ いじょう）は 重さが 2〜3ばいに ぶれる。同じ ものを 5回 はかって いちばん 小さい 数字を 見る。
