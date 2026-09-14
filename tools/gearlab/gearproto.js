/* ---------------------------------------------------------
   そうびの 見た目の 試作（2026-09-14・claude-f7）
   ユーザー「装備品を もっと 見た目を カッコ良く」→ 案 B（見せ方）→ A（グレードごとの 形）→ C（オーラ）。
   ゲームには まだ 入れて いない。tools/gearlab/index.html が 使う 見くらべ用。

   48マスの きまり（js/core/vox.js の fromHero が 3D に する ときの 切り方）：
     頭 x12〜35 y2〜21／体 x9〜38 y22〜35（左うで 9〜14・右うで 33〜38）／足 16〜31
     頭の 行（y<22）で x≤10 は 左うで・x≥36 は 右うで（けん）。→ かぶとは x11〜35 の 中だけ。
     右がわ x36〜40 は けん。→ 大きな かた当ては 左かた（たての がわ）だけ。
   色の 文字（どの 部位も 同じ）：
     A/a 板（こい／明るい）・N/n かげの 板・T/t 金の ふち・G/g 光る 宝石・W 白い 光
     K/k にぎり・F/f たての 面・C/c マント・X/x マントの すそ・R/r かぶとの かざり
   --------------------------------------------------------- */
(function () {
  const N48 = 48;
  function grid() { const g = []; for (let y = 0; y < N48; y++) g.push(new Array(N48).fill('.')); return g; }
  function R(g, x0, y0, x1, y1, c) {
    for (let y = Math.max(0, y0); y <= Math.min(47, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(47, x1); x++) g[y][x] = c;
  }
  function P(g, x, y, c) { if (x >= 0 && x < N48 && y >= 0 && y < N48) g[y][x] = c; }
  // 左と、まん中（23.5）で うつした 右の 両方に かく
  function Rm(g, x0, y0, x1, y1, c) { R(g, x0, y0, x1, y1, c); R(g, 47 - x1, y0, 47 - x0, y1, c); }
  function Pm(g, x, y, c) { P(g, x, y, c); P(g, 47 - x, y, c); }
  // すでに 何か ある ところだけ
  function paint(g, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] && g[y][x] !== '.') g[y][x] = c;
  }
  function rows(g) { return g.map(function (r) { return r.join(''); }); }

  /* =================== かぶと =================== */
  const helm = {};
  // てつ：きしの かぶと（ドーム＋金の ひたい当て＋ほほ当て＋赤い かざり）
  helm.base = function (g) {
    R(g, 15, 1, 32, 1, 'A'); R(g, 13, 2, 34, 2, 'A'); R(g, 12, 3, 35, 8, 'A');
    R(g, 15, 1, 21, 1, 'a'); R(g, 13, 2, 19, 3, 'a'); R(g, 12, 3, 12, 7, 'a');
    R(g, 34, 3, 35, 8, 'n');
    R(g, 23, 2, 24, 8, 'a');                                   // まん中の すじ
    R(g, 12, 9, 35, 9, 'T'); R(g, 12, 10, 35, 10, 't');        // ひたい当て
    [14, 19, 28, 33].forEach(function (x) { P(g, x, 9, 'W'); });
    Rm(g, 12, 11, 15, 18, 'A'); Rm(g, 12, 19, 14, 19, 'A'); Rm(g, 12, 20, 13, 20, 'N');
    R(g, 12, 11, 12, 19, 'a'); R(g, 15, 11, 15, 18, 'N'); R(g, 32, 11, 32, 18, 'N');
    R(g, 21, 0, 26, 0, 'R'); R(g, 20, 1, 27, 2, 'R'); R(g, 20, 0, 21, 2, 'r');   // かざり
  };
  // りゅう：うろこの ドーム・金の つの・りゅうの 目・ギザギザの ほほ当て
  helm.ryu = function (g) {
    R(g, 14, 1, 33, 1, 'A'); R(g, 13, 2, 34, 2, 'A'); R(g, 12, 3, 35, 8, 'A');
    for (let y = 3; y <= 7; y += 2) for (let x = 13 + (((y - 3) / 2) % 2) * 2; x <= 33; x += 4) R(g, x, y, x + 1, y, 'n');
    R(g, 13, 2, 19, 2, 'a'); R(g, 12, 3, 12, 8, 'a'); R(g, 35, 3, 35, 8, 'N');
    // つの（金）…上に 2マス 出る
    R(g, 12, 0, 13, 0, 'T'); R(g, 12, 1, 14, 1, 'T'); R(g, 12, 2, 16, 3, 'T'); R(g, 15, 2, 16, 3, 't');
    R(g, 34, 0, 35, 0, 'T'); R(g, 33, 1, 35, 1, 'T'); R(g, 31, 2, 35, 3, 'T'); R(g, 31, 2, 32, 3, 't');
    R(g, 12, 9, 35, 9, 'T'); R(g, 12, 10, 35, 10, 't');
    R(g, 20, 5, 27, 9, 'T'); R(g, 21, 6, 26, 8, 'G'); R(g, 22, 6, 23, 7, 'g');   // りゅうの 目
    Rm(g, 12, 11, 15, 17, 'A'); Rm(g, 12, 18, 14, 18, 'A'); Rm(g, 12, 19, 13, 19, 'A'); Rm(g, 12, 20, 12, 21, 'N');
    Rm(g, 13, 13, 14, 13, 'n'); Rm(g, 13, 16, 14, 16, 'n');
    R(g, 15, 11, 15, 17, 'N'); R(g, 32, 11, 32, 17, 'N');
  };
  // やみ：黒い ドーム・まん中の とげ・つの・光る スリットの ひさし
  helm.yami = function (g) {
    R(g, 14, 1, 33, 1, 'A'); R(g, 13, 2, 34, 2, 'A'); R(g, 12, 3, 35, 10, 'A');
    R(g, 13, 2, 18, 2, 'a'); R(g, 12, 3, 12, 7, 'a'); R(g, 34, 3, 35, 10, 'n');
    P(g, 23, 0, 'N'); P(g, 24, 0, 'N'); R(g, 22, 1, 25, 1, 'N'); R(g, 21, 2, 26, 2, 'N');   // とげ
    R(g, 23, 3, 24, 5, 'G'); P(g, 23, 3, 'g');
    P(g, 12, 0, 'g'); R(g, 12, 1, 13, 1, 'N'); R(g, 12, 2, 15, 3, 'N');                   // つの
    P(g, 35, 0, 'g'); R(g, 34, 1, 35, 1, 'N'); R(g, 32, 2, 35, 3, 'N');
    R(g, 12, 8, 35, 10, 'N'); R(g, 14, 9, 33, 9, 'G');                                   // 光る スリット
    Rm(g, 12, 11, 15, 20, 'A'); Rm(g, 12, 21, 13, 21, 'N');
    R(g, 12, 11, 12, 20, 'a'); R(g, 15, 11, 15, 20, 'N'); R(g, 32, 11, 32, 20, 'N');
    Rm(g, 13, 14, 14, 14, 'T'); Rm(g, 13, 18, 14, 18, 'T');
  };
  // オーロラ：かんむりの かぶと（金の とがり 5本・宝石・白い はねの ほほ当て）
  helm.aurora = function (g) {
    R(g, 14, 2, 33, 2, 'A'); R(g, 13, 3, 34, 3, 'A'); R(g, 12, 4, 35, 8, 'A');
    R(g, 14, 2, 20, 3, 'a'); R(g, 12, 4, 12, 8, 'a'); R(g, 35, 4, 35, 8, 'n');
    [[13, 2], [18, 1], [23, 0], [28, 1], [33, 2]].forEach(function (p) {
      R(g, p[0], p[1], p[0] + 1, 6, 'T'); R(g, p[0] + 1, p[1] + 1, p[0] + 1, 6, 't'); P(g, p[0], p[1], 'g');
    });
    R(g, 12, 6, 35, 8, 'T'); R(g, 12, 8, 35, 8, 't');
    [16, 23, 30].forEach(function (x) { R(g, x, 7, x + 1, 7, 'G'); });
    R(g, 12, 9, 35, 9, 'W'); R(g, 12, 10, 35, 10, 'n');
    Rm(g, 12, 11, 15, 17, 'a'); Rm(g, 12, 18, 14, 19, 'a'); Rm(g, 12, 20, 13, 20, 'A');
    Rm(g, 12, 11, 12, 16, 'W'); Rm(g, 13, 13, 15, 13, 'A'); Rm(g, 13, 16, 14, 16, 'A');
  };

  /* =================== よろい（むね・かた当て・こて・こしの 板・ひざ・くつ） =================== */
  const armor = {};
  function chest(g) {
    R(g, 16, 22, 31, 33, 'A');
    R(g, 17, 24, 19, 31, 'a'); R(g, 30, 23, 31, 33, 'n');
    R(g, 16, 28, 31, 28, 'N');
    R(g, 18, 22, 29, 23, 'T'); R(g, 18, 23, 29, 23, 't');
  }
  function lower(g, jag) {
    Rm(g, 9, 31, 14, 34, 'A'); Rm(g, 9, 34, 14, 34, 'N'); R(g, 9, 31, 9, 33, 'a');      // こて
    R(g, 15, 33, 32, 34, 'K'); R(g, 22, 33, 25, 34, 'T');                                  // ベルト
    Rm(g, 16, 35, 22, 37, 'A'); Rm(g, 16, 37, 22, 37, 'N');                                // こしの 板
    if (jag) { Rm(g, 17, 38, 18, 38, 'A'); Rm(g, 20, 38, 21, 38, 'A'); }
    Rm(g, 16, 38, 22, 43, 'n'); Rm(g, 16, 38, 22, 38, 'N');                                // すね当て
    Rm(g, 17, 40, 21, 41, 'A'); Rm(g, 17, 40, 21, 40, 'a');                                // ひざ
    Rm(g, 15, 44, 23, 46, 'N'); Rm(g, 15, 44, 23, 44, 'K');                                // くつ
  }
  // 右かた（けんの がわ）は ひかえめ
  function rightPad(g) { R(g, 32, 22, 40, 26, 'A'); R(g, 32, 21, 39, 21, 'a'); R(g, 32, 26, 40, 26, 'N'); R(g, 40, 22, 40, 25, 'n'); }
  armor.base = function (g) {
    chest(g); lower(g, false); rightPad(g);
    R(g, 7, 21, 15, 21, 'a'); R(g, 6, 22, 16, 26, 'A'); R(g, 6, 24, 16, 24, 'N'); R(g, 6, 26, 16, 26, 'N');
    R(g, 6, 22, 6, 25, 'a'); P(g, 9, 23, 'W');
  };
  armor.ryu = function (g) {
    chest(g);
    for (let y = 24; y <= 31; y += 2) for (let x = 17 + ((y / 2) % 2) * 2; x <= 30; x += 4) R(g, x, y, x + 1, y, 'n');
    R(g, 21, 24, 26, 29, 'T'); R(g, 22, 25, 25, 28, 'G'); R(g, 22, 25, 23, 26, 'g');       // むねの りゅうの 目
    lower(g, true); rightPad(g); R(g, 36, 19, 37, 21, 'T');
    // 左かた：大きく ＋ 金の かぎづめ 3本
    R(g, 6, 21, 16, 21, 'a'); R(g, 4, 22, 16, 27, 'A'); R(g, 4, 25, 16, 25, 'N'); R(g, 4, 27, 16, 27, 'N'); R(g, 4, 22, 4, 26, 'a');
    R(g, 4, 17, 5, 21, 'T'); P(g, 4, 16, 't');
    R(g, 7, 16, 8, 21, 'T'); P(g, 7, 15, 't');
    R(g, 10, 18, 10, 21, 'T');
    Rm(g, 18, 39, 20, 39, 'T');
  };
  armor.yami = function (g) {
    chest(g); R(g, 18, 22, 29, 23, 'N');
    for (let i = 0; i <= 6; i++) { P(g, 17 + i, 23 + i, 'G'); P(g, 30 - i, 23 + i, 'G'); }   // 光る V
    R(g, 22, 30, 25, 32, 'G'); R(g, 23, 31, 24, 31, 'g');
    lower(g, true); rightPad(g); R(g, 32, 26, 40, 26, 'T');
    // 左かた：とげ 3本（先が 光る）
    R(g, 5, 21, 16, 27, 'A'); R(g, 5, 27, 16, 27, 'T'); R(g, 5, 22, 5, 26, 'a');
    R(g, 5, 16, 6, 20, 'N'); P(g, 5, 15, 'G');
    R(g, 7, 13, 8, 20, 'N'); P(g, 7, 12, 'G'); P(g, 8, 12, 'G');
    R(g, 9, 17, 10, 20, 'N'); P(g, 10, 16, 'G');
    Rm(g, 16, 38, 16, 39, 'N'); Rm(g, 19, 38, 19, 39, 'N'); Rm(g, 22, 38, 22, 39, 'N');
  };
  armor.aurora = function (g) {
    chest(g);
    R(g, 16, 22, 16, 33, 'T'); R(g, 31, 22, 31, 33, 'T');
    R(g, 21, 24, 26, 30, 't'); R(g, 22, 25, 25, 29, 'G'); R(g, 22, 25, 23, 26, 'g');
    lower(g, false); rightPad(g); R(g, 32, 26, 40, 26, 'T');
    // 左かた：はねの ように 3だん 外へ
    R(g, 7, 18, 11, 20, 'W'); R(g, 5, 19, 7, 20, 'a');
    R(g, 5, 21, 16, 23, 'A'); R(g, 5, 23, 16, 23, 'T'); R(g, 5, 21, 5, 22, 'a');
    R(g, 3, 24, 15, 26, 'a'); R(g, 3, 26, 15, 26, 'T');
    R(g, 2, 27, 8, 28, 'W');
  };

  /* =================== たて（左うでに 持つ・体の よこ） =================== */
  const shield = {};
  // てつ：ひし形の たて（金の ふち・青い 面・白い 十字）
  function heater(g, top, bot) {
    for (let y = top; y <= bot; y++) {
      const d = y - (bot - 7);
      const inset = d > 0 ? Math.ceil(d * 0.8) : 0;
      const x0 = 2 + inset, x1 = 14 - inset;
      if (x0 > x1) break;
      R(g, x0, y, x1, y, 'F'); P(g, x0, y, 'T'); P(g, x1, y, 'T');
    }
    R(g, 2, top, 14, top, 'T'); R(g, 3, top + 1, 4, bot - 6, 'f');
  }
  shield.base = function (g) {
    heater(g, 27, 43);
    R(g, 7, 30, 9, 39, 'W'); R(g, 4, 33, 12, 35, 'W'); R(g, 8, 34, 8, 34, 'G');
  };
  shield.ryu = function (g) {
    // まるい たて＋ふちの とげ＋りゅうの 顔
    const rows_ = [[27, 5, 11], [28, 4, 12], [29, 3, 13], [30, 2, 14]];
    rows_.forEach(function (r) { R(g, r[1], r[0], r[2], r[0], 'F'); });
    R(g, 2, 31, 14, 39, 'F');
    [[40, 2, 14], [41, 3, 13], [42, 4, 12], [43, 5, 11]].forEach(function (r) { R(g, r[1], r[0], r[2], r[0], 'F'); });
    // ふち
    [[27, 5, 11], [43, 5, 11]].forEach(function (r) { R(g, r[1], r[0], r[2], r[0], 'T'); });
    R(g, 2, 30, 2, 40, 'T'); R(g, 14, 30, 14, 40, 'T');
    Pm(g, 3, 29, 'T'); Pm(g, 4, 28, 'T'); Pm(g, 3, 41, 'T'); Pm(g, 4, 42, 'T');
    R(g, 3, 31, 4, 37, 'f');
    // とげ
    P(g, 1, 33, 'T'); P(g, 1, 34, 'T'); P(g, 8, 26, 'T'); P(g, 8, 44, 'T'); P(g, 0, 33, 't');
    // りゅうの 顔（つの・目・はな）
    R(g, 5, 31, 11, 38, 'A'); R(g, 4, 30, 5, 31, 'T'); R(g, 11, 30, 12, 31, 'T');
    R(g, 6, 33, 6, 33, 'G'); R(g, 10, 33, 10, 33, 'G'); R(g, 7, 36, 9, 38, 'N'); P(g, 7, 37, 'W'); P(g, 9, 37, 'W');
  };
  shield.yami = function (g) {
    // たかい カイト形・上に とげ 2本・まん中に 光る 目
    for (let y = 26; y <= 44; y++) {
      const d = y - 37; const inset = d > 0 ? Math.ceil(d * 0.75) : 0;
      const x0 = 2 + inset, x1 = 14 - inset; if (x0 > x1) break;
      R(g, x0, y, x1, y, 'F'); P(g, x0, y, 'T'); P(g, x1, y, 'T');
    }
    R(g, 2, 26, 14, 26, 'T'); R(g, 2, 23, 3, 25, 'N'); R(g, 13, 23, 14, 25, 'N'); P(g, 2, 22, 'G'); P(g, 14, 22, 'G');
    R(g, 3, 27, 4, 36, 'f');
    R(g, 5, 31, 11, 34, 'N'); R(g, 6, 32, 10, 33, 'G'); R(g, 8, 32, 8, 33, 'K'); P(g, 7, 32, 'g');
    R(g, 8, 36, 8, 41, 'G');
  };
  shield.aurora = function (g) {
    // 6かくの クリスタルの たて・まん中に 大きな 宝石・金の 光の すじ
    [[26, 6, 10], [27, 5, 11], [28, 4, 12], [29, 3, 13]].forEach(function (r) { R(g, r[1], r[0], r[2], r[0], 'F'); });
    R(g, 2, 30, 14, 39, 'F');
    [[40, 3, 13], [41, 4, 12], [42, 5, 11], [43, 6, 10]].forEach(function (r) { R(g, r[1], r[0], r[2], r[0], 'F'); });
    R(g, 6, 26, 10, 26, 'T'); R(g, 6, 43, 10, 43, 'T'); R(g, 2, 30, 2, 39, 'T'); R(g, 14, 30, 14, 39, 'T');
    Pm(g, 3, 29, 'T'); Pm(g, 4, 28, 'T'); Pm(g, 5, 27, 'T'); Pm(g, 3, 40, 'T'); Pm(g, 4, 41, 'T'); Pm(g, 5, 42, 'T');
    R(g, 3, 30, 5, 34, 'f'); R(g, 4, 29, 5, 29, 'f');
    R(g, 8, 27, 8, 42, 'T'); R(g, 3, 35, 13, 35, 'T');
    R(g, 6, 32, 10, 38, 'G'); R(g, 7, 31, 9, 39, 'G'); R(g, 7, 33, 8, 34, 'g');
  };

  /* =================== けん（右手・x36〜40。刃は はば 5 いか） =================== */
  const weapon = {};
  function grip(g) {
    R(g, 37, 33, 39, 37, 'K'); P(g, 38, 34, 'k'); P(g, 38, 36, 'k');
    R(g, 36, 38, 40, 39, 'T'); P(g, 38, 38, 'G');
  }
  weapon.base = function (g) {
    P(g, 38, 2, 'W'); R(g, 37, 3, 39, 3, 'a'); R(g, 36, 4, 40, 30, 'A');
    R(g, 36, 4, 36, 30, 'W'); R(g, 38, 4, 38, 29, 'a'); R(g, 40, 4, 40, 30, 'N');
    R(g, 33, 30, 43, 32, 'T'); R(g, 33, 32, 43, 32, 't'); P(g, 33, 29, 'T'); P(g, 43, 29, 'T');
    R(g, 37, 31, 39, 31, 'G');
    grip(g);
  };
  weapon.ryu = function (g) {
    P(g, 38, 1, 'g'); R(g, 37, 2, 39, 3, 'a'); R(g, 36, 4, 40, 29, 'A');
    for (let y = 5; y <= 28; y += 3) P(g, 40, y, '.');                       // ほのおの ギザギザ
    for (let y = 6; y <= 27; y += 4) P(g, 36, y, '.');
    R(g, 37, 4, 37, 28, 'a'); R(g, 38, 4, 38, 28, 'G'); P(g, 38, 10, 'g'); P(g, 38, 18, 'g');
    // つばは りゅうの はね
    R(g, 32, 29, 44, 31, 'T'); R(g, 32, 31, 44, 31, 't');
    R(g, 31, 28, 33, 29, 'T'); R(g, 43, 28, 45, 29, 'T'); P(g, 31, 27, 'T'); P(g, 45, 27, 'T');
    R(g, 37, 30, 39, 30, 'G');
    grip(g);
  };
  weapon.yami = function (g) {
    R(g, 38, 0, 38, 0, 'N'); R(g, 37, 1, 39, 1, 'A'); R(g, 36, 2, 40, 29, 'A');
    for (let y = 4; y <= 28; y += 3) P(g, 36, y, 'N');                       // ぎざぎざの ふち
    R(g, 40, 2, 40, 29, 'N');
    [[5, 7], [10, 12], [15, 17], [20, 22], [25, 27]].forEach(function (r) { R(g, 38, r[0], 38, r[1], 'G'); });   // 光る もじ
    R(g, 32, 30, 44, 31, 'K'); R(g, 32, 30, 44, 30, 'T');
    R(g, 32, 32, 33, 33, 'K'); R(g, 43, 32, 44, 33, 'K'); P(g, 32, 34, 'G'); P(g, 44, 34, 'G');
    R(g, 37, 30, 39, 31, 'G');
    grip(g); R(g, 38, 40, 38, 41, 'N');
  };
  weapon.aurora = function (g) {
    P(g, 38, 1, 'g'); R(g, 37, 2, 39, 3, 'a'); R(g, 36, 4, 40, 29, 'A');
    R(g, 36, 4, 36, 29, 'G'); R(g, 40, 4, 40, 29, 'G');
    R(g, 37, 4, 38, 28, 'a'); R(g, 38, 8, 38, 24, 'W');
    // つばは 金の はね（大きく 広がる）
    R(g, 30, 29, 46, 30, 'T'); R(g, 30, 30, 46, 30, 't');
    R(g, 30, 28, 32, 28, 'T'); R(g, 44, 28, 46, 28, 'T'); P(g, 30, 27, 'T'); P(g, 46, 27, 'T');
    R(g, 33, 31, 35, 31, 'T'); R(g, 41, 31, 43, 31, 'T');
    R(g, 37, 29, 39, 31, 'G'); P(g, 38, 30, 'g');
    grip(g);
  };

  /* =================== マント（うしろ・すそが 広がる） =================== */
  const cape = {};
  function capeBody(g) {
    for (let y = 23; y <= 46; y++) {
      const w = Math.floor((y - 23) * 0.16);
      R(g, 8 - w, y, 39 + w, y, 'C');
    }
    for (let x = 6; x <= 42; x += 4) paint(g, x, 30, x, 45, 'c');
  }
  cape.base = function (g) { capeBody(g); for (let x = 0; x < 48; x++) paint(g, x, 45, x, 46, 'X'); };
  cape.ryu = function (g) {
    capeBody(g);
    for (let x = 0; x < 48; x++) {                                           // すそが ほのお
      const h = [2, 4, 3, 5, 2, 4][x % 6];
      for (let y = 46 - h + 1; y <= 46; y++) paint(g, x, y, y > 46 - Math.ceil(h / 2) ? 'X' : 'x');
    }
  };
  cape.yami = function (g) {
    capeBody(g);
    [[2, 44], [5, 42], [9, 45], [37, 43], [41, 41], [44, 44]].forEach(function (p) { R(g, p[0], p[1], p[0] + 1, 46, '.'); });
    for (let x = 0; x < 48; x++) paint(g, x, 40, x, 40, 'X');
  };
  cape.aurora = function (g) {
    capeBody(g);
    for (let x = 0; x < 48; x++) { paint(g, x, 44, x, 44, 'x'); paint(g, x, 45, x, 46, 'X'); }
    [[5, 33], [42, 31], [3, 40], [44, 38], [8, 37], [39, 36]].forEach(function (p) { paint(g, p[0], p[1], p[0], p[1], 'X'); });
  };

  const SHAPES = { helm: helm, armor: armor, shield: shield, weapon: weapon, cape: cape };

  /* =================== 色（グレードごと・どの 部位も 同じ 文字） =================== */
  const PAL = {
    tetsu: { A: '#aebfe3', a: '#e8f0ff', N: '#6a80b5', n: '#8ea2d0', T: '#ffd447', t: '#c7941c', G: '#ff5a5a', g: '#ffc2c2',
             W: '#ffffff', K: '#5a3a22', k: '#8a6040', F: '#3f6fd8', f: '#6f98f0', C: '#d8453e', c: '#b8342e', X: '#ffd447', x: '#c7941c', R: '#e8443a', r: '#ff8a80' },
    ryu:   { A: '#8e2a18', a: '#cf4a2a', N: '#4a1208', n: '#681b0e', T: '#ffc23a', t: '#b8761a', G: '#ffe45a', g: '#fff7b0',
             W: '#fff0d0', K: '#2a0e06', k: '#4a1a0c', F: '#5e170c', f: '#8e2a18', C: '#5e140c', c: '#48100a', X: '#ffcf3a', x: '#ff7a1a', R: '#ffc23a', r: '#fff0a0' },
    yami:  { A: '#4a3a6e', a: '#7a64b8', N: '#1c1430', n: '#2a2044', T: '#b58cff', t: '#6d48c0', G: '#ff4fd8', g: '#ffc2f2',
             W: '#e6d8ff', K: '#120c1e', k: '#2e2244', F: '#241a38', f: '#3d2f5c', C: '#1e1530', c: '#150e22', X: '#ff4fd8', x: '#9b6bff', R: '#ff4fd8', r: '#ffc2f2' },
    aurora:{ A: '#cdb8ff', a: '#ffffff', N: '#8f6fe0', n: '#b39cf5', T: '#ffd447', t: '#d19a24', G: '#72f0ff', g: '#e0fcff',
             W: '#ffffff', K: '#6a4cc0', k: '#8f6fe0', F: '#b79cff', f: '#e2d6ff', C: '#5b37b3', c: '#4a2a98', X: '#ffd447', x: '#ff9bf0', R: '#ff9bf0', r: '#ffd6fa' }
  };
  /* 部位ごとの 色の 上書き。けんの 刃は どの グレードでも いちばん 明るく（バトルで 目が いく ところ） */
  const SLOTPAL = {
    tetsu:  { weapon: { A: '#cfe4ff', a: '#ffffff', N: '#8aa8d6' } },
    ryu:    { weapon: { A: '#ff9a3c', a: '#ffd890', N: '#c4452a', W: '#fff6d8' }, helm: { A: '#a8321c', a: '#e0603a' } },
    yami:   { weapon: { A: '#7a5fc8', a: '#b9a2ff', N: '#d23cb4' } },
    aurora: { weapon: { A: '#e8deff', a: '#ffffff', N: '#b39cf5' } }
  };
  function palFor(grade, slot) { return Object.assign({}, PAL[grade], (SLOTPAL[grade] || {})[slot] || {}); }
  function matFor(grade, slot) {
    if (slot === 'cape') return { C: 'cloth', c: 'cloth', X: grade === 'ryu' || grade === 'yami' ? 'glow' : 'gold', x: grade === 'ryu' ? 'glow' : 'cloth' };
    return { A: 'metal', a: 'metal', N: 'metal', n: 'metal', T: 'gold', t: 'gold', G: 'glow', g: 'glow', W: 'white',
             K: 'wood', k: 'wood', F: 'metal', f: 'metal', R: grade === 'aurora' ? 'glow' : 'cloth', r: grade === 'aurora' ? 'glow' : 'cloth' };
  }

  // variant：'B' … てつの 形を どの グレードにも（色だけ）／'A' … グレードごとの 形
  function shapeRows(slot, grade, variant) {
    const set = SHAPES[slot];
    const fn = variant === 'A' && set[grade] ? set[grade] : set.base;
    const g = grid(); fn(g); return rows(g);
  }

  // かぶとを つけたら かみの 上の ほうは かくす（とがった かみが かぶとから 出ない ように）
  function maskTop(layer, y48) {
    const out = Object.assign({}, layer);
    out.rows = layer.rows.map(function (r, y) { return y <= y48 ? r.replace(/[^.]/g, '.') : r; });
    if (layer.rows2) out.rows2 = layer.rows2.map(function (r, y) { return y <= y48 * 2 + 1 ? r.replace(/[^.]/g, '.') : r; });
    return out;
  }

  const HD = { hd: 2, rim: 0.45, lit: 'sunset', sat: 0.2 };
  function layers(player, grade, variant) {
    const base = MQ.hero.layersFor(player, { noGear: true });
    // layersFor の ならび：体・ふく・頭・目・かみ・かざり・めがね
    base[4] = maskTop(base[4], 10);
    base[5] = maskTop(base[5], 10);
    const mk = function (slot) { return { rows: shapeRows(slot, grade, variant), palette: palFor(grade, slot), mat: matFor(grade, slot) }; };
    return [mk('cape')].concat(base, [mk('armor'), mk('helm'), mk('shield'), mk('weapon')]);
  }
  function sprite(player, grade, variant) {
    return MQ.pixel.url('gearproto:' + variant + ':' + grade + ':' + JSON.stringify(player.look || {}), layers(player, grade, variant), Object.assign({}, HD));
  }

  window.MQ = window.MQ || {};
  MQ.gearProto = { sprite: sprite, shapeRows: shapeRows, PAL: PAL, grades: ['tetsu', 'ryu', 'yami', 'aurora'] };
})();
