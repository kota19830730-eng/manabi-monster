/* ---------------------------------------------------------
   ブロックで 絵を 描く（CSS の div だけ・画像ファイルなし）

   マイクラ風に、**角丸なしの 真四角**を いくつか かさねて
   1体（1つ）を 作ります。立体感は 影で 出します。

     ・右がわに 暗い面   inset -Npx 0 0 <こい色>
     ・下がわにも 少し   inset 0 -Mpx 0 rgba(0,0,0,.15)
     ・左上に 白い ハイライト（rgba(255,255,255,.5)）
     ・光る ところ（目・コア・宝石）は 外に グロー

   絵の 書きかた（1マス = 1px。モンスターは 48×48、たからものは 40×40）：

     shape = [
       [x, y, よこ, たて, 色のキー, 'フラグ'],
       ...
     ]

   色のキーは パレットの 文字（A B C D P …）か、'#ff0000' の ような 色そのもの。
   フラグ（いくつでも 組み合わせられる）：
     h … 左上に 白い ハイライトを のせる
     g … 外に グロー（光る）
     n … 立体の 影を つけない（目・口など 平らな もの）
     d … 45度 まわす（宝石の ダイヤ形）
     o … まわりだけ（中は 空っぽ。カギ・わっか）

   使いかた：
     MQ.blocks.el(shape, palette)            → 48×48 の <div class="bx">
     MQ.blocks.box(shape, palette, { size })  → 大きさを 合わせた 入れもの
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.blocks = (function () {
  const BASE = 48;          // モンスターの 1辺
  const ITEM = 40;          // たからものの 1辺

  /* 色を こく／うすく する */
  function mix(hex, to, k) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1, 7), 16);
    const m = parseInt(to.slice(1), 16);
    const out = [16, 8, 0].map(function (sh) {
      const a = (n >> sh) & 255, b = (m >> sh) & 255;
      return Math.round(a + (b - a) * k);
    });
    return '#' + out.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function darker(hex, k) { return mix(hex, '#000000', k == null ? 0.28 : k); }
  function lighter(hex, k) { return mix(hex, '#ffffff', k == null ? 0.3 : k); }

  /* パレットを ととのえる。
     B・C・D が なくても A から 自動で 作るので、色を 1つ 決めるだけで 描ける */
  function fill(colors) {
    const p = {};
    Object.keys(colors || {}).forEach(function (k) { p[k] = colors[k]; });
    if (!p.A) p.A = '#9aa7b8';
    if (!p.B) p.B = darker(p.A, 0.34);
    if (!p.C) p.C = lighter(p.A, 0.34);
    if (!p.D) p.D = darker(p.B, 0.3);
    if (!p.P) p.P = darker(p.A, 0.55);
    return p;
  }

  // ブロックの 大きさに 合わせた 影の あつさ（小さい ブロックは うすく）
  function rightFace(w) { return w >= 16 ? 5 : w >= 10 ? 4 : w >= 6 ? 3 : w >= 3 ? 2 : 0; }
  function bottomFace(h) { return h >= 16 ? 4 : h >= 10 ? 3 : h >= 6 ? 2 : h >= 3 ? 1 : 0; }

  function part(p, palette) {
    const flags = p[5] || '';
    const key = p[4];
    const color = (key && key.charAt(0) === '#') ? key : palette[key];
    if (!color) return null;

    const x = p[0], y = p[1], w = p[2], hh = p[3];
    const d = document.createElement('i');
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.width = w + 'px';
    d.style.height = hh + 'px';

    const sh = [];
    if (flags.indexOf('o') !== -1) {
      // まわりだけ（中は 空っぽ）
      d.style.background = 'transparent';
      sh.push('inset 0 0 0 ' + Math.max(3, Math.round(Math.min(w, hh) * 0.24)) + 'px ' + color);
    } else {
      d.style.background = color;
      if (flags.indexOf('n') === -1) {
        const rs = rightFace(w), bs = bottomFace(hh);
        if (rs) sh.push('inset ' + (-rs) + 'px 0 0 ' + darker(color, 0.3));
        if (bs) sh.push('inset 0 ' + (-bs) + 'px 0 rgba(0,0,0,.15)');
      }
    }
    if (flags.indexOf('g') !== -1) sh.push('0 0 6px ' + color);
    if (sh.length) d.style.boxShadow = sh.join(', ');
    if (flags.indexOf('d') !== -1) d.style.transform = 'rotate(45deg)';
    return d;
  }

  // 左上の 白い ハイライト
  function highlight(p) {
    const w = Math.min(7, Math.max(3, p[2] - 6));
    const hh = Math.min(5, Math.max(2, p[3] - 6));
    const d = document.createElement('i');
    d.style.left = (p[0] + 3) + 'px';
    d.style.top = (p[1] + 3) + 'px';
    d.style.width = w + 'px';
    d.style.height = hh + 'px';
    d.style.background = 'rgba(255,255,255,.5)';
    return d;
  }

  /* 絵 1つ。48×48（たからものは 40×40）の <div class="bx"> を かえす */
  function el(shape, colors, opts) {
    opts = opts || {};
    const palette = opts.raw ? (colors || {}) : fill(colors);
    const box = document.createElement('div');
    box.className = 'bx';
    const side = opts.base || BASE;
    box.style.width = side + 'px';
    box.style.height = side + 'px';
    (shape || []).forEach(function (p) {
      if (!p) return;
      const d = part(p, palette);
      if (!d) return;
      box.appendChild(d);
      if ((p[5] || '').indexOf('h') !== -1) box.appendChild(highlight(p));
    });
    return box;
  }

  /* 画面に おく 入れもの。size に 合わせて 拡大／縮小する */
  function box(shape, colors, opts) {
    opts = opts || {};
    const base = opts.base || BASE;
    const size = opts.size || base;
    const wrap = document.createElement('div');
    wrap.className = 'bxbox' + (opts.cls ? ' ' + opts.cls : '');
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    const inner = el(shape, colors, opts);
    inner.style.transform = 'scale(' + (size / base) + ')';
    wrap.appendChild(inner);
    return wrap;
  }

  /* 写真から 作った モンスターなど、どうしても 画像の ときの 入れもの */
  function imgBox(src, opts) {
    opts = opts || {};
    const size = opts.size || BASE;
    const wrap = document.createElement('div');
    wrap.className = 'bxbox' + (opts.cls ? ' ' + opts.cls : '');
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    const img = document.createElement('img');
    img.className = 'bxbox__png';
    img.src = src;
    img.alt = opts.alt || '';
    wrap.appendChild(img);
    return wrap;
  }

  return {
    el: el, box: box, imgBox: imgBox, fill: fill,
    mix: mix, darker: darker, lighter: lighter,
    BASE: BASE, ITEM: ITEM
  };
})();
