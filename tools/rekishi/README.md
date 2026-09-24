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

---

## 写真を さがす・差しかえる 道具（v14.23 で 足した）

**呼んだ ところ**（cwd）に `cand/`（候補）と `out/`（できあがり）を 作る ので、
一時フォルダで 走らせる。パスの 決めうちは ない。

| ファイル | なに |
|---|---|
| `pageimg.js <記事名…>` | **ja.wikipedia の 代表画像**の ファイル名を 出す。Commons の 検索より 当たる |
| `find_pic.js <ことば…>` | **Commons を さがす**（ライセンス・作者・大きさ・thumb の URL を 14件） |
| `grab_pic.js <名前>=<File名.jpg> …` | ファイル名を さして **400px の thumb を `cand/` に** 落とす（ライセンスも 出す）。ファイル名に スペースや `'` が ある ときは **node から よぶ**（bash の 単語わけで こわれる） |
| `sheet.js <名前…>` | `cand/` の 画像を **1まいの コンタクトシート `sheet.jpg`**（4れつ・名前つき）に。**16まいを 1回の 画像読みで くらべられる**＝これが いちばん 速い |
| `crop.js <入力> <出力> <x,y,w,h> <よこpx> [filter]` | **切りぬき＋縮小＋明るさ**（Chrome の canvas）。x,y,w,h は わりあい。filter は `"brightness(1.12) contrast(1.28) saturate(1.45)"` の 形。**うすぐらい 写真は これで 直る** |

### つかう じゅんばん

```bash
cd <一時フォルダ>
node <ここ>/pageimg.js 江馬氏館跡 根城 草戸千軒町遺跡     # 代表画像を 見る
node <ここ>/find_pic.js "Ema's House Park"               # Commons で さがす
node <ここ>/grab_pic.js "e07=Historic Ruin ... 07.jpg"    # 候補を 落とす
node <ここ>/sheet.js e01 e02 e03 …                        # 1まいに して 目で くらべる
node <ここ>/crop.js cand/e07.jpg out/yakata.jpg 0,0.18,0.86,0.80 260 "brightness(1.04) contrast(1.08) saturate(1.12)"
```

### えらぶ ときの きまり（v14.23 で 決めた）

- **260px に して 何か 分かる もの**。**絵巻（一遍上人絵伝・男衾三郎絵詞）は 色が あせて いて 読めない。**
- **曇り空・冬の 枯れ木・街灯・現代の 手すり**が 目立つ 写真は さける（根城は これで 落とした）。
- ライセンスは **PD／CC0／CC BY／CC BY-SA／Attribution だけ**（NC・ND は smoke が 落とす）。CC は 作者名を `CREDITS` に。
- **写真の 時代と 問題の 時代を そろえる。** 吉野ヶ里（弥生）の ほりを 鎌倉の 武士の 問題に 出すと、時代を まちがえて おぼえる。

### 1まい 足す ときに さわる ところ

`assets/rekishi/<id>.jpg` ／ `js/content/rekishi.js` の `PICS` と `CREDITS` ／
`js/content/shakai6.js` の 問題に `pic: '<id>'` ／ **`sw.js` の FILES に `./assets/rekishi/<id>.jpg`**（smoke が 見る）。
