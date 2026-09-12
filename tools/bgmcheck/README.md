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

- 前の エンジン（v13.4）：2〜6%。v14.0：9〜18%（いちばん 重い サビで 約14%）。
- **タブレットは PC の 3〜4倍 おそい** → 25% を こえたら 軽く する。
- **長く 鳴らす ほど 重く なる なら もれ**（おわった 音を 外して いない）。10秒・16秒・27秒で 割合が 同じか 見る。v14.0 で 13→33→47% と ふえた → `retire()`（出口の disconnect）で 直った。
- リバーブ（ConvolverNode）は 長さで 重さが 大きく 変わる。1.6秒で 重さの 半分 → 0.8秒に した。

## わな

- `--virtual-time-budget` では OfflineAudioContext の 書き出しが おわらない → `cdpwait.js`（CDP で 本当の 時計・`#out` が `wait` で なくなるまで 待つ）。
- ぜんぶの 音を 先に 作ると 長い 曲で おわらない → `render.html` は `suspend()` で 0.2秒ずつ 作る（本番と 同じ）。`resume` を 上書き して いるので `realResume` を 使う。
- 大きな WAV を 1回で 返すと CDP が とまる → `window.__wav` に おいて 1MB ずつ 取る。
- アーティファクトの assets に 音声は 上げられない → data URI で 埋めこむ（22kHz・前の 音は モノラルで 半分）。
