/* ---------------------------------------------------------
   背景（v12.6）：タイトル・バトル・地図の 遠景と ゆか

   ユーザー「次は 背景を 整えて いきましょう」→ 3案（A 遠くの 山なみと まおうの 城／
   B ブロックの 森／C 夕やけ）を 見せて「全部 取り入れましょう」。仕様は docs/v12.6背景メモ.md、
   見た目の 正本は docs/STYLE_GUIDE.md の「背景（v12.6）」。

   きまり
     ・画像ファイルは 使わない。ぜんぶ CSS の 四角（<i>）だけ。filter も つけない（v12.5 の 軽さ）。
     ・山なみは「同じ 高さの 段を 1つの 四角に まとめる」（range・12px ごと）。部品は バトル 60〜125こ・タイトル 145〜160こ（smoke が 数える。1コマの 時間は 実測で 変わらなかった）。
     ・C（夕やけ）は **本当の 時計で 空が 変わる**：朝 6〜9／昼 9〜16／夕 16〜19／夜。
       時計で 変わるのは タイトルと、バトルの 山・湖・町。森は ずっと 夕方・海と 空は 昼・塔は 夜
       （v1.2 の「エリア別の 時間帯」を のこす）。
     ・バトルの 右 120px（てきの 場所）に 木や 城の ような 高い ものを 置かない（遠くの 山だけ）。
     ・テスト用に setNow で 時計を 入れかえられる（harness は 昼に 固定して 撮る）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};
MQ.ui.scenery = (function () {
  const BIOMES = ['mountain', 'forest', 'sea', 'sky', 'tower', 'lake', 'town'];
  /* 空が 時計で 変わる エリア。それ以外は 決まった 時間帯 */
  const FIXED = { forest: 'evening', sea: 'day', sky: 'day', tower: 'night' };

  let NOW = null;
  function now() { return NOW || new Date(); }
  function setNow(d) { NOW = d || null; }
  function timeOfDay(d) {
    const hr = (d || now()).getHours();
    if (hr >= 6 && hr < 9) return 'morning';
    if (hr >= 9 && hr < 16) return 'day';
    if (hr >= 16 && hr < 19) return 'evening';
    return 'night';
  }
  /* この エリアの 空の 時間帯（time を わたすと そのまま。地図・タイトルは biome なし） */
  function skyOf(biome, time) {
    if (biome && FIXED[biome]) return FIXED[biome];
    return time || timeOfDay();
  }

  /* 時間帯ごとの 遠くの 色（山なみ・松・鳥・きり） */
  const TONE = {
    morning: { far: '#b3c3e0', near: '#8ea3cc', pine: '#6a80ac', bird: '#5a6a90', snow: '#f6f9ff', fog: 'rgba(255,240,220,.5)' },
    day:     { far: '#8fa9d6', near: '#6a86bf', pine: '#4c6a9c', bird: '#3f4a6e', snow: '#eef4ff', fog: 'rgba(255,255,255,.45)' },
    evening: { far: '#5a3d7e', near: '#3a2c5e', pine: '#2c2050', bird: '#2c1f45', snow: '#ffd7c0', fog: 'rgba(80,40,90,.35)' },
    night:   { far: '#1f2b58', near: '#141d40', pine: '#0f1630', bird: '#0c1230', snow: '#cfd8f5', fog: 'rgba(20,30,70,.45)' }
  };

  /* ---------- 部品（ぜんぶ <i>・bottom で おく） ---------- */
  function part(L, x, y, w, hh, bg, cls) {
    const el = document.createElement('i');
    if (cls) el.className = cls;
    el.style.cssText = 'left:' + x + 'px;bottom:' + y + 'px;width:' + w + 'px;height:' + hh + 'px;background:' + bg;
    L.appendChild(el);
    return el;
  }
  /* 山なみ：点の ならびを 6px の 段に して、同じ 高さの 段は 1つの 四角に まとめる。
     cap＝この 高さより 高い 山頂に 雪を のせる */
  function range(L, pts, color, step, cap, capColor, yoff, width) {
    yoff = yoff || 0; width = width || 400;
    let prevH = -1, runX = 0;
    for (let x = 0; x <= width; x += step) {
      let hh = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (x >= a[0] && x <= b[0]) { hh = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); break; }
      }
      hh = Math.round(hh / 6) * 6;
      if (hh !== prevH) {
        if (prevH > 0) part(L, runX, yoff, x - runX, prevH, color);
        runX = x; prevH = hh;
      }
    }
    if (prevH > 0) part(L, runX, yoff, width - runX, prevH, color);
    if (cap) pts.forEach(function (p, i) {
      if (i > 0 && i < pts.length - 1 && p[1] > cap) part(L, p[0] - 8, yoff + Math.round(p[1] / 6) * 6 - 10, 16, 10, capColor);
    });
  }
  /* 松の 列（A）：みき＋三角の かわりの 2段 */
  function pines(L, list, color, yoff) {
    list.forEach(function (p) { part(L, p[0], yoff || 0, 12, 18 + p[1], color); part(L, p[0] + 3, (yoff || 0) + 18 + p[1], 6, 8, color); });
  }
  /* まおうの 城（A）：土台＋塔 3本＋ぎざぎざ＋窓の 明かり＋旗。s＝大きさ（1＝78px はば） */
  function castle(L, x, y, c, s, flag, win) {
    s = s || 1;
    const r = function (dx, dy, w, hh, col, cls) { return part(L, x + dx * s, y + dy * s, Math.max(2, w * s), Math.max(2, hh * s), col, cls); };
    r(0, 0, 78, 34, c);
    [0, 30, 60].forEach(function (dx, i) {
      r(dx, 0, 18, i === 1 ? 74 : 56, c);
      [0, 8, 16].forEach(function (t) { r(dx + t, i === 1 ? 74 : 56, 4, 5, c); });
    });
    if (win !== false) { r(37, 40, 4, 6, '#ffd447', 'win'); r(7, 30, 3, 5, '#ffd447', 'win'); }
    if (flag) { r(30, 74, 2, 14, c); r(32, 82, 10, 6, '#b03a5a'); }
  }
  function bird(L, x, y, c) { part(L, x, y, 6, 2, c); part(L, x + 6, y + 2, 6, 2, c); part(L, x - 6, y + 2, 6, 2, c); }
  /* ブロックの 木（B）：みき＋葉 3段＋てっぺんの 明るい ブロック。3面の 光は .bk */
  function tree(L, x, y, s, trunk, leaf, leafHi) {
    part(L, x + s * 1.5, y, s * 1.2, s * 3.2, trunk, 'bk');
    part(L, x, y + s * 2.6, s * 4.2, s * 2, leaf, 'bk');
    part(L, x + s * 0.6, y + s * 4.4, s * 3, s * 1.6, leaf, 'bk');
    part(L, x + s * 1.3, y + s * 5.8, s * 1.6, s * 1.2, leafHi, 'bk');
  }
  function bush(L, x, w, hh, c) { part(L, x, 0, w, hh, c, 'bk'); }
  function flower(L, x, hh, c, stem) { part(L, x + 1, 0, 3, hh, stem || '#3a8f3a'); part(L, x, hh, 5, 5, c); }
  function cloud(L, x, y, w, hh, c) { part(L, x, y, w, hh, c); part(L, x + Math.round(w * .2), y + hh, w - Math.round(w * .45), Math.max(4, Math.round(hh * .6)), c); }
  function star(L, x, y) { part(L, x, y, 3, 3, '#fff8e0', 'star'); }
  /* ブロックの 太陽（C）：ひし形の 段 */
  function sun(L, x, y, s) {
    s = s || 1;
    [[-6, 0, 60, 8], [-14, 8, 76, 8], [-20, 16, 88, 8], [-24, 24, 96, 16], [-20, 40, 88, 8], [-14, 48, 76, 8], [-6, 56, 60, 8]].forEach(function (r) {
      part(L, x + r[0] * s, y + r[1] * s, r[2] * s, r[3] * s, '#ffe07a', 'sun');
    });
  }
  /* 月：ブロックの 三日月（C の 形）。空の 色を かさねる 作り方は 四角に 見えた ので やめた */
  function moon(L, x, y) {
    const c = '#fff4c8';
    part(L, x, y, 8, 22, c, 'moon'); part(L, x, y + 16, 18, 6, c, 'moon'); part(L, x, y, 18, 6, c, 'moon');
    part(L, x + 16, y + 3, 4, 4, c, 'moon'); part(L, x + 16, y + 15, 4, 4, c, 'moon');
  }
  /* ヤシの木（海）：みき＋葉 4まい */
  function palm(L, x, y, s, trunk, leaf) {
    part(L, x + s * 2, y, s * 1.1, s * 5, trunk, 'bk');
    part(L, x - s * 0.5, y + s * 4.6, s * 3, s * 1, leaf, 'bk');
    part(L, x + s * 2.4, y + s * 4.6, s * 3.2, s * 1, leaf, 'bk');
    part(L, x + s * 0.6, y + s * 5.6, s * 2, s * 1, leaf, 'bk');
    part(L, x + s * 2.6, y + s * 5.6, s * 2, s * 1, leaf, 'bk');
    part(L, x + s * 1.6, y + s * 6.4, s * 1.8, s * .9, leaf, 'bk');
  }
  /* 家（町）：かべ＋屋根 2段＋まど＋とびら */
  function house(L, x, y, w, hh, wall, roof, lit) {
    part(L, x, y, w, hh, wall, 'bk');
    part(L, x - 3, y + hh, w + 6, 6, roof, 'bk');
    part(L, x + 5, y + hh + 6, w - 10, 6, roof, 'bk');
    part(L, x + Math.round(w * .18), y + Math.round(hh * .45), 6, 6, lit ? '#ffd447' : '#9fc6e8', lit ? 'win' : '');
    part(L, x + w - Math.round(w * .18) - 6, y + Math.round(hh * .45), 6, 6, lit ? '#ffd447' : '#9fc6e8', lit ? 'win' : '');
    part(L, x + Math.round(w / 2) - 3, y, 6, Math.round(hh * .4), '#6d4726');
  }
  /* 石の 柱（塔）と 光る クリスタル */
  function pillar(L, x, hh, c, cap) { part(L, x, 0, 14, hh, c, 'bk'); part(L, x - 3, hh, 20, 5, cap || c, 'bk'); part(L, x - 3, 0, 20, 5, cap || c, 'bk'); }
  function crystal(L, x, y, s, c) { part(L, x + s * .4, y, s * 1.2, s * 2.2, c, 'gem'); part(L, x, y + s * 2.2, s * 2, s * 1.4, c, 'gem'); part(L, x + s * .4, y + s * 3.6, s * 1.2, s * 1.2, c, 'gem'); }
  /* あし（湖）：くきと 穂 */
  function reed(L, x, hh) { part(L, x, 0, 2, hh, '#4f8a3a'); part(L, x - 1, hh - 6, 4, 8, '#8a6a3a'); }

  /* 空の 中の もの（時間帯で 変わる。タイトルと バトル 共通）。
     w＝はば・top＝いちばん 上の 高さ（星・太陽の 場所を 決める） */
  function skyThings(L, time, kind) {
    /* タイトルの 空は いちばん 短い とき 126px（タブレットは いつも これ）なので その 中に おさめる。
       太陽と 月は 右上（ドラゴンの 上）。まん中は 勇者と かんばんで 見えない */
    const top = kind === 'title' ? 126 : 120;
    const T = kind === 'title';   // タイトルの 太陽・月は titleTop()（かんばんの 上）に おく。scene の 中は 星と 雲だけ
    if (time === 'evening') {
      if (!T) sun(L, 226, top - 96, .8);
      [[30, top - 38, 34, 8], [56, top - 30, 28, 6], [300, top - 22, 44, 8], [140, top - 12, 30, 6]].forEach(function (c) { cloud(L, c[0], c[1], c[2], c[3], '#ffb3a0'); });
      [[20, top - 10], [120, top - 18], [340, top - 16]].forEach(function (s) { star(L, s[0], s[1]); });
    } else if (time === 'night') {
      [[20, top - 10], [70, top - 4], [120, top - 18], [180, top - 2], [220, top - 22], [260, top - 8], [300, top - 26], [340, top - 4], [380, top - 16], [150, top - 36], [330, top - 44], [92, top - 30]].forEach(function (s) { star(L, s[0], s[1]); });
      [[40, top - 60, 46, 10], [300, top - 52, 40, 8]].forEach(function (c) { cloud(L, c[0], c[1], c[2], c[3], 'rgba(120,140,200,.35)'); });
    } else if (time === 'morning') {
      if (!T) sun(L, 30, top - 116, .6);
      [[120, top - 34, 46, 10], [260, top - 26, 60, 12], [340, top - 44, 40, 8]].forEach(function (c) { cloud(L, c[0], c[1], c[2], c[3], 'rgba(255,255,255,.9)'); });
    } else {
      [[40, top - 30, 46, 12], [260, top - 18, 60, 14], [330, top - 40, 40, 10]].forEach(function (c) { cloud(L, c[0], c[1], c[2], c[3], 'rgba(255,255,255,.85)'); });
    }
  }

  function layer(cls) { const L = document.createElement('div'); L.className = 'bgfar ' + (cls || ''); return L; }


  /* =======================================================
     タイトルを 地図と 同じ 仕上げに（v13.9）

     ユーザー「タイトル画面の 背景や 地面も マップ画面と 同じ クオリティに して 綺麗に カッコ良く」。
     地図（v13.4 B案ジオラマ）と 同じ 考え方で、ブロックの 四角を やめて Canvas に なめらかに 描く：
       ・遠くの 山は 面 2つ（光・かげ）＋雪の 山頂（地図の 雪山と 同じ 作り）＋かすみ
       ・まおうの 城は とんがり屋根の 塔 3本・窓の 明かり
       ・おかは なめらかな 曲線＋上の へりに 光・木は 地図と 同じ 3だんの とんがり（面 3つ）＋長い かげ
       ・地面は 草の 原っぱ（やわらかい 明暗・草の 株）＋地図と 同じ 砂の 道＋手まえは 土の がけ（石・根っこ）
       ・雲は ふっくら・太陽と 月は まるく 光る
     時間帯（朝・昼・夕・夜）は いままで どおり 本当の 時計。色を まぜて 変える。
     1回 描いた 絵は とって おいて 使いまわす（同じ 時間帯は 描き直さない）。
     Canvas が 使えない ときは いままでの ブロック（titleBlocks）に もどる。
     見た目の 正本は docs/STYLE_GUIDE.md の「タイトルを 地図と 同じ 仕上げに（v13.9）」。
     ======================================================= */
  const TK = 2;                  // 画面の 何ばいで 描くか（地図の SK と 同じ）
  const LAND_H = 120;            // .title__land の 高さ
  const SOIL_H = 330;            // 地面の 下（ボタンの うしろ）に つづける 土の 高さ
  function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, k) {
    const x = rgbOf(a), y = rgbOf(b);
    return '#' + x.map(function (v, i) { return ('0' + Math.round(v + (y[i] - v) * k).toString(16)).slice(-2); }).join('');
  }
  function lit(hx, k) { return mix(hx, '#ffffff', k); }
  function drk(hx, k) { return mix(hx, '#000000', k); }
  function rgba(hx, a) { return 'rgba(' + rgbOf(hx).join(',') + ',' + a + ')'; }
  function rnd(i) { let v = (i * 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519); v ^= v >>> 13; return (v >>> 0) / 4294967295; }

  /* 時間帯の 色 まぜ（草・土・木）。昼は そのまま */
  const TINT = { morning: ['#ffd9a8', 0.1], day: null, evening: ['#b8645a', 0.26], night: ['#0c1640', 0.56] };
  function tod(hx, time) { const t = TINT[time]; return t ? mix(hx, t[0], t[1]) : hx; }

  /* 草の 色（地図の 草 #58ad4d の なかま。タイトルは 日が よく あたる ので すこし 明るく） */
  const GREEN = {
    backTop: '#b2e08e', backBot: '#8acb68',     // うしろの おか（すこし かすむ）
    frontTop: '#98d970', meadow: '#7cc75c',     // 手まえの おか → 原っぱの おく
    near: '#56a846',                             // 原っぱの 手まえ
    lip: '#3f8a35'                               // がけの ふち（草の 下）
  };
  const SOIL = ['#96633a', '#744a2a', '#583720'];
  const ROAD = '#d9b878';                        // 地図の 道と 同じ
  const ROCKC = '#8892a8';                       // 地図の 岩と 同じ
  function treePal() { const p = MQ.tiles && MQ.tiles.DECO_PAL && MQ.tiles.DECO_PAL.g3; return p ? p.tree : ['#7fd05a', '#4fae44', '#2c7a34']; }
  function flowerPal() { const p = MQ.tiles && MQ.tiles.DECO_PAL && MQ.tiles.DECO_PAL.g3; return p ? p.flower : ['#ffd84a', '#ff8fb0', '#ffffff', '#ffb04a']; }

  /* ---- Canvas の 用意（使えない ときは null） ---- */
  let paintOK = null;
  function canPaint() {
    if (paintOK !== null) return paintOK;
    try {
      const c = document.createElement('canvas');
      paintOK = !!(c && c.getContext && c.getContext('2d'));
    } catch (e) { paintOK = false; }
    return paintOK;
  }
  const paintCache = {};         // key → 描きおわった canvas
  function painted(key, w, hgt, cls, fn) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * TK); cv.height = Math.round(hgt * TK);
    cv.className = cls;
    const ctx = cv.getContext('2d');
    const hit = paintCache[key];
    if (hit) { ctx.drawImage(hit, 0, 0); return cv; }
    ctx.setTransform(TK, 0, 0, TK, 0, 0);
    fn(ctx, w, hgt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const keep = document.createElement('canvas');
    keep.width = cv.width; keep.height = cv.height;
    keep.getContext('2d').drawImage(cv, 0, 0);
    paintCache[key] = keep;
    return cv;
  }

  /* ---- 描く 部品（c＝2D の ctx。単位は 画面の px） ---- */
  function poly(c, pts, fill) {
    c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fill();
  }
  function vgrad(c, y0, y1, stops) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    stops.forEach(function (s, i) { g.addColorStop(s[1] == null ? i / (stops.length - 1) : s[1], s[0]); });
    return g;
  }
  /* 遠くの 山 1つ：光の 面（左）と かげの 面（右）。hh が snow より 高ければ 雪の 山頂 */
  function peak(c, x, base, hh, ww, cols, snow, snowCols) {
    const ay = base - hh, rx = x + ww * 0.16;
    poly(c, [[x - ww, base], [x, ay], [rx, base]], cols[0]);
    poly(c, [[rx, base], [x, ay], [x + ww, base]], cols[1]);
    if (snow != null && hh > snow) {
      const d = Math.min(hh * 0.36, 26), k = d / hh;
      const L = x - ww * k, R = x + ww * k, M = x + (rx - x) * k, sy = ay + d;
      poly(c, [[x, ay], [L, sy], [L + (M - L) * 0.33, sy - d * 0.28], [L + (M - L) * 0.66, sy + d * 0.04], [M, sy - d * 0.18]], snowCols[0]);
      poly(c, [[x, ay], [M, sy - d * 0.18], [M + (R - M) * 0.5, sy + d * 0.02], [R, sy - d * 0.22]], snowCols[1]);
    }
  }
  /* 地図と 同じ とんがりの 木（3だん・面 3つ）。s＝大きさ（1＝高さ 約34px） */
  function cone(c, cx, by, hh, ww, c3) {
    poly(c, [[cx, by - hh], [cx - ww * 0.35, by], [cx - ww, by]], c3[0]);
    poly(c, [[cx, by - hh], [cx + ww * 0.3, by], [cx - ww * 0.35, by]], c3[1]);
    poly(c, [[cx, by - hh], [cx + ww, by], [cx + ww * 0.3, by]], c3[2]);
  }
  function longShadow(c, x, y, w, hh, a) {
    c.fillStyle = 'rgba(15,30,20,' + (a == null ? 0.22 : a) + ')';
    c.beginPath(); c.moveTo(x - w * 0.6, y); c.lineTo(x + w * 0.6, y); c.lineTo(x + w * 0.6 + hh * 0.9, y + hh * 0.22); c.lineTo(x - w * 0.6 + hh * 0.9, y + hh * 0.22); c.closePath(); c.fill();
  }
  function fir(c, cx, by, s, c3, trunk, shadowA) {
    if (shadowA) longShadow(c, cx, by, 10 * s, 30 * s, shadowA);
    c.fillStyle = trunk; c.fillRect(cx - 2.2 * s, by - 9 * s, 4.4 * s, 9 * s);
    c.fillStyle = drk(trunk, 0.3); c.fillRect(cx + 0.6 * s, by - 9 * s, 1.6 * s, 9 * s);
    [[6, 24, 15], [15, 19, 12], [23, 13, 8]].forEach(function (t) {
      cone(c, cx, by - t[0] * s, t[1] * s, t[2] * s, c3);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(cx - t[2] * s, by - t[0] * s - 1.1 * s, t[2] * 2 * s, 1.1 * s);
    });
  }
  /* まるい しげみ（まるを 3つ・左上が 明るい） */
  function roundBush(c, x, by, w, col) {
    const r = w / 3.2;
    [[x + r * 0.9, by - r * 0.8, r], [x + r * 2.2, by - r * 1.15, r * 1.2], [x + r * 3.4, by - r * 0.75, r * 0.95]].forEach(function (b) {
      const g = c.createRadialGradient(b[0] - b[2] * 0.4, b[1] - b[2] * 0.5, b[2] * 0.1, b[0], b[1], b[2]);
      g.addColorStop(0, lit(col, 0.28)); g.addColorStop(0.7, col); g.addColorStop(1, drk(col, 0.22));
      c.fillStyle = g; c.beginPath(); c.arc(b[0], b[1], b[2], 0, Math.PI * 2); c.fill();
    });
  }
  /* 地図と 同じ 花（花びら 5つ） */
  function flower5(c, cx, cy, col, s) {
    s = s || 1;
    c.fillStyle = col;
    for (let a = 0; a < 5; a++) { c.beginPath(); c.arc(cx + Math.cos(a * 1.257) * 2 * s, cy + Math.sin(a * 1.257) * 2 * s, 1.3 * s, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, 1 * s, 0, Math.PI * 2); c.fill();
  }
  /* 地図と 同じ 岩（面 3つ） */
  function rock(c, cx, by, s, col, shadowA) {
    if (shadowA) longShadow(c, cx, by, 7 * s, 9 * s, shadowA);
    poly(c, [[cx - 9 * s, by], [cx - 4 * s, by - 9 * s], [cx + 3 * s, by - 8 * s], [cx, by]], lit(col, 0.25));
    poly(c, [[cx, by], [cx + 3 * s, by - 8 * s], [cx + 9 * s, by]], col);
    poly(c, [[cx + 3 * s, by - 8 * s], [cx + 9 * s, by], [cx + 5 * s, by]], drk(col, 0.28));
  }
  /* ふっくら 雲（まるを 4つ・底は 平ら・下は すこし かげ） */
  function puff(c, x, y, w, top, bot) {
    const r = w / 4.6;
    c.save();
    c.beginPath(); c.rect(x - r, y - w, w + r * 2, w + r * 0.25); c.clip();
    c.fillStyle = vgrad(c, y - r * 2.2, y + r * 0.3, [[top], [bot]]);
    c.beginPath();
    [[0.2, 0, 0.95], [0.42, -0.6, 1.3], [0.66, -0.3, 1.1], [0.85, 0.05, 0.85]].forEach(function (p) {
      const cx = x + w * p[0], cy = y + r * p[1], rr = r * p[2];
      c.moveTo(cx + rr, cy); c.arc(cx, cy, rr, 0, Math.PI * 2);
    });
    c.fill();
    c.restore();
  }
  function starDot(c, x, y, r) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(255,248,224,.9)'); g.addColorStop(1, 'rgba(255,248,224,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fffbea'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  function birdV(c, x, y, col, s) {
    s = s || 1;
    c.strokeStyle = col; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 5 * s, y); c.quadraticCurveTo(x - 2 * s, y - 3 * s, x, y); c.quadraticCurveTo(x + 2 * s, y - 3 * s, x + 5 * s, y); c.stroke();
  }
  /* なめらかな おかの 線（点を 通る 曲線）。closeTo が あれば 下まで ぬる 形に する */
  function crest(c, pts, closeTo) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0], last[1]);
    if (closeTo != null) { c.lineTo(last[0], closeTo); c.lineTo(pts[0][0], closeTo); c.closePath(); }
  }
  function hillShape(c, pts, bottom, top, bot, rimA) {
    const ys = pts.map(function (p) { return p[1]; });
    c.fillStyle = vgrad(c, Math.min.apply(null, ys), bottom, [[top], [bot]]);
    crest(c, pts, bottom); c.fill();
    if (rimA) {   // 上の へりに 日の 光
      c.strokeStyle = 'rgba(255,255,225,' + rimA + ')'; c.lineWidth = 1.6;
      crest(c, pts.map(function (p) { return [p[0], p[1] + 0.8]; })); c.stroke();
    }
  }
  /* まおうの 城（とんがり屋根の 塔 3本・窓の 明かり・旗）。x＝左はし・by＝足もと */
  function castleArt(c, x, by, wall, roof, win) {
    const side = drk(wall, 0.25), top = lit(wall, 0.12);
    // 本体
    c.fillStyle = vgrad(c, by - 36, by, [[top], [wall]]); c.fillRect(x + 6, by - 36, 64, 36);
    for (let i = 0; i < 7; i++) { c.fillStyle = top; c.fillRect(x + 8 + i * 9.4, by - 40, 5, 4); }
    // 門
    c.fillStyle = drk(wall, 0.5); c.beginPath(); c.moveTo(x + 31, by); c.lineTo(x + 31, by - 11); c.arc(x + 38, by - 11, 7, Math.PI, 0); c.lineTo(x + 45, by); c.closePath(); c.fill();
    // 塔（左・まん中・右）＝ 光の 面と かげの 面
    [[0, 52, 17], [29, 70, 20], [60, 52, 17]].forEach(function (t) {
      const tx = x + t[0], tw = t[2], th = t[1];
      c.fillStyle = top; c.fillRect(tx, by - th, tw * 0.6, th);
      c.fillStyle = side; c.fillRect(tx + tw * 0.6, by - th, tw * 0.4, th);
      // とんがり屋根
      poly(c, [[tx - 3, by - th], [tx + tw / 2, by - th - tw * 1.25], [tx + tw * 0.5, by - th]], lit(roof, 0.18));
      poly(c, [[tx + tw * 0.5, by - th], [tx + tw / 2, by - th - tw * 1.25], [tx + tw + 3, by - th]], roof);
      if (win) {   // 窓の 明かり
        c.save(); c.shadowColor = 'rgba(255,212,71,.95)'; c.shadowBlur = 6;
        c.fillStyle = '#ffd96a';
        c.beginPath(); c.moveTo(tx + tw / 2 - 2.2, by - th * 0.55); c.lineTo(tx + tw / 2 - 2.2, by - th * 0.68); c.arc(tx + tw / 2, by - th * 0.68, 2.2, Math.PI, 0); c.lineTo(tx + tw / 2 + 2.2, by - th * 0.55); c.closePath(); c.fill();
        c.restore();
      }
    });
    // 旗
    const fx = x + 39, fy = by - 70 - 25;
    c.fillStyle = drk(wall, 0.3); c.fillRect(fx - 0.7, fy - 12, 1.4, 13);
    c.fillStyle = '#c0395e'; c.beginPath(); c.moveTo(fx + 0.7, fy - 12); c.quadraticCurveTo(fx + 7, fy - 13, fx + 12, fy - 9.5); c.quadraticCurveTo(fx + 7, fy - 7, fx + 0.7, fy - 7); c.closePath(); c.fill();
  }

  /* ---- タイトルの 遠景（空の 雲・星 → 山 2重 → 城 → かすみ → おか → 木）。w×hh は 400×150 ---- */
  function paintTitleFar(c, w, hh, time) {
    const t = TONE[time], night = time === 'night', eve = time === 'evening';
    const base = hh - 18;              // 山の 足もと
    // 星（夕方・夜）
    if (night) [[20, 26], [64, 12], [104, 40], [150, 16], [196, 30], [232, 8], [270, 22], [318, 12], [352, 34], [384, 18], [128, 58], [40, 60], [300, 50]].forEach(function (s, i) { starDot(c, s[0], s[1], i % 3 ? 0.8 : 1.1); });
    if (eve) [[22, 20], [118, 30], [340, 22], [210, 12]].forEach(function (s) { starDot(c, s[0], s[1], 0.8); });
    // 雲（山の うしろ）
    const cloud = night ? ['rgba(130,150,210,.36)', 'rgba(90,110,180,.22)']
      : eve ? ['#ffd2bf', '#e88f8a'] : time === 'morning' ? ['#ffffff', '#ffe2c6'] : ['#ffffff', '#d9ecfb'];
    [[92, 46, 44], [4, 96, 30], [196, 62, 34]].forEach(function (p) { puff(c, p[0], p[1], p[2], cloud[0], cloud[1]); });
    // うしろの 山なみ（雪の 山頂）
    const far = [lit(t.far, 0.14), drk(t.far, 0.1)], snow = [t.snow, mix(t.snow, t.far, 0.35)];
    [[-10, 44, 52], [40, 70, 58], [96, 52, 50], [150, 92, 70], [214, 64, 58], [262, 108, 78], [322, 76, 62], [376, 88, 66], [420, 50, 50]].forEach(function (p) {
      peak(c, p[0], base, p[1], p[2], far, 62, snow);
    });
    c.fillStyle = vgrad(c, base - 70, base, [['rgba(255,255,255,0)'], [t.fog]]); c.fillRect(0, base - 70, w, 70);
    // 手まえの 山なみ
    const near = [lit(t.near, 0.12), drk(t.near, 0.14)];
    [[10, 38, 46], [70, 54, 52], [136, 36, 44], [196, 60, 56], [250, 40, 46], [300, 50, 50], [352, 34, 44], [404, 46, 48]].forEach(function (p) {
      peak(c, p[0], base + 4, p[1], p[2], near, 52, snow);
    });
    // 遠くの 松の 林（山の すそ）
    const pc = [lit(t.pine, 0.12), t.pine, drk(t.pine, 0.2)];
    [[8, 0.42], [24, 0.5], [40, 0.38], [132, 0.46], [146, 0.36], [206, 0.44], [222, 0.34], [370, 0.4], [386, 0.48]].forEach(function (p) { fir(c, p[0], base + 6, p[1], pc, pc[2]); });
    // まおうの 城（右の 地平線）
    castleArt(c, 292, base + 2, night ? '#2a2450' : eve ? '#3b2d63' : mix('#4a4680', t.far, 0.3), night ? '#3a1f4a' : '#5a2a5e', time !== 'day');
    // 鳥
    [[92, 62], [112, 54], [74, 50]].forEach(function (b, i) { birdV(c, b[0], b[1], t.bird, i === 1 ? 1.1 : 0.9); });
    // かすみ（山の 足もと）
    c.fillStyle = vgrad(c, base - 26, base + 8, [['rgba(255,255,255,0)'], [t.fog]]); c.fillRect(0, base - 26, w, 34);
    // うしろの おか・手まえの おか（下の へりは 原っぱの 色に つながる）
    const G = function (k) { return tod(GREEN[k], time); };
    hillShape(c, [[0, hh - 30], [56, hh - 44], [126, hh - 34], [206, hh - 50], [288, hh - 36], [352, hh - 48], [400, hh - 38]], hh, G('backTop'), G('backBot'), night ? 0.08 : 0.4);
    fir(c, 206, hh - 36, 0.62, [G('backTop'), mix(G('backBot'), '#2c7a34', 0.4), tod('#2c7a34', time)], tod('#6a4a2c', time), 0);
    fir(c, 222, hh - 34, 0.46, [G('backTop'), mix(G('backBot'), '#2c7a34', 0.4), tod('#2c7a34', time)], tod('#6a4a2c', time), 0);
    hillShape(c, [[0, hh - 16], [70, hh - 28], [150, hh - 14], [236, hh - 24], [322, hh - 12], [400, hh - 22]], hh + 1, G('frontTop'), G('meadow'), night ? 0.06 : 0.35);
    // 木（左右の はしで 画面を はさむ）と しげみ
    const tp = treePal().map(function (x) { return tod(x, time); }), tr = tod('#6a4a2c', time);
    fir(c, 30, hh - 8, 1.5, tp, tr, 0.16);
    fir(c, 56, hh - 14, 0.9, tp, tr, 0.14);
    fir(c, 370, hh - 10, 1.35, tp, tr, 0.16);
    fir(c, 346, hh - 16, 0.8, tp, tr, 0.14);
    roundBush(c, 86, hh - 12, 26, tod('#4fae44', time)); roundBush(c, 296, hh - 8, 30, tod('#4fae44', time)); roundBush(c, 150, hh - 10, 20, tod('#5bb84c', time));
    const fl = flowerPal();
    [[100, hh - 7], [124, hh - 10], [262, hh - 9], [284, hh - 5], [176, hh - 6], [320, hh - 4]].forEach(function (f, i) { flower5(c, f[0], f[1], tod(fl[i % fl.length], time), 0.9); });
  }

  /* ---- タイトルの 地面（原っぱ → 砂の 道 → 手まえの 土の がけ）。w×hh は 400×(120＋330) ---- */
  function lipY(x) { return LAND_H - 5 + 2.2 * Math.sin(x * 0.085) + 1.3 * Math.sin(x * 0.23 + 1); }
  function paintTitleGround(c, w, hh, time) {
    const G = function (k) { return tod(GREEN[k], time); };
    const night = time === 'night';
    // 原っぱ（おく→手まえ）
    c.fillStyle = vgrad(c, 0, LAND_H, [[G('meadow'), 0], [mix(G('meadow'), G('near'), 0.55), 0.55], [G('near'), 1]]);
    c.fillRect(0, 0, w, LAND_H + 4);
    // やわらかい 明暗（地図の おかの ふくらみと 同じ）
    for (let i = 0; i < 12; i++) {
      const x = rnd(i + 31) * w, y = 10 + rnd(i + 57) * (LAND_H - 20), r = 30 + rnd(i + 83) * 50;
      const a = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      a.addColorStop(0, night ? 'rgba(160,190,255,.05)' : 'rgba(255,255,210,.12)'); a.addColorStop(1, 'rgba(255,255,210,0)');
      c.fillStyle = a; c.beginPath(); c.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); c.fill();
      const b = c.createRadialGradient(x + r * 0.5, y + r * 0.3, 0, x + r * 0.5, y + r * 0.3, r * 0.8);
      b.addColorStop(0, 'rgba(20,60,30,.045)'); b.addColorStop(1, 'rgba(20,60,30,0)');
      c.fillStyle = b; c.beginPath(); c.ellipse(x + r * 0.5, y + r * 0.3, r * 0.8, r * 0.36, 0, 0, Math.PI * 2); c.fill();
    }
    // 砂の 道（おくは 細く・手まえは 太い）。勇者の 足もとを 通る
    const P = [[204, -3, 2.5], [196, 16, 8], [192, 26, 11], [176, 46, 16], [170, 64, 20], [186, 86, 26], [214, 106, 32], [226, LAND_H + 2, 36]];
    function roadPath(extra) {
      const L = [], R = [];
      for (let i = 0; i < P.length; i++) { L.push([P[i][0] - P[i][2] - extra, P[i][1]]); R.push([P[i][0] + P[i][2] + extra, P[i][1]]); }
      c.beginPath(); c.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < L.length - 1; i++) c.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
      c.lineTo(L[L.length - 1][0], L[L.length - 1][1]);
      c.lineTo(R[R.length - 1][0], R[R.length - 1][1]);
      for (let i = R.length - 2; i > 0; i--) c.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
      c.lineTo(R[0][0], R[0][1]); c.closePath();
    }
    const road = tod(ROAD, time);
    c.fillStyle = rgba(drk(road, 0.28), 0.5); roadPath(2.2); c.fill();
    c.save(); roadPath(0); c.clip();
    c.fillStyle = vgrad(c, 0, LAND_H, [[lit(road, 0.08)], [road]]); c.fillRect(0, 0, w, LAND_H + 4);
    for (let i = 0; i < 150; i++) {       // じゃり（手まえほど 大きい）
      const y = rnd(i + 1300) * LAND_H, x = 120 + rnd(i + 1350) * 150, s = 0.35 + y / LAND_H * 0.9;
      c.fillStyle = i % 3 ? 'rgba(120,80,30,.18)' : 'rgba(255,245,220,.35)';
      c.beginPath(); c.ellipse(x, y, (0.8 + rnd(i + 1370)) * s, (0.5 + rnd(i + 1390) * 0.6) * s, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,230,.18)'; c.fillRect(0, 0, w, 3);
    c.restore();
    // 草の 株（手まえほど 大きい・道の 上には 生やさない）
    c.lineCap = 'round';
    for (let i = 0; i < 170; i++) {
      const y = 4 + rnd(i + 2100) * (LAND_H - 12), x = rnd(i + 2200) * w, s = 0.55 + y / LAND_H * 1.1;
      const onRoad = (function () { for (let j = 0; j < P.length - 1; j++) if (y >= P[j][1] && y <= P[j + 1][1]) { const k = (y - P[j][1]) / (P[j + 1][1] - P[j][1]); const cx = P[j][0] + (P[j + 1][0] - P[j][0]) * k, hw = P[j][2] + (P[j + 1][2] - P[j][2]) * k; return Math.abs(x - cx) < hw + 1; } return false; })();
      if (onRoad) continue;
      c.strokeStyle = i % 3 === 0 ? rgba(lit(G('near'), 0.35), 0.55) : rgba(drk(G('near'), 0.3), 0.4);
      c.lineWidth = 0.8 * s;
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x - 1.6 * s, y - 3.2 * s);
      c.moveTo(x, y); c.lineTo(x + 0.2 * s, y - 4.2 * s);
      c.moveTo(x, y); c.lineTo(x + 1.7 * s, y - 3 * s);
      c.stroke();
    }
    // 花と 岩（地図と 同じ 描き方）
    const fl = flowerPal();
    [[26, 30], [58, 52], [118, 22], [300, 26], [344, 46], [382, 70], [12, 88], [132, 98], [278, 84], [364, 102], [88, 76], [250, 14]].forEach(function (f, i) { flower5(c, f[0], f[1], tod(fl[i % fl.length], time), 0.8 + f[1] / LAND_H * 0.5); });
    rock(c, 362, 26, 0.8, tod(ROCKC, time), 0.18);
    rock(c, 40, 104, 1.1, tod(ROCKC, time), 0.2);
    rock(c, 128, 14, 0.6, tod(ROCKC, time), 0.16);
    // 日の 光（左上 明るく・右下 すこし 暗く）＝地図と 同じ
    const lg = c.createLinearGradient(0, 0, w, LAND_H);
    lg.addColorStop(0, night ? 'rgba(170,190,255,.06)' : 'rgba(255,245,200,.14)'); lg.addColorStop(1, 'rgba(30,20,60,.1)');
    c.fillStyle = lg; c.fillRect(0, 0, w, LAND_H);

    // ---- 手まえの 土の がけ（ボタンの うしろまで）----
    const soil = SOIL.map(function (x) { return tod(x, time); });
    function lipPath(dy) {
      c.beginPath(); c.moveTo(0, lipY(0) + dy);
      for (let x = 4; x <= w; x += 4) c.lineTo(x, lipY(x) + dy);
      c.lineTo(w, hh); c.lineTo(0, hh); c.closePath();
    }
    c.fillStyle = vgrad(c, LAND_H - 8, hh, [[soil[0], 0], [soil[1], 0.3], [soil[2], 1]]); lipPath(0); c.fill();
    c.save(); lipPath(0); c.clip();
    // 地層（ゆるい なみ）
    [[26, 'rgba(0,0,0,.08)'], [62, 'rgba(255,220,170,.07)'], [104, 'rgba(0,0,0,.08)'], [160, 'rgba(255,220,170,.05)'], [220, 'rgba(0,0,0,.07)']].forEach(function (s, j) {
      const y0 = LAND_H + s[0];
      c.fillStyle = s[1]; c.beginPath(); c.moveTo(0, y0);
      for (let x = 0; x <= w; x += 8) c.lineTo(x, y0 + 3 * Math.sin(x * 0.03 + j * 1.7));
      for (let x = w; x >= 0; x -= 8) c.lineTo(x, y0 + 12 + 3 * Math.sin(x * 0.03 + j * 1.7 + 0.8));
      c.closePath(); c.fill();
    });
    // 石（面 3つの まるい 石・地図の 岩場と 同じ 光）
    for (let i = 0; i < 46; i++) {
      const x = rnd(i + 3100) * w, y = LAND_H + 10 + rnd(i + 3150) * (hh - LAND_H - 16), r = 2.4 + rnd(i + 3170) * (i % 5 ? 4 : 8);
      const col = tod(i % 4 ? '#9a8470' : '#8a91a4', time);
      c.fillStyle = 'rgba(30,15,5,.28)'; c.beginPath(); c.ellipse(x + r * 0.25, y + r * 0.3, r, r * 0.72, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = lit(col, 0.28); c.beginPath(); c.ellipse(x - r * 0.28, y - r * 0.24, r * 0.55, r * 0.34, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba(drk(col, 0.35), 0.55); c.beginPath(); c.ellipse(x + r * 0.34, y + r * 0.3, r * 0.5, r * 0.26, 0.2, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 90; i++) {         // 小石
      c.fillStyle = i % 2 ? 'rgba(255,225,180,.16)' : 'rgba(20,10,0,.18)';
      c.beginPath(); c.arc(rnd(i + 3400) * w, LAND_H + 6 + rnd(i + 3450) * (hh - LAND_H), 0.6 + rnd(i + 3470) * 1.2, 0, Math.PI * 2); c.fill();
    }
    // 根っこ（草の すぐ 下）
    c.strokeStyle = rgba(drk(soil[1], 0.35), 0.42); c.lineWidth = 1; c.lineCap = 'round';
    [[34, 1], [96, -1], [158, 1], [262, -1], [318, 1], [376, -1]].forEach(function (r) {
      const x = r[0], y = lipY(x) + 2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6 * r[1], y + 7, x + 2 * r[1], y + 15); c.quadraticCurveTo(x - 2 * r[1], y + 20, x + 4 * r[1], y + 25); c.stroke();
    });
    // 草の 下の かげ
    c.fillStyle = vgrad(c, LAND_H - 6, LAND_H + 16, [['rgba(20,10,0,.38)'], ['rgba(20,10,0,0)']]); c.fillRect(0, LAND_H - 6, w, 22);
    c.restore();
    // がけの ふちの 草（たれさがる 草の 先・上の へりに 光）
    c.fillStyle = G('lip');
    c.beginPath(); c.moveTo(0, lipY(0) - 1);
    for (let x = 0; x <= w; x += 3) {
      const tip = (Math.floor(x / 3) % 3 === 0) ? 3.2 + rnd(x + 71) * 2.6 : 1.2;
      c.lineTo(x, lipY(x) + tip);
    }
    c.lineTo(w, lipY(w) - 3); c.lineTo(0, lipY(0) - 3); c.closePath(); c.fill();
    c.strokeStyle = rgba(lit(G('near'), 0.4), night ? 0.25 : 0.55); c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(0, lipY(0) - 2.5); for (let x = 4; x <= w; x += 4) c.lineTo(x, lipY(x) - 2.5); c.stroke();
  }

  /* ---- 太陽と 月（かんばんの 上の あき 400×52） ---- */
  function paintTitleTop(c, w, hh, time) {
    if (time === 'evening' || time === 'morning') {
      const x = 240, y = 28, r = time === 'evening' ? 13 : 11;
      const g = c.createRadialGradient(x, y, r * 0.6, x, y, r * 3.4);
      g.addColorStop(0, 'rgba(255,200,110,.55)'); g.addColorStop(0.45, 'rgba(255,200,110,.16)'); g.addColorStop(1, 'rgba(255,200,110,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.4, 0, Math.PI * 2); c.fill();
      const s = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      s.addColorStop(0, '#fff6c8'); s.addColorStop(0.7, time === 'evening' ? '#ffc65a' : '#ffe07a'); s.addColorStop(1, time === 'evening' ? '#ff9a3c' : '#ffc94a');
      c.fillStyle = s; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    } else if (time === 'night') {
      const x = 240, y = 26, r = 11;
      const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 2.8);
      g.addColorStop(0, 'rgba(255,244,200,.35)'); g.addColorStop(1, 'rgba(255,244,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.8, 0, Math.PI * 2); c.fill();
      c.save();
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#fff4c8'; c.fillRect(x - r, y - r, r * 2, r * 2);
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(x + r * 0.55, y - r * 0.3, r * 0.92, 0, Math.PI * 2); c.fill();
      c.restore();
      [[204, 34, 0.8], [290, 40, 0.9], [270, 14, 0.7], [168, 18, 0.7]].forEach(function (s) { starDot(c, s[0], s[1], s[2]); });
    }
  }

  /* ---------- タイトル（v12.6 の ブロック。Canvas が 使えない ときだけ） ---------- */
  function titleBlocks(time) {
    time = skyOf(null, time);
    const t = TONE[time];
    const L = layer('bgfar--title tod-' + time);
    skyThings(L, time, 'title');
    /* A：遠くの 2重の 山なみ（雪の 山頂）＋松＋城＋鳥＋きり */
    range(L, [[0, 30], [60, 68], [120, 38], [190, 84], [260, 46], [330, 74], [400, 34]], t.far, 12, 64, t.snow, 20);
    range(L, [[0, 12], [80, 44], [150, 22], [240, 56], [320, 26], [400, 46]], t.near, 12, 44, t.snow, 20);
    pines(L, [[0, 6], [22, 10], [130, 10], [200, 9], [236, 6], [376, 8]], t.pine, 20);
    castle(L, 296, 40, time === 'night' ? '#241f4a' : '#3f3b73', 1, true, time !== 'day');
    bird(L, 90, 118, t.bird); bird(L, 118, 110, t.bird); bird(L, 60, 104, t.bird);
    /* B：手まえの みどりの 丘＋木＋しげみ＋花 */
    range(L, [[0, 22], [90, 40], [180, 24], [280, 44], [400, 28]], time === 'night' ? '#2f6a3a' : '#7fcf5a', 12, 0);
    range(L, [[0, 12], [120, 26], [230, 14], [330, 30], [400, 16]], time === 'night' ? '#255a30' : '#63c24a', 12, 0);
    tree(L, 14, 8, 10, '#7a4d2a', '#3f9e3c', '#6fd35a');
    tree(L, 358, 6, 9, '#7a4d2a', '#3f9e3c', '#6fd35a');
    tree(L, 196, 14, 6, '#7a4d2a', '#3a8f3a', '#63c24a');
    bush(L, 60, 22, 12, '#4fae44'); bush(L, 300, 26, 14, '#4fae44'); bush(L, 150, 18, 10, '#4fae44');
    [[92, 6, '#e8443a'], [116, 4, '#ffd447'], [250, 5, '#ffffff'], [284, 7, '#e8443a'], [176, 4, '#ffd447']].forEach(function (f) { flower(L, f[0], f[1], f[2]); });
    part(L, 0, 26, 400, 22, 'linear-gradient(rgba(255,255,255,0),' + t.fog + ')', 'fog');
    return L;
  }

  /* タイトルの いちばん 上（かんばんの 上の あき・52px）：太陽か 月。まん中（x 176〜224）は 音の ボタンと おうちの人の あいだ */
  function titleTopBlocks(time) {
    time = skyOf(null, time);
    const L = layer('bgtop tod-' + time);
    if (time === 'evening') sun(L, 216, 10, .5);
    else if (time === 'morning') sun(L, 216, 10, .42);
    else if (time === 'night') { moon(L, 230, 16); star(L, 196, 30); star(L, 284, 38); star(L, 266, 12); }
    return L;
  }

  /* ---------- タイトル（v13.9）：Canvas に なめらかに 描く。使えない ときは ブロック ---------- */
  function title(time) {
    time = skyOf(null, time);
    if (!canPaint()) return titleBlocks(time);
    const L = layer('bgfar--title bgfar--painted tod-' + time);
    L.appendChild(painted('far:' + time, 400, 150, 'bgfar__cv', function (c, w, hh) { paintTitleFar(c, w, hh, time); }));
    return L;
  }
  function titleTop(time) {
    time = skyOf(null, time);
    if (!canPaint()) return titleTopBlocks(time);
    const L = layer('bgtop bgtop--painted tod-' + time);
    if (time !== 'day') L.appendChild(painted('top:' + time, 400, 96, 'bgfar__cv', function (c, w, hh) { paintTitleTop(c, w, hh, time); }));
    return L;
  }
  /* 地面（.title__land の いちばん うしろ）。原っぱ 120px ＋ ボタンの うしろの 土 330px。使えない ときは null（start.js が ブロックの 地面に する） */
  function ground(time) {
    time = skyOf(null, time);
    if (!canPaint()) return null;
    const el = painted('ground:' + time, 400, LAND_H + SOIL_H, 'title__groundcv', function (c, w, hh) { paintTitleGround(c, w, hh, time); });
    el.setAttribute('aria-hidden', 'true');
    return el;
  }
  /* 土の いちばん 下の 色（絵の 下に つづく ところ・css の --soil） */
  function soilColor(time) { return tod(SOIL[2], skyOf(null, time)); }

  /* ---------- v14.32：アリーナが 高い とき（最大 336px）の 空を うめる ----------
     ユーザー「上が 広くなった分 背景が 寂しい」。遠景の 層は アリーナの 高さ いっぱい（css）。
     ・いちばん 奥の 山なみ（backRange）は 高さを %（層の 高さに 対して）で 決める＝アリーナが ひくい ときは
       手前の 山なみに ほぼ かくれ、高い ときだけ 上に 顔を 出す（どの 高さでも 空が からっぽに ならない）。
     ・空の 上の ほうの 星・月・雲（upperSky）は 上から % で おく。 */
  function partPct(L, x, yPct, w, hPct, bg) {
    const el = document.createElement('i');
    el.style.cssText = 'left:' + x + 'px;bottom:' + yPct + '%;width:' + w + 'px;height:' + hPct + '%;background:' + bg;
    L.appendChild(el);
    return el;
  }
  function backRange(L, pts, color, step, cap, capColor) {
    step = step || 16;
    let prev = -1, runX = 0;
    const put = function (x1) { if (prev > 0) partPct(L, runX, 0, x1 - runX, prev, color); };
    for (let x = 0; x <= 400; x += step) {
      let hh = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (x >= a[0] && x <= b[0]) { hh = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); break; }
      }
      hh = Math.round(hh / 3) * 3;
      if (hh !== prev) { put(x); runX = x; prev = hh; }
    }
    put(400);
    if (cap) pts.forEach(function (p, i) {
      if (i === 0 || i === pts.length - 1 || p[1] <= cap) return;
      const el = document.createElement('i');
      const x0 = Math.floor(p[0] / step) * step;
      let hh = p[1];                        // その 列の 本当の 高さ（雪が 浮かない ように）
      for (let j = 0; j < pts.length - 1; j++) { const q = pts[j], r = pts[j + 1]; if (x0 >= q[0] && x0 <= r[0]) { hh = q[1] + (r[1] - q[1]) * (x0 - q[0]) / (r[0] - q[0]); break; } }
      el.style.cssText = 'left:' + x0 + 'px;bottom:calc(' + (Math.round(hh / 3) * 3) + '% - 10px);width:' + step + 'px;height:10px;background:' + capColor;
      L.appendChild(el);
    });
  }
  function up(L, x, topPct, w, hh, cls) {
    const el = document.createElement('i');
    el.className = 'up' + (cls ? ' ' + cls : '');
    el.style.cssText = 'left:' + x + 'px;top:' + topPct + '%;width:' + w + 'px;height:' + hh + 'px';
    L.appendChild(el);
    return el;
  }
  function upStar(L, x, topPct) { up(L, x, topPct, 3, 3, 'star').style.background = '#fff8e0'; }
  function upCloud(L, x, topPct, w, hh, c) { cloud(up(L, x, topPct, w, hh * 2), 0, 0, w, hh, c); }
  function upperSky(L, time) {
    if (time === 'night') {
      moon(up(L, 318, 9, 20, 22), 0, 0);
      [[24, 5], [88, 14], [150, 4], [196, 20], [244, 9], [286, 27], [372, 18], [58, 33], [130, 29], [352, 40], [220, 37], [104, 45], [296, 49], [20, 50]].forEach(function (s) { upStar(L, s[0], s[1]); });
      upCloud(L, 160, 14, 52, 10, 'rgba(120,140,200,.30)');
    } else if (time === 'evening') {
      [[40, 6], [200, 3], [360, 10], [300, 2], [120, 4]].forEach(function (s) { upStar(L, s[0], s[1]); });
      upCloud(L, 118, 12, 56, 12, '#ffb3a0'); upCloud(L, 296, 24, 44, 10, '#ff9f8e');
    } else if (time === 'morning') {
      upCloud(L, 168, 9, 56, 12, 'rgba(255,255,255,.9)'); upCloud(L, 318, 22, 44, 10, 'rgba(255,255,255,.85)'); upCloud(L, 36, 30, 38, 8, 'rgba(255,255,255,.8)');
    } else {
      upCloud(L, 160, 8, 60, 14, 'rgba(255,255,255,.9)'); upCloud(L, 310, 20, 48, 12, 'rgba(255,255,255,.88)'); upCloud(L, 28, 32, 40, 10, 'rgba(255,255,255,.8)');
    }
  }
  /* いちばん 奥の 山なみの 色（時間帯・手前より うすく かすんだ 色） */
  const BACK = { morning: '#cdd8ee', day: '#b4c6e6', evening: '#7b5e9e', night: '#26336a' };
  const BACKSNOW = { morning: '#ffffff', day: '#f6f9ff', evening: '#ffe0d0', night: '#b8c4ea' };
  function backOf(L, biome, time) {
    if (biome === 'mountain' || biome === 'lake') backRange(L, [[0, 44], [40, 54], [90, 42], [150, 72], [200, 52], [250, 60], [310, 48], [360, 68], [400, 50]], BACK[time], 16, 58, BACKSNOW[time]);
    else if (biome === 'forest') backRange(L, [[0, 38], [70, 52], [140, 40], [220, 60], [300, 44], [400, 54]], '#7a5a9e', 16);
    else if (biome === 'town') backRange(L, [[0, 36], [100, 50], [200, 38], [300, 56], [400, 42]], BACK[time], 16);
    else if (biome === 'sea') backRange(L, [[0, 50], [60, 66], [120, 40], [250, 36], [320, 62], [400, 48]], 'rgba(255,255,255,.55)', 16);
    else if (biome === 'sky') backRange(L, [[0, 46], [80, 62], [160, 38], [240, 58], [320, 42], [400, 56]], 'rgba(236,244,255,.85)', 16);
    else if (biome === 'tower') backRange(L, [[0, 36], [30, 62], [50, 40], [110, 44], [140, 74], [170, 46], [240, 42], [270, 68], [300, 40], [360, 48], [380, 64], [400, 44]], '#241c46', 12);
  }

  /* ---------- バトル（エリアごと） ---------- */
  function arena(biome, time) {
    biome = BIOMES.indexOf(biome) >= 0 ? biome : 'mountain';
    time = skyOf(biome, time);
    const t = TONE[time];
    const L = layer('bgfar--arena bgfar--' + biome + ' tod-' + time);
    upperSky(L, time);                 // v14.32：空の 上の ほう（上から %）
    skyThings(L, time, 'arena');
    backOf(L, biome, time);            // v14.32：いちばん 奥の 山なみ（高い アリーナで 顔を 出す）
    if (biome === 'mountain') {
      /* A：雪山 2重＋松＋遠くの 城（小さく・うすく）＋鳥＋きり */
      range(L, [[0, 46], [60, 96], [120, 56], [190, 118], [260, 66], [330, 104], [400, 50]], t.far, 12, 90, t.snow);
      range(L, [[0, 22], [80, 62], [150, 34], [240, 78], [320, 40], [400, 66]], t.near, 12, 60, t.snow);
      pines(L, [[0, 8], [22, 12], [80, 14], [140, 12], [170, 7], [206, 11]], t.pine);
      castle(L, 322, 10, t.near, .55, true, time !== 'day');
      bird(L, 90, 108, t.bird); bird(L, 118, 100, t.bird);
      part(L, 0, 0, 400, 26, 'linear-gradient(rgba(255,255,255,0),' + t.fog + ')', 'fog');
    } else if (biome === 'forest') {
      /* B：木を 多く・A の 山は 遠く 小さく（森は ずっと 夕方） */
      range(L, [[0, 30], [90, 60], [180, 40], [280, 70], [400, 34]], '#5a3d7e', 12, 0);
      range(L, [[0, 30], [90, 66], [180, 36], [280, 74], [400, 40]], '#5f9a45', 12, 0);
      range(L, [[0, 14], [120, 34], [230, 16], [330, 40], [400, 20]], '#4c8a3a', 12, 0);
      tree(L, 6, 10, 10, '#6a4224', '#3a8f3a', '#63c24a');
      tree(L, 92, 18, 7, '#6a4224', '#2f7f30', '#4fae44');
      tree(L, 170, 12, 9, '#6a4224', '#3a8f3a', '#63c24a');
      tree(L, 236, 24, 5, '#6a4224', '#2f7f30', '#4fae44');
      bush(L, 60, 22, 12, '#3f9e3c'); bush(L, 140, 18, 10, '#3f9e3c'); bush(L, 300, 26, 12, '#3f9e3c');
      [[130, 6, '#e8443a'], [156, 4, '#ffd447'], [214, 5, '#ffffff'], [286, 7, '#e8443a']].forEach(function (f) { flower(L, f[0], f[1], f[2]); });
      part(L, 0, 0, 400, 20, 'linear-gradient(rgba(255,255,255,0),rgba(255,200,140,.25))', 'fog');
    } else if (biome === 'sea') {
      /* すなはま＋ヤシ＋波＋遠くの 島 */
      range(L, [[0, 20], [60, 26], [120, 18], [400, 16]], 'rgba(255,255,255,.6)', 12, 0, null, 20);
      part(L, 0, 0, 400, 22, 'linear-gradient(#5aaee8,#3d8fd8)', 'water');
      [[30, 6], [110, 12], [190, 4], [260, 10], [330, 6]].forEach(function (w) { part(L, w[0], w[1], 24, 2, 'rgba(255,255,255,.7)'); });
      range(L, [[150, 0], [180, 14], [220, 18], [250, 12], [270, 0]], '#4c9a3c', 8, 0, null, 20);
      part(L, 214, 38, 3, 12, '#6a4224'); part(L, 208, 48, 14, 4, '#3a8f3a'); part(L, 210, 52, 10, 3, '#3a8f3a');
      palm(L, 8, 0, 9, '#8a5a32', '#3f9e3c');
      palm(L, 120, 0, 7, '#8a5a32', '#3f9e3c');
      bird(L, 60, 100, '#f4f8ff'); bird(L, 84, 92, '#f4f8ff'); bird(L, 300, 104, '#f4f8ff');
    } else if (biome === 'sky') {
      /* 雲の 床＋遠くの お城（A の 城・白っぽく）＋雲 */
      range(L, [[0, 30], [70, 44], [140, 26], [220, 40], [300, 24], [400, 36]], '#dfeaff', 10, 0);
      range(L, [[0, 16], [60, 22], [120, 14], [200, 24], [280, 12], [400, 20]], '#ffffff', 10, 0);
      castle(L, 150, 20, '#b9c8e8', .8, true, false);
      cloud(L, 20, 40, 40, 10, '#ffffff'); cloud(L, 330, 30, 46, 12, '#ffffff');
      bird(L, 100, 96, '#6a86bf'); bird(L, 124, 104, '#6a86bf');
    } else if (biome === 'tower') {
      /* まおうの 城の 中：くらい 山・石の 柱・むらさきの クリスタル・星 */
      range(L, [[0, 40], [70, 70], [140, 46], [210, 84], [290, 50], [360, 66], [400, 44]], '#1b1636', 12, 0);
      range(L, [[0, 20], [90, 40], [170, 22], [260, 44], [340, 24], [400, 36]], '#150f2b', 12, 0);
      pillar(L, 22, 64, '#3a2f5a', '#4b3d74'); pillar(L, 118, 56, '#3a2f5a', '#4b3d74'); pillar(L, 214, 62, '#3a2f5a', '#4b3d74');
      crystal(L, 64, 0, 9, '#b46cff'); crystal(L, 160, 0, 7, '#9a4cf0'); crystal(L, 250, 0, 6, '#b46cff');
      [[30, 100], [90, 110], [150, 98], [200, 112], [260, 104], [320, 96], [370, 108]].forEach(function (s) { star(L, s[0], s[1]); });
      part(L, 0, 0, 400, 22, 'linear-gradient(rgba(120,80,200,0),rgba(120,80,200,.28))', 'fog');
    } else if (biome === 'lake') {
      /* 水面＋あし＋遠くの 山 */
      range(L, [[0, 40], [70, 76], [140, 46], [210, 90], [290, 52], [360, 72], [400, 44]], t.far, 12, 70, t.snow, 24);
      range(L, [[0, 22], [90, 44], [170, 26], [260, 52], [340, 30], [400, 40]], t.near, 12, 0, null, 24);
      part(L, 0, 0, 400, 26, 'linear-gradient(#6fb6ec,#4a8fd8)', 'water');
      [[20, 8], [96, 16], [150, 6], [230, 14], [300, 10], [360, 18]].forEach(function (w) { part(L, w[0], w[1], 30, 2, 'rgba(255,255,255,.55)'); });
      [[30, 34], [40, 42], [52, 30], [200, 40], [210, 32], [340, 38]].forEach(function (r) { reed(L, r[0], r[1]); });
      bird(L, 80, 104, t.bird); bird(L, 106, 96, t.bird);
    } else if (biome === 'town') {
      /* 家なみ＋遠くの 丘（夕方と 夜は 窓に 明かり） */
      const lit = time === 'evening' || time === 'night';
      range(L, [[0, 30], [90, 52], [180, 34], [280, 56], [400, 30]], time === 'night' ? '#2f5a3a' : '#7fbf5a', 12, 0);
      house(L, 8, 0, 46, 30, '#f2ead6', '#d65a4a', lit);
      house(L, 70, 0, 40, 26, '#e8dcc4', '#4b8fd8', lit);
      house(L, 126, 0, 52, 34, '#f2ead6', '#d65a4a', lit);
      house(L, 196, 0, 44, 28, '#efe4cc', '#5aa64a', lit);
      house(L, 254, 0, 36, 24, '#e8dcc4', '#d65a4a', lit);
      [[60, 18], [116, 14], [184, 20], [246, 16]].forEach(function (p) { part(L, p[0], 0, 4, p[1], '#8a6a3a'); part(L, p[0] - 2, p[1] - 5, 8, 3, '#8a6a3a'); });
      bird(L, 300, 100, t.bird); bird(L, 330, 92, t.bird);
    }
    return L;
  }

  /* ---------- バトルの ゆか（手前が 大きく 奥が 小さい マス目） ---------- */
  function floor(biome) {
    biome = BIOMES.indexOf(biome) >= 0 ? biome : 'mountain';
    const wrap = document.createElement('div'); wrap.className = 'afloorwrap';
    const f = document.createElement('div'); f.className = 'afloor afloor--' + biome;
    wrap.appendChild(f);
    return wrap;
  }

  /* ---------- 地図：海の 向こうの うすい 山なみ（A）と 時間帯の 光（C） ---------- */
  const MAP_FAR = { g1: '#9fd0f0', g2: '#5f96cf', g3: '#6e9ad8', g4: '#5f83b8', g5: '#c9dcf2', g6: '#2a2040' };
  function mapFar(theme) {
    const L = document.createElement('div'); L.className = 'mapfar';
    range(L, [[0, 6], [50, 14], [100, 8], [160, 16], [220, 10], [290, 15], [350, 7], [400, 12]], MAP_FAR[theme] || MAP_FAR.g3, 10, 0);
    return L;
  }
  function mapTint(time) {
    time = time || timeOfDay();
    const el = document.createElement('div'); el.className = 'map__tint tod-' + time;
    return el;
  }

  function count(el) { return el ? el.querySelectorAll('i').length : 0; }

  return {
    BIOMES: BIOMES, FIXED: FIXED, TONE: TONE,
    now: now, setNow: setNow, timeOfDay: timeOfDay, skyOf: skyOf,
    title: title, titleTop: titleTop, titleBlocks: titleBlocks, ground: ground, soilColor: soilColor, canPaint: canPaint,
    paintTitleFar: paintTitleFar, paintTitleGround: paintTitleGround, paintTitleTop: paintTitleTop, LAND_H: LAND_H, SOIL_H: SOIL_H,
    arena: arena, floor: floor, mapFar: mapFar, mapTint: mapTint, count: count
  };
})();
