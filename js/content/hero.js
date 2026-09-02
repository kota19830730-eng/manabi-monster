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
     そうび（5部位 × 4グレード ＝ 20点）
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
  const SHAPE = { weapon: swordRows, shield: shieldRows, helm: helmRows, armor: armorRows, cape: capeRows };

  // グレード（手に入る 順番も この順）
  const grades = [
    { id: 'kihon',    no: 1, name: 'かわ' },
    { id: 'tetsu',    no: 2, name: 'てつ' },
    { id: 'ryu',      no: 3, name: 'りゅう' },
    { id: 'densetsu', no: 4, name: 'でんせつ' }
  ];

  const GEAR_DEF = {
    kihon: {
      weapon: { name: '木のけん',       palette: { A: '#8B5A2B', y: '#5C3A16', w: '#C69C6D' } },
      shield: { name: '木のたて',       palette: { S: '#8B5A2B', s: '#C69C6D' } },
      helm:   { name: 'かわの かぶと',   palette: { H: '#8A6A3C', '<': '#C99A55' } },
      armor:  { name: 'かわの よろい',   palette: { A: '#9A7040', g: '#C99A55' } },
      cape:   { name: 'たびの マント',   palette: { C: '#7A6A4A' } }
    },
    // ★モックの 騎士の 一式（白〜水色に 光る けん・金ぶちの たて・赤い マント）
    tetsu: {
      weapon: { name: 'ひかる けん',     palette: { A: '#9fd8ff', y: '#ffd447', w: '#FFFFFF' } },
      shield: { name: 'きんぶちの たて', palette: { S: '#ffd447', s: '#4d7ddc' } },
      helm:   { name: 'きしの かぶと',   palette: { H: '#b9c6e6', '<': '#ff5e5e' } },
      armor:  { name: 'きしの よろい',   palette: { A: '#8ea6d8', g: '#ffd447' } },
      cape:   { name: 'あかい マント',   palette: { C: '#e3554f' } }
    },
    ryu: {
      weapon: { name: 'ほのおのけん',   palette: { A: '#ffb066', y: '#7A2E0E', w: '#fff0c0' } },
      shield: { name: 'りゅうの たて',   palette: { S: '#7A2E0E', s: '#F26B2B' } },
      helm:   { name: 'りゅうの かぶと', palette: { H: '#D2622A', '<': '#FFC46B' } },
      armor:  { name: 'りゅうの よろい', palette: { A: '#C4552A', g: '#FFC46B' } },
      cape:   { name: 'ほのおの マント', palette: { C: '#8A2418' } }
    },
    densetsu: {
      weapon: { name: 'ひかりのけん',     palette: { A: '#dff0ff', y: '#B8860B', w: '#FFFFFF' } },
      shield: { name: 'ゆうしゃの たて',   palette: { S: '#B8860B', s: '#6FA8FF' } },
      helm:   { name: 'ひかりの かぶと',   palette: { H: '#F2D06A', '<': '#FFF6C9' } },
      armor:  { name: 'ひかりの よろい',   palette: { A: '#EFC85C', g: '#FFF6C9' } },
      cape:   { name: 'でんせつの マント', palette: { C: '#7A1F3D' } }
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
        rows: SHAPE[slot],
        palette: def.palette
      });
    });
  });
  const gearById = {};
  gear.forEach(function (g) { gearById[g.id] = g; });

  function getGear(id) { return gearById[id]; }

  // グレード4「でんせつ」は かけら／ラスボスでしか 手に入らない
  function isDensetsu(id) { return String(id).indexOf('densetsu-') === 0; }

  // つぎに 手に入る そうび（グレード1〜3の うち まだ持っていない 最初のもの）
  function nextGear(player) {
    const owned = player.gear || [];
    for (let i = 0; i < gear.length; i++) {
      if (isDensetsu(gear[i].id)) continue;
      if (owned.indexOf(gear[i].id) === -1) return gear[i];
    }
    return null;
  }

  // でんせつ の 5点を 1つずつ わたす（かけら1つ＝1点、ラスボスで 5点目）
  function nextDensetsu(player) {
    const owned = player.gear || [];
    for (let i = 0; i < ORDER.length; i++) {
      const id = 'densetsu-' + ORDER[i];
      if (owned.indexOf(id) === -1) return gearById[id];
    }
    return null;
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
    '...............RRRRR.......WSS....',
    '...............rrrrr.......WSE....',
    '...............rrrrr.......WSE....',
    '............LLLLLLLLLLLLhh.WSE....',
    '............HHHHHHHHHHHHhh.WSE....',
    '............HHHHHHHHHHHHhh.WSE....',
    '............HHHHHHHHHHHHhh.WSE....',
    '............HHsssssssssshh.WSE....',
    '............HHsssssssssshh.WSE....',
    '............HHskksssskkshh.WSE....',
    '............HHskksssskkshh.WSE....',
    '............HHsssssssssshhgggggg..',
    '............HHsssssssssshhGGGGGG..',
    '............HHeeeeeeeeeehhggggg...',
    '............HHHHHHHHHHHHhhGGGGG...',
    '............hhhhhhhhhhhhhhLLLLD...',
    '........LLLLLLLLLLLLLLLLDDAAAAD...',
    '........AAAAAAAAAAAAAAAADDAAAAD...',
    '.yyyyyyyyyAAAAAAAAAAAAAADDAAAAD...',
    '.yBBBBBBByAAAAAAAAAAAAAADDAAAAD...',
    '.yBBBgBBByAAAAAAAAAAAAAADDAAAAD...',
    '.yBBgggBByAAAAAAAAAAAAAADDAAAAD...',
    '.yBgggggByAAAAAAAAAAAAAADDAAAAD...',
    '.yBBgggBByAAAAAAAAAAAAAADD........',
    '.yBBBgBBBy..gggggggggggggg........',
    '.yBBBBBBBy..gggggggggggggg........',
    '.yyyyyyyyy..GGGGGGGGGGGGGG........',
    '............ppppppppppppqq........',
    '............ppppppppppppqq........',
    '............ppppppppppppqq........',
    '............ppppppqqppppqq........',
    '............ppppppqqppppqq........',
    '............ppppppqqppppqq........',
    '............gggggg..gggggg........',
    '............GGGGGG..GGGGGG........'
  ];

  const POSTER_PALETTE = {
    r: '#ff5e5e', R: '#ff9090',                              // 前立て
    H: '#eef3ff', h: '#bcc9e6', L: '#ffffff',                // かぶと
    s: '#ffdca8', e: '#e0b986', k: '#242a44',                // 顔と 目
    A: '#b8cce8', D: '#8ba3c9',                              // よろい
    g: '#ffd447', G: '#d9a418',                              // 金
    p: '#33418f', q: '#26307a',                              // あし
    W: '#ffffff', S: '#e8f3ff', E: '#a9c8e8',                // けん
    y: '#ffd447', B: '#4d7ddc'                               // たて
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
  function hasPerfect(p) {
    const b = p.best || {};
    return Object.keys(b).some(function (k) { return b[k] && b[k].total >= 10 && b[k].correct === b[k].total; });
  }

  /* 34しゅるい（v2.0 で 23・v2.5 で 1・v3.1 で 2 ふやした）。ならびは だいたい 手に入る 順。
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
    { id: 't-yusha',     name: 'でんせつの ゆうしゃ',     how: 'ラスボスを たおす',          test: function (p) { return beaten(p, 'boss-maou'); } }
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
    fullSetOf: fullSetOf, equippedSetOf: equippedSetOf,
    sprite: sprite, faceSprite: faceSprite, bodySprite: bodySprite, partSprite: partSprite, poster: poster,
    gearSprite: gearSprite, gearShadow: gearShadow, layersFor: layersFor,
    xpForLevel: xpForLevel, levelOf: levelOf, progress: progress,
    titles: titles, getTitle: getTitle, titleName: titleName, checkTitles: checkTitles
  };
})();
