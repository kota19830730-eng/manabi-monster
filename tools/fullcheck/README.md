# 全体チェックの 道具（2026-09-18・claude-5e）

「全体を くまなく チェックして」と 言われた ときに 使う。くわしい 結果は `docs/全体チェック_2026-09-18メモ.md`。

じゅんばん：
1. `node --check`（js/core・content・ui・sw.js）→ `node tools/smoke.js .` を 3回（まれな 乱数の バグは 20回）
2. harness `#flow`（budget 3000000）と `#fit:all` を 800×1280・520×780
3. `node tools/fullcheck/consist.js .`（manabi-quest で）… index・sw の FILES・harness の 登録もれ。boot.js が harness に ないのは わざと
4. `node tools/fullcheck/sweep.js` … harness の モード 356本を 4本ずつ 開いて ログの ERROR／MISSING を `sweep_report.txt` に（約1時間）。
   「ログ空」は 撮る だけの モードで 正常。前から ある もの：`#news` の「つぎ」・`#guard`（わざと）・`#kanso`（にせの 記録）・`#counterboss`／`#skill:clone2`（v12.7 で ボスが 強く なって テストが 古い）
5. コードを 3分野（セーブの 引きつぎ／さいきんの 変更／バトルの 流れ）に 分けて 読ませ、出た ものは **ぜんぶ 自分で 再現**してから 直す
6. 直したら `node tools/fullcheck/cmp.js <モード…>` … 直す 前（`git -c core.autocrlf=false archive HEAD | tar -x -C C:/mqt_head`）と 後の ログを ならべ、MISSING／NG が ふえて いないか

そのほか：
- `txt.js "文"` … 学年の 辞書（kotoba.js）で 文が どう 変わるか（小1・2・3・5・6）
- `anstest2.js [root]` … 小3の 子が 小1の かん字の よみを 2回 まちがえた ときの「こたえは ○○。」（辞書が かかって いないか）
- harness の `#set` など 一部の モードは タイマーを 止める（freeze）。`|js=` で 自分の テストを 動かす ときは はじめに `var ST = window.setTimeout` を とって おいて それで 待つ
- パスは 中に 書いて ある（scratchpad → ここに 写した）。ちがう 場所で 使う ときは 直す
- おわったら `C:/tmp_*` の 一時フォルダと のこった headless Chrome を 消す
