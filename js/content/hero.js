/* ---------------------------------------------------------
   主人公と そうび、レベル、しょうごう

   主人公は 48×48マス の ブロック調（v1.4）。絵の パーツは face.js。
   見た目は かみがた／かみの いろ／はだの いろ／めの かたち／めの いろ／
   ふくの かたち／ふくの いろ／ズボンの いろ／めがね／かざり の 10しゅるい。
   一部の パーツは レベルで かいほう（レア＝金・SR＝むらさき の バッジ）。

   絵を かさねる 順番（うしろ → 手前）：
     マント → 体 → ふくの もよう → 顔 → め → かみ → かざり → めがね
     → よろい → かぶと → たて → けん
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.hero = (function () {
  const F = MQ.face;

  /* 体（首から 下）。絵は face.js が ブロックで 作る */
  const bodyRows = F.bodyRows;

  /* =======================================================
     見た目（えらべる 10しゅるい）
       kind: 'part'  … かたちを えらぶ（絵で 見せる）
             'color' … いろを えらぶ（色の 四角で 見せる）
       preview: 'face' か 'body' … ボタンに 出す 絵の 切りとり
       hint: 一覧の 右上に 出す ひとこと
     ======================================================= */
  const lookGroups = [
    { key: 'hair',       label: 'かみがた',      kind: 'part',  preview: 'face', list: F.hairStyles,  hint: 'クエストで あたらしい かみがた が でるよ' },
    { key: 'hairColor',  label: 'かみの いろ',   kind: 'color', list: F.hairColors },
    { key: 'skin',       label: 'はだの いろ',   kind: 'color', list: F.skinColors },
    { key: 'eye',        label: 'めの かたち',   kind: 'part',  preview: 'face', list: F.eyeStyles,   hint: 'レベルが 上がると ふえるよ' },
    { key: 'eyeColor',   label: 'めの いろ',     kind: 'color', list: F.eyeColors },
    { key: 'cloth',      label: 'ふくの かたち', kind: 'part',  preview: 'body', list: F.clothStyles, hint: 'レベルが 上がると ふえるよ' },
    { key: 'clothColor', label: 'ふくの いろ',   kind: 'color', list: F.clothColors },
    { key: 'pants',      label: 'ズボンの いろ', kind: 'color', list: F.pantsColors },
    { key: 'glass',      label: 'めがね',        kind: 'part',  preview: 'face', list: F.glassStyles },
    { key: 'acc',        label: 'かざり',        kind: 'part',  preview: 'face', list: F.accStyles,   hint: 'レベルが 上がると ふえるよ' }
  ];
  const groupByKey = {};
  lookGroups.forEach(function (g) { groupByKey[g.key] = g; });

  // 見た目えらび画面の タブ
  const lookTabs = [
    { id: 'kami', name: 'かみ',   keys: ['hair', 'hairColor', 'skin'] },
    { id: 'me',   name: 'め',     keys: ['eye', 'eyeColor'] },
    { id: 'fuku', name: 'ふく',   keys: ['cloth'] },
    { id: 'iro',  name: 'いろ',   keys: ['clothColor', 'pants'] },
    { id: 'acce', name: 'アクセ', keys: ['glass', 'acc'] }
  ];

  const DEFAULT_LOOK = {
    hair: 'tsun', hairColor: 'blue', skin: 'light', eye: 'futsu', eyeColor: 'navy',
    cloth: 'hoshi', clothColor: 'navy', pants: 'navy', glass: 'nashi', acc: 'nashi'
  };

  function defaultLook() {
    const out = {};
    Object.keys(DEFAULT_LOOK).forEach(function (k) { out[k] = DEFAULT_LOOK[k]; });
    return out;
  }

  /* v1.3 までの 見た目（かおの形・まゆ・はな・くち …）を 新しい 形に うつす */
  const OLD_HAIR = { short: 'mash', bouzu: 'mash', tsuntsun: 'tsun', bosabosa: 'wolf', makige: 'dango', dango: 'dango', okappa: 'mash', long: 'pony', ponytail: 'pony', twin: 'twin' };
  const OLD_HAIR_COLOR = { black: 'black', kogecha: 'brown', brown: 'brown', gold: 'gold', orange: 'gold', red: 'pink', pink: 'pink', purple: 'purple', blue: 'blue', cyan: 'mint', green: 'mint', white: 'gold' };
  const OLD_EYE = { futsu: 'futsu', pacchiri: 'maru', tsubura: 'maru', tare: 'tare', tsuri: 'tsuri', hosome: 'nemui', nemuso: 'nemui', kirakira: 'kira', niko: 'niko', bikkuri: 'maru' };
  const OLD_EYE_COLOR = { black: 'navy', brown: 'brown', blue: 'blue', green: 'green', purple: 'purple', gold: 'brown' };
  function isOldLook(l) {
    if (!l) return false;
    if ('style' in l || 'face' in l || 'brow' in l || 'nose' in l || 'mouth' in l) return true;
    return ('hair' in l) && !('hairColor' in l) && !F.has(F.hairStyles, l.hair);
  }
  function convertOldLook(l) {
    return {
      hair: OLD_HAIR[l.style] || DEFAULT_LOOK.hair,
      hairColor: OLD_HAIR_COLOR[l.hair] || DEFAULT_LOOK.hairColor,
      skin: l.skin, eye: OLD_EYE[l.eye], eyeColor: OLD_EYE_COLOR[l.eyeColor], glass: l.glass
    };
  }

  // 足りない ところは きほんに する（古い セーブも そのまま 使える）
  function lookOf(player) {
    let l = (player && player.look) || {};
    if (isOldLook(l)) l = convertOldLook(l);
    const out = {};
    lookGroups.forEach(function (g) {
      // 知らない id（古い セーブ・手で 書きかえた もの）は きほんに もどす
      out[g.key] = F.has(g.list, l[g.key]) ? l[g.key] : DEFAULT_LOOK[g.key];
    });
    return out;
  }

  /* =======================================================
     レベルで かいほう される パーツ
       item.lv が ない … さいしょから 使える
       item.lv = 15   … Lv15 に なると 使える
     ======================================================= */
  function levelFor(player) { return levelOf((player && player.xp) || 0); }
  function owns(item, level) { return !item.lv || (level == null ? 99 : level) >= item.lv; }
  function partsCount(level) {
    let have = 0, total = 0;
    lookGroups.forEach(function (g) {
      g.list.forEach(function (it) { total++; if (owns(it, level)) have++; });
    });
    return { have: have, total: total };
  }

  // でたらめに えらぶ（もっている パーツの 中から）
  function randomLook(level) {
    const out = {};
    lookGroups.forEach(function (g) {
      const pool = g.list.filter(function (it) { return owns(it, level); });
      out[g.key] = MQ.util.pick(pool.length ? pool : g.list).id;
    });
    return out;
  }

  function colorOf(list, id) {
    return F.pick(list, id).color;
  }

  // それぞれの 絵を どの 色で 描くか
  const HEADWEAR = { x: '#6b7c9c', X: '#4a5568', y: '#e3554f', Y: '#a92a13', v: '#2b2b3a', r: '#ff7ac8', t: '#3a2c20' };
  function palettes(look) {
    const skin = colorOf(F.skinColors, look.skin);
    const hc = F.pick(F.hairColors, look.hairColor);
    const eye = colorOf(F.eyeColors, look.eyeColor);
    const cloth = colorOf(F.clothColors, look.clothColor);
    const pants = colorOf(F.pantsColors, look.pants);
    const skinDark = F.darker(skin, 0.22);
    let hair;
    if (hc.rainbow) {
      // レインボーは 行ごとに 色が かわる（palette を 関数に する）
      const bands = hc.bands;
      hair = function (ch, x, y) {
        const c = bands[Math.min(bands.length - 1, Math.floor(Math.max(0, y) / 4))];
        if (ch === 'h') return c;
        if (ch === 'H') return F.darker(c, 0.25);
        return HEADWEAR[ch];
      };
    } else {
      hair = Object.assign({ h: hc.color, H: F.darker(hc.color, 0.28) }, HEADWEAR);
    }
    return {
      body:  { c: cloth, C: F.darker(cloth, 0.3), p: pants, P: F.darker(pants, 0.3), b: '#ffd447', B: '#b8801d', s: skin, S: skinDark },
      cloth: { g: '#ffd447', d: F.darker(cloth, 0.38), D: F.darker(cloth, 0.2), w: '#ffffff', q: pants, Q: F.darker(pants, 0.3) },
      head:  { s: skin, S: skinDark, n: F.darker(skin, 0.16), m: '#a5473a' },
      eye:   { w: '#ffffff', e: eye },
      hair:  hair,
      acc:   { r: '#ff9db0', g: '#ffd447', G: '#b8801d', w: '#fff6ee', d: '#c9a06b' }
    };
  }

  // v1.2 までの 名まえ（body の 色だけ ほしい ところ用）
  function bodyPalette(look) {
    return palettes(look).body;
  }

  /* =======================================================
     そうび（5部位 × 6グレード ＝ 30点）

     v5.4：
       ・グレードを 4 → 6 に ふやした（かわ／てつ／りゅう／でんせつ／ほし／やみ）
       ・**かたちも グレードごとに ちがう**（前は 色だけ ちがった）
       ・そうびに **戦いの 効果**が ついた（下の GEAR_POWER）

     かたちの 作り方：
       「てつ」の 一式（デザインモックの 騎士）を 元の かたち（BASE）に して、
       ほかの グレードは その マス目を 少し けずったり、かざり（e）を
       足したり して 作る。こうすると ぜんぶが 同じ 世界の 絵に なる。
       手で 48×48 を 打たない（face.js と 同じ やり方）。

     マス目の 文字：
       A/w/y … けんの 刃・光・つか      S/s … たての ふち・中
       H/<   … かぶとの 金ぞく・かざり   A/g … よろいの 本体・ふち
       C/c   … マントの 表・ふちどり
       e     … その グレードだけの かざり（つの・はね・宝石・とげ）
     ======================================================= */
  // かたちは 共通で、色だけ グレードごとに かえます。
  // かぶとは 行9より 下を 横だけに して、まゆ・目・口が 見えるように
  // してあります（せっかく えらんだ 顔が かくれないように）。
  const helmRows = [
    '................................................',
    '................................................',
    '......................<<<<......................',
    '......................<<<<......................',
    '..............HHHHHHHHHHHHHHHHHHHH..............',
    '.............HHHHHHHHHHHHHHHHHHHHHH.............',
    '............HHHHHHHHHHHHHHHHHHHHHHHH............',
    '............HHHHHHHHHHHHHHHHHHHHHHHH............',
    '............HHHHHHHHHHHHHHHHHHHHHHHH............',
    '............HHH..................HHH............',
    '............HHH..................HHH............',
    '............HHH..................HHH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '............HH....................HH............',
    '.............HH..................HH.............',
    '..............HH................HH..............',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................'
  ];
  const armorRows = [
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '...................AAAAAAAAAA...................',
    '.................AAAAAAAAAAAAAA.................',
    '...............AAAAAAAAAAAAAAAAAA...............',
    '.......gggggggggggggggggggggggggggggggggg.......',
    '.......AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.......',
    '.......AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.......',
    '.......ggggggAAAAAAAAAAAAAAAAAAAAAAgggggg.......',
    '........AAAAAAAAAAAAAAggggAAAAAAAAAgggggg.......',
    '........AAAAAAAAAAAAAggggggAAAAAAAAAAAAA........',
    '........AAAAAAAAAAAAAAggggAAAAAAAAAAAAAA........',
    '........gggggAAAAAAAAAAggAAAAAAAAAAAAAAA........',
    '.............AAAAAAAAAAAAAAAAAAAAAA.............',
    '.............AAAAAAAAAAAAAAAAAAAAAA.............',
    '..............AAAAAAAAAAAAAAAAAAAA..............',
    '...............AAAAAAAAAAAAAAAAAA...............',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................'
  ];
  const capeRows = [
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '.............CCCCCCCCCCCCCCCCCCCCCC.............',
    '.........CCCCCCCCCCCCCCCCCCCCCCCCCC.............',
    '.......CCCCCCCCCCCCCC...........................',
    '......CCCCCCCCCCCCCC............................',
    '.....CCCCCCCCCCCCCC.............................',
    '....CCCCCCCCCCCCCC..............................',
    '...CCCCCCCCCCCCCC...............................',
    '...CCCCCCCCCCCCC................................',
    '..CCCCCCCCCCCCC.................................',
    '..CCCCCCCCCCCC..................................',
    '.CCCCCCCCCCCC...................................',
    '.CCCCCCCCCCC....................................',
    '..CCCCCCCCCC....................................',
    '..CCCCCCCCC.....................................',
    '...CCCCCCCC.....................................',
    '...CCCCCCC......................................',
    '....CCCCCC......................................',
    '.....CCCC.......................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................'
  ];
  const swordRows = [
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '.....................................ww.........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '....................................wAAA........',
    '.................................yyyyyyyyyy.....',
    '.................................yyyyyyyyyy.....',
    '....................................yyyy........',
    '....................................yyyy........',
    '....................................yyyy........',
    '....................................yyyy........',
    '....................................yyyy........',
    '....................................yyyy........',
    '...................................yyyyyy.......',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................'
  ];
  const shieldRows = [
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '.......SSSSSSSSSS...............................',
    '.....SSSSSSSSSSSSSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSssssssssssSS.............................',
    '.....SSSSSSSSSSSSSS.............................',
    '.....SSSSSSSSSSSSSS.............................',
    '......SSSSSSSSSSSS..............................',
    '........SSSSSSSS................................',
    '..........SSSS..................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '................................................'
  ];

  const SLOTS = ['cape', 'armor', 'helm', 'shield', 'weapon'];
  const SLOT_NAME = { weapon: 'けん', shield: 'たて', helm: 'かぶと', armor: 'よろい', cape: 'マント' };
  const BASE = { weapon: swordRows, shield: shieldRows, helm: helmRows, armor: armorRows, cape: capeRows };

  /* ---- マス目を いじる 小さな 道具 ---- */
  const GW = 48;
  function gGrid(rows) { return rows.map(function (r) { return r.split(''); }); }
  function gRows(g) { return g.map(function (r) { return r.join(''); }); }
  function gPut(g, x, y, ch) { if (x >= 0 && x < GW && y >= 0 && y < GW) g[y][x] = ch; }
  function gRect(g, x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) gPut(g, x, y, ch);
  }
  // すでに 何か ある ところだけ ぬりかえる（体から はみ出さない かざり用）
  function gPaint(g, x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && x < GW && y >= 0 && y < GW && g[y][x] !== '.') g[y][x] = ch;
    }
  }
  function gClear(g, x0, y0, x1, y1) { gRect(g, x0, y0, x1, y1, '.'); }
  // それぞれの たての ならびで いちばん 下の マスを ch に する（ふちどり）
  function gHem(g, ch) {
    for (let x = 0; x < GW; x++) {
      for (let y = GW - 1; y >= 0; y--) {
        if (g[y][x] !== '.') { g[y][x] = ch; break; }
      }
    }
  }

  /* ---- グレードごとの かたち（1=かわ … 6=やみ） ----
       てつ（2）は デザインモックの 騎士 そのまま。ほかは そこから 作る。 */
  const SHAPER = {
    weapon: {
      1: function (g) {                      // かわ：みじかい 木のけん・つばも 小さい
        gClear(g, 0, 6, 47, 15);
        gClear(g, 33, 32, 34, 33); gClear(g, 41, 32, 42, 33);
      },
      3: function (g) {                      // りゅう：刃が ギザギザ・つばに 宝石
        [12, 16, 20, 24, 28].forEach(function (y) { gClear(g, 38, y, 38, y); });
        gRect(g, 36, 4, 38, 6, 'A'); gRect(g, 35, 4, 35, 6, 'w');
        gRect(g, 37, 32, 38, 33, 'e');
      },
      4: function (g) {                      // でんせつ：長くて 太い 刃・つばに はね
        gRect(g, 36, 3, 38, 6, 'A'); gRect(g, 35, 3, 35, 6, 'w');
        gRect(g, 39, 7, 39, 31, 'A');
        gRect(g, 30, 31, 32, 33, 'e'); gRect(g, 43, 31, 45, 33, 'e');
      },
      5: function (g) {                      // ほし：先が かがやき・にぎりに 星
        gRect(g, 36, 3, 38, 6, 'e'); gRect(g, 35, 4, 35, 6, 'w');
        gRect(g, 39, 8, 39, 31, 'A');
        gRect(g, 35, 40, 40, 42, 'e'); gRect(g, 37, 43, 38, 43, 'e');
      },
      6: function (g) {                      // やみ：はば広の 大けん・とげの つば
        gRect(g, 39, 7, 40, 31, 'A'); gRect(g, 34, 7, 34, 31, 'w');
        gRect(g, 36, 4, 40, 6, 'A');
        gRect(g, 30, 30, 33, 33, 'e'); gRect(g, 42, 30, 45, 33, 'e');
      }
    },
    shield: {
      1: function (g) {                      // かわ：小さくて まるい
        gClear(g, 0, 27, 47, 28); gClear(g, 5, 0, 6, 47); gClear(g, 17, 0, 18, 47);
        gRect(g, 7, 29, 16, 29, 'S');
      },
      3: function (g) {                      // りゅう：ふちに とげ
        gRect(g, 3, 30, 4, 31, 'e'); gRect(g, 3, 34, 4, 35, 'e'); gRect(g, 6, 41, 8, 42, 'e');
      },
      4: function (g) {                      // でんせつ：十字の しるし
        gRect(g, 11, 30, 12, 37, 'e'); gRect(g, 8, 32, 15, 33, 'e');
      },
      5: function (g) {                      // ほし：星の しるし
        gRect(g, 10, 29, 13, 30, 'e'); gRect(g, 8, 31, 15, 33, 'e');
        gRect(g, 9, 34, 10, 36, 'e'); gRect(g, 13, 34, 14, 36, 'e');
      },
      6: function (g) {                      // やみ：ふちが とげだらけ
        gRect(g, 3, 29, 4, 31, 'e'); gRect(g, 3, 33, 4, 35, 'e'); gRect(g, 3, 37, 4, 38, 'e');
        gRect(g, 19, 29, 20, 31, 'e'); gRect(g, 19, 33, 20, 35, 'e');
        gRect(g, 10, 32, 13, 35, 'e');
      }
    },
    helm: {
      1: function (g) {                      // かわ：かざりの ない ぼうし・横は みじかい
        gClear(g, 0, 2, 47, 3); gClear(g, 0, 16, 47, 20);
        gRect(g, 12, 15, 14, 16, 'H'); gRect(g, 33, 15, 35, 16, 'H');
      },
      3: function (g) {                      // りゅう：つの
        gRect(g, 9, 3, 11, 8, 'e'); gRect(g, 36, 3, 38, 8, 'e');
        gRect(g, 7, 1, 10, 4, 'e'); gRect(g, 37, 1, 40, 4, 'e');
      },
      4: function (g) {                      // でんせつ：よこの はね
        gRect(g, 7, 6, 11, 8, 'e'); gRect(g, 36, 6, 40, 8, 'e');
        gRect(g, 4, 4, 9, 6, 'e'); gRect(g, 38, 4, 43, 6, 'e');
      },
      5: function (g) {                      // ほし：かんむりの とがり 3つ
        gClear(g, 0, 2, 47, 3);
        gRect(g, 15, 1, 17, 4, 'e'); gRect(g, 22, 0, 25, 4, 'e'); gRect(g, 30, 1, 32, 4, 'e');
      },
      6: function (g) {                      // やみ：大きな つの＋前立て
        gRect(g, 8, 0, 11, 8, 'e'); gRect(g, 36, 0, 39, 8, 'e');
        gRect(g, 5, 2, 9, 5, 'e'); gRect(g, 38, 2, 42, 5, 'e');
        gRect(g, 21, 1, 26, 3, 'e');
      }
    },
    armor: {
      1: function (g) {                      // かわ：えりなし・かた当てなし
        gClear(g, 0, 24, 47, 26);
        gClear(g, 7, 27, 9, 30); gClear(g, 38, 27, 40, 30);
      },
      3: function (g) {                      // りゅう：大きな かた当て
        gRect(g, 2, 27, 8, 31, 'e'); gRect(g, 39, 27, 45, 31, 'e');
      },
      4: function (g) {                      // でんせつ：むねの 宝石
        gRect(g, 22, 29, 25, 32, 'e'); gRect(g, 21, 30, 26, 31, 'e');
      },
      5: function (g) {                      // ほし：むねの 星＋かたの かざり
        gRect(g, 21, 28, 26, 29, 'e'); gRect(g, 19, 30, 28, 31, 'e');
        gRect(g, 21, 32, 22, 34, 'e'); gRect(g, 25, 32, 26, 34, 'e');
        gRect(g, 5, 27, 8, 28, 'e'); gRect(g, 39, 27, 42, 28, 'e');
      },
      6: function (g) {                      // やみ：かたの とげ
        gRect(g, 4, 23, 8, 27, 'e'); gRect(g, 39, 23, 43, 27, 'e');
        gRect(g, 2, 25, 5, 27, 'e'); gRect(g, 42, 25, 45, 27, 'e');
        gPaint(g, 20, 30, 27, 34, 'e');
      }
    },
    cape: {
      1: function (g) { gClear(g, 0, 36, 47, 47); },          // かわ：みじかい たびマント
      3: function (g) { gHem(g, 'c'); },                       // りゅう：ふちどり
      4: function (g) {                                        // でんせつ：えり つき
        gRect(g, 13, 24, 34, 25, 'c'); gHem(g, 'c');
      },
      5: function (g) {                                        // ほし：ふちどり＋きらめき
        gHem(g, 'c');
        [[8, 30], [5, 34], [10, 37], [3, 39], [16, 28]].forEach(function (p) {
          gPaint(g, p[0], p[1], p[0] + 1, p[1] + 1, 'c');
        });
      },
      6: function (g) {                                        // やみ：すそが ボロボロ
        [[1, 40], [4, 41], [7, 40], [2, 42], [5, 43], [9, 38]].forEach(function (p) {
          gClear(g, p[0], p[1], p[0] + 1, 47);
        });
        gHem(g, 'c');
      }
    }
  };

  function shapeFor(slot, gradeNo) {
    const fn = SHAPER[slot][gradeNo];
    if (!fn) return BASE[slot];
    const g = gGrid(BASE[slot]);
    fn(g);
    return gRows(g);
  }

  /* =======================================================
     そうびの 効果（v5.4）

     大原則は アイテムと 同じ：**効果は「正解した とき」に 出る**。
     答えを 見せる・問題を とばす そうびは 作らない。
     中身は js/core/battle.js（start の gear）。ここは 名前と 数字だけ。
     ======================================================= */
  const GEAR_POWER = {
    weapon: { key: 'xpAdd',   vals: [1, 2, 3, 5, 7, 10],
      text: function (v) { return '正解 1もんごとに けいけんち ＋' + v; },
      short: function (v) { return 'けいけんち ＋' + v; } },
    shield: { key: 'safe',    vals: [1, 1, 2, 2, 3, 3],
      text: function (v) { return 'まちがえても ' + v + '回 てきが にげない'; },
      short: function (v) { return 'セーフ ' + v + '回'; } },
    helm:   { key: 'special', vals: [1, 1, 1, 2, 2, 2],
      text: function (v) { return 'ひっさつわざが ' + v + 'コンボ 早く 出る'; },
      short: function (v) { return 'ひっさつ ' + v + '早い'; } },
    armor:  { key: 'keep',    vals: [1, 1, 2, 2, 3, 3],
      text: function (v) { return 'まちがえても ' + v + '回 コンボが 切れない'; },
      short: function (v) { return 'コンボ ' + v + '回 まもる'; } },
    cape:   { key: 'coins',   vals: [1, 1, 1, 2, 2, 3],
      text: function (v) { return 'たたかいの おわりに コイン ＋' + v; },
      short: function (v) { return 'コイン ＋' + v; } }
  };
  // 同じ グレードを 5点 そろえたら、けいけんちが ふえる（セットボーナス）
  function setMulFor(gradeNo) { return 1 + 0.1 * gradeNo; }

  // グレード（手に入る 順番も この順）
  const grades = [
    { id: 'kihon',    no: 1, name: 'かわ',     how: '★2つで もらえる' },
    { id: 'tetsu',    no: 2, name: 'てつ',     how: '★2つで もらえる' },
    { id: 'ryu',      no: 3, name: 'りゅう',   how: '★2つで もらえる' },
    { id: 'densetsu', no: 4, name: 'でんせつ', how: 'かけら／ラスボス' },
    { id: 'hoshi',    no: 5, name: 'ほし',     how: '★3を あつめると' },
    { id: 'yami',     no: 6, name: 'やみ',     how: 'さいごの塔を クリア' }
  ];

  const GEAR_DEF = {
    kihon: {
      weapon: { name: '木のけん',       palette: { A: '#8B5A2B', y: '#5C3A16', w: '#C69C6D', e: '#C69C6D' } },
      shield: { name: '木のたて',       palette: { S: '#8B5A2B', s: '#C69C6D', e: '#5C3A16' } },
      helm:   { name: 'かわの ぼうし',   palette: { H: '#8A6A3C', '<': '#C99A55', e: '#C99A55' } },
      armor:  { name: 'かわの よろい',   palette: { A: '#9A7040', g: '#C99A55', e: '#C99A55' } },
      cape:   { name: 'たびの マント',   palette: { C: '#7A6A4A', c: '#C0AE86' } }
    },
    // ★モックの 騎士の 一式（白〜水色に 光る けん・金ぶちの たて・赤い マント）
    tetsu: {
      weapon: { name: 'ひかる けん',     palette: { A: '#9fd8ff', y: '#ffd447', w: '#FFFFFF', e: '#ffd447' } },
      shield: { name: 'きんぶちの たて', palette: { S: '#ffd447', s: '#4d7ddc', e: '#FFFFFF' } },
      helm:   { name: 'きしの かぶと',   palette: { H: '#b9c6e6', '<': '#ff5e5e', e: '#ff5e5e' } },
      armor:  { name: 'きしの よろい',   palette: { A: '#8ea6d8', g: '#ffd447', e: '#ffd447' } },
      cape:   { name: 'あかい マント',   palette: { C: '#e3554f', c: '#ffd447' } }
    },
    ryu: {
      weapon: { name: 'ほのおのけん',   palette: { A: '#ffb066', y: '#7A2E0E', w: '#fff0c0', e: '#E8443A' } },
      shield: { name: 'りゅうの たて',   palette: { S: '#7A2E0E', s: '#F26B2B', e: '#FFC46B' } },
      helm:   { name: 'りゅうの かぶと', palette: { H: '#D2622A', '<': '#FFC46B', e: '#FFE0A0' } },
      armor:  { name: 'りゅうの よろい', palette: { A: '#C4552A', g: '#FFC46B', e: '#FFE0A0' } },
      cape:   { name: 'ほのおの マント', palette: { C: '#8A2418', c: '#F26B2B' } }
    },
    densetsu: {
      weapon: { name: 'ひかりのけん',     palette: { A: '#dff0ff', y: '#B8860B', w: '#FFFFFF', e: '#FFE96B' } },
      shield: { name: 'ゆうしゃの たて',   palette: { S: '#B8860B', s: '#6FA8FF', e: '#FFF6C9' } },
      helm:   { name: 'ひかりの かぶと',   palette: { H: '#F2D06A', '<': '#FFF6C9', e: '#FFFFFF' } },
      armor:  { name: 'ひかりの よろい',   palette: { A: '#EFC85C', g: '#FFF6C9', e: '#6FA8FF' } },
      cape:   { name: 'でんせつの マント', palette: { C: '#7A1F3D', c: '#F2D06A' } }
    },
    hoshi: {
      weapon: { name: 'ほしくずの けん',   palette: { A: '#e8f0ff', y: '#4d7ddc', w: '#FFFFFF', e: '#FFE96B' } },
      shield: { name: 'ほしの たて',       palette: { S: '#6FD3FF', s: '#eaf4ff', e: '#FFE96B' } },
      helm:   { name: 'ほしの かぶと',     palette: { H: '#eaf4ff', '<': '#6FD3FF', e: '#FFE96B' } },
      armor:  { name: 'ほしの よろい',     palette: { A: '#dfe9ff', g: '#6FD3FF', e: '#FFE96B' } },
      cape:   { name: 'ぎんがの マント',   palette: { C: '#2E4FA8', c: '#9fd8ff' } }
    },
    yami: {
      weapon: { name: 'やみの 大けん',   palette: { A: '#8a6be0', y: '#2A1F3D', w: '#e0b6ff', e: '#FF5EC8' } },
      shield: { name: 'やみの たて',     palette: { S: '#3A2B52', s: '#8a6be0', e: '#FF5EC8' } },
      helm:   { name: 'やみの かぶと',   palette: { H: '#3A2B52', '<': '#FF5EC8', e: '#8a6be0' } },
      armor:  { name: 'やみの よろい',   palette: { A: '#3A2B52', g: '#8a6be0', e: '#FF5EC8' } },
      cape:   { name: 'やみの マント',   palette: { C: '#241A33', c: '#8a6be0' } }
    }
  };

  // 手に入る 順番：グレード1の5点 → グレード2の5点 → グレード3の5点
  const ORDER = ['weapon', 'shield', 'helm', 'armor', 'cape'];
  const gear = [];
  grades.forEach(function (g) {
    ORDER.forEach(function (slot) {
      const def = GEAR_DEF[g.id][slot];
      gear.push({
        id: g.id + '-' + slot,
        slot: slot,
        grade: g.id,
        gradeNo: g.no,
        gradeName: g.name,
        name: def.name,
        rows: shapeFor(slot, g.no),
        palette: def.palette,
        power: GEAR_POWER[slot].vals[g.no - 1],
        powerText: GEAR_POWER[slot].text(GEAR_POWER[slot].vals[g.no - 1]),
        powerShort: GEAR_POWER[slot].short(GEAR_POWER[slot].vals[g.no - 1])
      });
    });
  });
  const gearById = {};
  gear.forEach(function (g) { gearById[g.id] = g; });

  function getGear(id) { return gearById[id]; }

  /* グレード4いじょうは 特別な もらい方（★2では 出ない）
       でんせつ … まなびの かけら（1つ＝1点）＋ ラスボスで 5点目
       ほし     … ★3の ステージが 3・6・9・12・15 に なったとき（v5.4）
       さいごの塔を クリアする たびに 1点（v5.4） */
  const SPECIAL_GRADES = ['densetsu', 'hoshi', 'yami'];
  function isDensetsu(id) { return String(id).indexOf('densetsu-') === 0; }
  function isSpecial(id) {
    return SPECIAL_GRADES.some(function (g) { return String(id).indexOf(g + '-') === 0; });
  }
  const HOSHI_STARS = [3, 6, 9, 12, 15];   // ★3の ステージが これだけ たまるたび 1点

  // つぎに 手に入る そうび（グレード1〜3の うち まだ持っていない 最初のもの）
  function nextGear(player) {
    const owned = player.gear || [];
    for (let i = 0; i < gear.length; i++) {
      if (isSpecial(gear[i].id)) continue;
      if (owned.indexOf(gear[i].id) === -1) return gear[i];
    }
    return null;
  }

  // グレードの 5点を 1つずつ わたす（もう ぜんぶ 持っていれば null）
  function nextOfGrade(player, gradeId) {
    const owned = player.gear || [];
    for (let i = 0; i < ORDER.length; i++) {
      const id = gradeId + '-' + ORDER[i];
      if (owned.indexOf(id) === -1) return gearById[id];
    }
    return null;
  }
  function nextDensetsu(player) { return nextOfGrade(player, 'densetsu'); }
  function nextYami(player) { return nextOfGrade(player, 'yami'); }

  // ★3の ステージの 数で もらえる「ほし」の 一式。もらえる ぶんだけ かえす
  function nextHoshi(player, star3) {
    const owned = player.gear || [];
    const have = ORDER.filter(function (slot) { return owned.indexOf('hoshi-' + slot) !== -1; }).length;
    if (have >= ORDER.length) return null;
    if ((star3 || 0) < HOSHI_STARS[have]) return null;
    return gearById['hoshi-' + ORDER[have]];
  }

  /* いま つけている そうびの 効果を まとめる（core/battle.js に わたす）
       { xpAdd, safe, special, keep, coins, setMul, setName } */
  function gearPower(player) {
    const eq = (player && player.equipped) || {};
    const out = { xpAdd: 0, safe: 0, special: 0, keep: 0, coins: 0, setMul: 1, setName: '' };
    ORDER.forEach(function (slot) {
      const g = eq[slot] && gearById[eq[slot]];
      if (!g) return;
      out[GEAR_POWER[slot].key] += g.power;
    });
    const set = equippedSetOf(player);
    if (set) { out.setMul = setMulFor(set.no); out.setName = set.name; }
    return out;
  }

  // 同じグレードを 5点 そろえたか（見た目の ごほうび演出用）
  function fullSetOf(player) {
    const owned = player.gear || [];
    let best = null;
    grades.forEach(function (g) {
      const all = ORDER.every(function (slot) { return owned.indexOf(g.id + '-' + slot) !== -1; });
      if (all) best = g;
    });
    return best;
  }

  // その グレードの 5点を ぜんぶ 持っているか
  function hasSet(player, gradeId) {
    const owned = (player && player.gear) || [];
    return ORDER.every(function (slot) { return owned.indexOf(gradeId + '-' + slot) !== -1; });
  }

  function equippedSetOf(player) {
    const eq = (player && player.equipped) || {};
    let g = null;
    for (let i = 0; i < ORDER.length; i++) {
      const id = eq[ORDER[i]];
      if (!id) return null;
      const item = gearById[id];
      if (!item) return null;
      if (g && item.grade !== g) return null;
      g = item.grade;
    }
    for (let i = 0; i < grades.length; i++) if (grades[i].id === g) return grades[i];
    return null;
  }

  /* =======================================================
     絵を 作る
     ======================================================= */
  // opts.noGear … そうびを つけない すがた（見た目えらび画面で 顔を 見せるため）
  function layersFor(player, opts) {
    opts = opts || {};
    const look = lookOf(player);
    const P = palettes(look);
    const eq = (!opts.noGear && player && player.equipped) || {};
    const list = [];

    // うしろ から 手前へ
    const cape = eq.cape && gearById[eq.cape];
    if (cape) list.push({ rows: cape.rows, palette: cape.palette });

    list.push({ rows: bodyRows, palette: P.body });
    list.push({ rows: F.pick(F.clothStyles, look.cloth).rows, palette: P.cloth });
    list.push({ rows: F.headRows, palette: P.head });
    list.push({ rows: F.pick(F.eyeStyles, look.eye).rows, palette: P.eye });
    list.push({ rows: F.pick(F.hairStyles, look.hair).rows, palette: P.hair });
    list.push({ rows: F.pick(F.accStyles, look.acc).rows, palette: P.acc });
    const glass = F.pick(F.glassStyles, look.glass);
    list.push({ rows: glass.rows, palette: glass.palette });

    ['armor', 'helm', 'shield', 'weapon'].forEach(function (slot) {
      const g = eq[slot] && gearById[eq[slot]];
      if (g) list.push({ rows: g.rows, palette: g.palette });
    });
    return list;
  }

  function keyFor(player, opts) {
    const look = lookOf(player);
    const eq = ((!opts || !opts.noGear) && player && player.equipped) || {};
    const parts = lookGroups.map(function (g) { return look[g.key]; });
    return ['hero'].concat(parts).concat([
      eq.cape || '-', eq.armor || '-', eq.helm || '-', eq.shield || '-', eq.weapon || '-'
    ]).join(':');
  }

  // 主人公の画像。art.js に 絵があれば そちら
  function sprite(player, opts) {
    if (MQ.art && MQ.art.hero && (!opts || !opts.noGear)) return MQ.art.hero;
    return MQ.pixel.url(keyFor(player, opts), layersFor(player, opts), { bevel: true });
  }

  /* =======================================================
     タイトル画面の 勇者（ポスター用）

     ここだけは **その子の アバターとは べつ**の、決まった 一枚絵です。
     デザインモックの ナイトを そのまま 写しました。
     「がんばると さいごは こんなに カッコよく なれる」という 見本なので、
     その子の アバターに もどさないで ください。

     かさねる 順番（マント→体→かぶと→たて→けん）は 絵の 中で
     できあがっているので、1まいで 出せます。
     ======================================================= */
  const posterRows = [
    '............................S.....',
    '...........................SSS....',
    '...........................SSC....',
    '...........................SCC....',
    '...........kkkkkkkkkkkkkk..SSC....',
    '...........KKKKKKKKKKKKKK..SCC....',
    '...........KKKKKKKKKKKKKK..SSC....',
    '...........KKKKKKKKKKKKKK..SCC....',
    '...........KKKKKKKKKKKKKK..SSC....',
    '...........KKKKKKKKKKKKKKMMMMMMM..',
    '...........KKKKsKKssKKeKKmmmmmmm..',
    '...........KKKKsssssKKeKK..mmm....',
    '...........KKsWBBssWBBeKK..mmm....',
    '...........KKsBBBssBBBeKK..mmm....',
    '...........KKsBBBssBBBeKK.MMMMM...',
    '...........KKssssssssseKK.LLLLD...',
    '...........KKssssssssseKK.AAAAD...',
    '.............ssssssssse...AAAAD...',
    '.......gggggLLggggggggLDDvAAAAD...',
    '.......gggggAAGGGGGGGGADggggggg...',
    '.yyyyyyyyyGGAAAAAAAAAAADggggggg...',
    '.ybbbbbbbyLLAAAAggggggADGGGGGGG...',
    '.ybbbybbbyAAAAAAAggggAADDvAAAAD...',
    '.ybbyyybbyAAAAAAAAGGAAADDvv.......',
    '.ybyyyyybyAAAAAAAAAAAAADDVvv......',
    '.ybbyyybbyAAAAAAAAAAAAADDVvv......',
    '.ybbbybbbyAAgggggggggggggVvv......',
    '.ybbbbbbbyVGGGGGGGGGGGGGGVvv......',
    '.ybbbbbbbyVVppppppppppqqVVvv......',
    '.ybbbbbbbyVVppppppppppqqVVvv......',
    '.yyyyyyyyyVVpppppqqpppqqVVVvv.....',
    '.......VVVVVpppppqqpppqqVVVvv.....',
    '.......VVVVVpppppqqpppqqVVVvv.....',
    '........VVVVgggggVVgggggVVVv......',
    '............qqqqq..qqqqq..........',
    '............qqqqq..qqqqq..........'
  ];

  const POSTER_PALETTE = {
    K: '#3b2a16', k: '#5c421f',                              // かみの毛
    s: '#ffdca8', e: '#e0b986',                              // はだ
    W: '#ffffff', B: '#2e6fe0',                              // 青い 目
    A: '#3a3a48', L: '#4e4e5e', D: '#26262f',                // 黒い よろい
    g: '#ffd447', G: '#d9a418',                              // 金
    p: '#2b2b36', q: '#1d1d26',                              // あし・くつ
    V: '#3f66c9', v: '#294a9e',                              // 青い マント
    M: '#5a6274', m: '#2c3040',                              // けんの つば・にぎり
    S: '#e8f3ff', C: '#5aa8f0',                              // ダイヤの 刃
    y: '#ffd447', b: '#3f66c9'                               // たて
  };

  function poster() {
    return MQ.pixel.url('poster', [{ rows: posterRows, palette: POSTER_PALETTE }],
      { bevel: true });
  }

  // 顔だけの 小さい絵（ヘッダーの アイコンと 見た目えらびの ボタン）
  const FACE_CROP = { w: 36, h: 26, dx: -6, dy: 0 };
  // からだだけの 小さい絵（ふくを えらぶ ボタン）
  const BODY_CROP = { w: 32, h: 26, dx: -8, dy: -21 };
  function faceSprite(look) {
    const p = { look: look, equipped: {} };
    return MQ.pixel.url('face:' + keyFor(p, { noGear: true }), layersFor(p, { noGear: true }), FACE_CROP);
  }
  function bodySprite(look) {
    const p = { look: look, equipped: {} };
    return MQ.pixel.url('bodyc:' + keyFor(p, { noGear: true }), layersFor(p, { noGear: true }), BODY_CROP);
  }
  function partSprite(look, preview) {
    return preview === 'body' ? bodySprite(look) : faceSprite(look);
  }

  // そうび 1点だけの 絵（図鑑の 一覧用。うすい 主人公の かげの上に 重ねる）
  function gearSprite(id) {
    const g = gearById[id];
    if (!g) return '';
    return MQ.pixel.url('gear:' + id, [
      MQ.pixel.silhouette(F.bodyRows, '#E7E2F0'),
      MQ.pixel.silhouette(F.headRows, '#E7E2F0'),
      { rows: g.rows, palette: g.palette }
    ]);
  }

  function gearShadow(id) {
    const g = gearById[id];
    if (!g) return '';
    return MQ.pixel.url('gearshadow:' + id, [MQ.pixel.silhouette(g.rows, '#2A3556')]);
  }

  /* =======================================================
     レベル
     レベル n に なるのに 必要な けいけんち。
     Lv2 = 100, Lv3 = 250, Lv4 = 450, Lv5 = 700 … だんだん 遠くなる
     ======================================================= */
  function xpForLevel(n) {
    if (n <= 1) return 0;
    return 100 * (n - 1) + 25 * (n - 1) * (n - 2);
  }

  function levelOf(xp) {
    let n = 1;
    while (xpForLevel(n + 1) <= xp) n++;
    return n;
  }

  function progress(xp) {
    const level = levelOf(xp);
    const base = xpForLevel(level);
    const nextXp = xpForLevel(level + 1);
    return { level: level, into: xp - base, need: nextXp - base, ratio: (xp - base) / (nextXp - base) };
  }

  /* =======================================================
     しょうごう（名前の よこに 出る 肩書き）
     もらったものから 自分で えらべる。
     ======================================================= */
  // しょうごうの じょうけんで 使う 小さな 計算
  function beaten(p, id) { return ((p.dex && p.dex[id]) || 0) > 0; }
  function starSum(p) { const s = p.stars || {}; return Object.keys(s).reduce(function (n, k) { return n + (s[k] || 0); }, 0); }
  function treasureCount(p) { return Object.keys(p.treasure || {}).length; }
  function goldCount(p) { const t = p.treasure || {}; return Object.keys(t).filter(function (k) { return t[k] >= 2; }).length; }
  function dexCount(p) { const d = p.dex || {}; return Object.keys(d).filter(function (k) { return d[k] > 0; }).length; }
  // なかま（v5.2）
  function palCount(p) { return p && p.pals ? Object.keys(p.pals).length : 0; }
  function palBestLv(p) {
    if (!p || !p.pals || !MQ.pals) return 0;
    return Object.keys(p.pals).reduce(function (best, id) {
      return Math.max(best, MQ.pals.levelOf((p.pals[id] || {}).exp || 0));
    }, 0);
  }
  function hasPerfect(p) {
    const b = p.best || {};
    return Object.keys(b).some(function (k) { return b[k] && b[k].total >= 10 && b[k].correct === b[k].total; });
  }

  /* 42しゅるい（v2.0 で 23・v2.5 で 1・v3.1 で 2・v5.2 で 3・v5.4 で 4 ふやした）。ならびは だいたい 手に入る 順。
     新しく もらった ものが 自動で つくので、あとの ほうほど「えらい」しょうごうに してある。 */
  const titles = [
    { id: 't-minarai',   name: 'みならい ぼうけんしゃ', how: 'さいしょから',              test: function () { return true; } },
    { id: 't-kakedashi', name: 'かけだし けんし',       how: 'Lv3',                      test: function (p) { return levelOf(p.xp) >= 3; } },
    { id: 't-battle10',  name: 'なれた ぼうけんしゃ',    how: '10回 たたかう',             test: function (p) { return (p.battles || 0) >= 10; } },
    { id: 't-star10',    name: 'ほしあつめ 名人',        how: '★を 10こ あつめる',         test: function (p) { return starSum(p) >= 10; } },
    { id: 't-golden',    name: 'ゴールデン ハンター',    how: 'ゴールデンスライムを たおす', test: function (p) { return beaten(p, 'slime-golden'); } },
    { id: 't-isamashii', name: 'いさましい けんし',      how: 'Lv6',                      test: function (p) { return levelOf(p.xp) >= 6; } },
    { id: 't-ryu',       name: 'りゅうを たおす者',      how: 'ナンバードラゴンを たおす',   test: function (p) { return beaten(p, 'boss-dragon'); } },
    { id: 't-mori',      name: '森の まもりびと',        how: 'モジオニを たおす',          test: function (p) { return beaten(p, 'boss-oni'); } },
    { id: 't-umi',       name: '海の ぼうけんしゃ',      how: 'メカナイトを たおす',        test: function (p) { return beaten(p, 'boss-knight'); } },
    { id: 't-sora',      name: '空の たびびと',          how: 'キングスライムを たおす',     test: function (p) { return beaten(p, 'boss-slime'); } },
    { id: 't-tr8',       name: 'たからもの ハンター',    how: 'たからものを 8こ あつめる',   test: function (p) { return treasureCount(p) >= 8; } },
    { id: 't-perfect',   name: 'パーフェクト けんし',    how: 'ぜんもん 正解で クリア',      test: function (p) { return hasPerfect(p); } },
    { id: 't-fast5',     name: 'はやわざ けんし',        how: 'はやとき ボーナスを 5回',    test: function (p) { return (p.fastCount || 0) >= 5; } },
    { id: 't-inazuma',   name: 'いなずま つかい',        how: '8コンボ',                  test: function (p) { return (p.bestCombo || 0) >= 8; } },
    { id: 't-item10',    name: 'アイテム マスター',      how: 'アイテムを 10回 つかう',     test: function (p) { return (p.itemUses || 0) >= 10; } },
    { id: 't-mission10', name: 'ミッションの たつじん',   how: 'ミッションを 10こ クリア',   test: function (p) { return (p.missionsDone || 0) >= 10; } },
    { id: 't-revenge5',  name: 'リベンジ マスター',      how: 'リベンジを 5回 せいこう',    test: function (p) { return (p.revengeWins || 0) >= 5; } },
    { id: 't-coin20',    name: 'コイン もちぬし',        how: 'コインを 20まい あつめる',   test: function (p) { return (p.coins || 0) >= 20; } },
    { id: 't-creator',   name: 'モンスターの 生みのおや', how: 'じぶんの モンスターを つくる', test: function (p) { return (p.custom || []).length >= 1; } },
    { id: 't-honoo',     name: 'ほのおの けんし',        how: 'Lv10',                     test: function (p) { return levelOf(p.xp) >= 10; } },
    { id: 't-dex30',     name: 'ずかん はかせ',          how: 'モンスターを 30しゅるい 見つける', test: function (p) { return dexCount(p) >= 30; } },
    { id: 't-beat100',   name: 'モンスター マスター',    how: 'モンスターを 100たい たおす', test: function (p) { return (p.defeated || 0) >= 100; } },
    { id: 't-battle30',  name: 'たたかいの たつじん',    how: '30回 たたかう',             test: function (p) { return (p.battles || 0) >= 30; } },
    { id: 't-star30',    name: 'ほしの チャンピオン',    how: '★を 30こ あつめる',         test: function (p) { return starSum(p) >= 30; } },
    { id: 't-pika5',     name: 'ぴかぴか コレクター',    how: 'ぴかぴかを 5こ あつめる',    test: function (p) { return goldCount(p) >= 5; } },
    { id: 't-meteo',     name: 'メテオ つかい',          how: '12コンボ',                 test: function (p) { return (p.bestCombo || 0) >= 12; } },
    { id: 't-bigbang',   name: 'ぎんがの ゆうしゃ',      how: '16コンボ',                 test: function (p) { return (p.bestCombo || 0) >= 16; } },
    { id: 't-frag',      name: 'かけらの もちぬし',      how: 'かけらを 4つ あつめる',      test: function (p) {
      // かけらは 学年ごと（v4.5）。同じ 学年で 4つ そろえば もらえる
      const by = {};
      Object.keys(p.frags || {}).forEach(function (k) {
        const g = k.indexOf(':') > 0 ? k.slice(0, k.indexOf(':')) : 'g3';
        by[g] = (by[g] || 0) + 1;
      });
      return Object.keys(by).some(function (g) { return by[g] >= 4; });
    } },
    { id: 't-hikari',    name: 'ひかりの けんし',        how: 'Lv15',                     test: function (p) { return levelOf(p.xp) >= 15; } },
    { id: 't-tr20',      name: 'たからの もちぬし',      how: 'たからものを 20こ あつめる',  test: function (p) { return treasureCount(p) >= 20; } },
    { id: 't-dex80',     name: 'ずかんの たつじん',      how: 'モンスターを 80しゅるい 見つける', test: function (p) { return dexCount(p) >= 80; } },
    { id: 't-daiya',     name: 'ダイヤの けんし',        how: 'Lv20',                     test: function (p) { return levelOf(p.xp) >= 20; } },
    { id: 't-beat500',   name: 'モンスターの 王',        how: 'モンスターを 500たい たおす', test: function (p) { return (p.defeated || 0) >= 500; } },
    { id: 't-yusha',     name: 'でんせつの ゆうしゃ',     how: 'ラスボスを たおす',          test: function (p) { return beaten(p, 'boss-maou'); } },
    { id: 't-yami',      name: 'やみを こえた 者',        how: 'ダークロードを たおす',      test: function (p) { return beaten(p, 'boss-dark'); } },
    // なかま（v5.2）
    { id: 't-pal1',      name: 'なかまと ともに',        how: 'なかまを 1体 つくる',       test: function (p) { return palCount(p) >= 1; } },
    { id: 't-pal10',     name: 'なかまの リーダー',       how: 'なかまを 10体 あつめる',     test: function (p) { return palCount(p) >= 10; } },
    { id: 't-palLv10',   name: 'きずなの あかし',        how: '相棒を Lv.10 に そだてる',   test: function (p) { return palBestLv(p) >= 10; } },
    // そうび（v5.4）
    { id: 't-gearset',   name: 'そろいの きし',          how: 'そうびを 1しゅるい そろえる', test: function (p) { return !!fullSetOf(p); } },
    { id: 't-hoshiset',  name: 'ほしの ゆうしゃ',        how: 'ほしの そうびを そろえる',    test: function (p) { return hasSet(p, 'hoshi'); } },
    { id: 't-yamiset',   name: 'やみを まとう者',        how: 'やみの そうびを そろえる',    test: function (p) { return hasSet(p, 'yami'); } },
    { id: 't-gearall',   name: 'そうび マスター',        how: 'そうびを 30点 ぜんぶ あつめる', test: function (p) { return (p.gear || []).length >= gear.length; } }
  ];
  const titleById = {};
  titles.forEach(function (t) { titleById[t.id] = t; });

  function getTitle(id) { return titleById[id]; }

  function titleName(player) {
    const t = titleById[player && player.title];
    return t ? t.name : titles[0].name;
  }

  // まだ もらっていない しょうごうを わたす。新しく もらったものを かえす
  function checkTitles(player) {
    if (!Array.isArray(player.titles)) player.titles = [];
    const got = [];
    titles.forEach(function (t) {
      if (player.titles.indexOf(t.id) !== -1) return;
      if (!t.test(player)) return;
      player.titles.push(t.id);
      got.push(t);
    });
    // 新しいものを 自動で つける
    if (got.length) player.title = got[got.length - 1].id;
    if (!player.title) player.title = 't-minarai';
    return got;
  }

  return {
    bodyRows: bodyRows,
    hairColors: F.hairColors, skinColors: F.skinColors, eyeColors: F.eyeColors,
    clothColors: F.clothColors, pantsColors: F.pantsColors,
    lookGroups: lookGroups, lookTabs: lookTabs, groupByKey: groupByKey,
    lookOf: lookOf, defaultLook: defaultLook, randomLook: randomLook, isOldLook: isOldLook,
    levelFor: levelFor, owns: owns, partsCount: partsCount,
    bodyPalette: bodyPalette, palettes: palettes, colorOf: colorOf,
    gear: gear, grades: grades, slots: ORDER, slotName: SLOT_NAME,
    getGear: getGear, nextGear: nextGear, nextDensetsu: nextDensetsu, isDensetsu: isDensetsu,
    nextHoshi: nextHoshi, nextYami: nextYami, isSpecial: isSpecial, hoshiStars: HOSHI_STARS,
    gearPower: gearPower, gearSlotPower: GEAR_POWER, setMulFor: setMulFor,
    fullSetOf: fullSetOf, hasSet: hasSet, equippedSetOf: equippedSetOf,
    sprite: sprite, faceSprite: faceSprite, bodySprite: bodySprite, partSprite: partSprite, poster: poster,
    gearSprite: gearSprite, gearShadow: gearShadow, layersFor: layersFor,
    xpForLevel: xpForLevel, levelOf: levelOf, progress: progress,
    titles: titles, getTitle: getTitle, titleName: titleName, checkTitles: checkTitles
  };
})();
