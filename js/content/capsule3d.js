/* ---------------------------------------------------------
   カプセルマシンの 3D（2026-09-13・ユーザー「C案で カプセルマシンも 3D で 作れますか？」）
   たからばこ（chest3d.js）と 同じ 作り：絵は ゲームの 部品（MQ.blocks.el）で 描き、
   箱に するのは vox.js の fromGroups ＝ モンスター・主人公・たからばこと 同じ 見え方（マイクラ風の 角）。

   部品
     base  … 赤い 台＋金の ふち＋コインの 口＋カプセルの 出口＋上の ふた（ドームの かざり）
     knob  … 金の ハンドル（まん中で rotateZ ＝ ほんとうに 回る）。台より 奥ゆきを 2マス ずつ 大きく して 前に 出す
     ball1〜12 … ガラスの 中の 玉（ブロック）。1つずつ 別の かんせつ ＝ ばらばらに はねる。前後にも ずらす（BALLS の 6つめ）
     ガラス … ブロックの 絵には できない（すきとおる 色は かたちに 数えない）ので、ここで 面を 5まい 組む（buildGlass）

   かたち（48マス）
     ふた   y 0〜6   ／ ガラス 上 y 6〜10（はば 26）・下 y 10〜26（はば 32・奥ゆき 22）
     金の ふち y 26〜28 ／ 台 y 28〜44（奥ゆき 24）／ 足 y 44〜46

   MQ.vox.capsuleMachine({ unit, hide, shadow }) → .v3.v3--capmc
   --------------------------------------------------------- */
(function () {
  const COLORS = {
    A: '#d9483b', B: '#8f2a22', C: '#f07a62',      // 赤い 台（A）・こい 赤（B）・明るい 赤（C）
    y: '#f2c14e', Y: '#ffe89a',                    // 金・明るい 金
    k: '#2a0f0c',                                  // 口の 中（くらい）
    w: '#fff4dc',                                  // ハンドルの にぎり（赤い 台に とけこまない クリーム）
    o: '#ff8f5e', g: '#63d94f', p: '#b48cff', s: '#ffd447', b: '#4fd3ff', m: '#ff6fae'   // 玉
  };
  /* 台（ふた・金の ふち・台・口・足） */
  const BASE = [
    [22, 0, 4, 2, 'y', 'h'],       // ふたの つまみ
    [18, 2, 12, 2, 'A', 'h'],      // ふた（上）
    [14, 4, 20, 2, 'A', 'h'],      // ふた（下）
    [6, 26, 36, 2, 'y', 'h'],      // ガラスの 下の 金の ふち
    [5, 28, 38, 16, 'A', 'h'],     // 台
    [5, 28, 38, 2, 'B', 'n'],      // 上の こい おび（ふちの かげ）
    [5, 41, 38, 3, 'B', 'n'],      // 下の こい おび
    [9, 31, 12, 10, 'y', 'h'],     // カプセルの 出口の わく
    [10, 32, 10, 8, 'k', 'n'],     // 出口の 中
    [26, 30, 12, 3, 'y'],          // コインの 口の 板
    [28, 31, 8, 1, 'k', 'n'],      // コインの 口
    [7, 44, 34, 2, 'B', 'n']       // 足
  ];
  /* ハンドル（まん中 32,38.5 で 回る）＝ 金の 円ばん ＋ よこの 棒 ＋ りょうはしの 赤い にぎり */
  const KNOB = [
    [28, 34, 8, 9, 'y', 'h'],      // 円ばん
    [24, 37, 16, 3, 'Y', 'h'],     // 棒
    [22, 36, 3, 5, 'w', 'h'],      // にぎり（左）
    [39, 36, 3, 5, 'w', 'h'],      // にぎり（右）
    [31, 37, 2, 3, 'y', 'n']       // まん中の じく
  ];
  /* ガラスの 中の 玉（5×5 の ブロック）。4つめ＝奥ゆきの ずれ（マス・＋が 手まえ）＝ 前後に ちらばって 中が いっぱいに 見える */
  const BALLS = [
    [9, 20, 5, 5, 'o', -6], [14, 20, 5, 5, 'g', 4], [19, 20, 5, 5, 'p', -2], [24, 20, 5, 5, 's', 6], [29, 20, 5, 5, 'b', -5], [34, 20, 5, 5, 'm', 3],
    [11, 15, 5, 5, 'b', 3], [17, 15, 5, 5, 'o', -5], [23, 15, 5, 5, 'g', 5], [30, 15, 5, 5, 'p', -3],
    [15, 10, 5, 5, 's', -2], [26, 10, 5, 5, 'm', 4]
  ];
  /* ガラス（x, y, w, h, 奥ゆき）＝ 下の 大きい 箱と 上の せまい 箱 */
  const GLASS = [[8, 10, 32, 16, 22], [11, 6, 26, 4, 18]];
  const DEPTH = 24;                // 台の 奥ゆき（マス）

  function bxOf(shape, plain) { return MQ.blocks.el(shape, COLORS, { plain: plain }); }

  /* ガラスの 箱を 面 5まいで 組む（vox.js の buildBox と 同じ 置き方：箱は 奥ゆきの まん中ぞろえ）
     前の 面は うすい 水色＋ななめの 光の すじ、うしろは すこし こい 色（中の 玉が 浮かないように） */
  function face(w, h, tf, origin, bg) {
    const f = document.createElement('div');
    f.className = 'f v3glass__f';
    f.style.cssText = 'width:' + w + 'px;height:' + h + 'px;transform:' + tf + ';' + (origin ? 'transform-origin:' + origin + ';' : '') + 'background:' + bg + ';';
    return f;
  }
  function buildGlass(g, U) {
    const x = g[0] * U, y = g[1] * U, w = g[2] * U, h = g[3] * U, d = g[4] * U;
    const box = document.createElement('div');
    box.className = 'b v3glass';
    box.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:translateZ(' + (d / 2) + 'px);';
    const edge = 'box-shadow: inset 0 0 0 ' + Math.max(1, U / 2) + 'px rgba(255,255,255,.55);';
    box.appendChild(face(w, h, 'translateZ(' + (-d) + 'px)', null, 'rgba(70,120,190,.30)'));              // うしろ
    box.appendChild(face(d, h, 'rotateY(90deg)', 'left center', 'rgba(150,200,240,.22)'));               // 左
    box.appendChild(face(d, h, 'translateX(' + w + 'px) rotateY(90deg)', 'left center', 'rgba(150,200,240,.22)'));   // 右
    box.appendChild(face(w, d, 'rotateX(-90deg)', 'left top', 'rgba(210,240,255,.28)'));                 // 上
    const front = face(w, h, 'translateZ(0px)', null,
      'linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,255,255,.55) 19% 25%, rgba(255,255,255,0) 26% 60%, rgba(255,255,255,.28) 61% 64%, rgba(255,255,255,0) 65%), rgba(200,235,255,.16)');
    front.style.cssText += edge;
    front.classList.add('v3glass__front');
    box.appendChild(front);
    return box;
  }

  function machine(opts) {
    opts = opts || {};
    const plain = opts.plain != null ? opts.plain : false;
    const groups = [
      { cls: 'base', bx: bxOf(BASE, plain), joint: [24, 46], thick: DEPTH },
      { cls: 'knob', bx: bxOf(KNOB, plain), joint: [32, 38.5], parent: 'base', thick: DEPTH + 4, keep: true, floor: false }
    ];
    BALLS.forEach(function (r, i) {
      groups.push({ cls: 'ball' + (i + 1), bx: bxOf([[r[0], r[1], r[2], r[3], r[4], 'h']], plain),
        joint: [r[0] + r[2] / 2, r[1] + r[3]], parent: 'base', thick: 5, keep: true, floor: false });
    });
    const U = opts.unit || 2;
    const v = MQ.vox.fromGroups(groups, { unit: U, shadow: opts.shadow, hide: opts.hide });
    const base = v.querySelector('.p--base');
    GLASS.forEach(function (g) { base.appendChild(buildGlass(g, U)); });
    /* 玉を 前後に ずらす。動きは CSS の translate／rotate（transform とは べつ）で つけるので ぶつからない */
    BALLS.forEach(function (r, i) {
      const p = v.querySelector('.p--ball' + (i + 1));
      if (p && r[5]) p.style.transform = 'translateZ(' + (r[5] * U) + 'px)';
    });
    v.classList.add('v3--capmc');
    return v;
  }

  /* ---------- 出て くる カプセル（割れる 3D）----------
     まるい カプセルを ブロックの 段で 描く（はば 40 の 円）。上の 半分（明るい 色）と 下の 半分（レアさの 色）を
     べつの 部品に して、割れる ときに 上は 上へ・下は 下へ とぶ（.p--top／.p--bot を CSS で 動かす）。
     tone … 'n'＝オレンジ（ノーマルの 見た目）・'r'＝金・'sr'＝むらさき。出て くる ときの 色（期待度の ③）。 */
  const BALL_TONE = {
    n:  { L: '#fff1e2', A: '#ff8f5e', y: '#f2c14e' },
    r:  { L: '#fff6cf', A: '#ffc93c', y: '#fff1a6' },
    sr: { L: '#f1e6ff', A: '#9a6ae8', y: '#ffe89a' }
  };
  /* 段（y, h, はば, 奥ゆき）＝ 円を 4段ずつ。奥ゆきも 段ごとに 変える ので、よこから 見ても まるい */
  const BALL_BANDS_TOP = [[4, 3, 16, 16], [7, 4, 28, 26], [11, 7, 36, 34], [18, 6, 40, 38]];
  const BALL_BANDS_BOT = [[24, 6, 40, 38], [30, 7, 36, 34], [37, 4, 28, 26], [41, 3, 16, 16]];
  const BALL_TOP = BALL_BANDS_TOP.map(function (b) { return [24 - b[2] / 2, b[0], b[2], b[1], 'L', 'h']; });
  const BALL_BOT = BALL_BANDS_BOT.map(function (b, i) { return [24 - b[2] / 2, b[0], b[2], b[1], 'A', i === 0 ? 'h' : '']; });
  function ball(opts) {
    opts = opts || {};
    const col = Object.assign({}, COLORS, BALL_TONE[opts.tone] || BALL_TONE.n);
    const bx = function (shape) { return MQ.blocks.el(shape, col, { plain: !!opts.plain }); };
    const groups = [];
    BALL_BANDS_BOT.forEach(function (b, i) {
      const shape = [BALL_BOT[i]];
      if (i === 0) shape.push([24 - b[2] / 2, 24, b[2], 2, 'y', 'h']);      // まん中の 金の おび（上と 下の つなぎめ）
      groups.push({ cls: 'bot', bx: bx(shape), joint: [24, 44], thick: b[3], keep: true, floor: i === BALL_BANDS_BOT.length - 1 });
    });
    BALL_BANDS_TOP.forEach(function (b, i) {
      groups.push({ cls: 'top', bx: bx([BALL_TOP[i]]), joint: [24, 24], thick: b[3], keep: true, floor: false });
    });
    const v = MQ.vox.fromGroups(groups, { unit: opts.unit || 2, shadow: opts.shadow, hide: opts.hide });
    v.classList.add('v3--capball', 'v3--capball-' + (BALL_TONE[opts.tone] ? opts.tone : 'n'));
    return v;
  }

  MQ.vox.capsuleMachine = machine;
  MQ.vox.capsuleBall = ball;
  MQ.vox.capsuleShapes = { BASE: BASE, KNOB: KNOB, BALLS: BALLS, GLASS: GLASS, COLORS: COLORS, DEPTH: DEPTH, BALL_TOP: BALL_TOP, BALL_BOT: BALL_BOT, BALL_TONE: BALL_TONE, BALL_BANDS_TOP: BALL_BANDS_TOP, BALL_BANDS_BOT: BALL_BANDS_BOT };
})();
