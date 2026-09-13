/* =========================================================
   わざの 名前の 文字（v14.2）：ふちが なめらかな 大きな 字
   ユーザー「文字の カクカク（画質が 悪い）」→ 見くらべ → A（書体は そのまま・2026-09-14）。
   ・前は ふちどりを 8方向に ずらした text-shadow で 作って いた＝ふちが 階段のように ギザギザ。
   ・ここでは SVG の 本物の 線（stroke-linejoin: round・paint-order: stroke）で ふちを 描く。
     字の 中は 上から 下へ うすく 色が かわる グラデ・まわりに わざの 色の 光・下に こい 影。
   ・書体は いままでと 同じ Mochiy Pop One。
   ・学年の ことば（MQ.text.fit）は ここで かける（SVG は innerHTML で 入れる ので 親に data-raw）。
   使い方：
     MQ.ui.fxtext.name(文字, 色の 名前 か {ink, shadow, glow, glow2?, grad:[上,中,下]}, { size, ruby, cls })
       → <span class="fxname fxname--svg …">（.fxname の 場所と はじける アニメは そのまま 使える）
     MQ.ui.fxtext.STYLE … 色の 表（ひっさつわざ・アイテム・セットわざ）
   8方向の text-shadow に もどさない。
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};
  MQ.ui = MQ.ui || {};

  const FONT = "'Mochiy Pop One', 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif";
  const W = 400;          // 帯と 同じ はば（まん中に そろえる）
  const MAX_W = 384;      // これより 長い 名前は 字の 間を つめる（はみ出さない）

  /* ink＝ふちの 色／shadow＝下の 影／glow（glow2）＝まわりの 光／grad＝字の 中の グラデ（上・中・下）
     色は 前の text-shadow の ふちの 色と 光の 色を そのまま 使う */
  const STYLE = {
    // ひっさつわざ（コンボ）
    fire:      { ink: '#8f2406', shadow: '#4d1303', glow: '#ff8c3c', grad: ['#ffffff', '#fff4e6', '#ffc88a'] },
    leaf:      { ink: '#1f6b2a', shadow: '#0e3a14', glow: '#7ee06a', grad: ['#ffffff', '#f2ffe6', '#bff29e'] },
    ice:       { ink: '#1c5f8a', shadow: '#0c3450', glow: '#9fe6ff', grad: ['#ffffff', '#f4fcff', '#bdeeff'] },
    wind:      { ink: '#3f5f8a', shadow: '#22364f', glow: '#e6f6ff', grad: ['#ffffff', '#ffffff', '#d8ecff'] },
    bolt:      { ink: '#123f78', shadow: '#0a2246', glow: '#78c8ff', grad: ['#ffffff', '#f0f8ff', '#ade0ff'] },
    star:      { ink: '#8a5a08', shadow: '#4d3103', glow: '#ffd447', grad: ['#ffffff', '#fff8dc', '#ffe08a'] },
    nova:      { ink: '#3a1d6b', shadow: '#1c0b3a', glow: '#ff5e7a', glow2: '#4fd3ff', grad: ['#ffffff', '#ffffff', '#ffe9a8'] },
    starburst: { ink: '#12405a', shadow: '#06202e', glow: '#7cf9c4', glow2: '#c48bff', grad: ['#ffffff', '#effff9', '#b8ffe6'] },
    // アイテムの わざ（こうげき・まもり・ちえ・うん）
    atk:  { ink: '#8f2406', shadow: '#4d1303', glow: '#ff5e3a', grad: ['#ffffff', '#fff2ea', '#ffc0a0'] },
    def:  { ink: '#123f78', shadow: '#0a2246', glow: '#5ab0ff', grad: ['#ffffff', '#f0f8ff', '#b0d8ff'] },
    wis:  { ink: '#1f6a1c', shadow: '#0f3a0e', glow: '#63d94f', grad: ['#ffffff', '#f0ffe8', '#b8f0a0'] },
    luck: { ink: '#8a5a08', shadow: '#4d3103', glow: '#ffd447', grad: ['#ffffff', '#fff8dc', '#ffe08a'] },
    // セットわざ（v14.2）
    'set-kihon':    { ink: '#0f4a1c', shadow: '#062610', glow: '#7ee06a', glow2: '#2fbf6a', ruby: '#e2ffd8', grad: ['#ffffff', '#e8ffe0', '#9fef86'] },
    'set-tetsu':    { ink: '#1e2a3c', shadow: '#0a0f18', glow: '#c9d8ee', glow2: '#6f88b0', ruby: '#eef4ff', grad: ['#ffffff', '#e4ecf6', '#9fb2cc'] },
    'set-ryu':      { ink: '#6a1204', shadow: '#2e0602', glow: '#ff6a2a', glow2: '#ffcc3a', ruby: '#ffe6cc', grad: ['#fffbe6', '#ffe09a', '#ff8a3a'] },
    'set-densetsu': { ink: '#6a4a06', shadow: '#2e2002', glow: '#ffe27a', glow2: '#fff6c8', ruby: '#fff8dc', grad: ['#ffffff', '#fff6cc', '#ffd24a'] },
    'set-hoshi':    { ink: '#152a6a', shadow: '#070f2e', glow: '#8fb8ff', glow2: '#d6a8ff', ruby: '#e6eeff', grad: ['#ffffff', '#e8f0ff', '#a8c4ff'] },
    'set-yami':     { ink: '#2a0a4a', shadow: '#12031f', glow: '#b04dff', ruby: '#efdcff', grad: ['#ffffff', '#f1e2ff', '#c99bff'] },
    'set-capsule':  { ink: '#0a3a5a', shadow: '#041a2a', glow: '#4fd3ff', glow2: '#ff7ad0', ruby: '#dff6ff', grad: ['#ffffff', '#e0f8ff', '#8fe2ff'] },
    'set-aurora':   { ink: '#0f3f48', shadow: '#061c22', glow: '#7cf9c4', glow2: '#c48bff', ruby: '#e6fff6', grad: ['#ffffff', '#eafff6', '#a6f5d6'] }
  };
  const PLAIN = { ink: '#14102c', shadow: '#06040e', glow: '#ffd447', grad: ['#ffffff', '#fff6dc', '#ffe08a'] };

  let no = 0;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fitText(s) { return MQ.text && MQ.text.fit ? MQ.text.fit(s) : s; }

  // 字の はば（Canvas で はかる。はかれない ときは 1字＝1em の みつもり）
  let mctx = null;
  function widthOf(s, size, ls) {
    let w = 0;
    try {
      if (!mctx && typeof document !== 'undefined') mctx = document.createElement('canvas').getContext('2d');
      if (mctx) { mctx.font = size + "px 'Mochiy Pop One', sans-serif"; w = mctx.measureText(s).width; }
    } catch (e) { w = 0; }
    if (!w) for (let i = 0; i < s.length; i++) w += s[i] === ' ' ? size * 0.32 : s.charCodeAt(i) < 128 ? size * 0.6 : size;
    return w + ls * Math.max(0, s.length - 1);
  }

  /* SVG の 文字列。o: size（字の 大きさ）・ruby（上の 小さな 字）・sw（ふちの 太さ）・ls（字の 間） */
  function svg(text, st, o) {
    o = o || {};
    const size = o.size || 34, ls = o.ls == null ? 1 : o.ls;
    const sw = o.sw || Math.max(5, Math.round(size * 0.2));        // 34px で 7（見える ふちは 半分＝前の 3px と 同じ くらい）
    const drop = Math.max(3, Math.round(size * 0.15));              // 下の こい 影（前は 6px。ふちの 下から 見える ぶん）
    const rubyH = o.ruby ? 17 : 0;
    const pad = Math.ceil(sw / 2) + 4;
    const hgt = Math.round(rubyH + pad + size * 1.1 + drop + 4);
    const base = Math.round(rubyH + pad + size * 0.88);
    const id = 'fxt' + (++no);
    const tw = widthOf(text, size, ls);
    const squeeze = tw > MAX_W ? ' textLength="' + MAX_W + '" lengthAdjust="spacingAndGlyphs"' : '';
    const blur = Math.max(3, Math.round(size * 0.14));
    /* 1つの フィルターで：下の こい 影（ぼかさない）＋まわりの 光（1〜2色）。
       影を べつの text に すると、harness の 止めた 画面（virtual-time）で 影だけ ずれて 写る ことが あった */
    const fx = '<feOffset in="SourceAlpha" dy="' + drop + '" result="o"/>' +
      '<feFlood flood-color="' + st.shadow + '"/><feComposite in2="o" operator="in" result="sh"/>' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + blur + '" result="b"/>' +
      '<feFlood flood-color="' + st.glow + '" flood-opacity=".95"/><feComposite in2="b" operator="in" result="g1"/>' +
      (st.glow2 ? '<feGaussianBlur in="SourceAlpha" stdDeviation="' + (blur * 2.4) + '" result="b2"/>' +
        '<feFlood flood-color="' + st.glow2 + '" flood-opacity=".8"/><feComposite in2="b2" operator="in" result="g2"/>' : '') +
      '<feMerge>' + (st.glow2 ? '<feMergeNode in="g2"/>' : '') + '<feMergeNode in="g1"/><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge>';
    return '<svg class="fxname__svg" width="' + W + '" height="' + hgt + '" viewBox="0 0 ' + W + ' ' + hgt + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + st.grad[0] + '"/><stop offset=".55" stop-color="' + st.grad[1] + '"/><stop offset="1" stop-color="' + st.grad[2] + '"/></linearGradient>' +
      '<filter id="' + id + 'f" x="-20%" y="-60%" width="140%" height="220%">' + fx + '</filter></defs>' +
      '<g font-family="' + FONT + '" text-anchor="middle" stroke-linejoin="round" paint-order="stroke" filter="url(#' + id + 'f)">' +
        (o.ruby ? '<text x="' + (W / 2) + '" y="' + (rubyH - 2) + '" font-size="12" letter-spacing="2" fill="' + (st.ruby || '#fff6d8') + '" stroke="' + st.ink + '" stroke-width="3.5">' + esc(o.ruby) + '</text>' : '') +
        '<text x="' + (W / 2) + '" y="' + base + '" font-size="' + size + '" letter-spacing="' + ls + '"' + squeeze +
          ' fill="url(#' + id + 'g)" stroke="' + st.ink + '" stroke-width="' + sw + '">' + esc(text) + '</text>' +
      '</g></svg>';
  }

  /* .fxname の span を 作る。style は STYLE の 名前 か 色の オブジェクト */
  function name(text, style, o) {
    o = o || {};
    const st = typeof style === 'string' ? (STYLE[style] || PLAIN) : (style || PLAIN);
    const s = o.raw ? String(text) : fitText(text);
    const el = document.createElement('span');
    el.className = 'fxname fxname--svg' + (o.cls ? ' ' + o.cls : '');
    el.setAttribute('data-raw', '');          // 学年の 辞書を 2回 かけない（上で かけた）
    el.setAttribute('aria-label', s);
    el.innerHTML = svg(s, st, { size: o.size, ruby: o.ruby, sw: o.sw, ls: o.ls });
    return el;
  }

  MQ.ui.fxtext = { name: name, svg: svg, STYLE: STYLE };
})();
