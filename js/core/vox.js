/* ---------------------------------------------------------
   2Dの ドット絵 → 3Dの ブロック（v12.0・ゲーム本体）
   もとは tools/3d/vox2.js（試作 v3）。ここが 正本（tools/3d の ページも これを 読む＝window.VOX2）。
   MQ.vox … fromBx（モンスター）／fromHero（主人公）／fromImage（写真の モンスター）／fromGroups（たからばこ）

   2Dの ドット絵 → 3Dの ブロック（試作 v3・「もっと よく」）

   vox.js（試作 v2・ユーザー「イイ感じ」）から 変えた ところ
     ① 前の 面に **本物の 2Dの 部品（<i>）を そのまま 貼る**
        → 金・宝石・ほねの 質感（v9.6）、光る 目の 呼吸・まばたき（v9.1）が 3Dでも のこる。
          v2 は 色だけの PNG を 貼って いた ので ぜんぶ 消えて いた。
     ② よこ・上・下の 面に **模様**（ふちの 色を 1行ずつ・おくほど 暗く・ざらつき）
        → v2 は 1色の べた塗り＝「のばした 板」に 見えた。
     ③ 光の むき（左上 手まえ）。上＝あたたかく 明るく／右・下＝すこし 青い かげ（v10.1 と 同じ 考え方）
     ④ **上の ふたは rotateX(-90deg)**（うしろへ）。v2 の rotateX(90deg) は **手まえに 出て いた**
        （scratchpad/axis.html で 実測）。だから ふたを 4px に 削って ごまかして いた。
        こんどは ふちの ふた 全部に 本物の 奥ゆきを つけても 飛び出さない。下の 面も つける。
     ⑤ うすい 行（高さ 1〜2）は となりの 行の 厚みを もらう（みぞに ならない）。
     ⑥ 足もとの 影（ゆかに おちる だ円）。

   絵は 1つも 描き直さない。ライブラリなし。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.vox = (function () {

  function toHex(c) {
    if (!c) return '#888888';
    if (c.charAt(0) === '#') return c;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return '#888888';
    const v = m[1].split(',').map(function (s) { return Math.round(parseFloat(s)); });
    return '#' + v.slice(0, 3).map(function (n) { return ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2); }).join('');
  }
  function rgb(hex) {
    const n = parseInt(toHex(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(a) {
    return '#' + a.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join('');
  }
  function mix(c, to, k) {
    const a = rgb(c), b = rgb(to);
    return hex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
  }
  function mixCols(list) {
    if (!list.length) return '#888888';
    const a = [0, 0, 0];
    list.forEach(function (c) { const r = rgb(c); a[0] += r[0]; a[1] += r[1]; a[2] += r[2]; });
    return hex(a.map(function (v) { return v / list.length; }));
  }

  /* 光：左上の 手まえから。上＝あたたかい 光、かげ＝すこし 青。
     数字は 面ごとの まぜる わりあい。 */
  const LIT = {
    top:    ['#fff2cc', 0.22],
    left:   ['#141a3a', 0.08],
    right:  ['#141a3a', 0.30],
    bottom: ['#0c1030', 0.48],
    back:   ['#000000', 0.55]
  };
  function lit(c, side) { const l = LIT[side]; return mix(c, l[0], l[1]); }
  function hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

  /* 面の 模様を Canvas で 作る（1マス＝1点。CSS で のばして pixelated）。
     cols … 手まえの ふちの 色の ならび（行 or 列 ごと）
     along … 奥ゆき（点の 数）、across … cols の 数
     dir … 'x'＝奥ゆきが よこ（左右の 面）／'y'＝奥ゆきが たて（上下の 面） */
  function texture(cols, along, side, dir) {
    const across = cols.length;
    const w = dir === 'x' ? along : across, h = dir === 'x' ? across : along;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = dir === 'x' ? i : j;           // 奥ゆきの 位置 0..along-1
        const c = dir === 'x' ? cols[j] : cols[i];
        let col = rgb(lit(c, side));
        // おくほど 暗く（AO）。手まえ 35% は そのまま
        const t = along > 1 ? k / (along - 1) : 0;
        const ao = t < 0.35 ? 0 : (t - 0.35) / 0.65 * 0.30;
        // ざらつき（とびとび・±6%）
        const g = (Math.floor(hash(i + w * 7, j + h * 13) * 3) - 1) * 0.06;
        const f = (1 - ao) * (1 + g);
        cx.fillStyle = hex([col[0] * f, col[1] * f, col[2] * f]);
        cx.fillRect(i, j, 1, 1);
      }
    }
    return cv.toDataURL('image/png');
  }

  function face(w, h, tf, origin) {
    const f = document.createElement('div');
    f.className = 'f';
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    if (tf) f.style.transform = tf;
    if (origin) f.style.transformOrigin = origin;
    return f;
  }
  function texFace(w, h, tf, origin, png) {
    const f = face(w, h, tf, origin);
    f.style.backgroundImage = 'url(' + png + ')';
    f.style.backgroundSize = '100% 100%';
    f.style.imageRendering = 'pixelated';
    return f;
  }

  /* ---------------- かたちの 表 ---------------- */
  function gridOf(bx, size) {
    const on = [], col = [];
    for (let i = 0; i < size * size; i++) { on.push(false); col.push('#888888'); }
    Array.prototype.slice.call(bx.children).forEach(function (el) {
      const bg = el.style.backgroundColor || '';
      if (/rgba\([^)]*,\s*0?\.\d+\)/.test(bg)) return;     // すきとおる ハイライトは かたちに 数えない
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
  function gridOfImage(img, size) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, size, size);
    const px = cx.getImageData(0, 0, size, size).data;
    const on = [], col = [];
    for (let i = 0; i < size * size; i++) {
      on.push(px[i * 4 + 3] >= 40);
      col.push(hex([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]));
    }
    return { on: on, col: col, size: size };
  }

  function depthOf(w, h, max) {
    return Math.max(3, Math.min(max || 18, Math.round(Math.min(w, h * 2.5) * 0.75)));
  }

  /* かたちを 1行ずつ 四角に して たてに まとめる（vox.js と 同じ）＋ 面の 色は 1行（1列）ずつ とる */
  function solidBoxes(g, thick, bandOf, uniform) {
    const size = g.size;
    const on = function (x, y) { return x >= 0 && y >= 0 && x < size && y < size && g.on[y * size + x]; };
    const col = function (x, y) { return g.col[y * size + x]; };
    const band = bandOf || function () { return 0; };
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
    const gaps = function (y, x, w) {      // その 行の x〜x+w で 絵が ない 区間 ＝ ふちの ふたを つける ところ
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
    const out = [];
    const done = rows.map(function (r) { return r.map(function () { return false; }); });
    for (let y = 0; y < size; y++) {
      rows[y].forEach(function (run, i) {
        if (done[y][i]) return;
        let x = run[0], w = run[1];
        const tol = uniform ? 1 : 0;                 // 主人公は 1マスの ちがいまで 同じ 箱に まとめる
        const runsOf = [run];                        // 行ごとの ほんとうの はんい（ふちの 色を とる ため）
        let h = 1;
        while (y + h < size && band(y + h) === band(y)) {
          let j = -1;
          rows[y + h].forEach(function (r2, k) {
            if (j < 0 && !done[y + h][k] && Math.abs(r2[0] - x) <= tol && Math.abs(r2[0] + r2[1] - (x + w)) <= tol) j = k;
          });
          if (j < 0) break;
          done[y + h][j] = true;
          const r2 = rows[y + h][j];
          runsOf.push(r2);
          const nx = Math.min(x, r2[0]), nx1 = Math.max(x + w, r2[0] + r2[1]);
          x = nx; w = nx1 - nx;
          h++;
        }
        let above = 0, below = 0;
        for (let xx = 0; xx < size; xx++) { if (on(xx, y - 1)) above++; if (on(xx, y + h)) below++; }
        const ref = Math.max(above, below);
        const cap = typeof thick === 'function' ? thick(band(y)) : thick;
        let dep = Math.min(cap, depthOf(w, h, 99));
        if (ref && w > ref * 1.3) dep = Math.max(3, Math.round(dep * Math.max(0.45, ref / w)));   // はね・うでは うすく
        const L = [], R = [], T = [], B = [];
        runsOf.forEach(function (rr, k) { L.push(col(rr[0], y + k)); R.push(col(rr[0] + rr[1] - 1, y + k)); });
        const edgeCol = function (xx, yy, rr) { return on(xx, yy) ? col(xx, yy) : col(xx < rr[0] ? rr[0] : rr[0] + rr[1] - 1, yy); };
        for (let xx = x; xx < x + w; xx++) { T.push(edgeCol(xx, y, runsOf[0])); B.push(edgeCol(xx, y + h - 1, runsOf[runsOf.length - 1])); }
        out.push({
          x: x, y: y, w: w, h: h, d: dep, band: band(y), thin: h <= 2 || w <= 1, ref: ref,
          L: L, R: R, T: T, B: B,
          capTop: gaps(y - 1, x, w), capBottom: gaps(y + h, x, w)
        });
      });
    }
    let maxW = 0;
    out.forEach(function (r) { if (r.w > maxW) maxW = r.w; });
    /* 主人公（uniform）：帯の 中は **ぜんぶ 同じ 厚み**。行ごとに 厚みが ちがうと 前の 面が
       前後に 段に なり、頭が よこの 線で 切れて 見える（ユーザー「頭が 線で 切れてる」）。
       はば が ぜんたいの 3割 みまん の もの（かみの とんがり など）だけ 自分の はばで 決める
       （頭と 同じ 厚みに すると「くまで」に なる＝v2 の 教訓）。 */
    if (uniform) {
      const res = [];
      /* 箱の x〜x+w の ぶんだけ 面の 色を とり直す（分けた 部品 用） */
      const sub = function (r, x, w) {
        const o = { x: x, y: r.y, w: w, h: r.h, band: r.band, thin: r.thin, ref: r.ref, L: [], R: [], T: [], B: [] };
        const pick = function (xx, yy) {
          if (on(xx, yy)) return col(xx, yy);
          let k = 1;                                              // その 行で いちばん 近い ぬって ある マス
          while (k < size) { if (on(xx - k, yy)) return col(xx - k, yy); if (on(xx + k, yy)) return col(xx + k, yy); k++; }
          return '#888888';
        };
        for (let yy = r.y; yy < r.y + r.h; yy++) { o.L.push(pick(x, yy)); o.R.push(pick(x + w - 1, yy)); }
        for (let xx = x; xx < x + w; xx++) { o.T.push(pick(xx, r.y)); o.B.push(pick(xx, r.y + r.h - 1)); }
        o.capTop = gaps(r.y - 1, x, w);
        o.capBottom = gaps(r.y + r.h, x, w);
        return o;
      };
      out.forEach(function (r) {
        const cap = typeof thick === 'function' ? thick(r.band) : thick;
        const full = r.w >= maxW * 0.3 ? cap : Math.min(cap, depthOf(r.w, r.h, 99));
        if (!(r.ref && r.w > r.ref * 1.3)) { r.d = full; res.push(r); return; }
        /* 上下の 行より 大きく はみ出す 段（ひれ・はね・うで）。
           v2 は 行ごと うすく して いた ので、顔の ある 行まで 引っこんで **目の 高さに 線**が 出た（サメオニ）。
           → 上下の 行が ある はんい（まん中）は 同じ 厚み、はみ出した 左右だけ うすく。 */
        let cx0 = size, cx1 = 0;
        [r.y - 1, r.y + r.h].forEach(function (yy) {
          for (let xx = r.x; xx < r.x + r.w; xx++) if (on(xx, yy)) { if (xx < cx0) cx0 = xx; if (xx + 1 > cx1) cx1 = xx + 1; }
        });
        if (cx1 - cx0 < 3) { r.d = Math.max(3, Math.round(full * Math.max(0.45, r.ref / r.w))); res.push(r); return; }
        const thin = Math.max(3, Math.min(full, Math.round(Math.min(depthOf(Math.max(r.x + r.w - cx1, cx0 - r.x), r.h, 99), full * 0.6))));
        if (cx0 > r.x) { const p = sub(r, r.x, cx0 - r.x); p.d = thin; p.side = 'L'; res.push(p); }
        const core = sub(r, cx0, cx1 - cx0); core.d = full; res.push(core);
        if (cx1 < r.x + r.w) { const p = sub(r, cx1, r.x + r.w - cx1); p.d = thin; p.side = 'R'; res.push(p); }
      });
      return res;
    }
    /* うすい 行（高さ 1〜2）は 上下の となりの 厚みを もらう（v2 では 厚み 3 の みぞに なって いた） */
    out.forEach(function (r) {
      if (!r.thin) return;
      let best = 0;
      out.forEach(function (o) {
        if (o === r || o.thin) return;
        const touch = (o.y + o.h === r.y) || (r.y + r.h === o.y);
        const ox = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
        if (touch && ox > 0 && o.d > best) best = o.d;
      });
      if (best) r.d = Math.min(best, Math.max(r.d, Math.round(best * 0.9)));
    });
    return out;
  }

  /* 箱 r を x〜x+w の ぶんだけに 切りとる（面の 色・ふたも とり直す）。主人公の うで・あし 用 */
  function subBox(g, r, x, w) {
    const size = g.size;
    const on = function (xx, yy) { return xx >= 0 && yy >= 0 && xx < size && yy < size && g.on[yy * size + xx]; };
    const col = function (xx, yy) { return g.col[yy * size + xx]; };
    const pick = function (xx, yy) {
      if (on(xx, yy)) return col(xx, yy);
      let k = 1;
      while (k < size) { if (on(xx - k, yy)) return col(xx - k, yy); if (on(xx + k, yy)) return col(xx + k, yy); k++; }
      return '#888888';
    };
    const gaps = function (yy, x0, w0) {
      const list = [];
      let st = -1;
      for (let k = 0; k < w0; k++) {
        const open = !on(x0 + k, yy);
        if (open && st < 0) st = k;
        if (!open && st >= 0) { list.push([st, k - st]); st = -1; }
      }
      if (st >= 0) list.push([st, w0 - st]);
      return list;
    };
    const o = { x: x, y: r.y, w: w, h: r.h, d: r.d, band: r.band, thin: r.thin, ref: r.ref, side: r.side, L: [], R: [], T: [], B: [] };
    for (let yy = r.y; yy < r.y + r.h; yy++) { o.L.push(pick(x, yy)); o.R.push(pick(x + w - 1, yy)); }
    for (let xx = x; xx < x + w; xx++) { o.T.push(pick(xx, r.y)); o.B.push(pick(xx, r.y + r.h - 1)); }
    o.capTop = gaps(r.y - 1, x, w);
    o.capBottom = gaps(r.y + r.h, x, w);
    return o;
  }
  /* 箱を x の 切れ目（cuts）で 分ける。切れ目が 箱の 中に ない ときは そのまま */
  function splitCols(g, r, cuts) {
    const xs = [r.x].concat(cuts.filter(function (c) { return c > r.x && c < r.x + r.w; })).concat([r.x + r.w]);
    if (xs.length === 2) return [r];
    const out = [];
    for (let i = 0; i + 1 < xs.length; i++) out.push(subBox(g, r, xs[i], xs[i + 1] - xs[i]));
    return out;
  }

  /* 部品（かんせつで 回す グループ）。
     parts … [{ cls, joint: [x, y]（かんせつ・48マスの 座標）, boxes: [], parent: 'body' }]
     箱は 部品の 中に 入り、部品は transform-origin が かんせつ に なる。 */
  function partNode(p, U) {
    const d = document.createElement('div');
    d.className = 'p p--' + p.cls;
    d.style.transformOrigin = (p.joint[0] * U) + 'px ' + (p.joint[1] * U) + 'px ' + ((p.jz || 0) * U) + 'px';   // jz＝奥ゆき（たからばこの ふたは うしろの へり）
    return d;
  }
  function assemble(wrap, parts, U, makeBox) {
    /* 同じ 名前の 部品（あし 4本＝legA×2・legB×2）は それぞれ 別の かんせつ。親は その 名前の さいしょの 部品 */
    const first = {};
    parts.forEach(function (p) { p.node = partNode(p, U); if (!first[p.cls]) first[p.cls] = p.node; });
    parts.forEach(function (p) {
      p.boxes.forEach(function (r) { p.node.appendChild((p.make || makeBox)(r, p.cls)); });
      (p.parent && first[p.parent] ? first[p.parent] : wrap).appendChild(p.node);
    });
    wrap.dataset.parts = parts.map(function (p) { return p.cls + ':' + p.boxes.length; }).join(' ');
  }

  /* モンスターの 部品を 形から 自動で 見つける：
       あし … ゆかに ついて いる 細い 箱（2つ いじょう ある とき）。左から A/B こうたい
       はね … 「はみ出す 段」を 左右に 分けた 部品（side つき）
       体   … のこり ぜんぶ（かんせつは 足もとの まん中）
     頭は 分けない（顔だけの モンスターが 多く、頭だけ 動かすと 顔が 切れる）。 */
  function rigMonster(boxes, b) {
    const maxW = boxes.reduce(function (m, r) { return Math.max(m, r.w); }, 0);
    const legs = boxes.filter(function (r) { return r.y + r.h === b.y1 && r.w < maxW * 0.35 && r.h >= 2 && !r.side; })
      .sort(function (p, q) { return p.x - q.x; });
    const useLegs = legs.length >= 2 ? legs : [];
    boxes.forEach(function (r) {
      if (r.side || useLegs.indexOf(r) >= 0) return;
      if (r.w > maxW * 0.2 || r.h < 3 || r.y + r.h === b.y1) return;
      if (r.x === b.x0) r.side = 'L';
      else if (r.x + r.w === b.x1) r.side = 'R';
    });
    const wings = boxes.filter(function (r) { return r.side && useLegs.indexOf(r) < 0; });
    const body = boxes.filter(function (r) { return useLegs.indexOf(r) < 0 && wings.indexOf(r) < 0; });
    const cx = (b.x0 + b.x1) / 2;
    const parts = [{ cls: 'body', joint: [cx, useLegs.length ? useLegs[0].y : b.y1], boxes: body }];
    useLegs.forEach(function (r, i) {
      parts.push({ cls: 'leg' + (i % 2 ? 'B' : 'A'), joint: [r.x + r.w / 2, r.y], boxes: [r] });
    });
    wings.forEach(function (r) {
      parts.push({ cls: 'wing' + r.side, joint: [r.side === 'L' ? r.x + r.w : r.x, r.y + r.h / 2], boxes: [r], parent: 'body' });
    });
    return parts;
  }

  /* 箱 1つ。front … 前の 面（DOM）。 */
  function buildBox(r, U, front) {
    const w = r.w * U, h = r.h * U, d = r.d * U;
    const box = document.createElement('div');
    box.className = 'b';
    box.style.left = (r.x * U) + 'px';
    box.style.top = (r.y * U) + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.transform = 'translateZ(' + (d / 2) + 'px)';          // まん中ぞろえ（手まえと おくに 半分ずつ）
    box.appendChild(front);
    if (r.w <= 1 && r.h <= 1) return box;
    const dp = Math.max(2, Math.round(r.d));                          // 模様の 点の 数（奥ゆき）
    // うしろ
    const back = face(w, h, 'translateZ(' + (-d) + 'px)', null);
    back.style.background = lit(mixCols(r.L.concat(r.R)), 'back');
    box.appendChild(back);
    // 右・左（rotateY(90deg) は うしろへ のびる）
    box.appendChild(texFace(d, h, 'translateX(' + w + 'px) rotateY(90deg)', 'left center', texture(r.R, dp, 'right', 'x')));
    box.appendChild(texFace(d, h, 'rotateY(90deg)', 'left center', texture(r.L, dp, 'left', 'x')));
    /* 上・下の 面は **はば いっぱい**に つける（rotateX(-90deg) ＝ うしろへ。+90 だと 手まえに 出る）。
       となりの 箱に かくれる ぶんは 見えないので むだは ない。ふちだけに すると 箱の 中が あいて いて、
       かんせつで 回した とき（たおれる・歩く）に 中＝前の 面の うら（顔）が 見えた（ユーザー「首に 顔が ある」）。 */
    box.appendChild(texFace(w, d, 'rotateX(-90deg)', 'center top', texture(r.T, dp, 'top', 'y')));
    box.appendChild(texFace(w, d, 'translateY(' + h + 'px) rotateX(-90deg)', 'center top', texture(r.B, dp, 'bottom', 'y')));
    return box;
  }

  /* 足もとの 影（ゆかに ねかせた だ円） */
  function floorShadow(size, thick, x0, x1, y1) {
    const w = (x1 - x0) * 1.15, dz = thick * 2.4;
    const f = face(w, dz, 'translateZ(' + (dz / 2) + 'px) rotateX(-90deg)', 'center top');
    f.className = 'f v3__shadow';
    f.style.left = (x0 - (w - (x1 - x0)) / 2) + 'px';
    f.style.top = (y1 + 0.5) + 'px';
    f.style.background = 'radial-gradient(ellipse at center, rgba(0,0,0,.42), rgba(0,0,0,.18) 55%, rgba(0,0,0,0) 72%)';
    return f;
  }

  function wrapOf(px) {
    const wrap = document.createElement('div');
    wrap.className = 'v3';
    wrap.style.width = px + 'px';
    wrap.style.height = px + 'px';
    return wrap;
  }
  function bounds(g) {
    let x0 = g.size, y0 = g.size, x1 = 0, y1 = 0;
    for (let y = 0; y < g.size; y++) for (let x = 0; x < g.size; x++) {
      if (!g.on[y * g.size + x]) continue;
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1;
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  /* ---------------- モンスター（.bx）----------------
     前の 面は **もとの <i> の 写し**（その 箱に かかる ものだけ）を 切りぬいて 貼る。 */
  /* 1つの .bx から「箱の ならび」と「箱を 作る 関数」を 出す（fromBx と fromGroups の 共通部分） */
  function builder(bx, U, cap, bandOf) {
    const size = Math.round(parseFloat(bx.style.width) || 48);
    const g = gridOf(bx, size);
    const b = bounds(g);
    const thick = Math.max(6, Math.min(18, Math.round(Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.42)));
    const boxes = solidBoxes(g, cap || thick, bandOf || null, true);
    const parts = Array.prototype.slice.call(bx.children).map(function (el) {
      return {
        el: el,
        x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
        w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0
      };
    });
    /* 部品の 写しを 48マスの 座標の まま 置いて、層ごと scale(U) する（2Dの 拡大なので くっきり）。
       箱に すっぽり 入る 光る 部品（目・コア）は **切りぬかない 層**に 置く
       （切りぬくと グローが 四角い 帯に 見える）。それ いがいは 箱の 形に 切りぬく。 */
    const inner = function (r, clip) {
      const f = face(r.w * U, r.h * U, null, null);
      f.className = 'f fr' + (clip ? ' fr--clip' : ' fr--free');
      if (clip) {
        f.style.overflow = 'hidden';
        const cv = document.createElement('canvas');
        cv.width = 2; cv.height = r.h;
        const cx = cv.getContext('2d');
        for (let k = 0; k < r.h; k++) {
          cx.fillStyle = r.L[k] || r.L[0]; cx.fillRect(0, k, 1, 1);
          cx.fillStyle = r.R[k] || r.R[0]; cx.fillRect(1, k, 1, 1);
        }
        f.style.backgroundImage = 'url(' + cv.toDataURL('image/png') + ')';
        f.style.backgroundSize = '100% 100%';
        f.style.imageRendering = 'pixelated';
      }
      const lay = document.createElement('div');
      lay.className = 'bx';
      lay.style.cssText = 'position:absolute;left:0;top:0;width:' + r.w + 'px;height:' + r.h + 'px;transform:scale(' + U + ');transform-origin:0 0;';
      f.appendChild(lay);
      return { f: f, lay: lay, n: 0 };
    };
    const makeBox = function (r) {
      const clip = inner(r, true), free = inner(r, false);
      parts.forEach(function (p) {
        if (!p.w || !p.h) return;
        if (p.x >= r.x + r.w || p.x + p.w <= r.x || p.y >= r.y + r.h || p.y + p.h <= r.y) return;
        const inside = p.x >= r.x && p.x + p.w <= r.x + r.w && p.y >= r.y && p.y + p.h <= r.y + r.h;
        const glow = /bx__glow/.test(p.el.className);
        const c = p.el.cloneNode(true);
        c.style.left = (p.x - r.x) + 'px';
        c.style.top = (p.y - r.y) + 'px';
        const to = (glow && inside) ? free : clip;
        to.lay.appendChild(c);
        to.n++;
      });
      const box = buildBox(r, U, clip.f);
      if (free.n) box.insertBefore(free.f, clip.f.nextSibling);
      return box;
    };
    return { size: size, g: g, b: b, thick: thick, boxes: boxes, makeBox: makeBox };
  }

  function fromBx(bx, opts) {
    opts = opts || {};
    const U = opts.unit || 1;                                          // 1マス＝何px で 作るか（表示の 大きさで 作る＝ぼやけない）
    const bd = builder(bx, U, opts.max);
    const wrap = wrapOf(bd.size * U);
    if (opts.shadow !== false) wrap.appendChild(floorShadow(bd.size * U, bd.thick * U, bd.b.x0 * U, bd.b.x1 * U, bd.b.y1 * U));
    assemble(wrap, rigMonster(bd.boxes, bd.b), U, bd.makeBox);
    wrap.dataset.boxes = bd.boxes.length;
    return wrap;
  }

  /* ---------------- 部品ごとに 別の 絵から 組む（たからばこ など）----------------
     groups … [{ cls, bx（その 部品だけの .bx）, joint: [x, y], jz, parent, thick }]
     同じ 行に ちがう 部品（ふたの 中の 金貨 など）が ある ときは、1つの 絵から 切り分けられない ので
     部品ごとに 絵を 分けて わたす。箱の 作り方（面の 模様・前の 面の 写し）は fromBx と 同じ。 */
  function fromGroups(groups, opts) {
    opts = opts || {};
    const U = opts.unit || 1;
    let size = 48, x0 = 999, x1 = 0, y1 = 0, thick = 0;
    const parts = groups.map(function (gr) {
      const bd = builder(gr.bx, U, gr.thick || opts.max);
      size = bd.size;
      if (gr.floor !== false) { x0 = Math.min(x0, bd.b.x0); x1 = Math.max(x1, bd.b.x1); y1 = Math.max(y1, bd.b.y1); thick = Math.max(thick, gr.thick || bd.thick); }
      return { cls: gr.cls, joint: gr.joint, jz: gr.jz, parent: gr.parent, boxes: bd.boxes, make: bd.makeBox };
    });
    const wrap = wrapOf(size * U);
    if (opts.shadow !== false && x1 > x0) wrap.appendChild(floorShadow(size * U, thick * U, x0 * U, x1 * U, y1 * U));
    assemble(wrap, parts, U, null);
    wrap.dataset.boxes = parts.reduce(function (n, p) { return n + p.boxes.length; }, 0);
    return wrap;
  }

  /* ---------------- 主人公（Canvas の 絵）----------------
     帯（かみと頭／体・うで／足）ごとに 厚みを 変える。前の 面は 絵を 切り出して 貼る（96マス）。 */
  function fromHero(img, src, opts) {
    opts = opts || {};
    const U = opts.unit || 2;
    /* 帯：頭 20／体 13／足 13（マイクラの キャラも 体と 足は 同じ 厚み。足だけ うすいと 帯の さかいめに 線が 出る）
       体（22〜35）と 足（36〜）は 部品を 分ける ために 帯も 分ける */
    const BANDS = opts.bands || [[22, 20], [36, 13], [48, 13]];
    /* face.js の きまり：からだ x15〜32／左うで x9〜14／右うで x33〜38／あし 16〜23・24〜31 */
    const CUT = { armL: 15, armR: 33, leg: 24, neck: 22, hip: 36, headL: 11, headR: 36, shoeR: 34, sword: 36 };
    const SWORD_W = 5, SWORD_D = 4;   // 刃＝はば 5マス いかの 箱を 厚み 4 に（13 → 4・2026-09-10）   // 右の くつは x24〜33 なので 足の 行の 右うでは 34 から   // 頭の 行で 顔（かみ 12〜35）の 外＝けん・たて
    const g = gridOfImage(img, 48);
    const b = bounds(g);
    const bandOf = function (y) { for (let i = 0; i < BANDS.length; i++) if (y < BANDS[i][0]) return i; return BANDS.length - 1; };
    const boxes = solidBoxes(g, function (band) { return BANDS[band][1]; }, bandOf, true);
    const wrap = wrapOf(48 * U);
    if (opts.shadow !== false) {
      const sh = floorShadow(48 * U, 14 * U, b.x0 * U, b.x1 * U, b.y1 * U);
      wrap.appendChild(sh);
    }
    const P = { head: [], body: [], armL: [], armR: [], legL: [], legR: [], sword: [] };
    boxes.forEach(function (r) {
      if (r.band === 0) {
        /* 頭の 行でも かみの 外がわ（けん・たて）は うでの 部品に（頭に 入れると うでを ふった とき けんが 折れる）。厚みも うでと 同じに */
        splitCols(g, r, [CUT.headL, CUT.headR]).forEach(function (q) {
          if (q.x + q.w <= CUT.headL) { q.d = BANDS[1][1]; P.armL.push(q); }
          else if (q.x >= CUT.headR) { q.d = BANDS[1][1]; P.armR.push(q); }
          else P.head.push(q);
        });
        return;
      }
      if (r.band === 1) {
        splitCols(g, r, [CUT.armL, CUT.armR]).forEach(function (q) {
          (q.x + q.w <= CUT.armL ? P.armL : q.x >= CUT.armR ? P.armR : P.body).push(q);
        });
        return;
      }
      /* 足の 行でも あしの 外がわ（けんの つか・手・たての 下）は うで（つかを 足に 入れると うでを ふった とき つかが 折れる） */
      splitCols(g, r, [CUT.armL, CUT.leg, CUT.shoeR]).forEach(function (q) {
        if (q.x + q.w <= CUT.armL) { q.d = BANDS[1][1]; P.armL.push(q); }
        else if (q.x >= CUT.shoeR) { q.d = BANDS[1][1]; P.armR.push(q); }
        else (q.x + q.w <= CUT.leg ? P.legL : P.legR).push(q);
      });
    });
    /* けん（x36〜）は 右うでの 子＝手首の かんせつ（手の まん中 37,33）で 回る。
       うでと いっしょに 回すだけだと、ふりかぶった とき 刃が 頭の うしろに 下がって「ふり上げて いない」ように 見える */
    const armR = [];
    P.armR.forEach(function (r) {
      splitCols(g, r, [CUT.sword]).forEach(function (q) {
        if (q.x < CUT.sword) { armR.push(q); return; }
        /* 刃（はば 5マス いか）は うすく（ユーザー「剣の厚さが厚すぎる」）。うでと 同じ 13 だと 板に 見える。
           手・つば（はば 6 いじょう）は うでと 同じ 厚みの まま＝にぎった こぶし */
        if (q.w <= SWORD_W) q.d = SWORD_D;
        P.sword.push(q);
      });
    });
    P.armR = armR;
    const parts = [
      { cls: 'body', joint: [24, CUT.hip], boxes: P.body },
      { cls: 'head', joint: [23.5, CUT.neck], boxes: P.head, parent: 'body' },
      { cls: 'armL', joint: [12, CUT.neck], boxes: P.armL, parent: 'body' },
      { cls: 'armR', joint: [35.5, CUT.neck], boxes: P.armR, parent: 'body' },
      { cls: 'sword', joint: [37, 33], boxes: P.sword, parent: 'armR' },
      { cls: 'legA', joint: [19.5, CUT.hip], boxes: P.legL },
      { cls: 'legB', joint: [28, CUT.hip], boxes: P.legR }
    ];
    const makeBox = function (r, cls) {
      const front = face(r.w * U, r.h * U, null, null);
      // 下じき：左半分は 左の ふちの 色・右半分は 右の ふちの 色（行ごと）
      const cv = document.createElement('canvas');
      cv.width = 2; cv.height = r.h;
      const cx = cv.getContext('2d');
      for (let k = 0; k < r.h; k++) {
        cx.fillStyle = r.L[k] || r.L[0]; cx.fillRect(0, k, 1, 1);
        cx.fillStyle = r.R[k] || r.R[0]; cx.fillRect(1, k, 1, 1);
      }
      front.style.backgroundImage = 'url(' + src + '), url(' + cv.toDataURL('image/png') + ')';
      front.style.backgroundSize = (48 * U) + 'px ' + (48 * U) + 'px, 100% 100%';
      front.style.backgroundPosition = (-r.x * U) + 'px ' + (-r.y * U) + 'px, 0 0';
      front.style.imageRendering = 'pixelated';
      const box = buildBox(r, U, front);
      const back = box.children[1];
      const isBack = back && /translateZ\(-/.test(back.style.transform);
      if (isBack && cls === 'head') {
        back.style.background = lit(mixCols(r.T), 'back');             // 頭の うしろ＝かみの 色（顔を うつさない）
      } else if (isBack && cls !== 'body') {
        back.style.backgroundImage = 'linear-gradient(rgba(10,14,40,.38), rgba(10,14,40,.38)), url(' + src + ')';
        back.style.backgroundSize = 'auto, ' + (48 * U) + 'px ' + (48 * U) + 'px';
        back.style.backgroundPosition = '0 0, ' + (-r.x * U) + 'px ' + (-r.y * U) + 'px';
        back.style.imageRendering = 'pixelated';
      }
      return box;
    };
    assemble(wrap, parts, U, makeBox);
    wrap.dataset.boxes = boxes.length;
    return wrap;
  }

  /* ---------------- 写真の モンスター（<img>・v12.0）----------------
     絵が PNG（monstergen の 48マス／古い 64・96マス）なので、主人公と 同じく 絵を 切り出して 前の 面に 貼る。
     部品は モンスターと 同じ 自動（rigMonster）。 */
  function fromImage(img, src, opts) {
    opts = opts || {};
    const U = opts.unit || 1;
    const size = opts.size || Math.min(img.naturalWidth || 48, 64);
    const g = gridOfImage(img, size);
    const b = bounds(g);
    if (b.x1 <= b.x0 || b.y1 <= b.y0) return null;
    const thick = Math.max(6, Math.min(18, Math.round(Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.42)));
    const boxes = solidBoxes(g, opts.max || thick, null, true);
    const wrap = wrapOf(size * U);
    if (opts.shadow !== false) wrap.appendChild(floorShadow(size * U, thick * U, b.x0 * U, b.x1 * U, b.y1 * U));
    const makeBox = function (r) {
      const front = face(r.w * U, r.h * U, null, null);
      front.style.backgroundImage = 'url(' + src + ')';
      front.style.backgroundSize = (size * U) + 'px ' + (size * U) + 'px';
      front.style.backgroundPosition = (-r.x * U) + 'px ' + (-r.y * U) + 'px';
      front.style.imageRendering = 'pixelated';
      return buildBox(r, U, front);
    };
    assemble(wrap, rigMonster(boxes, b), U, makeBox);
    wrap.dataset.boxes = boxes.length;
    wrap.dataset.grid = size;
    return wrap;
  }

  return { fromBx: fromBx, fromHero: fromHero, fromImage: fromImage, fromGroups: fromGroups, depthOf: depthOf, texture: texture, lit: lit, rigMonster: rigMonster };
})();
window.VOX2 = MQ.vox;   // tools/3d の 検査ページ・デモ用の べつ名
