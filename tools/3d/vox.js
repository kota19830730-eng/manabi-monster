/* ---------------------------------------------------------
   2Dの ドット絵 → 3Dの ブロック（試作・v2）

   **絵は 1つも 描き直さない。**
   モンスターの 絵は もともと [よこ, たて, はば, 高さ, 色] の 四角の ならび
   （ぜんぶで 4328こ）なので、その 四角に 厚みを つけて 箱に する だけ。

   v1（1回目）で 息子さんに 言われた こと ＝ 直した ところ
     ①「主人公の 前に いろんな ものが 飛び出て 変」
        → **かさなりを 前後の ずれで 表して いた**（1つ 0.5px ずつ 手まえへ）。
          50この 四角が ある 絵では さいごの ものが **25px も 手まえ**に 浮いて いた。
          → やめた。**目・口・かざりは「うしろに ある 大きな 四角の 表面」に 貼る**
            （マイクラの テクスチャと 同じ 考え方。飛び出さない）。
     ②「ぜんたいに 奥行きが なくて ペラペラ」
        → 厚みが 小さい ほうの 辺の **0.9ばい・上限16** ＝ うすい 板だった。
          → **1.7ばい・上限 30**に して、**手まえと おくに 半分ずつ**のばす
            （前だけに のばすと「かべの レリーフ」に 見える）。
          → 主人公の 頭は **立方体**（顔の はば と 同じ 厚み）。

   前の 面 … いまの 色・もよう（そのまま）
   上の 面 … 明るく／下・右・左 … だんだん くらく
   うしろの 面は 作らない（見えない ので 数が 半分で すむ）
   --------------------------------------------------------- */
window.VOX = (function () {

  function toHex(c) {
    if (!c) return '#888888';
    if (c.charAt(0) === '#') return c;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return '#888888';
    const v = m[1].split(',').map(function (s) { return Math.round(parseFloat(s)); });
    return '#' + v.slice(0, 3).map(function (n) { return ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2); }).join('');
  }
  function mix(hex, to, k) {
    const n = parseInt(toHex(hex).slice(1), 16), m = parseInt(to.slice(1), 16);
    const out = [16, 8, 0].map(function (sh) {
      const a = (n >> sh) & 255, b = (m >> sh) & 255;
      return Math.round(a + (b - a) * k);
    });
    return '#' + out.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  const dark = function (c, k) { return mix(c, '#000000', k); };
  const light = function (c, k) { return mix(c, '#ffffff', k); };

  function face(w, h, color, tf, origin) {
    const f = document.createElement('div');
    f.className = 'f';
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    f.style.background = color;
    if (tf) f.style.transform = tf;
    if (origin) f.style.transformOrigin = origin;
    return f;
  }

  /* 四角 1つ → 箱 1つ。front＝前の 面の 位置、d＝厚み（うしろへ のびる） */
  function boxOf(x, y, w, h, front, d, src, back) {
    const col = toHex(src.style.backgroundColor);
    const b = document.createElement('div');
    b.className = 'b';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.style.width = w + 'px';
    b.style.height = h + 'px';
    b.style.transform = 'translateZ(' + front + 'px)' + (src.style.transform ? ' ' + src.style.transform : '');

    const f0 = face(w, h, col, null, null);
    if (src.style.backgroundImage) {
      f0.style.backgroundImage = src.style.backgroundImage;
      if (src.style.backgroundSize) f0.style.backgroundSize = src.style.backgroundSize;
      if (src.style.backgroundPosition) f0.style.backgroundPosition = src.style.backgroundPosition;
    }
    // 「にせの 立体」の 内がわの 影は はずす（本物の 面が ついた ので いらない）。
    // 光る ところの グロー（inset で ない 影）は のこす
    const sh = (src.style.boxShadow || '').split(/,(?![^(]*\))/)
      .filter(function (s) { return s.indexOf('inset') === -1 && s.trim(); });
    if (sh.length) f0.style.boxShadow = sh.join(',');
    if (src.className) f0.className = 'f ' + src.className;
    b.appendChild(f0);

    if (d > 0) {
      if (back) b.appendChild(face(w, h, dark(col, 0.45), 'translateZ(' + (-d) + 'px)', null));
      b.appendChild(face(d, h, dark(col, 0.30), 'translateX(' + w + 'px) rotateY(90deg)', 'left center'));
      b.appendChild(face(d, h, dark(col, 0.14), 'rotateY(90deg)', 'left center'));
      b.appendChild(face(w, d, light(col, 0.20), 'rotateX(90deg)', 'center top'));
      b.appendChild(face(w, d, dark(col, 0.40), 'translateY(' + h + 'px) rotateX(90deg)', 'center top'));
    }
    return b;
  }

  /* 厚み … **その 四角の はば**（上限＝絵ぜんたいの 厚み）。
     小さい ほうの 辺で 決めると、よこに 長い 体の 段が うすく なり
     ペラペラに 見える（1回目・2回目の 失敗）。 */
  function depthOf(w, h, max) {
    // はばで 決める。ただし **たてに うすい もの（おび・ひさし・はね）は うすい まま**に する
    // （はばだけで 決めると、よこ長の かざりが 体より 前に 飛び出す）
    return Math.max(3, Math.min(max || 18, Math.round(Math.min(w, h * 2.5) * 0.75)));
  }

  /* モンスター：いまの .bx（2Dの 絵）を そのまま 3Dに。

     **かさなりを 前後の ずれで 表さない。**
     小さい 四角（目・口・かざり）は、その 下に ある 大きな 四角の
     **表面に 貼る**（マイクラの テクスチャと 同じ）。
     大きな 四角は **まん中を そろえて 手まえと おくに 半分ずつ** のばす。 */
  function fromBx(bx, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'v3';
    wrap.style.width = bx.style.width || '48px';
    wrap.style.height = bx.style.height || '48px';
    const kids = Array.prototype.slice.call(bx.children);

    /* その 絵ぜんたいの 厚み ＝ 絵の たてよこの 小さい ほう × 0.5。
       よこに 長い 絵（馬など）が 立方体に ならない ように する ため。 */
    let x0 = 99, y0 = 99, x1 = 0, y1 = 0;
    kids.forEach(function (el) {
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      if (!w || !h) return;
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x + w > x1) x1 = x + w; if (y + h > y1) y1 = y + h;
    });
    const thick = Math.max(6, Math.min(18, Math.round(Math.min(x1 - x0, y1 - y0) * 0.42)));

    const placed = [];
    let n = 0;
    kids.forEach(function (el) {
      const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      if (!w || !h) return;
      const area = w * h;
      const d0 = depthOf(w, h, opts.max || thick);

      // 下に ある（さきに 描いた）大きな 四角を さがす
      let host = null, best = 0;
      placed.forEach(function (p) {
        const ox = Math.min(x + w, p.x + p.w) - Math.max(x, p.x);
        const oy = Math.min(y + h, p.y + p.h) - Math.max(y, p.y);
        if (ox <= 0 || oy <= 0) return;
        const cover = ox * oy;
        if (cover < area * 0.6) return;          // ほとんど かさなって いる ものだけ
        if (area > p.area * 0.5) return;         // 相手が じゅうぶん 大きい ときだけ
        if (cover > best) { best = cover; host = p; }
      });

      let front, d;
      if (host) {                                 // 目・口・かざり → 表面に 貼る
        d = Math.min(d0, 4);
        front = host.front + 0.12;
      } else {                                    // 体・頭・うで → まん中ぞろえ
        d = d0;
        front = d / 2;
      }
      wrap.appendChild(boxOf(x, y, w, h, front, d, el));
      placed.push({ x: x, y: y, w: w, h: h, area: area, front: front });
      n++;
    });
    wrap.dataset.boxes = n;
    return wrap;
  }

  /* ---------------- モンスター（CSS の 絵）----------------
     .bx の 中の 四角から **かたち（ぬって ある ところ）と 色**を 48マスの 表に して、
     主人公と 同じ やり方で 箱に する。前の 面は もとの .bx を そのまま かぶせる。 */
  function gridOf(bx, size) {
    const on = [], col = [];
    for (let i = 0; i < size * size; i++) { on.push(false); col.push('#888888'); }
    Array.prototype.slice.call(bx.children).forEach(function (el) {
      const bg = el.style.backgroundColor || '';
      // 左上の 白い ハイライト（すきとおる 白）は かたちに 数えない
      if (/rgba\([^)]*,\s*0?\.\d+\)/.test(bg)) return;
      const x = Math.round(parseFloat(el.style.left) || 0);
      const y = Math.round(parseFloat(el.style.top) || 0);
      const w = Math.round(parseFloat(el.style.width) || 0);
      const h = Math.round(parseFloat(el.style.height) || 0);
      if (!w || !h) return;
      const c = toHex(bg);
      for (let yy = y; yy < y + h; yy++) {
        if (yy < 0 || yy >= size) continue;
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || xx >= size) continue;
          on[yy * size + xx] = true;
          col[yy * size + xx] = c;
        }
      }
    });
    return { on: on, col: col, size: size };
  }

  // 四角の 表を そのまま 1枚の 画像に する（面に 貼る ため）
  function gridPng(g) {
    const cv = document.createElement('canvas');
    cv.width = g.size; cv.height = g.size;
    const cx = cv.getContext('2d');
    for (let y = 0; y < g.size; y++) {
      for (let x = 0; x < g.size; x++) {
        if (!g.on[y * g.size + x]) continue;
        cx.fillStyle = g.col[y * g.size + x];
        cx.fillRect(x, y, 1, 1);
      }
    }
    return cv.toDataURL('image/png');
  }

  /* かたちを 1行ずつ 四角に して、たてに つづく ぶんは まとめる。
     hero の heroBoxes と 同じ 考え方（あちらは 絵の 点、こちらは 四角の 表）。 */
  function solidBoxes(g, thick) {
    const size = g.size;
    const on = function (x, y) {
      return x >= 0 && y >= 0 && x < size && y < size && g.on[y * size + x];
    };
    const col = function (x, y) { return g.col[y * size + x]; };
    const mixCols = function (list) {
      if (!list.length) return '#888888';
      const a = [0, 0, 0];
      list.forEach(function (c) {
        const n = parseInt(c.slice(1), 16);
        a[0] += (n >> 16) & 255; a[1] += (n >> 8) & 255; a[2] += n & 255;
      });
      return '#' + a.map(function (v) {
        return ('0' + Math.round(v / list.length).toString(16)).slice(-2);
      }).join('');
    };
    const gaps = function (y, x, w) {
      const list = [];
      let st = -1;
      for (let k = 0; k < w; k++) {
        const open = !on(x + k, y);
        if (open && st < 0) st = k;
        if (!open && st >= 0) { list.push([st, k - st]); st = -1; }
      }
      if (st >= 0) list.push([st, w - st]);
      return list;
    };
    const rowCol = function (y, x, w) {
      const cs = [];
      for (let k = 0; k < w; k++) if (on(x + k, y)) cs.push(col(x + k, y));
      return mixCols(cs);
    };
    const rows = [];
    for (let y = 0; y < size; y++) {
      const runs = [];
      let x = 0;
      while (x < size) {
        if (!on(x, y)) { x++; continue; }
        let w = 1;
        while (x + w < size && on(x + w, y)) w++;
        runs.push([x, w]);
        x += w;
      }
      rows.push(runs);
    }
    const out = [];
    const done = rows.map(function (r) { return r.map(function () { return false; }); });
    for (let y = 0; y < size; y++) {
      rows[y].forEach(function (run, i) {
        if (done[y][i]) return;
        const x = run[0], w = run[1];
        let h = 1;
        while (y + h < size) {
          let j = -1;
          rows[y + h].forEach(function (r2, k) {
            if (j < 0 && !done[y + h][k] && r2[0] === x && r2[1] === w) j = k;
          });
          if (j < 0) break;
          done[y + h][j] = true;
          h++;
        }
        /* 上下の 行より はみ出して いる 段（はね・うで・ひれ）は うすく する。
           そのままだと はねが 体と 同じ ぶあつさに なって 板に 見える。 */
        let above = 0, below = 0;
        for (let xx = 0; xx < size; xx++) {
          if (on(xx, y - 1)) above++;
          if (on(xx, y + h)) below++;
        }
        const ref = Math.max(above, below);
        let dep = Math.min(thick, depthOf(w, h, 99));
        if (ref && w > ref * 1.3) dep = Math.max(3, Math.round(dep * Math.max(0.45, ref / w)));

        const L = [], R = [], T = [], B = [];
        for (let yy = y; yy < y + h; yy++) { L.push(col(x, yy)); R.push(col(x + w - 1, yy)); }
        for (let xx = x; xx < x + w; xx++) { T.push(col(xx, y)); B.push(col(xx, y + h - 1)); }
        out.push({
          x: x, y: y, w: w, h: h,
          d: dep,
          left: mixCols(L), right: mixCols(R), top: mixCols(T), bottom: mixCols(B),
          capTop: gaps(y - 1, x, w).map(function (a) { return a.concat([rowCol(y, x + a[0], a[1])]); }),
          capBottom: gaps(y + h, x, w).map(function (a) { return a.concat([rowCol(y + h - 1, x + a[0], a[1])]); })
        });
      });
    }
    return out;
  }

  /* モンスター 1体 → 3D。**絵（.bx）は 手まえに そのまま**、うしろに かたちの 箱。 */
  function fromBxSolid(bx, opts) {
    opts = opts || {};
    const size = Math.round(parseFloat(bx.style.width) || 48);
    const g = gridOf(bx, size);
    // ぜんたいの 厚み ＝ かたちの たてよこの 小さい ほう × 0.42（上限 18）
    let x0 = size, y0 = size, x1 = 0, y1 = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!g.on[y * size + x]) continue;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x + 1 > x1) x1 = x + 1;
        if (y + 1 > y1) y1 = y + 1;
      }
    }
    const thick = Math.max(6, Math.min(18, Math.round(Math.min(x1 - x0, y1 - y0) * 0.42)));
    const boxes = solidBoxes(g, thick);

    const png = gridPng(g);
    const wrap = document.createElement('div');
    wrap.className = 'v3';
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    boxes.forEach(function (r) {
      const box = document.createElement('div');
      box.className = 'b';
      box.style.left = r.x + 'px';
      box.style.top = r.y + 'px';
      box.style.width = r.w + 'px';
      box.style.height = r.h + 'px';
      // **まん中ぞろえ**（主人公と 同じ）。厚みは その ところの はばで 決まる
      box.style.transform = 'translateZ(' + (r.d / 2) + 'px)';
      const f0 = face(r.w, r.h, 'transparent', null, null);                      // 前＝絵を 切り出して 貼る
      f0.style.backgroundImage = 'url(' + png + ')';
      f0.style.backgroundSize = size + 'px ' + size + 'px';
      f0.style.backgroundPosition = (-r.x) + 'px ' + (-r.y) + 'px';
      f0.style.imageRendering = 'pixelated';
      box.appendChild(f0);
      if (r.w <= 1 || r.h <= 1) { wrap.appendChild(box); return; }
      box.appendChild(face(r.w, r.h, dark(r.left, 0.55), 'translateZ(' + (-r.d) + 'px)', null));
      box.appendChild(face(r.d, r.h, dark(r.right, 0.24), 'translateX(' + r.w + 'px) rotateY(90deg)', 'left center'));
      box.appendChild(face(r.d, r.h, dark(r.left, 0.10), 'rotateY(90deg)', 'left center'));
      r.capTop.forEach(function (a) {
        if (a[1] < 3) return;                                  // 1〜2マスの 段には つけない
        const cd = Math.min(r.d, 4);                           // ふたは ふちだけ（たなに しない）
        const f = face(a[1], cd, light(a[2], 0.12), 'rotateX(90deg)', 'center top');
        f.style.left = a[0] + 'px';
        box.appendChild(f);
      });
      r.capBottom.forEach(function (a) {
        if (true) return;                                       // うらの 面は つけない（棚に 見える）
        const cd = Math.min(r.d, Math.max(4, a[1] * 1.2));
        const f = face(a[1], cd, dark(a[2], 0.36), 'translateY(' + r.h + 'px) rotateX(90deg)', 'center top');
        f.style.left = a[0] + 'px';
        box.appendChild(f);
      });
      wrap.appendChild(box);
    });
    wrap.dataset.boxes = boxes.length;
    return wrap;
  }

  /* ---------------- 主人公（Canvas の 絵）----------------
     絵を 48マスで しらべて、1行ずつ「つながって いる ところ」を 四角に する。
     たてに 同じ 四角が つづく あいだは 1つに まとめる。
     帯（かみと頭／体・うで／足）ごとに 厚みを 変える＝マイクラの キャラと 同じ。 */
  function heroBoxes(img, bands) {
    const size = 48;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, size, size);
    const px = cx.getImageData(0, 0, size, size).data;
    const on = function (x, y) {
      return x >= 0 && y >= 0 && x < size && y < size && px[(y * size + x) * 4 + 3] >= 40;
    };
    const col = function (x, y) {
      const i = (y * size + x) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    };
    const hex = function (arr, n) {
      if (!n) return '#888888';
      return '#' + arr.map(function (v) { return ('0' + Math.round(v / n).toString(16)).slice(-2); }).join('');
    };
    const bandOf = function (y) {
      for (let i = 0; i < bands.length; i++) if (y < bands[i][0]) return i;
      return bands.length - 1;
    };
    // 1行ずつ つながって いる ところ
    const rows = [];
    for (let y = 0; y < size; y++) {
      const runs = [];
      let x = 0;
      while (x < size) {
        if (!on(x, y)) { x++; continue; }
        let w = 1;
        while (x + w < size && on(x + w, y)) w++;
        runs.push([x, w]);
        x += w;
      }
      rows.push(runs);
    }
    /* その 行（y）の x〜x+w で **絵が ない** ところの 区間。
       ここが「はみ出して いる ところ」＝ 上（下）の 面を つける ところ。 */
    const gaps = function (y, x, w) {
      const list = [];
      let st = -1;
      for (let k = 0; k < w; k++) {
        const open = !on(x + k, y);
        if (open && st < 0) st = k;
        if (!open && st >= 0) { list.push([st, k - st]); st = -1; }
      }
      if (st >= 0) list.push([st, w - st]);
      return list;
    };
    // その 行の その はんいの 色（面の 色を そこから とる）
    const rowColor = function (y, x, w) {
      const a = [0, 0, 0];
      let n = 0;
      for (let k = 0; k < w; k++) {
        if (!on(x + k, y)) continue;
        const c = col(x + k, y);
        a[0] += c[0]; a[1] += c[1]; a[2] += c[2]; n++;
      }
      return hex(a, n);
    };
    const out = [];
    const done = rows.map(function (r) { return r.map(function () { return false; }); });
    for (let y = 0; y < size; y++) {
      rows[y].forEach(function (run, i) {
        if (done[y][i]) return;
        let h = 1;
        while (y + h < size && bandOf(y + h) === bandOf(y)) {
          let j = -1;
          rows[y + h].forEach(function (r2, k) {
            if (j < 0 && !done[y + h][k] && r2[0] === run[0] && r2[1] === run[1]) j = k;
          });
          if (j < 0) break;
          done[y + h][j] = true;
          h++;
        }
        const x = run[0], w = run[1];
        // 面の 色は その ところの 絵から とる（1つの 平均色に すると 灰色の 箱に なる）
        const L = [0, 0, 0], R = [0, 0, 0], T = [0, 0, 0], B = [0, 0, 0];
        let n = 0;
        for (let yy = y; yy < y + h; yy++) {
          const l = col(x, yy), r = col(x + w - 1, yy);
          L[0] += l[0]; L[1] += l[1]; L[2] += l[2];
          R[0] += r[0]; R[1] += r[1]; R[2] += r[2];
          n++;
        }
        let m = 0;
        for (let xx = x; xx < x + w; xx++) {
          const t = col(xx, y), b2 = col(xx, y + h - 1);
          T[0] += t[0]; T[1] += t[1]; T[2] += t[2];
          B[0] += b2[0]; B[1] += b2[1]; B[2] += b2[2];
          m++;
        }
        out.push({
          x: x, y: y, w: w, h: h, band: bandOf(y),
          left: hex(L, n), right: hex(R, n), top: hex(T, m), bottom: hex(B, m),
          // 上（下）に 絵が ない ところ＝ほんとうの ふち（そこだけ 面を つける）
          capTop: gaps(y - 1, x, w).map(function (g) { return g.concat([rowColor(y, x + g[0], g[1])]); }),
          capBottom: gaps(y + h, x, w).map(function (g) { return g.concat([rowColor(y + h - 1, x + g[0], g[1])]); })
        });
      });
    }
    return out;
  }

  /* 主人公 … 頭は ぶあつく（立方体に 近い）、体と うでは その 半分、足は もっと うすく。
     前の 面には いまの 絵の その 場所を 切り出して 貼る。 */
  function fromHero(img, src, opts) {
    opts = opts || {};
    const U = opts.unit || 2;                                   // 48マス → 96マス
    const BANDS = opts.bands || [[22, 20], [34, 13], [48, 10]];  // [どこまで, 厚み]
    const boxes = heroBoxes(img, BANDS);
    const wrap = document.createElement('div');
    wrap.className = 'v3';
    wrap.style.width = (48 * U) + 'px';
    wrap.style.height = (48 * U) + 'px';
    boxes.forEach(function (r) {
      /* 厚みは 帯の 厚み。ただし **その 四角より 厚く しない**。
         かみの とんがり（はば10・高さ2）に 頭と 同じ 厚み 40を つけたら、
         手まえに のびる 板が ならんで「くまで」みたいに 見えた（実測で 見つけた）。 */
      const d = Math.min(BANDS[r.band][1] * U, depthOf(r.w * U, r.h * U, 99));
      const w = r.w * U, h = r.h * U;
      const box = document.createElement('div');
      box.className = 'b';
      box.style.left = (r.x * U) + 'px';
      box.style.top = (r.y * U) + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
      box.style.transform = 'translateZ(' + (d / 2) + 'px)';    // 手まえと おくに 半分ずつ

      const front = face(w, h, 'transparent', null, null);       // 前の 面＝いまの 絵
      front.style.backgroundImage = 'url(' + src + ')';
      front.style.backgroundSize = (48 * U) + 'px ' + (48 * U) + 'px';
      front.style.backgroundPosition = (-r.x * U) + 'px ' + (-r.y * U) + 'px';
      box.appendChild(front);

      if (r.w <= 1 || r.h <= 1) { wrap.appendChild(box); return; }   // 絵の まわりの 1マスの 線は 面を つけない
      const back = face(w, h, dark(r.left, 0.55), 'translateZ(' + (-d) + 'px)', null);
      box.appendChild(back);
      box.appendChild(face(d, h, dark(r.right, 0.22), 'translateX(' + w + 'px) rotateY(90deg)', 'left center'));
      box.appendChild(face(d, h, dark(r.left, 0.08), 'rotateY(90deg)', 'left center'));
      // 上・下は **はみ出して いる ところだけ**（はば いっぱいに つけると 灰色の たなに 見える）
      r.capTop.forEach(function (g) {
        if (g[1] < 2) return;
        const cd = Math.min(d, Math.max(4 * U, g[1] * U * 1.2));
        const f = face(g[1] * U, cd, light(g[2], 0.10), 'rotateX(90deg)', 'center top');
        f.style.left = (g[0] * U) + 'px';
        box.appendChild(f);
      });
      r.capBottom.forEach(function (g) {
        if (g[1] < 2) return;
        const cd = Math.min(d, Math.max(4 * U, g[1] * U * 1.2));
        const f = face(g[1] * U, cd, dark(g[2], 0.34), 'translateY(' + h + 'px) rotateX(90deg)', 'center top');
        f.style.left = (g[0] * U) + 'px';
        box.appendChild(f);
      });
      wrap.appendChild(box);
    });
    wrap.dataset.boxes = boxes.length;
    return wrap;
  }

  return { fromBx: fromBxSolid, fromBxParts: fromBx, fromHero: fromHero, boxOf: boxOf, depthOf: depthOf };
})();
