# そうびの 見た目の 道具（v13.19）

- `lab.html`＋`lab.js`＋`gearproto.js` … **案の 見くらべ**（いま／B 見せ方／A 形／C オーラ）。gearproto.js は 試作の 形（4グレード）。ゲームには つかって いない。
- `show.html`＋`show.js`＋`show.css` … **できあがり**（ゲームの 本物＝js/content/gearart.js と js/ui/gearaura.js）。8グレードを バトルの 大きさの 3D と メニューの 絵で。
- `build.js` … ページを 1まいの HTML に する（アーティファクト用）：`node tools/gearlab/build.js <出力.html> [show.html]`

ローカルで 見る ときは Chrome に `--allow-file-access-from-files`（または ふつうに ダブルクリック）。
仕様は docs/v13.19そうびの見た目メモ.md。
