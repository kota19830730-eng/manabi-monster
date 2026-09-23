# 歴史の 写真を あつめる 道具（v14.22）

`assets/rekishi/*.jpg`（47まい）と `js/content/rekishi.js` を 作った 道具。
仕様は `docs/v14.22歴史の写真メモ.md`。

**どれも scratchpad に あった ものを のこした もの**なので、パスは
`c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/` 決めうち。
つかう まえに 上の 定数を 見る こと。

## つかう じゅんばん

| ファイル | なに |
|---|---|
| `hist.js` | 理科・社会の 全ステージで **図・写真の わりあい**を 数える（`st.make(12,{})` を 60回） |
| `hist2.js` | 歴史の 問題の **問い方**を 数える（だれ／いつ／ことば…）。写真を つけて よいか の 判断に |
| `jinbutsu.js` | 歴史の 問題で **人名が 答えか、問題文の 中か**を 数える |
| `dumpq.js` | 単元を 指定して 問題と 答えを ぜんぶ 出す（`node dumpq.js てこ 水よう液`） |
| `fetch_jinbutsu.js` | 人物の 肖像を ja.wikipedia の 代表画像 → Commons の ライセンス確認 → 360px の thumb で 取る |
| `fetch_mono.js` | もの・たてもの を 同じ やり方で |
| `fetch_cc.js` | **PD で 取れなかった もの**を CC BY / CC BY-SA でも 取る（作者名も ひかえる） |
| `override.js` `fix2.js` `fix3.js` `fix_tokaido.js` | 取りちがえた ものを ファイル名を さして 取り直す |
| `shrink.js` | Chrome の canvas で **よこ260・たて320・JPEG 0.7** に 縮小（47まいで 約630KB） |
| `make_rekishi.js` | `assets/rekishi/` に 入れて `js/content/rekishi.js` を 書き出す |
| `attach_pic.js` | `js/content/shakai6.js` の 問題に `pic: '<id>'` を つける |

## わな（ふんだ もの）

- **ja.wikipedia の 代表画像は 人物でも「花押（サイン）」の ことが ある。**
  織田信長・豊臣秀吉・徳川家康が ぜんぶ そうだった。
  **取った あと かならず 一覧に して 目で 見る**（`#rekiall` か 自作の コンタクトシート）。
- **Commons の 検索（`gsrsearch`）は 日本語だと PDF の スキャンに 当たる。**
  ja.wikipedia の `prop=pageimages` で 代表画像を 取る ほうが 当たる。
- **PD だけで 絞ると たてものの 写真が ほぼ 落ちる**（法隆寺・金閣・大仏などは CC BY／BY-SA）。
  **CC BY／BY-SA は 作者名を 書けば つかえる** → `fetch_cc.js` で 作者も ひかえて
  おうちの人ページの 出どころ一覧に 出す。**NC／ND は つかわない。**
- **`js/content/world3.js` の リスト教科の 問題は フィールドの 白リスト。**
  `pic` の ような 新しい 欄は そこに 足さないと 消える。
- 縮小は **Chrome の canvas**（node に 画像の 道具は ない）。`shrink.js` が 見本。
