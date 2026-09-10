/* ---------------------------------------------------------
   たからばこの 3D（2026-09-10・v12.0 で ゲーム本体に。もとは tools/3d/chest3d.js）
   ユーザー「宝箱だけ 2D で 浮いてる から 次は ここから」

   タイトル（start.js の chest()＝CSS の div の 絵）と バトル（enemies の 'chest'＝48マスの 絵）で
   作りが ちがって いたので、3D は **1つの 作り**に そろえる。
   部品は 3つ：土台（base）／ふた（lid・うしろの 上の へりが ちょうつがい）／金貨（coins・ふたが ひらくと 見える）。
   絵は ゲームの 部品（MQ.blocks.el）で 作り、箱に するのは vox2.js の fromGroups（前の 面に 本物の <i>・
   よこと 上下の 面は 模様・光は 左上）＝ モンスターと 同じ 見え方。

   かたち（48マス・はば 38・奥ゆき 24）
     ふた   … 2段の 山形（上の 段は 4マス せまく・4マス うすい）＋金の ふち＋金の おび 2本＋赤い 宝石
     土台   … 木の 箱＋上下の こい おび＋金の おび 2本＋金の かぎ（かぎあな）
     金貨   … 土台の 上に もりあがる 金の 山（ふたの 中に かくれて いる。ひらくと 見える）

   MQ.vox.chest({ unit, open, shadow }) → .v3.v3--chest（open なら is-open＝ふたが ひらいた まま）
   動きは motion.css の mo-chest（待機・ガタガタ）／mo-chest-open（ひらく）／mo-chest-title（タイトルの ゆれ）
   --------------------------------------------------------- */
(function () {
  const COLORS = {
    A: '#9a5d26', B: '#6a3d14', C: '#b97a3a',      // 木（A）・こい 木（B）・明るい 木（C）
    y: '#f2c14e', Y: '#ffe89a',                    // 金・明るい 金
    r: '#ff4d5e', k: '#3a2410'                     // 宝石・かぎあな
  };
  /* ふた（y 8〜19） */
  const LID = [
    [7, 8, 34, 4, 'C', 'h'],       // 上の 段
    [5, 12, 38, 5, 'C', 'h'],      // 下の 段
    [5, 17, 38, 3, 'y', 'h'],      // 金の ふち
    [9, 8, 4, 12, 'y'],            // 金の おび（左）
    [35, 8, 4, 12, 'y'],           // 金の おび（右）
    [21, 12, 6, 4, 'r', 'g']       // 赤い 宝石
  ];
  /* 土台（y 20〜40） */
  const BASE = [
    [5, 20, 38, 21, 'A', 'h'],     // 箱
    [5, 20, 38, 3, 'B', 'n'],      // 上の こい おび（ふたの 下の かげ）
    [5, 37, 38, 4, 'B', 'n'],      // 下の こい おび
    [9, 20, 4, 21, 'y'],           // 金の おび（左）
    [35, 20, 4, 21, 'y'],          // 金の おび（右）
    [20, 21, 8, 9, 'y', 'h'],      // かぎ
    [23, 24, 2, 4, 'k', 'n']       // かぎあな
  ];
  /* 金貨の 山（y 11〜19・土台の 内がわ x 8〜39） */
  const COINS = [
    [8, 15, 32, 5, 'y', 'h'],      // 山の 土台
    [8, 13, 10, 2, 'Y'],           // 左の もりあがり
    [20, 11, 8, 4, 'y', 'h'],      // まん中の もりあがり
    [32, 13, 8, 2, 'Y']            // 右の もりあがり
  ];
  const INNER = '#c9944f';         // ふたの 内がわ（明るい 木）
  const DEPTH = 24;                // 奥ゆき（マス）。はば 38 に 対して 24 ＝ 箱らしい ふかさ

  function bxOf(shape, plain) {
    return MQ.blocks.el(shape, COLORS, { plain: plain });
  }

  function chest(opts) {
    opts = opts || {};
    const plain = opts.plain != null ? opts.plain : false;
    const groups = [
      { cls: 'base',  bx: bxOf(BASE, plain),  joint: [24, 41], thick: DEPTH },
      /* ふた：ちょうつがいは 土台の うしろの 上の へり（y 20・z −12）。rotateX(+) で 前が 上に あがる */
      /* v12.1：ふたは ひらくと うしろ・上・下が ぜんぶ 見える ので 面を 1つも はぶかない（keep）。内がわ（下の 面）は 明るい 木 */
      { cls: 'lid',   bx: bxOf(LID, plain),   joint: [24, 20], jz: -DEPTH / 2, parent: 'base', thick: DEPTH, keep: true, bottom: INNER },
      { cls: 'coins', bx: bxOf(COINS, plain), joint: [24, 20], parent: 'base', thick: 16, floor: false }
    ];
    /* ひらいた ふたの 裏（下の 面）は 上を 向く ので、明るい 木の 内がわに（自動だと 金の ふちを 暗くした 色＝どろっと 見えた）
       → v12.1 から groups の bottom（上の lid）で わたす。hide＝カメラの 向きで 見えない がわ（three.js が 決める） */
    const v = MQ.vox.fromGroups(groups, { unit: opts.unit || 2, shadow: opts.shadow, hide: opts.hide });
    v.classList.add('v3--chest');
    if (opts.open) v.classList.add('is-open');
    return v;
  }

  MQ.vox.chest = chest;
  MQ.vox.chestShapes = { LID: LID, BASE: BASE, COINS: COINS, COLORS: COLORS, DEPTH: DEPTH };
})();
