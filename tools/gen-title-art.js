/* タイトル画面の ドット絵を 作る スクリプト（node tools/gen-title-art.js）
   勇者（hero.js の posterRows）と ドラゴン・なかま3体（start.js の *_ROWS）を
   四角の ならびから 生成して、そのまま ソースに 書きこむ。
   絵を 直したい ときは この ファイルの rect(...) を 変えて 流し直す。
   （手で マス目を 打たない ための 道具。v1.8 で 作った）

   もとの メモ：

   ユーザー：「ドラゴンが ドラゴンに 見えない。解像度が 悪い。画像の とおりで」
   直す ところ：
     ・1ドットを 5px → **約3.8px** に（マス目を 1.3倍 こまかく）
       勇者 26×28 → 34×36 ／ ボス 28×16 → 44×24 ／ なかま 12 → 16マス
     ・ドラゴンは モックの ワイバーンと 同じ **はねを 上に 大きく ひろげた V字**。
       とがった はね先・ぎざぎざの 下の へり・こい色の どうたい・金の はん点・
       金の つの と かぎづめ・小さい 頭（左）・しっぽ（右下）。色は 赤。
     ・黒い ふち取りは やめる（モックに ふちは ない。太い ふちが 安っぽさの もと）
   出来た マス目は hero.js と start.js に 書きこむ。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');   // manabi-quest/

function grid(w, h) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill('.')); return g; }
function rect(g, x, y, w, h, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const Y = y + j, X = x + i;
    if (g[Y] && X >= 0 && X < g[Y].length) g[Y][X] = c;
  }
}
function px(g, x, y, c) { rect(g, x, y, 1, 1, c); }
function toRows(g) { return g.map(function (r) { return r.join(''); }); }
function lit(rows, ind) { return rows.map(function (r) { return ind + "'" + r + "'"; }).join(',\n'); }
function mirror(g, rows, W) {
  for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
    const c = g[y][x];
    if (c !== '.') { const m = W - 1 - x; if (g[y][m] === '.') g[y][m] = c; }
  }
}

/* ========================= 勇者 34×36 =========================
   あたま 13 : からだ 11 : ズボン 6 : くつ 2（モックの 割合） */
function knight() {
  const g = grid(34, 36);

  // けん（白い やいば・先は とがる）
  rect(g, 27, 1, 3, 11, 'S');
  rect(g, 27, 1, 1, 11, 'W');
  rect(g, 29, 2, 1, 10, 'E');
  px(g, 28, 0, 'S');
  rect(g, 25, 12, 7, 1, 'g');               // つば
  rect(g, 25, 13, 7, 1, 'G');
  rect(g, 26, 14, 5, 2, 'g');               // 金の てぶくろ
  rect(g, 26, 15, 5, 1, 'G');

  // 上げた 右うで（かたまで つなげる）
  rect(g, 26, 16, 5, 8, 'A');
  rect(g, 26, 16, 5, 1, 'L');
  rect(g, 30, 16, 1, 8, 'D');

  // 前立て（赤）
  rect(g, 15, 1, 5, 3, 'r');
  rect(g, 15, 1, 5, 1, 'R');

  // かぶと（顔の まわりの わく）
  rect(g, 12, 4, 14, 13, 'H');
  rect(g, 12, 4, 14, 1, 'L');
  rect(g, 24, 4, 2, 13, 'h');
  rect(g, 12, 16, 14, 1, 'h');
  // 顔（目だけ）
  rect(g, 14, 8, 10, 7, 's');
  rect(g, 14, 14, 10, 1, 'e');
  rect(g, 15, 10, 2, 2, 'k');
  rect(g, 21, 10, 2, 2, 'k');

  // からだ（よろい）＋ 金の ベルト
  rect(g, 12, 17, 14, 11, 'A');
  rect(g, 12, 17, 14, 1, 'L');
  rect(g, 24, 17, 2, 11, 'D');
  rect(g, 12, 25, 14, 3, 'g');
  rect(g, 12, 27, 14, 1, 'G');

  // 左うで
  rect(g, 8, 17, 4, 8, 'A');
  rect(g, 8, 17, 4, 1, 'L');

  // ズボン（紺）＋ 金の くつ
  rect(g, 12, 28, 14, 6, 'p');
  rect(g, 24, 28, 2, 6, 'q');
  rect(g, 18, 31, 2, 3, 'q');               // 足の あいだ
  rect(g, 12, 34, 6, 2, 'g'); rect(g, 12, 35, 6, 1, 'G');
  rect(g, 20, 34, 6, 2, 'g'); rect(g, 20, 35, 6, 1, 'G');

  // 小さい たて（金ぶち＋青・こしの あたり）
  [
    'yyyyyyyyy',
    'yBBBBBBBy',
    'yBBBgBBBy',
    'yBBgggBBy',
    'yBgggggBy',
    'yBBgggBBy',
    'yBBBgBBBy',
    'yBBBBBBBy',
    'yyyyyyyyy'
  ].forEach(function (row, j) {
    for (let i = 0; i < row.length; i++) px(g, 1 + i, 19 + j, row[i]);
  });

  return toRows(g);
}

/* ==================== 赤い ドラゴン 44×24 ====================
   はねを 上に 大きく ひろげた V字（モックの ワイバーンと 同じ 形）。 */
function dragon() {
  const W = 44, H = 24;
  const g = grid(W, H);

  /* ---- 左の はね（x 1〜19）：おうぎ形 ----
     上の へり：はね先（左上）から かた（右下）へ ななめに おりる
     下の へり：3か所 ぎざぎざ（こうもりの 指）。ほねは 描かない（うるさく なる） */
  for (let x = 1; x <= 19; x++) {
    const top = Math.floor((x - 1) * 9 / 18);            // 0 → 9
    let bot = x <= 4 ? 3 + (x - 1) * 3 : 13;             // 3,6,9,12 → 13
    if (x === 8 || x === 13 || x === 18) bot = 11;       // ぎざぎざ
    if (bot < top) bot = top;
    rect(g, x, top, 1, bot - top + 1, 'P');
    px(g, x, top, 'p');                                   // 上の へり
    if (bot > top) px(g, x, bot, 'p');                    // 下の へり
    if (x <= 2) rect(g, x, top, 1, bot - top + 1, 'p');   // はね先は こく
  }
  // はね先の とげ（金）と、へりの かぎづめ
  px(g, 1, 0, 'G'); px(g, 2, 0, 'G');
  rect(g, 8, 2, 1, 2, 'G');
  rect(g, 14, 5, 1, 2, 'G');
  // まくの 金の はん点
  [[6, 7], [11, 9], [16, 11]].forEach(function (d) { rect(g, d[0], d[1], 1, 1, 'G'); });

  mirror(g, 14, W);

  // ---- どうたい（x 14〜31・y 12〜19）----
  rect(g, 14, 12, 18, 8, 'K');
  rect(g, 14, 12, 18, 1, 'N');
  rect(g, 30, 12, 2, 8, 'D');
  rect(g, 14, 19, 18, 1, 'D');
  [17, 22, 27].forEach(function (x) { rect(g, x, 15, 2, 2, 'G'); });   // 金の はん点
  rect(g, 20, 9, 1, 3, 'G'); rect(g, 23, 9, 1, 3, 'G');                // せなかの とげ

  // ---- くび と あたま（左下に つき出す）----
  rect(g, 11, 15, 4, 3, 'K');                 // くび
  rect(g, 4, 14, 8, 7, 'K');                  // あたま
  rect(g, 4, 14, 8, 1, 'N');
  rect(g, 2, 16, 2, 4, 'K');                  // はな先
  rect(g, 6, 15, 2, 2, 'Y');                  // 光る 目
  rect(g, 2, 19, 7, 1, 'D');                  // 口
  px(g, 3, 20, 'G');                          // きば
  rect(g, 5, 11, 1, 3, 'G');                  // つの
  rect(g, 8, 12, 1, 2, 'G');

  // ---- しっぽ（右下へ・先は やじり）----
  rect(g, 32, 16, 6, 2, 'K');
  rect(g, 37, 17, 2, 4, 'K');
  rect(g, 37, 21, 5, 2, 'P');
  px(g, 39, 20, 'P'); px(g, 39, 23, 'P'); px(g, 42, 22, 'P');

  // ---- あし（金の かぎづめ）----
  rect(g, 18, 20, 3, 3, 'K'); rect(g, 17, 23, 4, 1, 'G');
  rect(g, 26, 20, 3, 3, 'K'); rect(g, 25, 23, 4, 1, 'G');

  return toRows(g);
}

/* ==================== なかま 3体（16マス） ==================== */
function slime() {                            // 16×14
  const g = grid(16, 14);
  rect(g, 4, 0, 8, 1, 'g');
  rect(g, 2, 1, 12, 1, 'g');
  rect(g, 1, 2, 14, 1, 'g');
  rect(g, 0, 3, 16, 9, 'g');
  rect(g, 1, 12, 14, 1, 'g');
  rect(g, 2, 13, 12, 1, 'g');
  rect(g, 14, 3, 2, 9, 'd'); rect(g, 13, 12, 2, 1, 'd'); rect(g, 12, 13, 2, 1, 'd');
  rect(g, 2, 2, 3, 1, 'l'); rect(g, 1, 3, 2, 2, 'l');
  rect(g, 4, 5, 2, 4, 'k'); rect(g, 10, 5, 2, 4, 'k');   // 目
  rect(g, 6, 10, 4, 1, 'k');                            // 口
  return toRows(g);
}
function lizard() {                           // 16×15
  const g = grid(16, 15);
  rect(g, 3, 0, 10, 7, 'o');                 // あたま
  rect(g, 3, 0, 10, 1, 'l');
  rect(g, 11, 0, 2, 7, 'd');
  rect(g, 5, 2, 2, 2, 'k'); rect(g, 9, 2, 2, 2, 'k');   // 目
  rect(g, 5, 5, 6, 1, 'd');                             // 口
  rect(g, 4, 7, 8, 6, 'o');                  // どう
  rect(g, 11, 7, 1, 6, 'd');
  rect(g, 6, 8, 4, 4, 'c');                  // おなか
  rect(g, 1, 7, 3, 3, 'o'); rect(g, 12, 7, 3, 3, 'o');  // うで
  rect(g, 14, 7, 1, 3, 'd');
  rect(g, 4, 13, 3, 2, 'o'); rect(g, 9, 13, 3, 2, 'o'); // あし
  rect(g, 4, 14, 3, 1, 'd'); rect(g, 9, 14, 3, 1, 'd');
  return toRows(g);
}
function golem() {                            // 16×16
  const g = grid(16, 16);
  rect(g, 4, 0, 8, 7, 'b');                  // あたま
  rect(g, 4, 0, 8, 1, 'l');
  rect(g, 10, 0, 2, 7, 'd');
  rect(g, 5, 2, 2, 2, 'y'); rect(g, 9, 2, 2, 2, 'y');   // 光る 目
  rect(g, 4, 7, 8, 7, 'b');                  // どう
  rect(g, 4, 7, 8, 1, 'l');
  rect(g, 10, 7, 2, 7, 'd');
  rect(g, 0, 7, 4, 6, 'b'); rect(g, 3, 7, 1, 6, 'd');   // うで
  rect(g, 12, 7, 4, 6, 'b'); rect(g, 15, 7, 1, 6, 'd');
  rect(g, 4, 14, 3, 2, 'b'); rect(g, 9, 14, 3, 2, 'b'); // あし
  rect(g, 4, 15, 3, 1, 'd'); rect(g, 9, 15, 3, 1, 'd');
  return toRows(g);
}

/* ========================= 書きこむ ========================= */
const K = knight();
let hero = fs.readFileSync(ROOT + '/js/content/hero.js', 'utf8');
let a = hero.indexOf('  const posterRows = [');
let b = hero.indexOf('  ];', a) + 4;
if (a < 0) throw new Error('posterRows anchor NG');
hero = hero.slice(0, a) + '  const posterRows = [\n' + lit(K, '    ') + '\n  ];' + hero.slice(b);
// 黒い ふち取りは やめる（モックに ふちは ない）
hero = hero.replace("      { bevel: true, outline: '#1b1030' });", "      { bevel: true });");
fs.writeFileSync(ROOT + '/js/content/hero.js', hero);

const art = { dragon: dragon(), slime: slime(), lizard: lizard(), golem: golem() };
let st = fs.readFileSync(ROOT + '/js/ui/start.js', 'utf8');
Object.keys(art).forEach(function (k) {
  const name = '  const ' + k.toUpperCase() + '_ROWS = [';
  const i = st.indexOf(name);
  if (i < 0) throw new Error('start.js anchor NG: ' + k);
  const j = st.indexOf('  ];', i) + 4;
  st = st.slice(0, i) + name + '\n' + lit(art[k], '    ') + '\n  ];' + st.slice(j);
});
st = st.replace("      src: MQ.pixel.url(key, [{ rows: rows, palette: pal }], { bevel: true, outline: '#1b1030' })",
                "      src: MQ.pixel.url(key, [{ rows: rows, palette: pal }], { bevel: true })   // ふち取りなし（モックに 合わせる）");
// ドラゴンの 色（D = いちばん こい 赤 を 足す）
st = st.replace("  const DRAGON_PAL = {\n" +
                "    P: '#e8402e', p: '#a3210f',        // はね（赤）\n" +
                "    K: '#7d1a0e', N: '#a82d19',        // からだ（こい赤）\n" +
                "    G: '#ffd447', Y: '#ffe95e'         // 金の つの・ふち／光る 目\n" +
                "  };",
                "  const DRAGON_PAL = {\n" +
                "    P: '#ee4a34', p: '#9c1e0c',        // はね（赤）／へり・ほね（こい赤）\n" +
                "    K: '#7a1608', N: '#b0301a', D: '#4c0b03',   // からだ（こい赤／あかるい／かげ）\n" +
                "    G: '#ffd447', Y: '#ffe95e'         // 金の つの・かぎづめ・はん点／光る 目\n" +
                "  };");
fs.writeFileSync(ROOT + '/js/ui/start.js', st);

console.log('勇者 ' + K[0].length + '×' + K.length);
Object.keys(art).forEach(function (k) { console.log(k, art[k][0].length + '×' + art[k].length); });
console.log('outline removed:', !hero.includes("outline: '#1b1030'") && !st.includes("outline: '#1b1030'"));
console.log('\n--- ドラゴン ---'); art.dragon.forEach(function (r) { console.log(r); });
