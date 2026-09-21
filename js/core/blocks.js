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
  /* 光る ところが これより 多い 絵は「呼吸」させない（v14.16・下の el() を 見る）。
     12 に すると 止まるのは ラスボス 5体と テンショウトリ・テンガイキリンだけで、
     310体 中 303体は いままで どおり 呼吸する（実測して 決めた 数）。 */
  const GLOW_ANIM_MAX = 12;
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
  // 上の 面（光が あたる ところ）。右・下の 暗い面と 合わせて「3面」に なる
  function topFace(h) { return h >= 16 ? 3 : h >= 10 ? 2 : h >= 6 ? 1 : 0; }

  /* -------------------------------------------------------
     マイクラ風の こまかい ざらつき（テクスチャ）

     1マスの 中が べた塗りだと のっぺりして 見えるので、
     4px の マスで ほんの少し 明るさを ばらつかせます。
     色ごとに 作ると 重いので、**すきとおる 白と 黒だけの
     タイルを 1枚**だけ 作って、どの 色の 上にも かさねます。
     ------------------------------------------------------- */
  const NOISE = (function () {
    const N = 16, cell = 4;          // 16px の タイル（4px の マス 4×4）
    let s = 20260907;                // いつも 同じ もように なる ように
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    let rects = '';
    for (let y = 0; y < N; y += cell) {
      for (let x = 0; x < N; x += cell) {
        const r = rnd();
        // 4マスの うち 1〜2マスだけ 明るく／暗く（うすく）
        const c = r < 0.22 ? 'rgba(255,255,255,.085)'
                : r > 0.80 ? 'rgba(0,0,0,.075)' : null;
        if (!c) continue;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="' + c + '"/>';
      }
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + N + '" height="' + N + '">' + rects + '</svg>';
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  })();

  /* -------------------------------------------------------
     HD の 材質（v9.6）

     ユーザー「モンスターも HD化して ほしい」。
     モンスターは **CSS の div**（`.bx i`）なので、大きくしても ぼやけません。
     足りないのは 点の 数では なく **四角 1つの 中の 情報**でした
     （1体 へいきん 16.8この 四角＝ぜんぶ べた塗り）。

     そこで **色の キーごとに「何で できて いるか」**を のせます。
     CSS の グラデーションなので `.bx` を scale しても **かどが ぼやけません**
     （＝どの 大きさでも HD）。

       金・鉄（y・s）   … ななめの 光の すじ（みがいた 金ぞく）
       宝石・光（r・e） … 左上の まるい ハイライト
       ほね・白（w）    … うすい ななめの つや
       ぬの（m・W）     … こまかい ななめの おりめ
       体（A/B/C/D）    … いままでの ざらつき（NOISE）の まま

     **絵の データ（四角の ならび）は 1つも さわって いません。**
     小さく 出す とき（ずかんの 52px＝plain）は のせない＝220体が 軽い。
     ------------------------------------------------------- */
  const MAT_BY_KEY = { y: 'metal', s: 'metal', r: 'gem', e: 'gem', w: 'bone', m: 'cloth', W: 'cloth',
                       A: 'body', B: 'body', C: 'body', D: 'body',
                       G: 'body', Y: 'body' };   // G・Y＝ABC3きょうだいの 緑と 黄色（v13.21）
  const MAT = {
    metal: 'linear-gradient(116deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.40) 42%, rgba(255,255,255,.12) 50%, rgba(255,255,255,0) 62%)',
    gem:   'radial-gradient(ellipse at 32% 26%, rgba(255,255,255,.55), rgba(255,255,255,0) 62%)',
    bone:  'linear-gradient(152deg, rgba(255,255,255,.24), rgba(255,255,255,0) 55%)',
    cloth: 'repeating-linear-gradient(56deg, rgba(0,0,0,.09) 0 1px, rgba(255,255,255,.06) 1px 2.5px)',
    // 体は 「面が 光を うけて いる」だけ。強くすると まるく なって マイクラらしさが 消える
    body:  'linear-gradient(178deg, rgba(255,255,255,.13), rgba(255,255,255,0) 38%, rgba(0,0,0,.10))'
  };

  function part(p, palette, plain, isEye) {
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
    const glow = flags.indexOf('g') !== -1;
    if (flags.indexOf('o') !== -1) {
      // まわりだけ（中は 空っぽ）
      d.style.background = 'transparent';
      sh.push('inset 0 0 0 ' + Math.max(3, Math.round(Math.min(w, hh) * 0.24)) + 'px ' + color);
    } else {
      d.style.backgroundColor = color;
      if (flags.indexOf('n') === -1) {
        const rs = rightFace(w), bs = bottomFace(hh), ts = topFace(hh);
        // 上の 面は 明るく（光が あたる がわ）
        if (ts) sh.push('inset 0 ' + ts + 'px 0 ' + lighter(color, 0.22));
        if (rs) sh.push('inset ' + (-rs) + 'px 0 0 ' + darker(color, 0.3));
        if (bs) sh.push('inset 0 ' + (-bs) + 'px 0 rgba(0,0,0,.15)');
        // まわりの ふち。黒では なく **同じ 色みの こい色**（かたちが しまる）。
        // **6px より 細い ブロックには つけない**。わけは 2つ：
        //   ・立体の 影と 同じ 考え方（rightFace / bottomFace も 小さい ものには つけない）
        //   ・**立体を つける ブロックの 42%（1996こ 中 831こ）が 6px 未満**なので、
        //     ここを 省くと ずかんの 220体が ならぶ ところが かるく なる
        // 見た目は 52〜96px（じっさいに 出す 大きさ）では ほとんど 変わらない
        // ＝ 実測ずみ。scratchpad の rimtest.html で 6ばい と 実寸を くらべた
        if (w >= 6 && hh >= 6) sh.push('0 0 0 1px ' + darker(color, 0.45));
        // 大きな 面だけ ざらつきを のせる（小さい 目や 歯は そのまま）。
        // 小さく 出す とき（ずかんの タイル 52px など）は 見えないので つけない
        // ＝ 220体が ならぶ ところが 軽く なる
        // 材質（v9.6）と ざらつきを かさねる。
        // **材質は 小さく 出す とき（ずかんの 52px）にも のせる**。
        // 210体を ならべて 実測して 18.4ms → 22.4ms＝＋4ms しか 変わらない ので、
        // 図かんでも 金や 宝石が 光った ほうが よい。
        // ざらつき（NOISE）は 前どおり 大きい ときだけ（小さいと 見えない）。
        const layers = [];
        if (w >= 5 && hh >= 5) {
          const mat = MAT[MAT_BY_KEY[key]];
          if (mat) layers.push(mat);
        }
        if (!plain && w >= 10 && hh >= 10) layers.push(NOISE);
        if (layers.length) d.style.backgroundImage = layers.join(', ');
      }
    }
    if (glow) sh.push('0 0 6px ' + color, '0 0 14px ' + color);
    if (sh.length) d.style.boxShadow = sh.join(', ');
    if (flags.indexOf('d') !== -1) d.style.transform = 'rotate(45deg)';
    // 光る ところ（目・コア）は 呼吸するように 明るさが 変わる
    if (glow) d.className = 'bx__glow';
    else if (isEye) d.className = 'bx__eye';
    return d;
  }

  /* まばたきさせる ブロックを 形ぜんたいから えらぶ。

     1つずつ 見て 決めると、歯・くちばし・белい おなかまで 消えて しまう。
     そこで **絵ぜんたいを 見て「いちばん 上の 目の 行」だけ**を えらぶ：

       ① 光る ブロック（g）が 顔の あたりに ある モンスターは **まばたきしない**
          （その 子の 目は 光る ほう。`.bx__glow` が 明滅する）
       ② のこりの 候補＝上半分（y 2〜22）の 小さな（9×11 まで）白か 黒 の 四角
       ③ その 中で **いちばん 上の 行**（さいしょの y から 3px 以内）だけ
       ④ それが 4つ いじょう なら やめる（たぶん 目では なく もよう）

     かえり値は「まばたきさせる ブロック」の Set（絵の 中の 番号） */
  function pickEyes(shape) {
    const out = {};
    if (!shape || !shape.length) return out;
    let glow = false;
    const cand = [];
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      if (!p) continue;
      const f = p[5] || '';
      if (f.indexOf('g') !== -1 && p[1] <= 24) { glow = true; continue; }
      if (f.indexOf('d') !== -1 || f.indexOf('o') !== -1) continue;
      if (p[1] < 2 || p[1] > 22) continue;
      if (p[2] > 9 || p[3] > 11) continue;
      if (p[4] !== 'w' && p[4] !== 'k') continue;
      cand.push(i);
    }
    if (glow || !cand.length) return out;
    let top = 48;
    cand.forEach(function (i) { if (shape[i][1] < top) top = shape[i][1]; });
    const keep = cand.filter(function (i) { return shape[i][1] <= top + 3; });
    if (keep.length > 4) return out;      // ならんだ もよう。目では ない
    keep.forEach(function (i) { out[i] = true; });
    return out;
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
    // まばたき・明滅の タイミングを 1体ずつ ずらす（みんな 同時だと 気もちわるい）
    box.style.setProperty('--bxwait', (Math.random() * 6.5).toFixed(2) + 's');
    const eyes = pickEyes(shape);
    (shape || []).forEach(function (p, i) {
      if (!p) return;
      const d = part(p, palette, opts.plain, eyes[i]);
      if (!d) return;
      box.appendChild(d);
      if ((p[5] || '').indexOf('h') !== -1) box.appendChild(highlight(p));
    });
    /* v14.16：光る ところが とても 多い 絵は「呼吸」（bxGlow）を させない。
       bxGlow は filter（明るさ）を 動かす ので、動く たびに その 場所を 塗り直す。
       ラスボスは 光る ところが 23〜54こ も あり（ふつうの モンスターは 0〜8こ）、
       タブレットの ボス戦で **メモに 字を 書く 反応**が 落ちて いた
       （実測：main の しごと −37%・style −46%）。光そのもの（box-shadow）は そのまま。 */
    const gl = box.querySelectorAll('.bx__glow');
    if (gl.length > GLOW_ANIM_MAX) {
      Array.prototype.forEach.call(gl, function (g) { g.classList.add('bx__glow--still'); });
    }
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
    // 小さく 出す ときは ざらつきを 省く（見えない ので）
    if (size < 56 && opts.plain == null) opts = Object.assign({}, opts, { plain: true });
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
    pickEyesTest: pickEyes,          // 道具（まばたきの 検査）から 見る ため
    mix: mix, darker: darker, lighter: lighter,
    BASE: BASE, ITEM: ITEM
  };
})();
