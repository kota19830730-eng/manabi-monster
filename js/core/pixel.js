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

  // layers: [{ rows, palette, ox, oy }, ...] を 重ねて 1枚の画像にする
  function render(layers, opts) {
    opts = opts || {};
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

    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] === 0) {
          // すきま。まわりに 絵が あれば ふちを つける
          if (oc && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) {
            out[i] = oc[0]; out[i + 1] = oc[1]; out[i + 2] = oc[2]; out[i + 3] = 255;
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
