/* ---------------------------------------------------------
   主人公の パーツ（v1.4 / ブロック調・48×48）

   マイクラ風の「四角い ブロックの 積み重ね」で 描きます。
   角丸は なし。右がわ 2列と 下がわ 2行を 少し こい色に して
   ボクセルの 立体感を 出します（block() が 自動で やる）。

   マス目の 決まり（48×48）：
     行0〜9    かみの毛（ヘルメットの 形。ひたいを かくす）
     行6〜21   顔（列13〜34・22はば）
     行12〜14  め（左 列17〜20 ／ 右 列27〜30。「白＋こい色の 2ピクセル」）
     行15      はな
     行17〜18  くち（小さい 四角）
     行22〜35  からだ（列15〜32）と うで（列9〜14、33〜38）
     行36〜43  あし
     行44〜46  くつ

   パーツの 作りかた：
     ・かみがた ＝ ヘルメット型の きほんブロック ＋ 前がみの ノッチ ＋ サイドの パーツ
     ・め       ＝ 白と こい色の ブロック（かたちで 8しゅるい）
     ・ふく     ＝ からだの 上に のせる もよう（ほし・しま・ベルト …）
     ・アクセ   ＝ ほっぺ・ばんそうこう・おうかん など

   レア度と かいほう：
     rare: 'r'（レア・金）／ 'sr'（SR・むらさき）
     lv:   この レベルに なると 使える（ないものは さいしょから）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.face = (function () {
  const W = 48;

  /* 色を まぜる／こくする */
  function mix(hex, to, k) {
    const n = parseInt(hex.slice(1), 16);
    const m = parseInt(to.slice(1), 16);
    const out = [16, 8, 0].map(function (sh) {
      const a = (n >> sh) & 255, b = (m >> sh) & 255;
      return Math.round(a + (b - a) * k);
    });
    return '#' + out.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function darker(hex, k) { return mix(hex, '#000000', k); }
  function lighter(hex, k) { return mix(hex, '#ffffff', k); }

  /* =======================================================
     描く 道具（マス目に 文字を 置く）
     ======================================================= */
  function grid() {
    const g = [];
    for (let y = 0; y < W; y++) g.push(new Array(W).fill('.'));
    return g;
  }
  function px(g, x, y, ch) { if (x >= 0 && x < W && y >= 0 && y < W) g[y][x] = ch; }
  function rect(g, x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(g, x, y, ch);
  }
  // ボクセルの ブロック：右がわと 下がわを こい色（dark）に する
  function block(g, x0, y0, x1, y1, ch, dark) {
    rect(g, x0, y0, x1, y1, ch);
    if (!dark) return;
    const w = x1 - x0 + 1, hh = y1 - y0 + 1;
    const sw = w >= 6 ? 2 : (w >= 3 ? 1 : 0);
    const sh = hh >= 6 ? 2 : (hh >= 3 ? 1 : 0);
    if (sw) rect(g, x1 - sw + 1, y0, x1, y1, dark);
    if (sh) rect(g, x0, y1 - sh + 1, x1, y1, dark);
  }
  function rows(g) { return g.map(function (r) { return r.join(''); }); }
  // 左右対称の 位置（列13〜34 の 顔の まん中は 23.5）
  function M(x) { return 47 - x; }

  /* =======================================================
     顔と からだ（決まった かたち）
     ======================================================= */
  const HEAD = { x0: 13, x1: 34, y0: 6, y1: 21 };

  const headRows = (function () {
    const g = grid();
    block(g, HEAD.x0, HEAD.y0, HEAD.x1, HEAD.y1, 's', 'S');
    rect(g, 23, 15, 24, 15, 'n');         // はな
    rect(g, 22, 17, 25, 18, 'm');         // くち（小さい 四角）
    return rows(g);
  })();

  const bodyRows = (function () {
    const g = grid();
    block(g, 15, 22, 32, 35, 'c', 'C');   // からだ
    block(g, 9, 22, 14, 31, 'c', 'C');    // 左うで（そで）
    block(g, 33, 22, 38, 31, 'c', 'C');   // 右うで
    block(g, 9, 32, 14, 35, 's', 'S');    // 手
    block(g, 33, 32, 38, 35, 's', 'S');
    block(g, 16, 36, 23, 43, 'p', 'P');   // あし
    block(g, 24, 36, 31, 43, 'p', 'P');
    block(g, 15, 44, 23, 46, 'b', 'B');   // くつ
    block(g, 24, 44, 32, 46, 'b', 'B');
    return rows(g);
  })();

  /* =======================================================
     かみがた（ヘルメット ＋ 前がみ ＋ サイド）
       h/H … かみの色   x/X … フードの ぬの   y/Y … ぼうし   v … つば
       r … リボン      t … かみを むすぶ ゴム
     ======================================================= */
  function helmet(g, y0, y1) { block(g, 12, y0, 35, y1, 'h', 'H'); }
  function sides(g, y0, y1) { block(g, 12, y0, 14, y1, 'h', 'H'); block(g, 33, y0, 35, y1, 'h', 'H'); }
  function bangs(g, y, spans) { spans.forEach(function (s) { rect(g, s[0], y, s[1], y, 'h'); }); }

  const hairStyles = [
    { id: 'tsun', name: 'ツンツン', make: function (g) {
      rect(g, 13, 0, 15, 1, 'h'); rect(g, 22, 0, 25, 1, 'h'); rect(g, 32, 0, 34, 1, 'h');   // とんがり
      helmet(g, 2, 7);
      bangs(g, 8, [[12, 14], [17, 19], [22, 25], [28, 30], [33, 35]]);
      sides(g, 9, 10);
    } },
    { id: 'wolf', name: 'ウルフ', rare: 'r', lv: 3, make: function (g) {
      helmet(g, 2, 7);
      bangs(g, 8, [[12, 21], [26, 35]]);
      bangs(g, 9, [[12, 17], [30, 35]]);
      block(g, 12, 10, 14, 17, 'h', 'H'); block(g, 33, 10, 35, 17, 'h', 'H');   // 長い サイド
      rect(g, 12, 18, 13, 19, 'h'); rect(g, 34, 18, 35, 19, 'h');               // 先が とがる
    } },
    { id: 'mash', name: 'マッシュ', make: function (g) {
      rect(g, 14, 2, 33, 2, 'h'); rect(g, 13, 3, 34, 3, 'h');
      helmet(g, 4, 9);
      bangs(g, 10, [[12, 35]]);
      sides(g, 11, 14);
    } },
    { id: 'twin', name: 'ツインテ', make: function (g) {
      block(g, 6, 6, 10, 17, 'h', 'H'); block(g, 37, 6, 41, 17, 'h', 'H');     // ふたつの しっぽ
      rect(g, 7, 18, 9, 19, 'h'); rect(g, 38, 18, 40, 19, 'h');
      helmet(g, 2, 7);
      bangs(g, 8, [[12, 16], [19, 28], [31, 35]]);
      sides(g, 9, 10);
      rect(g, 8, 4, 9, 5, 'r'); rect(g, 38, 4, 39, 5, 'r');                   // リボン
    } },
    { id: 'dango', name: 'おだんご', make: function (g) {
      block(g, 19, 0, 28, 3, 'h', 'H');                                       // おだんご
      helmet(g, 3, 7);
      bangs(g, 8, [[12, 35]]);
      sides(g, 9, 11);
    } },
    { id: 'pony', name: 'ポニテ', rare: 'r', lv: 5, make: function (g) {
      block(g, 35, 6, 39, 17, 'h', 'H');                                      // うしろの しっぽ
      rect(g, 36, 18, 39, 20, 'h');
      rect(g, 35, 9, 39, 10, 't');                                            // むすぶ ゴム
      helmet(g, 2, 7);
      bangs(g, 8, [[12, 26], [30, 35]]);
      bangs(g, 9, [[12, 20]]);
      block(g, 12, 10, 14, 10, 'h'); block(g, 33, 9, 35, 12, 'h', 'H');
    } },
    { id: 'hood', name: 'フード', rare: 'sr', lv: 8, make: function (g) {
      rect(g, 22, 0, 25, 0, 'x');
      block(g, 11, 1, 36, 7, 'x', 'X');                                       // フードの 上
      block(g, 11, 8, 15, 21, 'x', 'X'); block(g, 32, 8, 36, 21, 'x', 'X');   // フードの よこ
      rect(g, 15, 8, 15, 21, 'X'); rect(g, 32, 8, 32, 21, 'X');               // 内がわの ふち
      rect(g, 16, 8, 31, 8, 'h');                                             // のぞく かみ
    } },
    { id: 'cap', name: 'キャップ', lv: 15, make: function (g) {
      helmet(g, 3, 7);
      sides(g, 8, 11);
      rect(g, 22, 0, 25, 0, 'y');                                             // ボタン
      rect(g, 14, 1, 33, 1, 'y');
      block(g, 12, 2, 35, 6, 'y', 'Y');                                       // ぼうし
      rect(g, 10, 7, 36, 8, 'v');                                             // つば
    } }
  ];
  hairStyles.forEach(function (s) { const g = grid(); s.make(g); s.rows = rows(g); });

  /* =======================================================
     め（白 w ＋ めの色 e）
     ======================================================= */
  function eyeNormal(g, side) {
    if (side === 'L') { rect(g, 17, 12, 18, 14, 'w'); rect(g, 19, 12, 20, 14, 'e'); }
    else { rect(g, 27, 12, 28, 14, 'e'); rect(g, 29, 12, 30, 14, 'w'); }
  }
  function eyeSmile(g, side) {
    const p = side === 'L' ? [[17, 13], [18, 12], [19, 12], [20, 13]] : [[27, 13], [28, 12], [29, 12], [30, 13]];
    p.forEach(function (q) { px(g, q[0], q[1], 'e'); });
  }
  const eyeStyles = [
    { id: 'futsu', name: 'ふつう', make: function (g) { eyeNormal(g, 'L'); eyeNormal(g, 'R'); } },
    { id: 'maru', name: 'まるめ', make: function (g) {
      rect(g, 17, 11, 20, 14, 'w'); rect(g, 27, 11, 30, 14, 'w');
      rect(g, 19, 13, 20, 14, 'e'); rect(g, 27, 13, 28, 14, 'e');
    } },
    { id: 'tare', name: 'たれめ', make: function (g) {
      rect(g, 17, 13, 18, 14, 'w'); rect(g, 19, 12, 20, 14, 'e');
      rect(g, 27, 12, 28, 14, 'e'); rect(g, 29, 13, 30, 14, 'w');
    } },
    { id: 'tsuri', name: 'つりめ', make: function (g) {
      rect(g, 17, 11, 18, 13, 'w'); rect(g, 19, 12, 20, 14, 'e');
      rect(g, 27, 12, 28, 14, 'e'); rect(g, 29, 11, 30, 13, 'w');
    } },
    { id: 'kira', name: 'きらきら', rare: 'r', lv: 4, make: function (g) {
      rect(g, 17, 12, 20, 14, 'e'); rect(g, 27, 12, 30, 14, 'e');
      px(g, 17, 12, 'w'); px(g, 20, 14, 'w'); px(g, 30, 12, 'w'); px(g, 27, 14, 'w');
    } },
    { id: 'niko', name: 'にっこり', make: function (g) { eyeSmile(g, 'L'); eyeSmile(g, 'R'); } },
    { id: 'nemui', name: 'ねむい', make: function (g) {
      rect(g, 17, 13, 20, 13, 'e'); rect(g, 17, 14, 18, 14, 'w'); rect(g, 19, 14, 20, 14, 'e');
      rect(g, 27, 13, 30, 13, 'e'); rect(g, 27, 14, 28, 14, 'e'); rect(g, 29, 14, 30, 14, 'w');
    } },
    { id: 'wink', name: 'ウインク', rare: 'sr', lv: 9, make: function (g) { eyeNormal(g, 'L'); eyeSmile(g, 'R'); } }
  ];
  eyeStyles.forEach(function (s) { const g = grid(); s.make(g); s.rows = rows(g); });

  /* =======================================================
     ふく（からだの 上に のせる もよう）
       g … 金   d … ふくより こい色   w … 白   q/Q … ズボンの色
     ======================================================= */
  const clothStyles = [
    { id: 'hoshi', name: 'ほしシャツ', make: function (g) {
      rect(g, 23, 25, 24, 31, 'g'); rect(g, 20, 28, 27, 29, 'g');            // ✦
      px(g, 21, 26, 'g'); px(g, 26, 26, 'g'); px(g, 21, 31, 'g'); px(g, 26, 31, 'g');
    } },
    { id: 'shima', name: 'しまシャツ', make: function (g) {
      rect(g, 9, 25, 38, 26, 'd'); rect(g, 9, 30, 38, 31, 'd');
    } },
    { id: 'bouken', name: 'ぼうけんふく', make: function (g) {
      px(g, 22, 22, 'd'); px(g, 25, 22, 'd'); rect(g, 23, 23, 24, 23, 'd');   // えり
      rect(g, 15, 33, 32, 34, 'd'); rect(g, 22, 33, 25, 34, 'g');            // ベルト
    } },
    { id: 'parka', name: 'パーカー', rare: 'r', lv: 5, make: function (g) {
      rect(g, 18, 22, 29, 23, 'd');                                          // フードの ねもと
      rect(g, 21, 24, 21, 27, 'w'); rect(g, 26, 24, 26, 27, 'w');            // ひも
      rect(g, 18, 30, 29, 34, 'd'); rect(g, 19, 31, 28, 33, 'D');            // ポケット
    } },
    { id: 'overall', name: 'オーバーオール', make: function (g) {
      rect(g, 18, 27, 29, 35, 'q'); rect(g, 28, 27, 29, 35, 'Q'); rect(g, 18, 34, 29, 35, 'Q');
      rect(g, 18, 22, 19, 26, 'q'); rect(g, 28, 22, 29, 26, 'q');            // かた ひも
      rect(g, 18, 27, 19, 28, 'g'); rect(g, 28, 27, 29, 28, 'g');            // ボタン
    } },
    { id: 'robe', name: 'ゆうしゃローブ', rare: 'sr', lv: 13, make: function (g) {
      rect(g, 15, 22, 17, 35, 'd'); rect(g, 30, 22, 32, 35, 'd');
      rect(g, 23, 22, 24, 35, 'g');                                          // 金の ライン
      rect(g, 9, 22, 14, 24, 'g'); rect(g, 33, 22, 38, 24, 'g');             // かたの かざり
      rect(g, 15, 34, 32, 35, 'd');
    } }
  ];
  clothStyles.forEach(function (s) { const g = grid(); s.make(g); s.rows = rows(g); });

  /* =======================================================
     めがね（f … フレーム   l … レンズ）
     ======================================================= */
  function frames(g, lens) {
    [[16, 21], [26, 31]].forEach(function (s) {
      rect(g, s[0], 11, s[1], 11, 'f'); rect(g, s[0], 15, s[1], 15, 'f');
      rect(g, s[0], 12, s[0], 14, 'f'); rect(g, s[1], 12, s[1], 14, 'f');
      if (lens) rect(g, s[0] + 1, 12, s[1] - 1, 14, 'l');
    });
    rect(g, 22, 13, 25, 13, 'f');                                            // ブリッジ
    rect(g, 13, 12, 15, 12, 'f'); rect(g, 32, 12, 34, 12, 'f');              // つる
  }
  const glassStyles = [
    { id: 'nashi', name: 'なし', palette: {}, make: function () {} },
    { id: 'kuro', name: 'くろメガネ', palette: { f: '#2b2b3a' }, make: function (g) { frames(g); } },
    { id: 'aka', name: 'あかメガネ', palette: { f: '#e3554f' }, make: function (g) { frames(g); } },
    { id: 'ao', name: 'あおメガネ', palette: { f: '#3a5fb0' }, make: function (g) { frames(g); } },
    { id: 'kin', name: 'きんメガネ', rare: 'r', lv: 6, palette: { f: '#ffd447' }, make: function (g) { frames(g); } },
    { id: 'sun', name: 'サングラス', rare: 'r', lv: 7, palette: { f: '#2b2b3a', l: '#1c1b26' }, make: function (g) { frames(g, true); } }
  ];
  glassStyles.forEach(function (s) { const g = grid(); s.make(g); s.rows = rows(g); });

  /* =======================================================
     かざり（r … ピンク   g/G … 金   w … 白   d … こい色）
     ======================================================= */
  const accStyles = [
    { id: 'nashi', name: 'なし', make: function () {} },
    { id: 'hoppe', name: 'ほっぺ', make: function (g) { rect(g, 14, 16, 15, 17, 'r'); rect(g, 32, 16, 33, 17, 'r'); } },
    { id: 'bansoko', name: 'ばんそうこう', make: function (g) { rect(g, 13, 17, 17, 17, 'w'); rect(g, 15, 15, 15, 19, 'w'); rect(g, 15, 17, 15, 17, 'd'); } },
    { id: 'hoshi', name: 'ほしマーク', make: function (g) { px(g, 32, 15, 'g'); rect(g, 31, 16, 33, 16, 'g'); px(g, 32, 17, 'g'); } },
    { id: 'heart', name: 'ハート', rare: 'r', lv: 4, make: function (g) {
      px(g, 14, 15, 'r'); px(g, 16, 15, 'r'); rect(g, 13, 16, 17, 16, 'r'); rect(g, 14, 17, 16, 17, 'r'); px(g, 15, 18, 'r');
    } },
    { id: 'crown', name: 'おうかん', rare: 'sr', lv: 15, make: function (g) {
      rect(g, 18, 0, 19, 1, 'g'); rect(g, 23, 0, 24, 1, 'g'); rect(g, 28, 0, 29, 1, 'g');
      rect(g, 18, 2, 29, 3, 'g'); rect(g, 18, 3, 29, 3, 'G'); rect(g, 23, 2, 24, 2, 'r');
    } }
  ];
  accStyles.forEach(function (s) { const g = grid(); s.make(g); s.rows = rows(g); });

  /* =======================================================
     いろ
     ======================================================= */
  const hairColors = [
    { id: 'black',   name: 'くろ',     color: '#2b2b3a' },
    { id: 'brown',   name: 'ちゃいろ', color: '#6b4a2a' },
    { id: 'gold',    name: 'きんぱつ', color: '#ffd447' },
    { id: 'blue',    name: 'あお',     color: '#3a8cf5' },
    { id: 'pink',    name: 'ピンク',   color: '#ff7ac8' },
    { id: 'mint',    name: 'ミント',   color: '#7cf9c4' },
    { id: 'purple',  name: 'むらさき', color: '#b06cf5' },
    { id: 'rainbow', name: 'レインボー', rare: 'sr', lv: 12, rainbow: true,
      color: 'linear-gradient(135deg, #ff7ac8, #ffe45e 35%, #7cf9c4 65%, #4fd3ff)',
      bands: ['#ff7ac8', '#ffb347', '#ffe45e', '#7cf9c4', '#4fd3ff', '#b28cff'] }
  ];

  const skinColors = [
    { id: 'usui',   name: 'うすい',   color: '#fbe3ca' },
    { id: 'light',  name: 'あかるい', color: '#f7dcc0' },
    { id: 'mid',    name: 'ふつう',   color: '#efc29b' },
    { id: 'komugi', name: 'こむぎ',   color: '#dda878' },
    { id: 'dark',   name: 'こい',     color: '#c68a5e' },
    { id: 'deep',   name: 'こげちゃ', color: '#9a6440' }
  ];

  const eyeColors = [
    { id: 'navy',   name: 'こん',     color: '#1f2d5c' },
    { id: 'brown',  name: 'ちゃいろ', color: '#6b4a2a' },
    { id: 'blue',   name: 'あお',     color: '#2f6fd0' },
    { id: 'green',  name: 'みどり',   color: '#2f9a56' },
    { id: 'purple', name: 'むらさき', color: '#8b4fc0' },
    { id: 'red',    name: 'あか',     rare: 'r', lv: 7, color: '#d93a3a' }
  ];

  const clothColors = [
    { id: 'navy',   name: 'こん',     color: '#2f3c78' },
    { id: 'red',    name: 'あか',     color: '#e3554f' },
    { id: 'green',  name: 'みどり',   color: '#4fa55e' },
    { id: 'yellow', name: 'きいろ',   color: '#ffd447' },
    { id: 'purple', name: 'むらさき', color: '#7e4fb0' },
    { id: 'white',  name: 'しろ',     color: '#e8e4dc' },
    { id: 'black',  name: 'くろ',     color: '#2b2b3a' },
    { id: 'pink',   name: 'ピンク',   color: '#e37fa8' }
  ];

  const pantsColors = [
    { id: 'navy',  name: 'こん',     color: '#28336a' },
    { id: 'brown', name: 'ちゃいろ', color: '#6b4a2a' },
    { id: 'black', name: 'くろ',     color: '#2b2b3a' },
    { id: 'blue',  name: 'あお',     color: '#3a5fb0' },
    { id: 'red',   name: 'あか',     color: '#c23a2f' },
    { id: 'green', name: 'みどり',   color: '#3e7a4b' }
  ];

  /* id から えらぶ（見つからなければ さいしょのもの） */
  function pick(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function has(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }

  return {
    headRows: headRows, bodyRows: bodyRows, HEAD: HEAD,
    hairStyles: hairStyles, eyeStyles: eyeStyles, clothStyles: clothStyles,
    glassStyles: glassStyles, accStyles: accStyles,
    hairColors: hairColors, skinColors: skinColors, eyeColors: eyeColors,
    clothColors: clothColors, pantsColors: pantsColors,
    pick: pick, has: has, mix: mix, darker: darker, lighter: lighter,
    SIZE: W,
    // それぞれの パーツが 使う 場所（tools/smoke.js の 検査用）
    EYE_AREA: { x0: 17, x1: 30, y0: 11, y1: 14 },
    MOUTH_AREA: { x0: 22, x1: 25, y0: 17, y1: 18 }
  };
})();
