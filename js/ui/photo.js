/* ---------------------------------------------------------
   写真から じぶんの モンスターを つくる（v2.7 で 作り直し）

   ① カメラで 紙に かいた 絵を とる
   ② わくは 自動で 絵に 合わせる（手でも 動かせる）
   ③ 紙を すけさせて、線を のこしたまま ドット絵に する
   ④ なまえと 出てくる エリアを えらぶ
   ⑤ つぎの バトルから ほんとうに 出てくる／図かんにも のる

   v2.6 までは 24マスに ちぢめて 明るさで 紙を 消していたので、
   細い 線が 消えて「ぜんぜん ちがう 姿」に なっていた（息子さんの 感想）。
   v2.7 の 作りかた：
     ・切りぬいた ところを 320px に して しらべる
     ・紙の 明るさは 場所ごとに 見る（かげが あっても OK）
     ・紙は「外から つながっている ところ」だけ 消す（目の 白は のこる）
     ・64マス（48／96 も えらべる）に 落とすとき、マスの 中に 1つでも
       こい線が あれば 線の 色に する（線が 消えない）
     ・色は 絵に ある 色から 16色を えらんで そろえる（ドット絵らしく）
     ・絵の まわりの 余白を 切って、マスいっぱいに 入れる

   写真は 外に 送りません。小さな ドット絵だけを タブレットの 中に
   ほぞんします（1体 数キロバイト）。

   v2.8「AIで かっこよく する」：おうちの人が おうちの人ページで AIの かぎを
   入れた ときだけ、金の ボタンが 出る。切りぬいた 絵を Google の 画像AI に
   送って「絵に 忠実な まま ゲームの モンスターらしく」かき直して もらい、
   その 絵を 上の しくみで ドット絵に する（js/core/ai.js）。
   「もとの しゃしんに もどす」で AI前に もどれる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.photo = (function () {
  const h = MQ.util.h;
  const WORK = 320;                 // しらべる ときの 大きさ
  const SIZES = [[48, 'あらい'], [64, 'ふつう'], [96, 'こまかい']];
  let size = 64;                    // ドット絵の マス数
  let img = null;                   // 読みこんだ 写真
  let crop = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };   // わく（0〜1の わりあい）
  let tol = 55;                     // 紙と 見なす 近さ（大きいほど よく 消える）
  let inkLv = 50;                   // 線の こさ（大きいほど 線を ひろう）
  let outUrl = '';
  let lastInfo = null;              // できあがりの 情報（テスト用）
  // AI（v2.8）
  const SEND = 640;                 // AIに 送る 絵の 大きさ（正方形）
  let origImg = null;               // AIに 送る 前の 写真（もどす 用）
  let origCrop = null;
  let aiBusy = false;               // AIに たのんで まっている
  let aiUsed = false;               // いまの 絵は AIが かいた もの
  let aiError = '';

  /* =======================================================
     しらべる 道具
     ======================================================= */
  function lumOf(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

  /* 場所ごとの「紙の 明るさ」。8×8 の ますに 分けて、明るい ほうから
     1割めの 明るさを その ますの 紙と 考え、あいだは なめらかに つなぐ */
  function paperMap(p, w, hh) {
    const G = 8;
    const cw = w / G, ch = hh / G;
    const cells = [];
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const arr = [];
        const x0 = Math.floor(gx * cw), y0 = Math.floor(gy * ch);
        const x1 = Math.floor((gx + 1) * cw), y1 = Math.floor((gy + 1) * ch);
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * w + x) * 4;
            arr.push(lumOf(p[i], p[i + 1], p[i + 2]));
          }
        }
        arr.sort(function (a, b) { return b - a; });
        cells.push(arr[Math.floor(arr.length * 0.1)] || 255);
      }
    }
    // 暗い ます（絵で うまっている）は まわりの 明るい ますに 合わせる
    const all = cells.slice().sort(function (a, b) { return b - a; });
    const bright = all[Math.floor(all.length * 0.25)];
    for (let i = 0; i < cells.length; i++) if (cells[i] < bright - 60) cells[i] = bright;
    return function (x, y) {
      const fx = Math.max(0, Math.min(G - 1, x / cw - 0.5));
      const fy = Math.max(0, Math.min(G - 1, y / ch - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(G - 1, x0 + 1), y1 = Math.min(G - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const a = cells[y0 * G + x0] * (1 - tx) + cells[y0 * G + x1] * tx;
      const b = cells[y1 * G + x0] * (1 - tx) + cells[y1 * G + x1] * tx;
      return a * (1 - ty) + b * ty;
    };
  }

  /* 紙か どうかの マスク → 外から つながる 紙だけ「背景」に する（目の 白は のこす）
     かえり値：Uint8Array（1 = 絵の 一部） */
  function foregroundMask(p, w, hh, tolerance) {
    const paper = paperMap(p, w, hh);
    const isPaper = new Uint8Array(w * hh);
    const tolL = 30 + tolerance * 1.1;          // 明るさの ゆるさ
    const tolS = 28 + tolerance * 0.55;         // 色みの ゆるさ（紙は 色みが ない）
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = p[i], g = p[i + 1], b = p[i + 2];
        const lum = lumOf(r, g, b);
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum >= paper(x, y) - tolL && sat < tolS) isPaper[y * w + x] = 1;
      }
    }
    // 外から つながる 紙を ぬりつぶす
    const bg = new Uint8Array(w * hh);
    const stack = [];
    function push(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= hh) return;
      const k = y * w + x;
      if (bg[k] || !isPaper[k]) return;
      bg[k] = 1; stack.push(k);
    }
    for (let x = 0; x < w; x++) { push(x, 0); push(x, hh - 1); }
    for (let y = 0; y < hh; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const k = stack.pop();
      const x = k % w, y = (k - x) / w;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    const fg = new Uint8Array(w * hh);
    for (let k = 0; k < fg.length; k++) fg[k] = bg[k] ? 0 : 1;
    // 小さな ごみ（ぽつんと ある 点）を 消す：まわり 8つの うち 2つ 以下なら 消す
    const out = new Uint8Array(fg);
    for (let y = 1; y < hh - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const k = y * w + x;
        if (!fg[k]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && fg[k + dy * w + dx]) n++;
        if (n <= 2) out[k] = 0;
      }
    }
    return out;
  }

  // 絵が ある はんい（絵の まわりの 余白を 切る ため）
  function bbox(fg, w, hh) {
    let x0 = w, y0 = hh, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        if (!fg[y * w + x]) continue;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return n ? { x0: x0, y0: y0, x1: x1, y1: y1, n: n } : null;
  }

  /* 色を 16色に そろえる（絵に ある 色から えらぶ。k-means を 4回） */
  function palette(colors, k) {
    if (colors.length <= k) return colors.slice();
    // はじめの 候補：いままでの 候補から いちばん 遠い 色を 順に とる（にた色ばかりに ならない）
    const samp = colors.length > 900 ? colors.filter(function (c, i) { return i % Math.ceil(colors.length / 900) === 0; }) : colors;
    const cents = [samp[0].slice()];
    while (cents.length < k) {
      let far = null, fd = -1;
      samp.forEach(function (c) {
        let md = 1e9;
        for (let j = 0; j < cents.length; j++) {
          const d = (c[0] - cents[j][0]) * (c[0] - cents[j][0]) + (c[1] - cents[j][1]) * (c[1] - cents[j][1]) + (c[2] - cents[j][2]) * (c[2] - cents[j][2]);
          if (d < md) md = d;
        }
        if (md > fd) { fd = md; far = c; }
      });
      if (!far || fd < 60) break;
      cents.push(far.slice());
    }
    for (let it = 0; it < 4; it++) {
      const sum = cents.map(function () { return [0, 0, 0, 0]; });
      colors.forEach(function (c) {
        let best = 0, bd = 1e9;
        for (let j = 0; j < cents.length; j++) {
          const d = (c[0] - cents[j][0]) * (c[0] - cents[j][0]) + (c[1] - cents[j][1]) * (c[1] - cents[j][1]) + (c[2] - cents[j][2]) * (c[2] - cents[j][2]);
          if (d < bd) { bd = d; best = j; }
        }
        sum[best][0] += c[0]; sum[best][1] += c[1]; sum[best][2] += c[2]; sum[best][3]++;
      });
      for (let j = 0; j < cents.length; j++) {
        if (sum[j][3]) cents[j] = [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]];
      }
    }
    return cents;
  }
  function nearest(c, pal) {
    let best = pal[0], bd = 1e9;
    for (let j = 0; j < pal.length; j++) {
      const d = (c[0] - pal[j][0]) * (c[0] - pal[j][0]) + (c[1] - pal[j][1]) * (c[1] - pal[j][1]) + (c[2] - pal[j][2]) * (c[2] - pal[j][2]);
      if (d < bd) { bd = d; best = pal[j]; }
    }
    return best;
  }
  // 色を 少し あざやかに（クレヨンや ペンの 色が 写真で くすむので）
  function vivid(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const mid = (mx + mn) / 2;
    const k = mx - mn > 16 ? 1.3 : 1;
    function f(v) { return Math.max(0, Math.min(255, mid + (v - mid) * k)); }
    return [f(r), f(g), f(b)];
  }

  /* =======================================================
     写真 → ドット絵
     ======================================================= */
  function workCanvas(src, c) {
    const cv = document.createElement('canvas');
    cv.width = WORK; cv.height = WORK;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = true;
    const sx = Math.round(src.naturalWidth * c.x);
    const sy = Math.round(src.naturalHeight * c.y);
    const sw = Math.max(1, Math.round(src.naturalWidth * c.w));
    const sh = Math.max(1, Math.round(src.naturalHeight * c.h));
    x.drawImage(src, sx, sy, sw, sh, 0, 0, WORK, WORK);
    return cv;
  }

  /* AIに 送る 絵（わくの 中だけ・白い 下地の JPEG） */
  function sendCanvas(src, c) {
    const cv = document.createElement('canvas');
    cv.width = SEND; cv.height = SEND;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, SEND, SEND);
    x.imageSmoothingEnabled = true;
    const sx = Math.round(src.naturalWidth * c.x);
    const sy = Math.round(src.naturalHeight * c.y);
    const sw = Math.max(1, Math.round(src.naturalWidth * c.w));
    const sh = Math.max(1, Math.round(src.naturalHeight * c.h));
    x.drawImage(src, sx, sy, sw, sh, 0, 0, SEND, SEND);
    return cv;
  }

  function build() {
    if (!img) return '';
    const cv = workCanvas(img, crop);
    let data;
    try { data = cv.getContext('2d').getImageData(0, 0, WORK, WORK); } catch (e) { return cv.toDataURL(); }
    const p = data.data;
    const fg = foregroundMask(p, WORK, WORK, tol);
    const box = bbox(fg, WORK, WORK);
    if (!box || box.n < 30) { lastInfo = { empty: true }; return ''; }

    // 絵の まわりの 余白を 切って、正方形に する（少し 余白を のこす）
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const side = Math.max(bw, bh) * 1.06;
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const ox = cx - side / 2, oy = cy - side / 2;

    const N = size;
    const cell = side / N;
    const inkThresh = 70 + inkLv * 0.9;          // これより 暗ければ「線」
    const M = 6;                                  // 1マスの 中で しらべる 点の 数（M×M）
    const cells = new Array(N * N);
    const fills = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let fgN = 0, inkN = 0, total = 0;
        let sr = 0, sg = 0, sb = 0, sn = 0;
        let ir = 0, ig = 0, ib = 0;
        for (let v = 0; v < M; v++) {
          for (let u = 0; u < M; u++) {
            const x = Math.floor(ox + (i + (u + 0.5) / M) * cell);
            const y = Math.floor(oy + (j + (v + 0.5) / M) * cell);
            total++;
            if (x < 0 || y < 0 || x >= WORK || y >= WORK) continue;
            const k = y * WORK + x;
            if (!fg[k]) continue;
            fgN++;
            const q = k * 4;
            const r = p[q], g = p[q + 1], b = p[q + 2];
            if (lumOf(r, g, b) < inkThresh) { inkN++; ir += r; ig += g; ib += b; }
            else { sr += r; sg += g; sb += b; sn++; }
          }
        }
        if (!fgN) { cells[j * N + i] = null; continue; }
        // 線：マスの 中に こい点が 2つ 以上（細い 線でも ひろう）
        if (inkN >= 2 && inkN >= fgN * 0.12) {
          const c = [ir / inkN, ig / inkN, ib / inkN];
          const dark = Math.min(1, lumOf(c[0], c[1], c[2]) / 90);   // 線は しっかり 暗く
          cells[j * N + i] = { ink: true, c: [c[0] * dark * 0.6, c[1] * dark * 0.6, c[2] * dark * 0.6 + 10] };
          continue;
        }
        // ふち（マスの 一部だけ 絵）は 消して きれいな 輪かくに
        if (fgN < total * 0.4) { cells[j * N + i] = null; continue; }
        if (!sn) { cells[j * N + i] = null; continue; }
        const vc = vivid(sr / sn, sg / sn, sb / sn);
        cells[j * N + i] = { ink: false, c: vc };
        fills.push(vc);
      }
    }
    // 色を 16色に そろえる
    const pal = palette(fills, 16);

    const out = document.createElement('canvas');
    out.width = N; out.height = N;
    const ox2 = out.getContext('2d');
    const od = ox2.createImageData(N, N);
    let drawn = 0;
    for (let k = 0; k < N * N; k++) {
      const c = cells[k];
      if (!c) continue;
      const col = c.ink ? c.c : nearest(c.c, pal);
      od.data[k * 4] = Math.round(col[0]); od.data[k * 4 + 1] = Math.round(col[1]); od.data[k * 4 + 2] = Math.round(col[2]); od.data[k * 4 + 3] = 255;
      drawn++;
    }
    ox2.putImageData(od, 0, 0);
    lastInfo = { size: N, drawn: drawn, colors: pal.length, box: box };
    return out.toDataURL('image/png');
  }

  /* 写真ぜんたいから 絵の 場所を 見つけて、わくを 合わせる */
  function autoCrop() {
    if (!img) return;
    const cv = workCanvas(img, { x: 0, y: 0, w: 1, h: 1 });
    let data;
    try { data = cv.getContext('2d').getImageData(0, 0, WORK, WORK); } catch (e) { return; }
    const fg = foregroundMask(data.data, WORK, WORK, tol);
    // つながっている かたまりごとに 分けて、いちばん 大きい もの（ふちに ついていない もの を 優先）
    const label = new Int32Array(WORK * WORK);
    const comps = [];
    for (let k = 0; k < fg.length; k++) {
      if (!fg[k] || label[k]) continue;
      const id = comps.length + 1;
      const st = [k];
      label[k] = id;
      const c = { x0: WORK, y0: WORK, x1: 0, y1: 0, n: 0, edge: false };
      while (st.length) {
        const q = st.pop();
        const x = q % WORK, y = (q - x) / WORK;
        c.n++;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        if (x === 0 || y === 0 || x === WORK - 1 || y === WORK - 1) c.edge = true;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= WORK || ny >= WORK) return;
          const nk = ny * WORK + nx;
          if (fg[nk] && !label[nk]) { label[nk] = id; st.push(nk); }
        });
      }
      comps.push(c);
    }
    if (!comps.length) return;
    comps.sort(function (a, b) { return (b.edge ? 0 : 1) - (a.edge ? 0 : 1) || b.n - a.n; });
    const best = comps[0];
    if (best.n < 40) return;
    // 近くに ある かたまり（同じ 絵の 目や つの）も まとめる
    let x0 = best.x0, y0 = best.y0, x1 = best.x1, y1 = best.y1;
    const reach = Math.max(x1 - x0, y1 - y0) * 0.35;
    comps.slice(1).forEach(function (c) {
      if (c.edge && c.n > best.n * 0.5) return;
      if (c.x1 < x0 - reach || c.x0 > x1 + reach || c.y1 < y0 - reach || c.y0 > y1 + reach) return;
      x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1);
    });
    // WORK（正方形に ゆがめてある）→ 写真の ピクセルに もどして、正方形の わくに
    const kx = img.naturalWidth / WORK, ky = img.naturalHeight / WORK;
    const bw = (x1 - x0 + 1) * kx, bh = (y1 - y0 + 1) * ky;
    crop = squareCrop((x0 + x1 + 1) / 2 * kx, (y0 + y1 + 1) / 2 * ky, Math.max(bw, bh) * 1.12);
  }

  // 写真を 90度 回す（横向きに とった とき）
  function rotateImg() {
    if (!img) return;
    const cv = document.createElement('canvas');
    cv.width = img.naturalHeight; cv.height = img.naturalWidth;
    const x = cv.getContext('2d');
    x.translate(cv.width / 2, cv.height / 2);
    x.rotate(Math.PI / 2);
    x.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const im = new Image();
    im.onload = function () { img = im; autoCrop(); if (onImage) onImage(); };
    im.src = cv.toDataURL('image/png');
  }

  let onImage = null;   // 写真が 入れかわった ときに 画面を 書きなおす

  /* わくを「写真の ピクセルで 正方形」に する（0〜1の わりあいに 直す）。
     cx, cy, side は 写真の ピクセル。はみ出す ときは 中に おさめる */
  function squareCrop(cx, cy, side) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    side = Math.max(32, Math.min(side, iw, ih));
    let x = cx - side / 2, y = cy - side / 2;
    x = Math.max(0, Math.min(iw - side, x));
    y = Math.max(0, Math.min(ih - side, y));
    return { x: x / iw, y: y / ih, w: side / iw, h: side / ih };
  }
  function defaultCrop() {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    return squareCrop(iw / 2, ih / 2, Math.min(iw, ih) * 0.7);
  }

  /* =======================================================
     画面
     ======================================================= */
  function render() {
    const player = MQ.save.current();
    if (!player) return;

    const fileIn = h('input', { class: 'file', type: 'file', accept: 'image/*', capture: 'environment' });
    const stage = h('div', { class: 'photo__stage' });
    const preview = h('img', { class: 'photo__out', alt: 'できあがり' });
    const previewBattle = h('img', { class: 'photo__outb', alt: '' });
    const nameIn = h('input', { class: 'input', type: 'text', maxlength: '8', placeholder: 'モンスターの なまえ' });
    const emptyNote = h('p', { class: 'note photo__empty', hidden: 'hidden', text: '絵が 見つからないよ。わくを 絵に 合わせるか、「はいけいを 消す」を 弱めてみてね' });

    let areaId = 'sansu';
    const areaChips = h('div', { class: 'chips' }, MQ.content.subjectAreas().map(function (a) {
      const b = h('button', {
        class: 'chip' + (areaId === a.id ? ' is-on' : ''), type: 'button', text: a.name,
        onclick: function () {
          areaId = a.id;
          MQ.sfx.tap();
          areaChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
        }
      });
      return b;
    }));

    function sliderRow(label, min, max, get, set) {
      const s = h('input', { class: 'slider', type: 'range', min: String(min), max: String(max), value: String(get()) });
      s.addEventListener('input', function () { set(Number(s.value)); refresh(); });
      return h('div', { class: 'photo__row' }, [h('span', { class: 'photo__lbl', text: label }), s]);
    }
    const sizeChips = h('div', { class: 'chips chips--tight' }, SIZES.map(function (s) {
      const b = h('button', {
        class: 'chip chip--s' + (size === s[0] ? ' is-on' : ''), type: 'button', text: s[1],
        onclick: function () {
          size = s[0]; MQ.sfx.tap();
          sizeChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
          refresh();
        }
      });
      return b;
    }));

    /* ---- AIで かっこよく する（v2.8）。かぎが ある ときだけ 金の ボタン ---- */
    const aiCount = h('span', { class: 'btn--ai__n' });
    const aiBtn = h('button', { class: 'btn btn--ai photo__ai', type: 'button', hidden: 'hidden', onclick: function () { askAi(); } }, [
      h('span', { class: 'btn--ai__t', text: 'AIで かっこよく する' }),
      aiCount,
      h('span', { class: 'btn__shine' })
    ]);
    const aiAgain = h('button', { class: 'btn btn--small btn--cream', type: 'button', text: 'もう1回 AIに たのむ', onclick: function () { askAi(); } });
    const aiRow = h('div', { class: 'photo__airow', hidden: 'hidden' }, [
      aiAgain,
      h('button', { class: 'btn btn--small btn--stone', type: 'button', text: 'もとの しゃしんに もどす', onclick: function () { MQ.sfx.tap(); restoreOrig(); } })
    ]);
    const aiNote = h('p', { class: 'note photo__ainote', hidden: 'hidden', text: 'おうちの人ページで AIの かぎを 入れると、絵を AIが ゲームの モンスターみたいに かっこよく してくれるよ。' });
    const aiErr = h('p', { class: 'note photo__empty', hidden: 'hidden' });
    const aiWait = h('div', { class: 'photo__wait', hidden: 'hidden' }, [
      h('div', { class: 'photo__waitbox' }, [
        h('div', { class: 'photo__waiticon' }, [h('span'), h('span'), h('span')]),
        h('div', { class: 'photo__waitt', text: 'AIが かいて いるよ…' }),
        h('div', { class: 'photo__waits', text: '10〜30びょう くらい まってね' })
      ])
    ]);
    function paintAi() {
      const on = !!(MQ.ai && MQ.ai.ready());
      const n = on ? MQ.ai.left() : 0;
      aiBtn.hidden = !(img && on && !aiUsed);
      aiBtn.disabled = aiBusy || n <= 0;
      aiCount.textContent = n > 0 ? 'きょう あと ' + n + '回' : 'きょうは もう つかえないよ';
      aiRow.hidden = !(img && aiUsed);
      aiAgain.disabled = aiBusy || n <= 0;
      aiNote.hidden = !(img && !on);
      aiWait.hidden = !aiBusy;
      aiErr.hidden = !aiError;
      aiErr.textContent = aiError;
    }
    function askAi() {
      if (!img || aiBusy || !MQ.ai) return;
      if (!MQ.ai.canUse()) { MQ.ui.toast(MQ.ai.message(MQ.ai.ready() ? 'limit' : 'nokey')); return; }
      MQ.sfx.tap();
      // いつも「AI前の 写真」を 送る（AIの 絵を もう一度 AIに 送らない）
      const src = origImg || img;
      const c = origImg ? origCrop : crop;
      let send = '';
      try { send = sendCanvas(src, c).toDataURL('image/jpeg', 0.85); } catch (e) { send = ''; }
      if (!send) { aiError = MQ.ai.message('unknown'); paintAi(); return; }
      aiBusy = true; aiError = '';
      paintAi();
      MQ.ai.generate(send).then(function (url) {
        const im = new Image();
        im.onload = function () {
          if (!origImg) { origImg = img; origCrop = Object.assign({}, crop); }
          img = im;
          aiUsed = true; aiBusy = false;
          crop = { x: 0, y: 0, w: 1, h: 1 };
          autoCrop();
          drawStage(); refresh(); paintAi();
          MQ.sfx.rare();
        };
        im.onerror = function () { aiBusy = false; aiError = MQ.ai.message('noimage'); paintAi(); };
        im.src = url;
      }, function (e) {
        aiBusy = false;
        aiError = MQ.ai.message(e);
        paintAi();
      });
    }
    function restoreOrig() {
      if (!origImg) return;
      img = origImg; crop = origCrop;
      origImg = null; origCrop = null;
      aiUsed = false; aiError = '';
      drawStage(); refresh(); paintAi();
    }

    // できあがりの みほん。しゃしんを とるまでは かくしておく
    const previewRow = h('div', { class: 'photo__preview', hidden: 'hidden' }, [
      h('div', { class: 'photo__views' }, [
        h('div', { class: 'photo__view' }, [preview, h('span', { class: 'photo__cap', text: 'できあがり' })]),
        h('div', { class: 'photo__view photo__view--battle' }, [
          h('div', { class: 'photo__sky' }, [previewBattle, h('span', { class: 'shadow shadow--foe photo__shadow' })]),
          h('span', { class: 'photo__cap', text: 'バトルでは' })
        ])
      ]),
      emptyNote,
      sliderRow('はいけいを 消す', 15, 120, function () { return tol; }, function (v) { tol = v; }),
      sliderRow('線を こく', 0, 100, function () { return inkLv; }, function (v) { inkLv = v; }),
      h('div', { class: 'photo__row' }, [h('span', { class: 'photo__lbl', text: 'ドットの こまかさ' }), sizeChips]),
      h('div', { class: 'photo__btns' }, [
        h('button', { class: 'btn btn--small btn--cream', type: 'button', text: 'わくを 自動で', onclick: function () { MQ.sfx.tap(); autoCrop(); drawStage(); refresh(); } }),
        h('button', { class: 'btn btn--small btn--cream', type: 'button', text: '回す', onclick: function () { MQ.sfx.tap(); rotateImg(); } })
      ])
    ]);

    function refresh() {
      outUrl = build();
      preview.src = outUrl || '';
      previewBattle.src = outUrl || '';
      previewRow.hidden = !img;   // まだ しゃしんが ない ときは かくす
      emptyNote.hidden = !(img && !outUrl);
    }

    /* ---- わく（ドラッグして 動かす／右下で 大きさ） ---- */
    function drawStage() {
      stage.innerHTML = '';
      if (!img) {
        stage.appendChild(h('p', { class: 'note', style: { padding: '20px', textAlign: 'center' }, text: 'まず したの ボタンで しゃしんを とってね' }));
        return;
      }
      const el = h('img', { class: 'photo__img', src: img.src, alt: '' });
      const box = h('div', { class: 'photo__crop' });
      const handle = h('div', { class: 'photo__handle' });
      box.appendChild(handle);
      stage.appendChild(el);
      stage.appendChild(box);

      function place() {
        // 画面は ぜんたいが 拡大縮小されている（stage.js）ので、getBoundingClientRect でなく offset の 値で
        const w = el.offsetWidth, hh = el.offsetHeight;
        box.style.left = (el.offsetLeft + w * crop.x) + 'px';
        box.style.top = (el.offsetTop + hh * crop.y) + 'px';
        box.style.width = (w * crop.w) + 'px';
        box.style.height = (hh * crop.h) + 'px';
      }
      el.addEventListener('load', place);
      setTimeout(place, 30);
      window.addEventListener('resize', place);

      let mode = null, startPt = null, startCrop = null;
      function down(e, m) {
        e.preventDefault();
        e.stopPropagation();
        mode = m;
        startPt = { x: e.clientX, y: e.clientY };
        startCrop = Object.assign({}, crop);
        try { (m === 'size' ? handle : box).setPointerCapture(e.pointerId); } catch (err) {}
      }
      function move(e) {
        if (!mode) return;
        const r = el.getBoundingClientRect();   // 指の うごきは 画面の px なので、画面上の 大きさで わる
        const dx = (e.clientX - startPt.x) / r.width;
        const dy = (e.clientY - startPt.y) / r.height;
        if (mode === 'move') {
          crop.x = Math.max(0, Math.min(1 - startCrop.w, startCrop.x + dx));
          crop.y = Math.max(0, Math.min(1 - startCrop.h, startCrop.y + dy));
        } else {
          // 大きさを 変えても 正方形の まま（写真の ピクセルで）
          const iw = img.naturalWidth, ih = img.naturalHeight;
          const s = Math.max(dx, dy);
          const side = Math.max(32, Math.min((startCrop.w + s) * iw, (1 - startCrop.x) * iw, (1 - startCrop.y) * ih));
          crop.w = side / iw;
          crop.h = side / ih;
        }
        place();
        refresh();
      }
      function up() { mode = null; }
      box.addEventListener('pointerdown', function (e) { down(e, 'move'); });
      handle.addEventListener('pointerdown', function (e) { down(e, 'size'); });
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function useImage(im) {
      img = im;
      origImg = null; origCrop = null; aiUsed = false; aiError = '';
      crop = defaultCrop();
      autoCrop();
      drawStage();
      refresh();
      paintAi();
    }
    onImage = function () { drawStage(); refresh(); };

    fileIn.addEventListener('change', function () {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      MQ.sfx.shutter();
      const r = new FileReader();
      r.onload = function () {
        const im = new Image();
        im.onload = function () { useImage(im); };
        im.src = String(r.result);
      };
      r.readAsDataURL(f);
    });

    function save() {
      if (!img || !outUrl) { MQ.ui.toast('まず しゃしんを とってね'); return; }
      const name = (nameIn.value || '').trim();
      if (!name) { MQ.ui.toast('なまえを 入れてね'); return; }
      const mon = { id: 'my-' + MQ.util.uid(), name: name, area: areaId, png: outUrl };
      if (aiUsed) mon.ai = true;
      const byAi = aiUsed;
      MQ.save.update(function (p) {
        MQ.save.addCustom(p, mon);
        MQ.save.addLog(p, 'じぶんの モンスター「' + name + '」を つくった' + (byAi ? '（AIで かっこよく）' : ''));
      });
      MQ.ui.syncCustom();
      MQ.sfx.rare();
      MQ.ui.toast(name + ' が なかまに なった！ バトルに 出てくるよ');
      img = null; outUrl = '';
      origImg = null; origCrop = null; aiUsed = false; aiError = '';
      MQ.ui.dex.render('mons');
      MQ.ui.show('screen-dex');
    }

    /* ---- じぶんの モンスター 一覧 ---- */
    const mine = (player.custom || []).map(function (m) {
      const area = MQ.content.areaOf(m.area);
      return h('div', { class: 'cell' }, [
        MQ.blocks.imgBox(m.png, { size: 52, cls: 'cell__img' }),
        h('span', { class: 'cell__name', text: m.name }),
        h('span', { class: 'cell__tag', text: area ? area.short : '' }),
        h('button', {
          class: 'btn btn--small btn--danger', type: 'button', text: '消す',
          onclick: function () {
            if (!window.confirm(m.name + ' を 消しますか？')) return;
            MQ.save.update(function (p) { MQ.save.removeCustom(p, m.id); });
            MQ.ui.syncCustom();
            render();
          }
        })
      ]);
    });

    MQ.ui.mount('screen-dex', h('div', { class: 'wrap' }, [
      h('h2', { class: 'label', text: 'じぶんの モンスターを つくる', style: { marginTop: '6px' } }),
      h('p', { class: 'note', text: '紙に かいた 絵を しゃしんに とると、ドット絵に なって バトルに 出てくるよ。明るい ところで、紙が ぜんぶ 入るように まっすぐ とると きれいに なるよ。' }),
      h('div', { class: 'photo' }, [
        stage,
        h('button', { class: 'btn', type: 'button', text: '📷 しゃしんを とる', onclick: function () { MQ.sfx.tap(); fileIn.click(); } }),
        fileIn,
        aiBtn,
        aiRow,
        aiErr,
        aiNote,
        previewRow,
        aiWait,
        nameIn,
        h('p', { class: 'note', style: { margin: '0' }, text: 'どの エリアに 出す？' }),
        areaChips,
        h('button', { class: 'btn btn--big', type: 'button', text: 'なかまに する！', onclick: function () { MQ.sfx.tap(); save(); } })
      ]),
      mine.length ? h('h2', { class: 'label', text: 'つくった モンスター' }) : null,
      mine.length ? h('div', { class: 'grid' }, mine) : null,
      h('button', {
        class: 'btn btn--big btn--stone', type: 'button', text: '図かんへ もどる',
        style: { marginTop: '18px' },
        onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render('mons'); MQ.ui.show('screen-dex'); }
      })
    ]));
    MQ.ui.show('screen-dex');
    drawStage();
    paintAi();

    // テスト用（tools/harness.html）：写真の かわりに 画像を わたす／AIの ボタンを 押す
    render.load = function (dataUrl, cb) {
      const im = new Image();
      im.onload = function () { useImage(im); if (cb) cb(lastInfo, outUrl); };
      im.src = dataUrl;
    };
    render.askAi = askAi;
    render.restore = restoreOrig;
  }

  return {
    render: render,
    // テスト用：さいごの できあがりの 情報／作り直し
    info: function () { return lastInfo; },
    crop: function () { return crop; },
    build: build,
    // AI（v2.8）の いまの 状態（テスト用）
    aiState: function () { return { busy: aiBusy, ai: aiUsed, error: aiError, hasOrig: !!origImg, out: outUrl.length }; },
    setOptions: function (o) { if (o.size) size = o.size; if (o.tol != null) tol = o.tol; if (o.ink != null) inkLv = o.ink; }
  };
})();
