/* ---------------------------------------------------------
   ボスの 3D（v14.6・2026-09-14）
   ユーザー「ボスの デザインを 変えたい。もじおにも ナンバードラゴンも 弱そう」→ 3案ずつ（Claude Design の キャンバス）
   →「ドラゴンは C で 鬼は B。3D で 作れるなら すぐに 公開」。

   ふつうの モンスターは 1まいの 絵（.bx）から 部品を 自動で 見つける（vox.js の rigMonster）。
   この 2体は たからばこ（chest3d.js）と 同じく **部品ごとに 別の 絵**から 組む（MQ.vox.fromGroups）：
     ナンバードラゴン … 体・首と 頭・しっぽ・つばさ（手まえ／向こう）・足 4本（手まえ 2・向こう 2）
     モジオニ         … 体・頭・たてがみ・うで 2本（肩の よろいごと）・なぎなた・足 2本
   絵の 正本は tools/bossart/final.js（64マス・7つめが 部品の 名前）→ emit.js が monsterart.js に 書く。
   z＝部品の 奥ゆきの ずれ（マス）。手まえの 足・つばさは +、向こうは −。
   動きは css/motion3d.css の .v3--dragonboss／.v3--oniboss（はばたく・首を ふる・なぎなたを ふる）。

   MQ.vox.boss3d.has(shape) → この 作り方の ボスか
   MQ.vox.boss3d.make(e, { unit, hide, enrage, shadow }) → .v3（three.js の monster() が よぶ）
   MQ.vox.boss3d.ry(shape) → 向き（ドラゴンは 頭を 手まえに）
   --------------------------------------------------------- */
(function () {
  const CFG = {
    dragon: {
      ry: 18,                                                         // 左むきの 横すがた：頭が 手まえに くる 向き
      parts: [
        { tag: 'body',  cls: 'body',  joint: [37, 46], thick: 14 },
        { tag: 'head',  cls: 'head',  joint: [26, 34], thick: 8,  parent: 'body' },
        { tag: 'tail',  cls: 'tail',  joint: [48, 40], thick: 6,  parent: 'body' },
        { tag: 'wing',  cls: 'wingR', joint: [40, 31], thick: 2,  z: 8,  parent: 'body' },
        { tag: 'wing',  cls: 'wingL', joint: [40, 31], thick: 2,  z: -8, parent: 'body', dark: 0.38, floor: false },   // 向こうの つばさ（同じ 形を こく）
        { tag: 'legNF', cls: 'legA',  joint: [30, 44], thick: 6,  z: 4 },
        { tag: 'legNB', cls: 'legB',  joint: [46, 38], thick: 6,  z: 4 },
        { tag: 'legFF', cls: 'legB',  joint: [25, 46], thick: 5,  z: -4 },
        { tag: 'legFB', cls: 'legA',  joint: [47, 44], thick: 5,  z: -4 }
      ]
    },
    oni: {
      parts: [
        { tag: 'body',   cls: 'body',   joint: [32, 56], thick: 12 },
        { tag: 'head',   cls: 'head',   joint: [32, 30], thick: 12, parent: 'body' },
        { tag: 'mane',   cls: 'mane',   joint: [32, 26], thick: 4,  z: -6, parent: 'head', floor: false },
        { tag: 'armL',   cls: 'armL',   joint: [12, 30], thick: 9,  parent: 'body' },
        { tag: 'armR',   cls: 'armR',   joint: [52, 30], thick: 9,  parent: 'body' },
        { tag: 'weapon', cls: 'weapon', joint: [57, 50], thick: 2,  z: 6, parent: 'armR', floor: false },
        { tag: 'legA',   cls: 'legA',   joint: [25, 54], thick: 8 },
        { tag: 'legB',   cls: 'legB',   joint: [39, 54], thick: 8 }
      ]
    },
    /* ---------- v14.7：序盤・中盤の 10体と 64マスで 作り直した 3体（絵の 正本は tools/bossart/final2.js） ----------
       kind：'side'＝左むきの 横すがた（頭を 手まえに ry +18・つばさは rotateX）／'front'＝正面（ry −22・つばさは rotateY）。
       動きは css/motion3d.css の .v3--b64（頭・うで・しっぽ・つばさ・マント・かんむり・うかぶ もの）。 */
    saidon: {
      ry: 18, kind: 'side',
      parts: [
        { tag: 'body',  cls: 'body',  joint: [34, 50], thick: 14 },
        { tag: 'head',  cls: 'head',  joint: [16, 36], thick: 10, parent: 'body' },
        { tag: 'tail',  cls: 'tail',  joint: [54, 34], thick: 4,  parent: 'body' },
        { tag: 'legNF', cls: 'legA',  joint: [21, 48], thick: 6,  z: 4 },
        { tag: 'legNB', cls: 'legB',  joint: [43, 48], thick: 6,  z: 4 },
        { tag: 'legFF', cls: 'legB',  joint: [23, 46], thick: 5,  z: -4 },
        { tag: 'legFB', cls: 'legA',  joint: [47, 46], thick: 5,  z: -4 }
      ]
    },
    majin: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body', joint: [32, 58], thick: 12 },
        { tag: 'head', cls: 'head', joint: [32, 18], thick: 12, parent: 'body' },
        { tag: 'armL', cls: 'armL', joint: [16, 24], thick: 5,  parent: 'body' },
        { tag: 'armR', cls: 'armR', joint: [48, 22], thick: 5,  parent: 'body' },
        { tag: 'orbs', cls: 'orbs', joint: [32, 44], thick: 2,  z: 4, floor: false }
      ]
    },
    fude: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body', joint: [31, 56], thick: 12 },
        { tag: 'head', cls: 'head', joint: [29, 26], thick: 12, parent: 'body' },
        { tag: 'tail', cls: 'tail', joint: [48, 40], thick: 5,  z: -6, parent: 'body', floor: false },
        { tag: 'armL', cls: 'armL', joint: [16, 32], thick: 4,  parent: 'body' },
        { tag: 'armR', cls: 'armR', joint: [44, 31], thick: 5,  parent: 'body' },
        { tag: 'legA', cls: 'legA', joint: [23, 56], thick: 8 },
        { tag: 'legB', cls: 'legB', joint: [39, 56], thick: 8 }
      ]
    },
    tengu: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body',  joint: [32, 48], thick: 10 },
        { tag: 'head', cls: 'head',  joint: [30, 24], thick: 12, parent: 'body' },
        { tag: 'wing', cls: 'wingR', joint: [42, 18], thick: 2,  z: -6, parent: 'body', floor: false },
        { tag: 'armL', cls: 'armL',  joint: [20, 30], thick: 4,  parent: 'body' },
        { tag: 'armR', cls: 'armR',  joint: [44, 29], thick: 5,  parent: 'body' },
        { tag: 'legA', cls: 'legA',  joint: [28, 48], thick: 6 },
        { tag: 'legB', cls: 'legB',  joint: [38, 48], thick: 6 }
      ]
    },
    namazu: {
      ry: 18, kind: 'side',
      parts: [
        { tag: 'body',   cls: 'body', joint: [28, 58], thick: 14 },
        { tag: 'tail',   cls: 'tail', joint: [46, 40], thick: 5,  parent: 'body' },
        { tag: 'fin',    cls: 'fin',  joint: [30, 32], thick: 2,  parent: 'body', floor: false },
        { tag: 'pool',   cls: 'pool', joint: [31, 61], thick: 16, floor: false },
        { tag: 'sparks', cls: 'orbs', joint: [24, 16], thick: 2,  z: 4, floor: false }
      ]
    },
    mizuchi: {
      ry: 18, kind: 'side',
      parts: [
        { tag: 'body', cls: 'body', joint: [32, 58], thick: 16 },
        { tag: 'head', cls: 'head', joint: [18, 32], thick: 8,  parent: 'body' },
        { tag: 'tail', cls: 'tail', joint: [52, 46], thick: 4,  parent: 'body' },
        { tag: 'pool', cls: 'pool', joint: [33, 61], thick: 18, floor: false }
      ]
    },
    koban: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body', joint: [32, 56], thick: 12 },
        { tag: 'head', cls: 'head', joint: [29, 24], thick: 12, parent: 'body' },
        { tag: 'sack', cls: 'sack', joint: [50, 26], thick: 6,  z: -6, parent: 'body', floor: false },
        { tag: 'tail', cls: 'tail', joint: [48, 52], thick: 3,  z: -4, parent: 'body', floor: false },
        { tag: 'armL', cls: 'armL', joint: [14, 36], thick: 4,  parent: 'body' },
        { tag: 'legA', cls: 'legA', joint: [23, 56], thick: 8 },
        { tag: 'legB', cls: 'legB', joint: [39, 56], thick: 8 }
      ]
    },
    haniwa: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body', joint: [32, 62], thick: 14 },
        { tag: 'head', cls: 'head', joint: [32, 26], thick: 14, parent: 'body' },
        { tag: 'armL', cls: 'armL', joint: [18, 30], thick: 5,  parent: 'body' },
        { tag: 'armR', cls: 'armR', joint: [46, 30], thick: 5,  parent: 'body' }
      ]
    },
    prince: {
      kind: 'front',
      parts: [
        { tag: 'body',  cls: 'body',  joint: [32, 62], thick: 16 },
        { tag: 'crown', cls: 'crown', joint: [31, 13], thick: 6, parent: 'body' },
        { tag: 'cape',  cls: 'cape',  joint: [44, 18], thick: 2, z: -7, parent: 'body', floor: false }
      ]
    },
    griffon: {
      ry: 18, kind: 'side',
      parts: [
        { tag: 'body',  cls: 'body',  joint: [32, 50], thick: 12 },
        { tag: 'head',  cls: 'head',  joint: [18, 24], thick: 8,  parent: 'body' },
        { tag: 'wing',  cls: 'wingR', joint: [42, 18], thick: 2,  z: -6, parent: 'body', floor: false },
        { tag: 'tail',  cls: 'tail',  joint: [50, 36], thick: 4,  parent: 'body' },
        { tag: 'legNF', cls: 'legA',  joint: [26, 46], thick: 5,  z: 4 },
        { tag: 'legNB', cls: 'legB',  joint: [42, 40], thick: 5,  z: 4 }
      ]
    },
    knight: {
      kind: 'front',
      parts: [
        { tag: 'body',   cls: 'body',   joint: [32, 44], thick: 12 },
        { tag: 'head',   cls: 'head',   joint: [32, 20], thick: 12, parent: 'body' },
        { tag: 'armL',   cls: 'armL',   joint: [14, 26], thick: 4,  parent: 'body' },
        { tag: 'armR',   cls: 'armR',   joint: [48, 24], thick: 6,  parent: 'body' },
        { tag: 'weapon', cls: 'weapon', joint: [56, 44], thick: 2,  z: 4, parent: 'armR', floor: false },
        { tag: 'legA',   cls: 'legA',   joint: [27, 44], thick: 8 },
        { tag: 'legB',   cls: 'legB',   joint: [41, 44], thick: 8 }
      ]
    },
    kingslime: {
      kind: 'front',
      parts: [
        { tag: 'body',    cls: 'body',    joint: [30, 62], thick: 18 },
        { tag: 'crown',   cls: 'crown',   joint: [32, 14], thick: 6, parent: 'body' },
        { tag: 'cape',    cls: 'cape',    joint: [8, 20],  thick: 2, z: -8, parent: 'body', floor: false },
        { tag: 'minionA', cls: 'minionA', joint: [6, 61],  thick: 6, z: 6 },
        { tag: 'minionB', cls: 'minionB', joint: [57, 60], thick: 6, z: 6 }
      ]
    },
    titan: {
      kind: 'front',
      parts: [
        { tag: 'body', cls: 'body', joint: [32, 46], thick: 16 },
        { tag: 'head', cls: 'head', joint: [33, 14], thick: 12, parent: 'body' },
        { tag: 'armL', cls: 'armL', joint: [9, 18],  thick: 10, parent: 'body' },
        { tag: 'armR', cls: 'armR', joint: [55, 18], thick: 10, parent: 'body' },
        { tag: 'legA', cls: 'legA', joint: [25, 46], thick: 9 },
        { tag: 'legB', cls: 'legB', joint: [39, 46], thick: 9 }
      ]
    }
  };

  /* ---------- ラスボス 6体（2026-09-19・96マス・絵の 正本は tools/bossart/final3.js） ----------
     座標・厚み・奥ゆきは 64マスの つもりで 書き、scale（1.5）ばいして 96マスに する。正面（kind 'front'）。
     つばさは 左右 べつの 部品（wingL／wingR）・ハデスの ほのおの かみ（mane）は motion3d.css の .v3--b64last で ゆれる。 */
  const LASTB = {
    maou: [
      { tag: 'wingL',  cls: 'wingL',  joint: [20, 24], thick: 3,  z: -5, parent: 'body', floor: false },
      { tag: 'wingR',  cls: 'wingR',  joint: [44, 24], thick: 3,  z: -5, parent: 'body', floor: false },
      { tag: 'cape',   cls: 'cape',   joint: [32, 24], thick: 2,  z: -5, parent: 'body', floor: false },
      { tag: 'body',   cls: 'body',   joint: [32, 48], thick: 12 },
      { tag: 'head',   cls: 'head',   joint: [32, 24], thick: 11, z: 3, parent: 'body' },
      { tag: 'armL',   cls: 'armL',   joint: [16, 30], thick: 6,  parent: 'body' },
      { tag: 'orbs',   cls: 'orbs',   joint: [12, 40], thick: 2,  z: 4, floor: false },
      { tag: 'armR',   cls: 'armR',   joint: [48, 30], thick: 6,  parent: 'body' },
      { tag: 'weapon', cls: 'weapon', joint: [54, 44], thick: 2,  z: 5, parent: 'armR', floor: false },
      { tag: 'legA',   cls: 'legA',   joint: [25, 46], thick: 8 },
      { tag: 'legB',   cls: 'legB',   joint: [38, 46], thick: 8 }
    ],
    obakeking: [
      { tag: 'cape',    cls: 'cape',    joint: [32, 18], thick: 2,  z: -7, parent: 'body', floor: false },
      { tag: 'body',    cls: 'body',    joint: [32, 58], thick: 16 },
      { tag: 'crown',   cls: 'crown',   joint: [32, 11], thick: 7,  parent: 'body' },
      { tag: 'armL',    cls: 'armL',    joint: [8, 28],  thick: 5,  parent: 'body' },
      { tag: 'armR',    cls: 'armR',    joint: [56, 28], thick: 5,  parent: 'body' },
      { tag: 'weapon',  cls: 'weapon',  joint: [59, 30], thick: 2,  z: 5, parent: 'armR', floor: false },
      { tag: 'orbs',    cls: 'orbs',    joint: [32, 20], thick: 2,  z: 4, floor: false },
      { tag: 'minionA', cls: 'minionA', joint: [5, 58],  thick: 5,  z: 6 },
      { tag: 'minionB', cls: 'minionB', joint: [59, 58], thick: 5,  z: 6 }
    ],
    kaizoku: [
      { tag: 'body',   cls: 'body',   joint: [32, 52], thick: 12 },
      { tag: 'head',   cls: 'head',   joint: [32, 28], thick: 12, z: 2, parent: 'body' },
      { tag: 'sack',   cls: 'sack',   joint: [11, 28], thick: 5,  z: 2, parent: 'body', floor: false },
      { tag: 'armL',   cls: 'armL',   joint: [15, 32], thick: 6,  parent: 'body' },
      { tag: 'armR',   cls: 'armR',   joint: [49, 32], thick: 6,  parent: 'body' },
      { tag: 'weapon', cls: 'weapon', joint: [52, 46], thick: 2,  z: 5, parent: 'armR', floor: false },
      { tag: 'legA',   cls: 'legA',   joint: [25, 50], thick: 8 },
      { tag: 'legB',   cls: 'legB',   joint: [38, 50], thick: 8 }
    ],
    dark: [
      { tag: 'cape',   cls: 'cape',   joint: [32, 20], thick: 2,  z: -6, parent: 'body', floor: false },
      { tag: 'body',   cls: 'body',   joint: [32, 48], thick: 13 },
      { tag: 'head',   cls: 'head',   joint: [32, 23], thick: 12, z: 2, parent: 'body' },
      { tag: 'armL',   cls: 'armL',   joint: [15, 29], thick: 6,  parent: 'body' },
      { tag: 'orbs',   cls: 'orbs',   joint: [10, 42], thick: 2,  z: 4, floor: false },
      { tag: 'armR',   cls: 'armR',   joint: [49, 29], thick: 6,  parent: 'body' },
      { tag: 'weapon', cls: 'weapon', joint: [52, 46], thick: 2,  z: 5, parent: 'armR', floor: false },
      { tag: 'legA',   cls: 'legA',   joint: [25, 46], thick: 8 },
      { tag: 'legB',   cls: 'legB',   joint: [38, 46], thick: 8 }
    ],
    blizzard: [
      { tag: 'cape',   cls: 'cape',   joint: [32, 20], thick: 2,  z: -7, parent: 'body', floor: false },
      { tag: 'body',   cls: 'body',   joint: [32, 48], thick: 13 },
      { tag: 'head',   cls: 'head',   joint: [32, 24], thick: 11, z: 3, parent: 'body' },
      { tag: 'crown',  cls: 'crown',  joint: [32, 10], thick: 6,  parent: 'head' },
      { tag: 'armL',   cls: 'armL',   joint: [15, 28], thick: 6,  parent: 'body' },
      { tag: 'orbs',   cls: 'orbs',   joint: [9, 36],  thick: 2,  z: 4, floor: false },
      { tag: 'armR',   cls: 'armR',   joint: [49, 28], thick: 6,  parent: 'body' },
      { tag: 'weapon', cls: 'weapon', joint: [52, 44], thick: 2,  z: 5, parent: 'armR', floor: false },
      { tag: 'legA',   cls: 'legA',   joint: [25, 46], thick: 8 },
      { tag: 'legB',   cls: 'legB',   joint: [38, 46], thick: 8 }
    ],
    hades: [
      { tag: 'mane',   cls: 'mane',   joint: [32, 20], thick: 3,  z: -4, parent: 'head', floor: false },
      { tag: 'cape',   cls: 'cape',   joint: [32, 20], thick: 2,  z: -7, parent: 'body', floor: false },
      { tag: 'body',   cls: 'body',   joint: [32, 60], thick: 13 },
      { tag: 'head',   cls: 'head',   joint: [32, 24], thick: 11, z: 3, parent: 'body' },
      { tag: 'armL',   cls: 'armL',   joint: [15, 29], thick: 6,  parent: 'body' },
      { tag: 'orbs',   cls: 'orbs',   joint: [10, 40], thick: 2,  z: 4, floor: false },
      { tag: 'armR',   cls: 'armR',   joint: [49, 29], thick: 6,  parent: 'body' },
      { tag: 'weapon', cls: 'weapon', joint: [53, 44], thick: 2,  z: 5, parent: 'armR', floor: false }
    ]
  };
  Object.keys(LASTB).forEach(function (k) { CFG[k] = { kind: 'front', scale: 1.5, last: true, parts: LASTB[k] }; });

  function has(shape) { return !!CFG[shape] && !!(MQ.enemies && MQ.enemies.shapes && MQ.enemies.shapes[shape]); }
  function ry(shape) { return CFG[shape] && CFG[shape].ry != null ? CFG[shape].ry : null; }

  function make(e, opts) {
    opts = opts || {};
    const cfg = CFG[e.shape];
    const shape = MQ.enemies.shapes[e.shape];
    const base = e.base || 64;
    const pal = MQ.enemies.paletteOf(e, !!opts.enrage);
    const S = cfg.scale || 1;   // ラスボス（96マス）は 64マスの つもりの 数を 1.5ばい
    const groups = cfg.parts.map(function (p) {
      const rects = shape.filter(function (r) { return r[6] === p.tag; });
      let pp = pal;
      if (p.dark) { pp = {}; Object.keys(pal).forEach(function (k) { pp[k] = MQ.blocks.darker(pal[k], p.dark); }); }
      return {
        cls: p.cls, bx: MQ.blocks.el(rects, pp, { raw: true, base: base }),
        joint: [p.joint[0] * S, p.joint[1] * S], parent: p.parent, thick: Math.round(p.thick * S), z: (p.z || 0) * S, floor: p.floor
      };
    });
    const v = MQ.vox.fromGroups(groups, { unit: opts.unit || 2, hide: opts.hide, shadow: opts.shadow });
    v.classList.add('v3--' + e.shape + 'boss');
    if (cfg.kind) { v.classList.add('v3--b64'); v.classList.add('v3--b64' + cfg.kind); }   // v14.7：序盤・中盤の ボスと 作り直しの 3体の 動き
    if (cfg.last) v.classList.add('v3--b64last');   // ラスボス（2026-09-19）：左の つばさ・ほのおの かみ
    return v;
  }

  MQ.vox.boss3d = { has: has, make: make, ry: ry, CFG: CFG };
})();
