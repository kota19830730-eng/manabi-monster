/* タイトル画面の 勇者の ドット絵を 作る スクリプト（node tools/gen-title-art.js）
   四角の ならびから マス目を 生成して hero.js の posterRows に 書きこむ。
   絵を 直したい ときは この ファイルの rect(...) を 変えて 流し直す。
   （手で マス目を 打たない ための 道具。v1.8 で 作り、v5.0 で 描き直した）

   v5.0（2026-09-04）ユーザーが 出した マイクラ風の 写真の 勇者に 寄せた：
     ・こげ茶の かみの毛（ぎざぎざの まえがみ）。かぶとは かぶらない
     ・大きな 青い 目
     ・黒い よろい ＋ 金の かた当て・くびかざり・ベルト
     ・青い マント（うしろに ひろがる）
     ・ダイヤの 大けん（青と 白の 市松の 刃）を かかげる
     ・金ぶち＋金の ダイヤもんしょうの 青い たて
   1ドットは 約3.8px（34×36 → 130×138）。黒い ふち取りは つけない。

   なかまと ドラゴンは v5.0 から ゲームの 本物の モンスターの 絵
   （MQ.enemies.node）を つかうので、ここでは 作らない。 */
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

/* ========================= 勇者 34×36 =========================
   かみ 8 : 顔 7 : からだ 10 : あし 5 : くつ 3
   かさねる 順番：マント → けん → うで → かみと顔 → からだ → あし → たて */
function knight() {
  const g = grid(34, 36);

  /* ---- 青い マント（いちばん うしろ・下へ ひろがる）---- */
  rect(g, 9, 18, 18, 6, 'V');
  rect(g, 8, 24, 20, 6, 'V');
  rect(g, 7, 30, 22, 4, 'V');
  rect(g, 25, 18, 2, 6, 'v');            // 右がわは かげ
  rect(g, 26, 24, 2, 6, 'v');
  rect(g, 27, 30, 2, 4, 'v');
  [7, 13, 14, 20, 21, 28].forEach(function (x) { px(g, x, 33, '.'); });   // すその ぎざぎざ

  /* ---- ダイヤの 大けん（青と 白の 市松）---- */
  px(g, 28, 0, 'S');
  rect(g, 27, 1, 3, 1, 'S');
  for (let y = 2; y <= 8; y++) {
    rect(g, 27, y, 3, 1, (y % 2 === 0) ? 'S' : 'C');
    px(g, 27, y, 'S');
    px(g, 29, y, 'C');
  }
  rect(g, 25, 9, 7, 2, 'M');             // つば
  rect(g, 25, 10, 7, 1, 'm');
  rect(g, 27, 11, 3, 4, 'm');            // にぎり
  rect(g, 26, 14, 5, 1, 'M');            // つか頭

  /* ---- 右うで（けんを かかげる）---- */
  rect(g, 26, 15, 5, 8, 'A');
  rect(g, 26, 15, 5, 1, 'L');
  rect(g, 30, 15, 1, 8, 'D');

  /* ---- かみの毛 と 顔 ---- */
  rect(g, 11, 4, 14, 6, 'K');            // かみ（上）
  rect(g, 11, 4, 14, 1, 'k');
  rect(g, 13, 10, 10, 8, 's');           // 顔
  rect(g, 22, 10, 1, 8, 'e');            // 右の かげ
  rect(g, 11, 10, 2, 7, 'K');            // よこの かみ
  rect(g, 23, 10, 2, 7, 'K');
  rect(g, 13, 10, 2, 2, 'K');            // まえがみの ぎざぎざ
  rect(g, 16, 10, 2, 1, 'K');
  rect(g, 20, 10, 2, 2, 'K');
  rect(g, 14, 12, 3, 3, 'B');            // 青い 目（左上に 白い 光）
  px(g, 14, 12, 'W');
  rect(g, 19, 12, 3, 3, 'B');
  px(g, 19, 12, 'W');

  /* ---- からだ（黒い よろい）---- */
  rect(g, 11, 18, 14, 10, 'A');
  rect(g, 11, 18, 14, 1, 'L');
  rect(g, 23, 18, 2, 10, 'D');
  rect(g, 14, 18, 8, 2, 'g');            // 金の くびかざり
  rect(g, 14, 19, 8, 1, 'G');
  rect(g, 16, 21, 6, 1, 'g');            // むねの 金の しるし
  rect(g, 17, 22, 4, 1, 'g');
  rect(g, 18, 23, 2, 1, 'G');
  rect(g, 11, 26, 14, 2, 'g');           // 金の ベルト
  rect(g, 11, 27, 14, 1, 'G');
  rect(g, 8, 21, 4, 6, 'A');             // 左うで
  rect(g, 8, 21, 4, 1, 'L');
  rect(g, 7, 18, 5, 3, 'g');             // 左の かた当て（金）
  rect(g, 7, 20, 5, 1, 'G');
  rect(g, 24, 19, 7, 3, 'g');            // 右の かた当て（金）
  rect(g, 24, 21, 7, 1, 'G');

  /* ---- あし と くつ（金の ふち）---- */
  rect(g, 12, 28, 12, 5, 'p');
  rect(g, 22, 28, 2, 5, 'q');
  rect(g, 17, 30, 2, 3, 'q');
  rect(g, 12, 33, 5, 1, 'g'); rect(g, 12, 34, 5, 2, 'q');
  rect(g, 19, 33, 5, 1, 'g'); rect(g, 19, 34, 5, 2, 'q');

  /* ---- 青い たて（金ぶち＋金の ダイヤもんしょう）---- */
  [
    'yyyyyyyyy',
    'ybbbbbbby',
    'ybbbybbby',
    'ybbyyybby',
    'ybyyyyyby',
    'ybbyyybby',
    'ybbbybbby',
    'ybbbbbbby',
    'ybbbbbbby',
    'ybbbbbbby',
    'yyyyyyyyy'
  ].forEach(function (row, j) {
    for (let i = 0; i < row.length; i++) px(g, 1 + i, 20 + j, row[i]);
  });

  return toRows(g);
}

/* ========================= 書きこむ ========================= */
const K = knight();
let hero = fs.readFileSync(ROOT + '/js/content/hero.js', 'utf8');
const a = hero.indexOf('  const posterRows = [');
if (a < 0) throw new Error('posterRows anchor NG');
const b = hero.indexOf('  ];', a) + 4;
hero = hero.slice(0, a) + '  const posterRows = [\n' + lit(K, '    ') + '\n  ];' + hero.slice(b);
fs.writeFileSync(ROOT + '/js/content/hero.js', hero);

console.log('勇者 ' + K[0].length + '×' + K.length);
K.forEach(function (r) { console.log(r); });
