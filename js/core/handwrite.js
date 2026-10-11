/* ---------------------------------------------------------
   かん字を「書く」問題の はんてい（v2.9）

   いままでは 正しい字を 見せて 自分で ○× だった → なぐり書きでも ○に できた（ユーザー）。
   ここでは 書いた 字の「形」を、フォントで 描いた おてほんと くらべて 点数を つける。

   しくみ（字を 読む AI では なく、形の にている 度合い）：
     ① メモ欄の canvas から 線の ある ところ（alpha）を とる
     ② 字の まわりの 余白を 切り、S×S（48）に のばす（大きさ・場所・たてよこの ちがいを なくす）
     ③ おてほん：かん字を フォントで 描いて 同じ ように S×S に
     ④ 線の 太さを おてほんに 合わせる（細い 線は ふとらせる）
     ⑤ 特徴：8×8 の ますごとに 線の 向き（4方向）の 量（256個）＋ 6×6 の こさ（36個）
     ⑥ 点数 = 向きの にている 度合い×0.7 ＋ こさの にている 度合い×0.3（0〜1）
     ⑦ ぬりつぶし（かたまり）／たてよこが ぜんぜん ちがう（一 に たての 線）は ×
   はんてい：
     ok    … 点数が 高い → そのまま せいかい
     maybe … まよう → おてほんと ならべて 見せ、じぶんで ◯✕（前と 同じ）
     ng    … 低い → ×（おてほんを 見せて もう1回）
   しきい値は tools/harness.html #judge で 校正した（docs/v2.9メモ 参照）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.handwrite = (function () {
  const S = 48;      // のばした あとの 大きさ
  const PAD = 2;
  const G = 8;       // 向きの 特徴の ます
  const D = 6;       // こさの 特徴の ます
  // おてほんの フォント：教科書体 → 明朝 → ゴシック の じゅんで、端末に ある もの
  let FONT = "'UD Digi Kyokasho N-R', 'UD Digi Kyokasho N', 'HGKyokashotai', 'BIZ UDMincho Medium', 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', 'Noto Serif CJK JP', 'Noto Sans JP', 'Noto Sans CJK JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif";
  // きびしさ（おうちの人ページ）。#judge の 校正：ok 0.85 で「べつの字が ○」3〜4%・正しい字が そのまま ○ 約80%
  // d＝線が たりない・多い の しきい値の 倍率（v14.51・大きいほど ゆるい）
  const LEVELS = { easy: { ok: 0.78, ng: 0.55, d: 1.25 }, normal: { ok: 0.82, ng: 0.62, d: 1 }, strict: { ok: 0.88, ng: 0.70, d: 0.85 } };   // v14.53：手書きで 試して ふつう 0.85 → 0.82（正しい字の ○ 87 → 94%）
  let TH = { ok: LEVELS.normal.ok, ng: LEVELS.normal.ng };
  const DIFF = { k: 1 };
  const W = { dir: 0.7, den: 0.3 };
  let cache = {};

  /* ---- canvas → 線の ある ところ ---- */
  function alphaOf(canvas) {
    const w = canvas.width, hh = canvas.height;
    if (!w || !hh) return null;
    let d;
    try { d = canvas.getContext('2d').getImageData(0, 0, w, hh).data; } catch (e) { return null; }
    const a = new Uint8Array(w * hh);
    let n = 0;
    for (let i = 0, k = 0; i < d.length; i += 4, k++) if (d[i + 3] > 40) { a[k] = 1; n++; }
    return { w: w, h: hh, a: a, n: n };
  }
  function bbox(b) {
    let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1;
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        if (!b.a[y * b.w + x]) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  /* 余白を 切って S×S に のばす（たてよこは べつに おぼえておく） */
  function normalize(b) {
    const box = bbox(b);
    if (!box) return null;
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const inner = S - PAD * 2;
    const g = new Float32Array(S * S);
    const sub = 3;
    let n = 0;
    for (let y = 0; y < inner; y++) {
      for (let x = 0; x < inner; x++) {
        let s = 0;
        for (let v = 0; v < sub; v++) {
          for (let u = 0; u < sub; u++) {
            const sx = box.x0 + Math.min(bw - 1, Math.floor((x + (u + 0.5) / sub) / inner * bw));
            const sy = box.y0 + Math.min(bh - 1, Math.floor((y + (v + 0.5) / sub) / inner * bh));
            if (b.a[sy * b.w + sx]) s++;
          }
        }
        g[(y + PAD) * S + x + PAD] = s / (sub * sub);
      }
    }
    for (let k = 0; k < b.a.length; k++) n += b.a[k];
    return { g: g, box: box, w: bw, h: bh, aspect: bh / bw, fill: n / (bw * bh) };
  }

  /* ---- 画像の 道具 ---- */
  function fillOf(g) { let s = 0; for (let i = 0; i < g.length; i++) s += g[i]; return s / g.length; }
  function at(g, x, y) { return g[Math.max(0, Math.min(S - 1, y)) * S + Math.max(0, Math.min(S - 1, x))]; }
  function blur3(g) {
    const o = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(g, x + dx, y + dy);
      o[y * S + x] = s / 9;
    }
    return o;
  }
  function dilate(g) {
    const o = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = at(g, x + dx, y + dy); if (v > m) m = v; }
      o[y * S + x] = m;
    }
    return o;
  }
  // 細い 線は おてほんの 太さまで ふとらせる（子どもの 線は フォントより 細い）
  function matchThickness(g, target) {
    let cur = fillOf(g), k = 0;
    while (cur < target * 0.75 && k < 3) { g = dilate(g); cur = fillOf(g); k++; }
    return g;
  }
  function l2(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= s;
    return v;
  }
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  /* ---- ゆびの 線の ならび（メモ欄が おぼえている paths）から：画数・とがった まがり ---- */
  function pathStats(paths) {
    let strokes = 0, sharpMax = 0, sharpTotal = 0, len = 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    (paths || []).forEach(function (p) {
      (p || []).forEach(function (q) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; });
    });
    const side = Math.max(1, x1 - x0, y1 - y0);
    const step = Math.max(8, side * 0.06);     // これより 短い ふるえ・はねは 見ない
    (paths || []).forEach(function (p) {
      if (!p || !p.length) return;
      strokes++;
      const rs = [p[0]];
      for (let i = 1; i < p.length; i++) {
        const a = rs[rs.length - 1], b = p[i];
        len += Math.hypot(b.x - p[i - 1].x, b.y - p[i - 1].y);
        if (Math.hypot(b.x - a.x, b.y - a.y) >= step) rs.push(b);
      }
      let sharp = 0;
      for (let i = 2; i < rs.length; i++) {
        const ax = rs[i - 1].x - rs[i - 2].x, ay = rs[i - 1].y - rs[i - 2].y;
        const bx = rs[i].x - rs[i - 1].x, by = rs[i].y - rs[i - 1].y;
        const cs = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1);
        if (cs < Math.cos(75 * Math.PI / 180)) sharp++;   // 75度より 大きく まがる
      }
      if (sharp > sharpMax) sharpMax = sharp;
      sharpTotal += sharp;
    });
    return { strokes: strokes, sharpMax: sharpMax, sharpTotal: sharpTotal, length: len, side: side };
  }
  /* 画数・なぐりがきの ルール。だめなら { verdict:'ng', reason }、よければ null */
  function pathRules(paths, kanji) {
    if (!paths || !paths.length) return null;
    const ps = pathStats(paths);
    const expected = (MQ.kakusu && MQ.kakusu.ofWord(kanji)) || 0;
    const out = { strokes: ps.strokes, expected: expected, sharpMax: ps.sharpMax, sharpTotal: ps.sharpTotal };
    /* 1本の 線で 5回いじょう ぐねぐね／ぜんぶで 画数＋5 いじょう → なぐりがき
       （v5.5 で 4 → 5 に ゆるめた。「口」「日」を ひと筆で 書く 子が ×に なって いた） */
    if (ps.sharpMax >= 5 || (expected && ps.sharpTotal > expected + 5)) { out.verdict = 'ng'; out.reason = 'scribble'; out.score = 0; return out; }
    // 画数が 半分 より 少ない（線を つなげて 書く 子も いるので ゆるめ）／多すぎる（ちょんちょん）
    if (expected >= 3 && ps.strokes < Math.ceil(expected * 0.5)) { out.verdict = 'ng'; out.reason = 'strokes'; out.score = 0; return out; }
    if (expected && ps.strokes > expected * 2 + 4) { out.verdict = 'ng'; out.reason = 'strokes'; out.score = 0; return out; }
    return null;
  }

  /* ---- 特徴 ---- */
  function features(g) {
    const s = blur3(blur3(g));
    const dir = new Float32Array(G * G * 4);
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        const gx = (at(s, x + 1, y - 1) + 2 * at(s, x + 1, y) + at(s, x + 1, y + 1)) - (at(s, x - 1, y - 1) + 2 * at(s, x - 1, y) + at(s, x - 1, y + 1));
        const gy = (at(s, x - 1, y + 1) + 2 * at(s, x, y + 1) + at(s, x + 1, y + 1)) - (at(s, x - 1, y - 1) + 2 * at(s, x, y - 1) + at(s, x + 1, y - 1));
        const m = Math.sqrt(gx * gx + gy * gy);
        if (m < 0.02) continue;
        let th = Math.atan2(gy, gx);
        if (th < 0) th += Math.PI;
        const p = th / (Math.PI / 4);           // 0〜4（0=よこの へり, 2=たての へり）
        const b0 = Math.floor(p) % 4, b1 = (b0 + 1) % 4, f = p - Math.floor(p);
        const u = (x + 0.5) / S * G - 0.5, v = (y + 0.5) / S * G - 0.5;
        const u0 = Math.floor(u), v0 = Math.floor(v), fu = u - u0, fv = v - v0;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const cx = u0 + i, cy = v0 + j;
            if (cx < 0 || cy < 0 || cx >= G || cy >= G) continue;
            const w = (i ? fu : 1 - fu) * (j ? fv : 1 - fv) * m;
            const base = (cy * G + cx) * 4;
            dir[base + b0] += w * (1 - f);
            dir[base + b1] += w * f;
          }
        }
      }
    }
    for (let i = 0; i < dir.length; i++) dir[i] = Math.sqrt(dir[i]);
    l2(dir);
    // こさ（ふとらせてから 6×6 に）
    const dg = dilate(g);
    const den = new Float32Array(D * D);
    const cell = S / D;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      den[Math.floor(y / cell) * D + Math.floor(x / cell)] += dg[y * S + x];
    }
    l2(den);
    return { dir: dir, den: den };
  }
  function compare(fa, fb) {
    const dsim = dot(fa.dir, fb.dir), nsim = dot(fa.den, fb.den);
    return { dir: dsim, den: nsim, score: W.dir * dsim + W.den * nsim };
  }

  /* ---- 線が たりない・多い を さがす（v14.51） ----
     形の 点数（向きと こさ）は 字ぜんたいの にかたを 見るので、「目」を「日」と 書いても
     0.9 ちかく 出て ○に なって いた（ユーザー「線が 1本 少なくても 正解に なる」）。
     ここでは おてほんと 書いた 字を 同じ 大きさに そろえて かさね、
       miss  … おてほんの 線なのに 近くに 書いた 線が ない ところ（線が たりない）
       extra … 書いた 線なのに 近くに おてほんの 線が ない ところ（線が 多い）
     を さがし、いちばん 大きい ひと かたまりの 大きさ（字の 大きさ S に 対する 長さ）を かえす。
     手で 書いた ずれは 小さな かけらに なり、1本 ぬけた 線は 長い かたまりに なる。 */
  // m の 1 の ところの うち、いちばん 大きい つながりの「長さ」（よこ・たての 長い ほう）と 画素数
  function biggestBlob(m) {
    const seen = new Uint8Array(S * S);
    let best = { len: 0, n: 0 };
    const st = [];
    for (let i = 0; i < S * S; i++) {
      if (!m[i] || seen[i]) continue;
      let n = 0, x0 = S, y0 = S, x1 = -1, y1 = -1;
      st.push(i); seen[i] = 1;
      while (st.length) {
        const k = st.pop(), x = k % S, y = (k - x) / S;
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue;
          const j = yy * S + xx;
          if (m[j] && !seen[j]) { seen[j] = 1; st.push(j); }
        }
      }
      const len = Math.max(x1 - x0 + 1, y1 - y0 + 1);
      if (len > best.len || (len === best.len && n > best.n)) best = { len: len, n: n };
    }
    return best;
  }
  const NEAR_R = 3;     // これより 近ければ「同じ 線」と みなす（48 の うち）
  // 0/1 の 地図 → いちばん 近い 1 までの きょり（3-4 チャンファー・÷3 で だいたい px）
  function distOf(m) {
    const BIG = 1e6, d = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) d[i] = m[i] ? 0 : BIG;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) { v = Math.min(v, d[i - S] + 3); if (x > 0) v = Math.min(v, d[i - S - 1] + 4); if (x < S - 1) v = Math.min(v, d[i - S + 1] + 4); }
      d[i] = v;
    }
    for (let y = S - 1; y >= 0; y--) for (let x = S - 1; x >= 0; x--) {
      const i = y * S + x; let v = d[i];
      if (x < S - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < S - 1) { v = Math.min(v, d[i + S] + 3); if (x < S - 1) v = Math.min(v, d[i + S + 1] + 4); if (x > 0) v = Math.min(v, d[i + S - 1] + 4); }
      d[i] = v;
    }
    for (let i = 0; i < S * S; i++) d[i] /= 3;
    return d;
  }
  // 書いた 字を 少し 回す・ななめに する・たてよこに のばす・ずらす（まん中を 中心に）
  function warp(m, th, k, dx, dy, a) {
    a = a || 1;
    const o = new Uint8Array(S * S), c = (S - 1) / 2;
    const cs = Math.cos(th), sn = Math.sin(th);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // 出力 → 入力（ぎゃくの 変換）
      let u = x - c - dx, v = y - c - dy;
      const ru = cs * u + sn * v, rv = -sn * u + cs * v;
      const sv = rv * a, su = (ru - k * sv) / a;
      const sx = Math.round(su + c), sy = Math.round(sv + c);
      if (sx >= 0 && sy >= 0 && sx < S && sy < S && m[sy * S + sx]) o[y * S + x] = 1;
    }
    return o;
  }
  function strokeDiff(childG, tmplG) {
    // おてほんの 線の しん（こい ところ）／書いた 線
    const tCore = new Uint8Array(S * S), tAll = new Uint8Array(S * S), cLine = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) { if (tmplG[i] > 0.6) tCore[i] = 1; if (tmplG[i] > 0.4) tAll[i] = 1; if (childG[i] > 0.25) cLine[i] = 1; }
    const dT = distOf(tAll);
    const tPts = []; for (let i = 0; i < S * S; i++) if (tCore[i]) tPts.push(i);
    // 書いた 字の かたむき・ななめ・ずれを、おてほんに いちばん かさなる ように 合わせる
    let best = null;
    function tryIt(th, k, dx, dy, a) {
      const w = warp(cLine, th, k, dx, dy, a);
      const dC = distOf(w);
      let s = 0, n = 0, e = 0, en = 0;
      for (let j = 0; j < tPts.length; j++) { s += Math.min(8, dC[tPts[j]]); n++; }
      for (let i = 0; i < S * S; i++) if (w[i]) { e += Math.min(8, dT[i]); en++; }
      const cost = (n ? s / n : 8) + (en ? e / en : 8);
      if (!best || cost < best.cost) best = { cost: cost, w: w, dC: dC, th: th, k: k, dx: dx, dy: dy, a: a };
    }
    const R = Math.PI / 180;
    // 平たい 字・細長い 字は 正方形に のばす ので、かたむきが「ななめ＋たてよこの のび」に なる → a も さがす
    [0.88, 1, 1.12].forEach(function (a) { [-8, -4, 0, 4, 8].forEach(function (d) { [-0.12, -0.06, 0, 0.06, 0.12].forEach(function (k) { tryIt(d * R, k, 0, 0, a); }); }); });
    const b0 = best;
    [-2, 0, 2].forEach(function (da) { [-0.03, 0, 0.03].forEach(function (dk) { [-2, -1, 0, 1, 2].forEach(function (dx) { [-2, -1, 0, 1, 2].forEach(function (dy) {
      tryIt(b0.th + da * R, b0.k + dk, dx, dy, b0.a);
    }); }); }); });
    const miss = new Uint8Array(S * S), extra = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) {
      if (tCore[i] && best.dC[i] > NEAR_R) miss[i] = 1;
      if (best.w[i] && dT[i] > NEAR_R) extra[i] = 1;
    }
    const bm = biggestBlob(miss), be = biggestBlob(extra);
    let cn = 0; for (let i = 0; i < S * S; i++) if (best.w[i]) cn++;
    return { miss: bm.len / S, missN: bm.n, missA: bm.n / Math.max(1, tPts.length), extra: be.len / S, extraN: be.n, extraA: be.n / Math.max(1, cn), fit: best.cost };
  }

  /* ---- おてほん ---- */
  function templateOf(kanji) {
    if (kanji in cache) return cache[kanji];
    let t = null;
    try {
      // 小3は「学校」「大きい」のような ことばも ある → 字数ぶん よこに 長い canvas
      const len = Math.max(1, String(kanji).length);
      const c = document.createElement('canvas');
      c.width = 40 + 120 * len; c.height = 160;
      const x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      x.fillStyle = '#000';
      x.font = '112px ' + FONT;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(kanji, c.width / 2, 84);
      const b = alphaOf(c);
      const nrm = b && b.n > 20 ? normalize(b) : null;
      if (nrm) t = { g: nrm.g, aspect: nrm.aspect, fill: fillOf(nrm.g), feat: features(nrm.g) };
    } catch (e) { t = null; }
    cache[kanji] = t;
    return t;
  }

  /* ---- はんてい ---- */
  function judge(canvas, kanji, opts) {
    opts = opts || {};
    const b = alphaOf(canvas);
    if (!b || b.n < 30) return { verdict: 'ng', reason: 'empty', score: 0 };
    const nrm = normalize(b);
    if (!nrm || nrm.w < 12 || nrm.h < 12) return { verdict: 'ng', reason: 'empty', score: 0 };
    const t = templateOf(kanji);
    if (!t) return { verdict: 'maybe', reason: 'notemplate', score: 0.7 };
    const out = { fill: nrm.fill, w: nrm.w, h: nrm.h, strokes: opts.strokes, expected: (MQ.kakusu && MQ.kakusu.ofWord(kanji)) || 0 };
    // ぬりつぶした かたまり
    if (nrm.fill > 0.62) { out.verdict = 'ng'; out.reason = 'blob'; out.score = 0; return out; }
    // たてよこ（一 は よこ長・川 は たて長）。ぜんぜん ちがえば ×
    const asp = Math.abs(Math.log(nrm.aspect / t.aspect));
    out.aspect = asp;
    const g = matchThickness(nrm.g, t.fill);
    const cmp = compare(features(g), t.feat);
    let score = cmp.score;
    if (asp > 0.7) score -= (asp - 0.7) * 0.5;
    score = Math.max(0, Math.min(1, score));
    out.dir = cmp.dir; out.den = cmp.den; out.score = score;
    /* v14.51：線が たりない・多い。1字の ときだけ（「学校」の ような ことばは 48 に つめると 線が つぶれる）。
       strong＝はっきり ちがう → ×／weak＝あやしい → ○に しない（見くらべ）。画数も ちがえば ×。
       しきい値は #judgenear で 校正（正しい字が ×に なるのは 約2%）。 */
    let diff = '';
    if (String(kanji).length === 1) {
      const sd = strokeDiff(nrm.g, t.g);
      out.miss = sd.miss; out.extra = sd.extra; out.missA = sd.missA; out.extraA = sd.extraA;
      const f = DIFF.k;
      const strong = (sd.miss >= 0.13 * f && sd.missA >= 0.035 * f) || (sd.extra >= 0.12 * f && sd.extraA >= 0.035 * f);
      const weak = (sd.miss >= 0.10 * f && sd.missA >= 0.018 * f) || (sd.extra >= 0.10 * f && sd.extraA >= 0.018 * f);
      const sMiss = sd.missA >= sd.extraA ? 'missing' : 'extra';
      const ps = (opts.paths && opts.paths.length) ? pathStats(opts.paths) : null;
      if (ps && out.expected) {
        /* v14.53：ゆびで 書いた とき（本物の 画面は いつも これ）。
           v14.51 は フォントの 字で 校正した ので、手書きの 細い 線・ゆがみを「線が たりない」と 見まちがえ、
           **正しく 書いても ×**に なった（ユーザー「大人の 僕でも 正解判定 出なかった」）。
           → **画数が 合って いれば 形の ちがいでは × に しない**（いままで どおり 形の 点数だけで きめる）。
              画数が たりない（多い）うえに、たりない（多い）線が はっきり 見つかった ときだけ ×。
              あやしい だけ なら 見くらべ。「目」を「日」と 書くと 画数も 1つ たりない ので ここで 止まる。 */
        const fewer = ps.strokes < out.expected, more = ps.strokes > out.expected;
        const strongMiss = sd.miss >= 0.13 * f && sd.missA >= 0.035 * f, strongExtra = sd.extra >= 0.12 * f && sd.extraA >= 0.035 * f;
        if (fewer && strongMiss) diff = 'missing';
        else if (more && strongExtra) diff = 'extra';
        else if ((fewer || more) && weak) diff = 'weak';
      } else if (strong) diff = sMiss;     // 線の ならびが ない とき（テストの 字）は はっきり ちがう ときだけ
      out.diff = diff;
    }
    /* ゆびの 線が わかる とき：画数・なぐりがきの ルール（v2.9）。
       **v5.5：形が おてほんに よく にて いれば ×に せず「見くらべて じぶんで ○×」に する。**
       実機では 線が とちゅうで 切れて 画数が 合わなく なる ことが あった（v5.5 で 直したが、
       つなげて 書く 子・ひと筆で 書く 子も いる）。なぐりがきは 形の 点数が 高く ならない ので
       これで 通って しまう ことは ない。 */
    const rule = pathRules(opts.paths, kanji);
    if (rule) {
      Object.assign(out, rule);
      out.score = score;
      if (score >= TH.ok) { out.verdict = 'maybe'; out.reason = rule.reason + '-but-shape'; }
      // なぐりがきは なぐりがきの ことば（v14.53）。画数が たりない うえに 線も 見つからない ときは「線が たりない」
      if (rule.reason !== 'scribble' && (diff === 'missing' || diff === 'extra')) { out.verdict = 'ng'; out.reason = diff; }
      return out;
    }
    if (diff === 'missing' || diff === 'extra') { out.verdict = 'ng'; out.reason = diff; return out; }
    if (asp > 1.2) { out.verdict = 'ng'; out.reason = 'shape'; return out; }
    out.reason = 'score';
    out.verdict = score >= TH.ok ? 'ok' : score < TH.ng ? 'ng' : 'maybe';
    if (diff === 'weak' && out.verdict === 'ok') { out.verdict = 'maybe'; out.reason = 'weak-diff'; }
    return out;
  }

  /* 書いた 字の ところだけを 切りぬいた 絵（見くらべ用・白い 下地の 正方形） */
  function cropUrl(canvas, size) {
    const b = alphaOf(canvas);
    const box = b ? bbox(b) : null;
    const out = document.createElement('canvas');
    out.width = size || 96; out.height = size || 96;
    const x = out.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, out.width, out.height);
    if (!box) return out.toDataURL();
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const side = Math.max(bw, bh) * 1.15;
    const cx = (box.x0 + box.x1 + 1) / 2, cy = (box.y0 + box.y1 + 1) / 2;
    x.imageSmoothingEnabled = true;
    x.drawImage(canvas, cx - side / 2, cy - side / 2, side, side, 0, 0, out.width, out.height);
    return out.toDataURL();
  }

  return {
    S: S,
    judge: judge,
    cropUrl: cropUrl,
    templateOf: templateOf,
    // 部品（smoke / harness 用）
    alphaOf: alphaOf,
    normalize: normalize,
    features: features,
    compare: compare,
    matchThickness: matchThickness,
    fillOf: fillOf,
    dot: dot,
    font: function () { return FONT; },
    setFont: function (f) { FONT = f; cache = {}; },
    strokeDiff: strokeDiff,
    pathStats: pathStats,
    pathRules: pathRules,
    LEVELS: LEVELS,
    setLevel: function (name) { const L = LEVELS[name] || LEVELS.normal; TH.ok = L.ok; TH.ng = L.ng; DIFF.k = L.d || 1; },
    thresholds: function () { return { ok: TH.ok, ng: TH.ng }; },
    setThresholds: function (o) { if (o && o.ok != null) TH.ok = o.ok; if (o && o.ng != null) TH.ng = o.ng; }
  };
})();
