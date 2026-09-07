/* ---------------------------------------------------------
   ドット絵を 描く

   絵は 文字の マス目で 書いてあります。
     '.' … 何もない（すける）
     それ以外の文字 … palette で 色を決める
   それを 小さな PNG 画像にして、画面では CSS で 大きく表示します
   （image-rendering: pixelated で ドットが くっきり出ます）。

   かさねる 絵（layer）は こう書きます：
     { rows: [...], palette: {...}, ox: 0, oy: 3 }
   ox / oy は「右へ／下へ 何マス ずらして 描くか」。
   これが あるので、顔の パーツは 目の ぶんの 2行だけ、のように
   ひつような 行数だけ 書けば すみます。

   opts で 切り取りも できます：
     { w: 18, h: 12, dx: -3, dy: 0 }   … 18×12 の 大きさに、
                                          ぜんぶを 左に3マス ずらして 描く
   （＝ 顔だけの 小さい絵を 作るのに 使っています）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.pixel = (function () {
  const cache = {};

  /* =======================================================
     HD（v9.4）… 2倍の こまかさで 描く

     ユーザー（息子さん）「キャラの グラフィックが 上がった 気が しない」。
     v9.1 で 変えたのは **ぬり方**だけで、点の 数は 48×48 の ままだった。
     ここでは **1点を 2×2 に 分けて 96×96 で 描き**、あいた こまかさに

       ・素材の 質感（かみの すじ・ぬのの おり・金ぞくの ななめの 光…）
       ・**色の さかいめの 立体**（同じ 色の かたまりの ふちを 2だんかいで 明暗）
       ・目の ハイライト
       ・まわりの こい ふち（v9.1 の rim を 半分の 太さで）

     を 入れる。**マス目（かたち）は 1つも 動かさない**ので、
     いままでの 顔・かみがた・そうびが そのまま 使える。

     どの 素材かは 呼ぶ 側（hero.js）が `layer.mat` で 教える：
       mat: 'skin'                     … その 層は ぜんぶ その 素材
       mat: { c: 'cloth', b: 'gold' }  … 文字ごと（書いて ない 文字は cloth）
     ======================================================= */
  const MATS = ['none', 'skin', 'hair', 'cloth', 'wood', 'metal', 'gold', 'white', 'iris', 'glow', 'mouth'];
  const MAT_ID = {};
  MATS.forEach(function (m, i) { MAT_ID[m] = i; });

  /* マイクラ風（v9.7）… ユーザー「目が怖いわ。マイクラ風でお願いします」

     v9.4 の しあげは **なめらかな グラデーション＋ひとみの 光の 点**だった。
     これが つやつやした「作りものの 目」に 見えて こわかった。
     マイクラの テクスチャは そうでは ない：

       ① 面は **平ら**。中に なめらかな 明暗を つけない
       ② ゆらぎは **とびとび（3段階）**で、**もとの 1マス（＝2サブ）ごとの かたまり**
          （1サブごとの こまかい ゆらぎは 84px で つぶれて「網目」に 見える）
       ③ 立体は **ふちの 1サブだけ**（上・左が 明るい／下・右が くらい）
       ④ **目・口は 何も しない**（FLAT）。光の 点も グラデも つけない

     ここを もどすと また「つやつや」に なる。 */
  const FLAT = {};                                  // 平らな まま にする 素材
  [MAT_ID.iris, MAT_ID.white, MAT_ID.mouth].forEach(function (m) { FLAT[m] = 1; });

  // いつも 同じ ゆらぎ（描き直しても ちらつかない）
  function grain(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = (h ^ (h >>> 13)) * 1274126177;
    return (((h ^ (h >>> 16)) >>> 0) % 1000) / 1000 - 0.5;    // -0.5 〜 0.5
  }
  /* とびとびの ゆらぎ。**もとの 1マスごと**の かたまりで -1／0／+1 を かえす。
     （マイクラの テクスチャは 同じ 色みの 数だんかいを ばらまいて あるだけ） */
  function step3(X, Y) {
    const v = grain(X >> 1, Y >> 1);
    return v < -0.18 ? -1 : (v > 0.18 ? 1 : 0);
  }
  // 金ぞく・金の きらり（ぽつんと 明るい マス。ななめの すじには しない）
  function glint(X, Y) { return grain((X >> 1) + 977, (Y >> 1) - 311) > 0.42; }
  /* 同じ ものの 明るい面・くらい面（c と C、h と k …）は **1つの かたまり**と 見なす。
     でないと ぬのの ざらつき 1つ 1つに ふちの 明暗が ついて、
     マイクラの 平らな テクスチャでは なく「ぼこぼこ」に 見える。 */
  function region(ch) {
    const c = ch.charCodeAt(0);
    return (c >= 65 && c <= 90) ? c + 32 : c;                  // 大文字は 小文字に そろえる
  }

  function renderHD(layers, opts) {
    const SUB = Math.max(2, opts.hd | 0);
    const base = layers[0].rows;
    const bw = opts.w || base[0].length;
    const bh = opts.h || base.length;
    const W = bw * SUB, H = bh * SUB;
    const dx = opts.dx || 0, dy = opts.dy || 0;

    const R = new Uint8ClampedArray(W * H), G = new Uint8ClampedArray(W * H), B = new Uint8ClampedArray(W * H);
    const on = new Uint8Array(W * H);         // 絵が あるか
    const mt = new Uint8Array(W * H);         // 素材
    const rg = new Int32Array(W * H);         // 同じ 色の かたまりの 印

    layers.forEach(function (layer, li) {
      if (!layer) return;
      const fn = typeof layer.palette === 'function';
      const mat = layer.mat;
      const matStr = (typeof mat === 'string') ? (MAT_ID[mat] || 3) : 0;

      /* rows2 … **はじめから 96マスで 描いた 層**（v9.4 の のこり課題・案③）。
         もとの 48マスを 2倍に のばすのでは なく、こまかい かたち（白目・ひとみの 光・
         かみの すじ）を そのまま 置く。1つずつ 置きかえて いける ように、
         rows2 が ある 層だけ こちらを 通る。 */
      if (layer.rows2) {
        const ox2 = (layer.ox || 0) * SUB + dx * SUB, oy2 = (layer.oy || 0) * SUB + dy * SUB;
        for (let y = 0; y < layer.rows2.length; y++) {
          const row = layer.rows2[y];
          const Y = y + oy2;
          if (Y < 0 || Y >= H) continue;
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === '.' || ch === ' ') continue;
            // palette が 関数（レインボーの かみ）の ときは **もとの 48マスの 場所**を わたす
            const hex = fn ? layer.palette(ch, x / SUB, y / SUB) : layer.palette[ch];
            if (!hex) continue;
            const X = x + ox2;
            if (X < 0 || X >= W) continue;
            const n = parseInt(hex.slice(1), 16);
            const i = Y * W + X;
            R[i] = (n >> 16) & 255; G[i] = (n >> 8) & 255; B[i] = n & 255;
            on[i] = 1;
            mt[i] = matStr || (mat ? (MAT_ID[mat[ch]] || 3) : 3);
            rg[i] = li * 256 + region(ch);
          }
        }
        return;
      }

      const ox = (layer.ox || 0) + dx, oy = (layer.oy || 0) + dy;
      for (let y = 0; y < layer.rows.length; y++) {
        const row = layer.rows[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const hex = fn ? layer.palette(ch, x, y) : layer.palette[ch];
          if (!hex) continue;
          const n = parseInt(hex.slice(1), 16);
          const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
          const m = matStr || (mat ? (MAT_ID[mat[ch]] || 3) : 3);
          const key = li * 256 + region(ch);
          for (let sy = 0; sy < SUB; sy++) {
            const Y = (y + oy) * SUB + sy;
            if (Y < 0 || Y >= H) continue;
            for (let sx = 0; sx < SUB; sx++) {
              const X = (x + ox) * SUB + sx;
              if (X < 0 || X >= W) continue;
              const i = Y * W + X;
              R[i] = r; G[i] = g; B[i] = b; on[i] = 1; mt[i] = m; rg[i] = key;
            }
          }
        }
      }
    });

    const out = new Uint8ClampedArray(W * H * 4);
    const idx = function (X, Y) { return (X < 0 || Y < 0 || X >= W || Y >= H) ? -1 : Y * W + X; };

    for (let Y = 0; Y < H; Y++) {
      for (let X = 0; X < W; X++) {
        const i = Y * W + X;
        if (!on[i]) continue;
        let k = 0;
        const m = mt[i];

        // ---- 目・口は 平らな まま（マイクラの 顔。つやを つけない）----
        if (!FLAT[m]) {
          // ---- 素材の ゆらぎ（とびとび・1マスの かたまり）----
          const s = step3(X, Y);
          if (m === MAT_ID.skin)  k += s * 0.030;
          else if (m === MAT_ID.hair)  k += s * 0.075;
          else if (m === MAT_ID.cloth) k += s * 0.055;
          else if (m === MAT_ID.wood)  k += s * 0.070;
          else if (m === MAT_ID.metal) { k += s * 0.070; if (glint(X, Y)) k += 0.12; }
          else if (m === MAT_ID.gold)  { k += s * 0.075; if (glint(X, Y)) k += 0.18; }
          else if (m === MAT_ID.glow)  k += 0.10 + s * 0.040;
          else k += s * 0.045;

          // ---- 立体は ふちの 1サブだけ（中は 平ら）----
          const key = rg[i];
          const diff = function (X2, Y2) { const j = idx(X2, Y2); return j < 0 || rg[j] !== key; };
          if (diff(X, Y - 1)) k += 0.16;
          if (diff(X - 1, Y)) k += 0.09;
          if (diff(X, Y + 1)) k -= 0.18;
          if (diff(X + 1, Y)) k -= 0.10;
        }

        if (k > 0.7) k = 0.7; else if (k < -0.5) k = -0.5;
        const j = i * 4;
        out[j]     = k >= 0 ? R[i] + (255 - R[i]) * k : R[i] * (1 + k);
        out[j + 1] = k >= 0 ? G[i] + (255 - G[i]) * k : G[i] * (1 + k);
        out[j + 2] = k >= 0 ? B[i] + (255 - B[i]) * k : B[i] * (1 + k);
        out[j + 3] = 255;
      }
    }

    // ---- まわりの ふち（となりの 色を こく した もの。v9.1 の rim を 1点＝半分の 太さで）----
    if (opts.rim !== false) {
      const rim = (opts.rim === true || opts.rim == null) ? 0.5 : opts.rim;
      for (let Y = 0; Y < H; Y++) {
        for (let X = 0; X < W; X++) {
          const i = Y * W + X;
          if (on[i]) continue;
          let j = -1;
          const at = [[X, Y + 1], [X - 1, Y], [X + 1, Y], [X, Y - 1]];
          for (let n = 0; n < at.length; n++) {
            const q = idx(at[n][0], at[n][1]);
            if (q >= 0 && on[q]) { j = q; break; }
          }
          if (j < 0) continue;
          const o = i * 4;
          out[o] = R[j] * (1 - rim); out[o + 1] = G[j] * (1 - rim); out[o + 2] = B[j] * (1 - rim); out[o + 3] = 255;
        }
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx.createImageData) {
      const img = ctx.createImageData(W, H);
      img.data.set(out);
      ctx.putImageData(img, 0, 0);
    } else {
      // node の テスト（tools/smoke.js）の にせ Canvas は createImageData を もたない。
      // 1点ずつ ぬる 道も のこして おく（本物の ブラウザでは 上を 通る）
      for (let Y = 0; Y < H; Y++) {
        for (let X = 0; X < W; X++) {
          const j = (Y * W + X) * 4;
          if (!out[j + 3]) continue;
          ctx.fillStyle = 'rgb(' + out[j] + ',' + out[j + 1] + ',' + out[j + 2] + ')';
          ctx.fillRect(X, Y, 1, 1);
        }
      }
    }
    return canvas.toDataURL('image/png');
  }

  // layers: [{ rows, palette, ox, oy }, ...] を 重ねて 1枚の画像にする
  function render(layers, opts) {
    opts = opts || {};
    if (opts.hd) return renderHD(layers, opts);
    const base = layers[0].rows;
    const width = opts.w || base[0].length;
    const height = opts.h || base.length;
    const dx = opts.dx || 0;
    const dy = opts.dy || 0;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    layers.forEach(function (layer) {
      if (!layer) return;
      const ox = (layer.ox || 0) + dx;
      const oy = (layer.oy || 0) + dy;
      // palette は { 文字: 色 } か、function(文字, x, y) → 色（レインボーの かみ など）
      const fn = typeof layer.palette === 'function';
      for (let y = 0; y < layer.rows.length; y++) {
        const row = layer.rows[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const color = fn ? layer.palette(ch, x, y) : layer.palette[ch];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x + ox, y + oy, 1, 1);
        }
      }
    });
    if (opts.outline || opts.bevel) polish(ctx, width, height, opts);
    return canvas.toDataURL('image/png');
  }

  /* -------------------------------------------------------
     ふち取り と 立体感（モンスターを カッコよく 見せる ため）
       outline … まわりを 1マス 黒く かこむ
       bevel   … 上が あいている ところは 明るく、
                 下が あいている ところは くらく する
     どちらも Canvas の 上で あとから かける ので、
     絵の データ（文字の マス目）は さわりません。
     ------------------------------------------------------- */
  function polish(ctx, w, hh, opts) {
    let img;
    try { img = ctx.getImageData(0, 0, w, hh); } catch (e) { return; }
    const src = img.data;
    const out = new Uint8ClampedArray(src);
    const A = function (x, y) {
      if (x < 0 || y < 0 || x >= w || y >= hh) return 0;
      return src[(y * w + x) * 4 + 3];
    };
    const oc = opts.outline ? [
      parseInt(opts.outline.slice(1, 3), 16),
      parseInt(opts.outline.slice(3, 5), 16),
      parseInt(opts.outline.slice(5, 7), 16)
    ] : null;
    // rim … となりの 色を こく した ふち（黒では ない）。
    // モンスター（blocks.js）と 同じ かんがえ方で、かたちが しまる。
    const rim = opts.rim ? (opts.rim === true ? 0.45 : opts.rim) : 0;
    function neighbor(x, y) {
      const at = [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]];   // 下 → 横 → 上 の 順で さがす
      for (let n = 0; n < at.length; n++) {
        const nx = at[n][0], ny = at[n][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= hh) continue;
        const j = (ny * w + nx) * 4;
        if (src[j + 3] !== 0) return j;
      }
      return -1;
    }

    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] === 0) {
          // すきま。まわりに 絵が あれば ふちを つける
          if (oc && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) {
            out[i] = oc[0]; out[i + 1] = oc[1]; out[i + 2] = oc[2]; out[i + 3] = 255;
          } else if (rim) {
            const j = neighbor(x, y);
            if (j >= 0) {
              for (let c = 0; c < 3; c++) out[i + c] = src[j + c] * (1 - rim);
              out[i + 3] = 255;
            }
          }
          continue;
        }
        if (!opts.bevel) continue;
        let k = 0;
        if (!A(x, y - 1)) k = 0.34;          // 上が あいている → 明るく
        else if (!A(x, y + 1)) k = -0.30;    // 下が あいている → くらく
        else if (!A(x - 1, y)) k = 0.16;
        else if (!A(x + 1, y)) k = -0.16;
        if (!k) continue;
        for (let c = 0; c < 3; c++) {
          const v = src[i + c];
          out[i + c] = k > 0 ? v + (255 - v) * k : v * (1 + k);
        }
      }
    }
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
  }

  // 同じ絵は 一度だけ 作る（key で 覚えておく）
  function url(key, layers, opts) {
    if (!cache[key]) cache[key] = render(layers, opts);
    return cache[key];
  }

  // 黒い影だけの絵（図鑑で まだ見ていない敵に 使う）
  function silhouette(rows, color) {
    return {
      rows: rows.map(function (row) { return row.replace(/[^.\s]/g, 'X'); }),
      palette: { X: color || '#2A3556' }
    };
  }

  return { render: render, url: url, silhouette: silhouette };
})();
