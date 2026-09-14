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
    }
  };

  function has(shape) { return !!CFG[shape] && !!(MQ.enemies && MQ.enemies.shapes && MQ.enemies.shapes[shape]); }
  function ry(shape) { return CFG[shape] && CFG[shape].ry != null ? CFG[shape].ry : null; }

  function make(e, opts) {
    opts = opts || {};
    const cfg = CFG[e.shape];
    const shape = MQ.enemies.shapes[e.shape];
    const base = e.base || 64;
    const pal = MQ.enemies.paletteOf(e, !!opts.enrage);
    const groups = cfg.parts.map(function (p) {
      const rects = shape.filter(function (r) { return r[6] === p.tag; });
      let pp = pal;
      if (p.dark) { pp = {}; Object.keys(pal).forEach(function (k) { pp[k] = MQ.blocks.darker(pal[k], p.dark); }); }
      return {
        cls: p.cls, bx: MQ.blocks.el(rects, pp, { raw: true, base: base }),
        joint: p.joint, parent: p.parent, thick: p.thick, z: p.z || 0, floor: p.floor
      };
    });
    const v = MQ.vox.fromGroups(groups, { unit: opts.unit || 2, hide: opts.hide, shadow: opts.shadow });
    v.classList.add('v3--' + e.shape + 'boss');
    return v;
  }

  MQ.vox.boss3d = { has: has, make: make, ry: ry, CFG: CFG };
})();
