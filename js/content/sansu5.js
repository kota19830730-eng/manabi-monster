/* ---------------------------------------------------------
   小5 算数：問題を その場で作る（日本文教出版『小学算数』5年の 単元の じゅん・v6.5）

   ステージ 1〜7 は 1学期、8〜14 は 2学期、15〜18 は 3学期（目安。学校で 前後する）。
   出すか どうかは 学期の しくみ（terms.js・おうちの人ページ）が 決める。

   問題の作り方は 関数として 入っていて、数字は 毎回かわります。
   ステージごとに 4つの グループ（easy / normal / hard / boss）。sansu4.js と 同じ 形。

   ことばの きまり：小4までの かん字＋5年で ならう かん字（比・率・均・応・仮・容・増・減・厚）。
   6年・中学の かん字は ふりがな か ひらがな（割合→<ruby>割</ruby>合・偶数→<ruby>偶</ruby>数・
   すいちょく・ちょう点・てん開図）。tools/smoke.js が 検査する。

   あたらしい 答えの 形（v6.5）：type 'frac' ＝ 分子と 分母を べつべつに 入れる（{ n, d }）。
   核（core/battle.js）と 画面（ui/battle.js）が わり算の あまり（divrem）と 同じ しくみで 受ける。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu5 = (function () {
  const U = MQ.util;

  /* =======================================================
     問題を作る 小さな道具
     ======================================================= */
  function expr(a, sign, b) { return '<span class="num">' + a + ' ' + sign + ' ' + b + '</span>'; }
  const HAS_FIG = /figbox|class="graph"|class="figwide"|class="tbl"|<svg/;
  function num(unit, prompt, answer, extra) {
    return Object.assign({ type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: !HAS_FIG.test(String(prompt)) }, extra || {});
  }
  function choice(unit, prompt, choices, extra) {
    return Object.assign({ type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0 }, extra || {});
  }
  function fx(v) { return String(Math.round(v * 1000) / 1000); }
  function dec(unit, prompt, value, extra) {
    return num(unit, prompt, Math.round(value * 1000) / 1000, Object.assign({ decimal: true }, extra || {}));
  }
  function vertical(unit, a, sign, b, answer, extra) {
    return num(unit, expr(a, sign, b), answer, Object.assign({ layout: 'vertical', a: a, b: b, sign: sign }, extra || {}));
  }
  // 分数の 答え（分子 n・分母 d）。約分ずみの 形で 入れる きまり（画面に 書いて ある）
  function fracQ(unit, prompt, n, d, extra) {
    const g = gcd(n, d);
    return Object.assign({ type: 'frac', unit: unit, prompt: prompt, answer: { n: n / g, d: d / g }, scratch: !HAS_FIG.test(String(prompt)) }, extra || {});
  }
  function pf(list) { return list[U.randInt(0, list.length - 1)]; }
  function withDistractors(correct, candidates, format) {
    const seen = {};
    seen[String(correct)] = true;
    const out = [format ? format(correct) : String(correct)];
    U.shuffle(candidates).forEach(function (c) {
      if (out.length >= 4) return;
      const k = String(c);
      if (seen[k]) return;
      seen[k] = true;
      out.push(format ? format(c) : String(c));
    });
    return out;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function lcm(a, b) { return a * b / gcd(a, b); }
  function divisors(n) { const out = []; for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i); return out; }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // 分数の 見た目（画面）と 文字（ヒント・note）
  function fr(n, d) { return '<span class="frac"><span class="frac__n">' + n + '</span><span class="frac__d">' + d + '</span></span>'; }
  function mixed(w, n, d) { return '<span class="mixed"><span class="mixed__w">' + w + '</span>' + fr(n, d) + '</span>'; }
  function ft(n, d) { return d + '分の' + n; }
  function mt(w, n, d) { return w + 'と' + ft(n, d); }

  // ふりがな（prompt だけ HTML が 使える）
  const WARI = '<ruby>割<rt>わり</rt></ruby>合';
  const WARIBIKI = '<ruby>割<rt>わり</rt></ruby>引';
  const GUU = '<ruby>偶<rt>ぐう</rt></ruby>数';
  const KI = '<ruby>奇<rt>き</rt></ruby>数';
  const SHASHA = '四<ruby>捨<rt>しゃ</rt></ruby>五入';
  const TENKAI = '<ruby>展<rt>てん</rt></ruby>開図';

  /* =======================================================
     図の 道具（inline SVG）。色は sansu3/4 と そろえる
     ======================================================= */
  const FS = '#1a1a1a', FF = '#FFF3C4', FR = '#d42a20', FB = '#4F8CFF', FG = '#3E9A6B';
  function svgBox(inner) { return '<span class="figbox"><svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg></span>'; }
  function svgWide(inner, w, hgt) { return '<svg class="figwide" viewBox="0 0 ' + (w || 300) + ' ' + (hgt || 100) + '" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>'; }
  function figQ(text, svg) { return '<span class="figq"><span class="figq__t">' + text + '</span>' + svg + '</span>'; }
  function txt(x, y, s, size, color, anchor, bold) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 12) + '" fill="' + (color || FR) + '" text-anchor="' + (anchor || 'middle') + '"' + (bold === false ? '' : ' font-weight="bold"') + '>' + s + '</text>';
  }
  function poly(pts, fill, stroke, sw) {
    return '<polygon points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" fill="' + (fill || FF) + '" stroke="' + (stroke || FS) + '" stroke-width="' + (sw || 3.4) + '" stroke-linejoin="round"/>';
  }
  function line(a, b, color, sw, dash) {
    return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (color || FS) + '" stroke-width="' + (sw || 2.4) + '"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linecap="round"/>';
  }
  // sansu3 / sansu4 の 図を かりる（読みこみは index.html の じゅん）
  function boxSvg(cube, labels) { return MQ.sansu4.figs4.boxSvg(cube, labels); }
  function tableRows(rows) { return MQ.sansu4.figs4.tableRows(rows); }
  function tableHtml(head, rows) { return MQ.sansu4.figs4.tableHtml(head, rows); }
  function circleSvg(kind, label) { return MQ.sansu3.figs3.circleSvg(kind, label); }

  /* ---- 平行四辺形・三角形・台形・ひし形の 面積（ステージ14） ---- */
  function paraSvg(b, h, labels) {
    const sc = Math.min(96 / (b + 3), 70 / h, 12);
    const W = b * sc, H = h * sc, sk = Math.min(28, 3 * sc);
    const x = 24, y = 18 + (70 - H) / 2;
    let s = poly([[x, y + H], [x + W, y + H], [x + W + sk, y], [x + sk, y]]);
    s += line([x + sk, y], [x + sk, y + H], FR, 2.2, true);
    s += '<rect x="' + (x + sk) + '" y="' + (y + H - 7) + '" width="7" height="7" fill="none" stroke="' + FR + '" stroke-width="1.4"/>';
    s += txt(x + W / 2, y + H + 16, labels[0]);
    s += txt(x + sk - 5, y + H / 2 + 4, labels[1], 12, FR, 'end');
    return svgBox(s);
  }
  function triASvg(b, h, labels, right) {
    const sc = Math.min(104 / b, 74 / h, 12);
    const W = b * sc, H = h * sc;
    const x = 28, y = 16 + (74 - H) / 2;
    const apex = right ? [x, y] : [x + W * 0.38, y];
    let s = poly([[x, y + H], [x + W, y + H], apex]);
    if (!right) s += line([apex[0], y], [apex[0], y + H], FR, 2.2, true);
    s += '<rect x="' + apex[0] + '" y="' + (y + H - 7) + '" width="7" height="7" fill="none" stroke="' + FR + '" stroke-width="1.4"/>';
    s += txt(x + W / 2, y + H + 16, labels[0]);
    s += txt(apex[0] - 5, y + H / 2 + 4, labels[1], 12, FR, 'end');
    return svgBox(s);
  }
  function trapSvg(a, b, h, labels) {
    const big = Math.max(a, b);
    const sc = Math.min(104 / big, 66 / h, 12);
    const Wa = a * sc, Wb = b * sc, H = h * sc;
    const x = 28, y = 20 + (66 - H) / 2;
    const off = (Wb - Wa) / 2;
    let s = poly([[x, y + H], [x + Wb, y + H], [x + Wb - off, y], [x + off, y]]);
    s += line([x + Wb / 2, y], [x + Wb / 2, y + H], FR, 2.2, true);
    s += txt(x + Wb / 2, y - 5, labels[0]);          // 上底
    s += txt(x + Wb / 2, y + H + 16, labels[1]);     // 下底
    s += txt(x + Wb / 2 + 5, y + H / 2 + 4, labels[2], 12, FR, 'start');
    return svgBox(s);
  }
  function rhombusSvg(d1, d2, labels) {
    const sc = Math.min(104 / d1, 76 / d2, 12);
    const W = d1 * sc, H = d2 * sc;
    const cx = 84, cy = 60;
    let s = poly([[cx - W / 2, cy], [cx, cy - H / 2], [cx + W / 2, cy], [cx, cy + H / 2]]);
    s += line([cx - W / 2, cy], [cx + W / 2, cy], FR, 2.2, true);
    s += line([cx, cy - H / 2], [cx, cy + H / 2], FR, 2.2, true);
    s += txt(cx + W / 2 - 14, cy - 6, labels[0], 12, FR, 'end');
    s += txt(cx + 5, cy + H / 2 - 6, labels[1], 12, FR, 'start');
    return svgBox(s);
  }

  /* ---- 三角形・四角形の 角（ステージ7） ---- */
  function triAngSvg(labels, kind) {
    const pts = kind === 'iso' ? [[80, 14], [30, 104], [130, 104]] : [[52, 16], [16, 104], [144, 104]];
    let s = poly(pts);
    const at = [[pts[0][0], pts[0][1] + 24], [pts[1][0] + 22, pts[1][1] - 8], [pts[2][0] - 22, pts[2][1] - 8]];
    labels.forEach(function (t, i) { if (t != null) s += txt(at[i][0], at[i][1], t, 12, t === '？' ? FR : FB); });
    return svgBox(s);
  }
  function quadAngSvg(labels) {
    const pts = [[24, 30], [130, 16], [144, 100], [38, 108]];
    let s = poly(pts);
    const at = [[pts[0][0] + 20, pts[0][1] + 16], [pts[1][0] - 20, pts[1][1] + 18], [pts[2][0] - 22, pts[2][1] - 8], [pts[3][0] + 22, pts[3][1] - 10]];
    labels.forEach(function (t, i) { if (t != null) s += txt(at[i][0], at[i][1], t, 12, t === '？' ? FR : FB); });
    return svgBox(s);
  }
  function polyPts(n, cx, cy, r, rot) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = (rot || -Math.PI / 2) + Math.PI * 2 * i / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  // 正多角形（ステージ17）。center で 中心と 1つの 中心角
  function polySvg(n, opts) {
    opts = opts || {};
    const cx = 80, cy = 62, r = 48;
    const pts = polyPts(n, cx, cy, r);
    let s = '';
    if (opts.circle) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#999" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += poly(pts);
    if (opts.center) {
      s += line([cx, cy], pts[0], FR, 2);
      s += line([cx, cy], pts[1], FR, 2);
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + FS + '"/>';
      s += txt(cx + 12, cy - 8, opts.center === true ? '？' : opts.center, 13, FR, 'start');
    }
    if (opts.side) s += txt((pts[0][0] + pts[1][0]) / 2 + 10, (pts[0][1] + pts[1][1]) / 2 - 4, opts.side, 12, FR, 'start');
    return svgBox(s);
  }
  // 合同（ステージ6）：もとの 三角形と あ・い・う の 3つ。ans が 合同（回した／うら返した）
  function congSvg(ans) {
    const base = [[0, 0], [44, 0], [12, -34]];
    function tr(pts, f) { return pts.map(f); }
    const shapes = [];
    // 合同（180度 回す）・うら返し・大きさが ちがう・形が ちがう
    const cong = tr(base, function (p) { return [-p[0], -p[1]]; });
    const flip = tr(base, function (p) { return [-p[0], p[1]]; });
    const bigger = tr(base, function (p) { return [p[0] * 1.35, p[1] * 1.35]; });
    const other = [[0, 0], [44, 0], [30, -34]];
    const wrongs = U.shuffle([bigger, other]);
    const list = [null, null, null];
    list[ans] = pf([cong, flip]);
    let wi = 0;
    for (let i = 0; i < 3; i++) if (!list[i]) list[i] = wrongs[wi++];
    let s = '';
    // もとの 三角形（左）
    s += poly(base.map(function (p) { return [p[0] + 14, p[1] + 66]; }), '#FFE1A8');
    s += txt(36, 86, 'もと', 11, FS);
    const ox = [104, 176, 248];
    list.forEach(function (pts, i) {
      const minX = Math.min.apply(null, pts.map(function (p) { return p[0]; })), maxX = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
      const minY = Math.min.apply(null, pts.map(function (p) { return p[1]; })), maxY = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
      const cx = ox[i] - (minX + maxX) / 2, cy = 46 - (minY + maxY) / 2;
      s += poly(pts.map(function (p) { return [p[0] + cx, p[1] + cy]; }));
      s += txt(ox[i], 92, ['あ', 'い', 'う'][i], 13, FB);
    });
    return svgWide(s, 300, 100);
  }
  // 対応する 頂点（ステージ6）：ABC と DEF（合同・回した もの）
  function corrSvg() {
    const A = [[40, 80], [120, 80], [64, 22]];
    const B = A.map(function (p) { return [300 - p[0] + 0, 102 - p[1] + 0]; });   // 180度 回して 右に
    let s = poly(A) + poly(B);
    const la = [['A', 64, 14], ['B', 30, 94], ['C', 128, 94]];
    const lb = [['D', 236, 96], ['E', 270, 16], ['F', 172, 16]];
    la.concat(lb).forEach(function (l) { s += txt(l[1], l[2], l[0], 13, FB); });
    return svgWide(s, 300, 100);
  }
  /* ---- 帯グラフ・円グラフ（ステージ16）。items: [{ name, pct }]。hide＝？に する 番号 ---- */
  function bandSvg(items, hide) {
    const W = 300, x0 = 8, y0 = 30, bw = 284, bh = 30;
    const cols = ['#4F8CFF', '#FF8A5A', '#4CD164', '#FFD166', '#C9A0FF', '#AAB4C4'];
    let s = '';
    let x = x0;
    items.forEach(function (it, i) {
      const w = bw * it.pct / 100;
      s += '<rect x="' + x + '" y="' + y0 + '" width="' + w + '" height="' + bh + '" fill="' + cols[i % cols.length] + '" stroke="' + FS + '" stroke-width="1.4"/>';
      s += txt(x + w / 2, y0 + bh / 2 + 4, it.name, 10, FS);
      s += txt(x + w / 2, y0 + bh + 14, i === hide ? '？' : it.pct + '%', 11, i === hide ? FR : FS);
      x += w;
    });
    // 目もり（10% ごと）
    for (let i = 0; i <= 10; i++) {
      const gx = x0 + bw * i / 10;
      s += line([gx, y0 - 6], [gx, y0], FS, 1);
      if (i % 5 === 0) s += txt(gx, y0 - 9, i * 10, 9, FS);
    }
    return svgWide(s, W, 82);
  }
  // 円グラフは 帯グラフと 同じく カードの はば いっぱい（小さい わくだと 名前が 読めない）
  function pieSvg(items, hide) {
    const cx = 52, cy = 50, r = 44;
    const cols = ['#4F8CFF', '#FF8A5A', '#4CD164', '#FFD166', '#C9A0FF', '#AAB4C4'];
    let s = '', acc = 0;
    items.forEach(function (it, i) {
      const a0 = -Math.PI / 2 + Math.PI * 2 * acc / 100, a1 = -Math.PI / 2 + Math.PI * 2 * (acc + it.pct) / 100;
      const big = it.pct > 50 ? 1 : 0;
      s += '<path d="M ' + cx + ' ' + cy + ' L ' + (cx + Math.cos(a0) * r) + ' ' + (cy + Math.sin(a0) * r) + ' A ' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + Math.cos(a1) * r) + ' ' + (cy + Math.sin(a1) * r) + ' Z" fill="' + cols[i % cols.length] + '" stroke="' + FS + '" stroke-width="1.4"/>';
      const am = (a0 + a1) / 2;
      s += txt(cx + Math.cos(am) * r * 0.62, cy + Math.sin(am) * r * 0.62 + 4, i === hide ? '？' : it.pct + '%', 10, i === hide ? FR : FS);
      acc += it.pct;
    });
    // 右に 名前（2列）
    items.forEach(function (it, i) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 118 + col * 88, y = 30 + row * 34;
      s += '<rect x="' + x + '" y="' + (y - 11) + '" width="13" height="13" fill="' + cols[i % cols.length] + '" stroke="' + FS + '" stroke-width="1"/>';
      s += txt(x + 18, y, it.name, 12, FS, 'start', false);   // 割合は おうぎ形の 中に 書いて ある
    });
    return svgWide(s, 300, 100);
  }
  /* ---- 角柱・円柱（ステージ18） ---- */
  function prismSvg(kind, labels) {
    let s = '';
    if (kind === 'cyl') {
      s += '<ellipse cx="80" cy="96" rx="40" ry="12" fill="' + FF + '" stroke="' + FS + '" stroke-width="3"/>';
      s += '<rect x="40" y="30" width="80" height="66" fill="' + FF + '" stroke="none"/>';
      s += line([40, 30], [40, 96], FS, 3) + line([120, 30], [120, 96], FS, 3);
      s += '<ellipse cx="80" cy="30" rx="40" ry="12" fill="#FFE9A8" stroke="' + FS + '" stroke-width="3"/>';
      if (labels) { s += txt(128, 66, labels[0], 12, FR, 'start'); s += txt(80, 14, labels[1], 12, FR); }
      return svgBox(s);
    }
    const n = kind === 'tri' ? 3 : kind === 'quad' ? 4 : kind === 'pent' ? 5 : 6;
    const top = polyPts(n, 80, 30, 34, Math.PI / 2 + Math.PI / n).map(function (p) { return [p[0], 30 + (p[1] - 30) * 0.42]; });
    const bot = top.map(function (p) { return [p[0], p[1] + 62]; });
    // 見えない へん（うしろ）は てんせん
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const back = top[i][1] < 30 && top[j][1] < 30;
      s += line(bot[i], bot[j], FS, back ? 2 : 3, back);
    }
    for (let i = 0; i < n; i++) s += line(top[i], bot[i], FS, top[i][1] < 28 ? 2 : 3, top[i][1] < 28);
    s += poly(top, '#FFE9A8');
    if (labels) { s += txt(134, 66, labels[0], 12, FR, 'start'); }
    return svgBox(s);
  }
  // 円柱の てん開図（ステージ18）
  function cylNetSvg(labels) {
    let s = '<circle cx="80" cy="18" r="14" fill="#FFE9A8" stroke="' + FS + '" stroke-width="2.4"/>';
    s += '<rect x="20" y="34" width="120" height="52" fill="' + FF + '" stroke="' + FS + '" stroke-width="2.4"/>';
    s += '<circle cx="80" cy="102" r="14" fill="#FFE9A8" stroke="' + FS + '" stroke-width="2.4"/>';
    s += txt(80, 64, labels[0], 12, FR);
    s += txt(146, 64, labels[1], 11, FR, 'start');
    return svgBox(s);
  }

  /* =======================================================
     ステージ1 整数と 小数
     ======================================================= */
  const PLACE5 = { 0: '一の位', '-1': '小数第一位', '-2': '小数第二位', '-3': '小数第三位', 1: '十の位', 2: '百の位' };
  function rnd3() { return U.randInt(1001, 9999) / 1000; }   // 小数第三位まで
  function rnd2() { return U.randInt(101, 999) / 100; }
  function timesQ(mult) {
    const v = mult >= 100 ? rnd3() : rnd2();
    return dec('10倍・100倍', '<span class="num">' + fx(v) + '</span> を ' + mult + '倍した 数は？', v * mult, {
      scratch: false, hint: mult + '倍すると、小数点が 右に ' + (String(mult).length - 1) + 'けた うつるよ。', note: fx(v) + ' × ' + mult + ' = ' + fx(v * mult)
    });
  }
  function divQ(divisor) {
    const v = divisor >= 100 ? U.randInt(12, 999) : U.randInt(12, 99) + pf([0, 0.5]);
    return dec('10分の1・100分の1', '<span class="num">' + fx(v) + '</span> を ' + divisor + ' で わった 数は？', v / divisor, {
      scratch: false, hint: divisor + ' で わると、小数点が 左に ' + (String(divisor).length - 1) + 'けた うつるよ。', note: fx(v) + ' ÷ ' + divisor + ' = ' + fx(v / divisor)
    });
  }
  function placeQ5() {
    const v = rnd3();
    const p = pf([-1, -2, -3]);
    const s = fx(v);
    const d = Number(s.split('.')[1].padEnd(3, '0').charAt(-p - 1));
    return num('小数の 位', '<span class="num">' + s + '</span> の ' + PLACE5[p] + 'の 数字は？', d, {
      scratch: false, hint: '小数点の 右から 1つめが 小数第一位、2つめが 小数第二位、3つめが 小数第三位。', note: s + ' の ' + PLACE5[p] + 'は ' + d
    });
  }
  function collectQ() {
    const unit = pf([0.1, 0.01, 0.001]), k = U.randInt(12, 999);
    return dec('小数の しくみ', fx(unit) + ' を ' + k + 'こ あつめた 数は？', unit * k, {
      scratch: false, hint: fx(unit) + ' × ' + k + '。' + fx(unit) + ' が 10こで ' + fx(unit * 10) + '。', note: fx(unit) + ' × ' + k + ' = ' + fx(unit * k)
    });
  }
  function howManyQ() {
    const unit = pf([0.01, 0.001]), k = U.randInt(12, 999);
    const v = unit * k;
    return num('小数の しくみ', '<span class="num">' + fx(v) + '</span> は ' + fx(unit) + ' を 何こ あつめた 数？', k, {
      scratch: false, hint: fx(v) + ' ÷ ' + fx(unit) + '。小数点を 右に うつして 考えよう。', note: fx(v) + ' は ' + fx(unit) + ' が ' + k + 'こ'
    });
  }
  function composeQ5() {
    const a = U.randInt(1, 9), b = U.randInt(1, 9), c = U.randInt(1, 9), d = U.randInt(1, 9);
    const v = a + b / 10 + c / 100 + d / 1000;
    return dec('小数の しくみ', '1 を ' + a + 'こ、0.1 を ' + b + 'こ、0.01 を ' + c + 'こ、0.001 を ' + d + 'こ 合わせた 数は？', v, {
      scratch: false, hint: a + ' + 0.' + b + ' + 0.0' + c + ' + 0.00' + d + '。', note: '= ' + fx(v)
    });
  }
  function cmpQ5() {
    let a = rnd3(), b = a + pf([0.001, 0.01, 0.1, -0.001, -0.01]);
    b = Math.round(b * 1000) / 1000;
    if (b <= 0 || b === a) b = a + 0.002;
    const big = Math.max(a, b);
    return choice('小数の 大小', '<span class="num">' + fx(a) + '</span> と <span class="num">' + fx(b) + '</span>。大きいのは？', [fx(big), fx(Math.min(a, b))], {
      key: 'cmp5:' + fx(a) + ':' + fx(b), hint: '上の 位から じゅんに くらべよう。', note: fx(big) + ' の ほうが 大きい'
    });
  }
  function whatTimesQ() {
    const v = rnd2(), m = pf([10, 100, 1000]);
    const w = Math.round(v * m * 100) / 100;
    return choice('何倍', '<span class="num">' + fx(v) + '</span> を 何倍すると <span class="num">' + fx(w) + '</span> に なる？', withDistractors(m + '倍', ['10倍', '100倍', '1000倍', '10分の1']), {
      key: 'wt:' + fx(v) + ':' + m, hint: '小数点が 右に 何けた うつったか 数えよう。', note: fx(v) + ' × ' + m + ' = ' + fx(w)
    });
  }
  function reverseQ() {
    const v = rnd2(), m = pf([10, 100]);
    return dec('もとの 数', 'ある 数を ' + m + '倍したら <span class="num">' + fx(v * m) + '</span> に なりました。ある 数は？', v, {
      scratch: false, hint: fx(v * m) + ' ÷ ' + m + '。小数点を 左に ' + (String(m).length - 1) + 'けた。', note: fx(v * m) + ' ÷ ' + m + ' = ' + fx(v)
    });
  }
  const stage1 = {
    easy: [function () { return timesQ(10); }, function () { return divQ(10); }, placeQ5, function () { return collectQ(); }],
    normal: [function () { return timesQ(100); }, function () { return divQ(100); }, composeQ5, cmpQ5, howManyQ],
    hard: [function () { return timesQ(1000); }, whatTimesQ, reverseQ, function () { return collectQ(); }],
    boss: [reverseQ, whatTimesQ, composeQ5, function () { return timesQ(1000); }]
  };

  /* =======================================================
     ステージ2 体積
     ======================================================= */
  function cubeQ() {
    const a = U.randInt(2, 7);
    return num('立方体の 体積', figQ('1辺が ' + a + 'cm の 立方体。体積は 何cm³？', boxSvg(true, [a + 'cm', a + 'cm', a + 'cm'])), a * a * a, {
      key: 'cube:' + a, hint: '体積 = 1辺 × 1辺 × 1辺。' + a + ' × ' + a + ' × ' + a + '。', note: a + ' × ' + a + ' × ' + a + ' = ' + (a * a * a) + 'cm³'
    });
  }
  function boxQ(big) {
    const w = big ? U.randInt(11, 30) : U.randInt(2, 8), d = big ? U.randInt(5, 20) : U.randInt(2, 8), hgt = big ? U.randInt(5, 15) : U.randInt(2, 8);
    const text = 'たて ' + d + 'cm、横 ' + w + 'cm、高さ ' + hgt + 'cm の 直方体。体積は 何cm³？';
    return num('直方体の 体積', big ? text : figQ(text, boxSvg(false, [w + 'cm', hgt + 'cm', d + 'cm'])), w * d * hgt, {
      key: 'box:' + w + ':' + d + ':' + hgt, maxLen: 6, hint: '体積 = たて × 横 × 高さ。' + d + ' × ' + w + ' × ' + hgt + '。', note: d + ' × ' + w + ' × ' + hgt + ' = ' + (w * d * hgt) + 'cm³'
    });
  }
  const VOL_UNITS = [
    ['1L は 何cm³？', 1000, '1L = 1000cm³（10cm × 10cm × 10cm の 立方体）。'],
    ['1m³ は 何cm³？', 1000000, '100 × 100 × 100 = 1000000。'],
    ['1m³ は 何L？', 1000, '1m³ = 1000L。'],
    ['1mL は 何cm³？', 1, '1mL = 1cm³。'],
    ['1L は 何mL？', 1000, '1L = 1000mL。'],
    ['1dL は 何cm³？', 100, '1dL = 100mL = 100cm³。']
  ];
  function volUnitQ() {
    const u = pf(VOL_UNITS);
    return num('体積の 単位', u[0], u[1], { key: 'vu:' + u[0], scratch: false, maxLen: 7, hint: u[2], note: u[0].replace('何', String(u[1])).replace('？', '') });
  }
  function volConvQ() {
    const k = pf([[2, 'L', 'cm³', 1000], [3.5, 'L', 'cm³', 1000], [2, 'm³', 'L', 1000], [4500, 'cm³', 'L', 0.001], [0.5, 'm³', 'cm³', 1000000], [250, 'mL', 'cm³', 1]]);
    const v = k[0] * k[3];
    return dec('体積の 単位', fx(k[0]) + k[1] + ' は 何' + k[2] + '？', v, { key: 'vc:' + k[0] + k[1], scratch: false, maxLen: 8, hint: '1' + k[1] + ' = ' + fx(k[3]) + k[2] + '。', note: fx(k[0]) + k[1] + ' = ' + fx(v) + k[2] });
  }
  function sideQ() {
    const w = U.randInt(2, 9), d = U.randInt(2, 9), hgt = U.randInt(2, 9);
    return num('高さを もとめる', 'たて ' + d + 'cm、横 ' + w + 'cm の 直方体の 体積が ' + (w * d * hgt) + 'cm³。高さは 何cm？', hgt, {
      hint: '体積 ÷ （たて × 横）。' + (w * d * hgt) + ' ÷ ' + (w * d) + '。', note: (w * d * hgt) + ' ÷ ' + (w * d) + ' = ' + hgt + 'cm'
    });
  }
  function innerQ() {
    const w = U.randInt(10, 20), d = U.randInt(8, 16), hgt = U.randInt(6, 12), t = 1;
    const iw = w - 2 * t, id = d - 2 * t, ih = hgt - t;
    return num('容積', 'あつさ 1cm の 板で 作った 直方体の 入れもの。外がわは たて ' + d + 'cm、横 ' + w + 'cm、高さ ' + hgt + 'cm（ふたなし）。容積は 何cm³？', iw * id * ih, {
      maxLen: 6, hint: '内のりは たて ' + id + 'cm、横 ' + iw + 'cm、高さ ' + ih + 'cm（ふたが ない ので 高さは 1cm だけ へる）。', note: id + ' × ' + iw + ' × ' + ih + ' = ' + (iw * id * ih) + 'cm³'
    });
  }
  function comboVolQ() {
    const a = U.randInt(4, 9), b = U.randInt(2, 5), c = U.randInt(2, 4);
    const v1 = a * a * b, v2 = c * c * c;
    return num('組み合わせた 体積', 'たて ' + a + 'cm、横 ' + a + 'cm、高さ ' + b + 'cm の 直方体の 上に、1辺 ' + c + 'cm の 立方体を のせました。ぜんぶの 体積は？', v1 + v2, {
      hint: a + ' × ' + a + ' × ' + b + ' と ' + c + ' × ' + c + ' × ' + c + ' を たそう。', note: v1 + ' + ' + v2 + ' = ' + (v1 + v2) + 'cm³'
    });
  }
  function waterQ() {
    const w = U.randInt(10, 30), d = U.randInt(10, 20), hh = U.randInt(3, 12);
    return dec('水の 体積', 'たて ' + d + 'cm、横 ' + w + 'cm の 水そうに 水が ' + hh + 'cm の 深さまで 入って います。水は 何L？', w * d * hh / 1000, {
      maxLen: 7, hint: d + ' × ' + w + ' × ' + hh + ' cm³ を 1000 で わると L。', note: (w * d * hh) + 'cm³ = ' + fx(w * d * hh / 1000) + 'L'
    });
  }
  const stage2 = {
    easy: [cubeQ, function () { return boxQ(false); }, volUnitQ, function () { return boxQ(false); }],
    normal: [function () { return boxQ(true); }, volConvQ, sideQ, waterQ],
    hard: [innerQ, comboVolQ, function () { return boxQ(true); }, volConvQ],
    boss: [innerQ, comboVolQ, waterQ, sideQ]
  };

  /* =======================================================
     ステージ3 比例
     ======================================================= */
  const PROP_ITEMS = [
    ['えんぴつの 本数', 'ねだん', 60, '円', '本'], ['水を 入れる 時間', '水の 深さ', 3, 'cm', '分'], ['リボンの 長さ', 'ねだん', 40, '円', 'm'],
    ['正方形の 1辺', 'まわりの 長さ', 4, 'cm', 'cm'], ['ノートの さっ数', 'ねだん', 120, '円', 'さつ'], ['走った 時間', '道のり', 80, 'm', '分']
  ];
  function propTableQ(kind) {
    const it = pf(PROP_ITEMS), a = it[2];
    const xs = [1, 2, 3, 4, 5];
    const hide = U.randInt(2, 5);
    const rows = [['x（' + it[0] + '）'].concat(xs.map(function (x) { return x + it[4]; })), ['y（' + it[1] + '）'].concat(xs.map(function (x) { return x === hide ? '？' : (a * x) + it[3]; }))];
    return num('比例の 表', '<b>' + it[0] + ' x と ' + it[1] + ' y</b>' + tableRows(rows) + '？に 入る 数は？', a * hide, {
      key: 'pt:' + it[0] + ':' + hide, hint: 'x が 2倍、3倍… に なると y も 2倍、3倍…。1' + it[4] + ' で ' + a + it[3] + ' だから ' + a + ' × ' + hide + '。', note: a + ' × ' + hide + ' = ' + (a * hide) + it[3]
    });
  }
  function propFormulaQ() {
    const it = pf(PROP_ITEMS), a = it[2];
    return choice('比例の 式', it[0] + ' x と ' + it[1] + ' y が 比例して いて、x = 1 の とき y = ' + a + '。y を x の 式で 表すと？', withDistractors('y = ' + a + ' × x', ['y = x ÷ ' + a, 'y = ' + a + ' + x', 'y = x − ' + a, 'y = ' + a + ' ÷ x']), {
      key: 'pfm:' + a + ':' + it[0], hint: '比例する とき、y = きまった 数 × x。', note: 'y = ' + a + ' × x'
    });
  }
  function propCalcQ(big) {
    const it = pf(PROP_ITEMS), a = it[2], x = big ? U.randInt(12, 30) : U.randInt(6, 9);
    return num('比例の 計算', it[0] + ' x と ' + it[1] + ' y は 比例して いて、y = ' + a + ' × x です。x = ' + x + ' の とき y は？', a * x, {
      key: 'pc:' + a + ':' + x, maxLen: 6, hint: a + ' × ' + x + ' を 計算しよう。', note: a + ' × ' + x + ' = ' + (a * x)
    });
  }
  function propInvQ() {
    const it = pf(PROP_ITEMS), a = it[2], x = U.randInt(3, 12);
    return num('比例の 計算', it[1] + ' y は ' + it[0] + ' x に 比例し、y = ' + a + ' × x。y = ' + (a * x) + ' の とき x は？', x, {
      key: 'pi:' + a + ':' + x, hint: (a * x) + ' ÷ ' + a + '。', note: (a * x) + ' ÷ ' + a + ' = ' + x
    });
  }
  const PROP_YESNO = [
    ['正方形の 1辺の 長さと まわりの 長さ', true], ['1本 50円の えんぴつの 本数と 代金', true], ['一定の 速さで 歩く 時間と 道のり', true],
    ['人の 年れいと 身長', false], ['正方形の 1辺の 長さと 面積', false], ['20cm の ひもから 切りとる 長さと のこりの 長さ', false], ['同じ 速さで 走る 時間と 進んだ 道のり', true], ['長方形の たての 長さと 横の 長さ（面積が 12cm² の とき）', false]
  ];
  function propYesQ() {
    const yes = PROP_YESNO.filter(function (p) { return p[1]; }), no = PROP_YESNO.filter(function (p) { return !p[1]; });
    const ask = Math.random() < 0.5;
    const right = pf(ask ? yes : no), wrongs = (ask ? no : yes).map(function (p) { return p[0]; });
    return choice('比例するか', ask ? '2つの 量が 比例して いるのは どれ？' : '2つの 量が 比例して いないのは どれ？', [right[0]].concat(U.shuffle(wrongs).slice(0, 3)), {
      key: 'py:' + right[0], hint: '一方が 2倍、3倍に なると もう一方も 2倍、3倍に なる とき 比例する。', note: right[0] + ' → ' + (ask ? '比例する' : '比例しない')
    });
  }
  function propTimesQ() {
    const k = U.randInt(2, 6);
    return num('比例の せいしつ', '比例して いる 2つの 量で、x が ' + k + '倍に なると y は 何倍に なる？', k, {
      scratch: false, hint: '比例では x と y は 同じ 倍に なる。', note: 'y も ' + k + '倍'
    });
  }
  function propFindAQ() {
    const it = pf(PROP_ITEMS), a = it[2], x = U.randInt(3, 8);
    return num('きまった 数', it[0] + ' が ' + x + it[4] + ' の とき ' + it[1] + ' は ' + (a * x) + it[3] + '（比例する）。1' + it[4] + ' あたりは 何' + it[3] + '？', a, {
      key: 'pa:' + a + ':' + x, hint: (a * x) + ' ÷ ' + x + '。', note: (a * x) + ' ÷ ' + x + ' = ' + a + it[3]
    });
  }
  const stage3 = {
    easy: [propTableQ, propYesQ, propTimesQ, function () { return propCalcQ(false); }],
    normal: [propFormulaQ, propInvQ, propTableQ, propFindAQ],
    hard: [function () { return propCalcQ(true); }, propInvQ, propFormulaQ, propFindAQ],
    boss: [function () { return propCalcQ(true); }, propFindAQ, propFormulaQ, propYesQ]
  };

  /* =======================================================
     ステージ4 小数の かけ算
     ======================================================= */
  const hintMulD = '小数点が ない ものと して 計算し、かけられる数と かける数の 小数点の 右の けた数を たした ぶんだけ、答えの 小数点を 左から うつす。';
  function mulDV(unit, a, b, extra) {
    const p = Math.round(a * b * 1000) / 1000;
    return dec(unit, expr(fx(a), '×', fx(b)), p, Object.assign({ layout: 'vertical', a: fx(a), b: fx(b), sign: '×', hint: hintMulD, note: fx(a) + ' × ' + fx(b) + ' = ' + fx(p) }, extra || {}));
  }
  function intTimesDecQ() {
    const a = U.randInt(2, 9), b = U.randInt(11, 49) / 10;
    return dec('整数 × 小数', expr(a, '×', fx(b)), a * b, { scratch: false, hint: a + ' × ' + Math.round(b * 10) + ' = ' + Math.round(a * b * 10) + ' を 10 で わる。', note: a + ' × ' + fx(b) + ' = ' + fx(a * b) });
  }
  function decTimesDecQ(level) {
    let a, b;
    if (level === 1) { a = U.randInt(11, 39) / 10; b = U.randInt(11, 29) / 10; }
    else if (level === 2) { a = U.randInt(12, 99) / 10; b = U.randInt(12, 99) / 10; }
    else { a = U.randInt(101, 999) / 100; b = U.randInt(12, 99) / 10; }
    return mulDV('小数 × 小数', a, b);
  }
  function pointPlaceQ() {
    const a = U.randInt(11, 99) / 10, b = pf([U.randInt(11, 99) / 10, U.randInt(101, 999) / 100]);
    const k = (fx(a).split('.')[1] || '').length + (fx(b).split('.')[1] || '').length;
    return choice('小数点の 位置', expr(fx(a), '×', fx(b)) + ' の 答えの 小数点は、右から 何けたの ところ？', withDistractors(k + 'けた', ['1けた', '2けた', '3けた', '4けた']), {
      key: 'pp:' + fx(a) + ':' + fx(b), hint: 'かけられる数の 小数の けた数 ＋ かける数の 小数の けた数。', note: (fx(a).split('.')[1] || '').length + ' + ' + (fx(b).split('.')[1] || '').length + ' = ' + k + 'けた'
    });
  }
  function smallerQ() {
    const a = U.randInt(12, 99) / 10;
    const bs = [0.6, 0.8, 0.9, 1.2, 1.5, 2.3];
    const right = pf([0.6, 0.8, 0.9]);
    return choice('積の 大きさ', fx(a) + ' に かけると 答えが ' + fx(a) + ' より 小さく なる 数は？', [fx(right)].concat(U.shuffle([1.2, 1.5, 2.3, 1.1]).slice(0, 3).map(fx)), {
      key: 'sm:' + fx(a) + ':' + right, hint: '1 より 小さい 数を かけると、積は かけられる数より 小さく なる。', note: fx(a) + ' × ' + fx(right) + ' < ' + fx(a)
    });
  }
  const MULD_WORDS = [
    ['1m の 重さが □kg の 鉄の ぼう ○m の 重さは？', 'kg', [1.2, 4.8], [1.5, 6.5]],
    ['1L の 重さが □kg の 油 ○L の 重さは？', 'kg', [0.8, 0.95], [2.5, 8.5]],
    ['1m □円の リボンを ○m 買うと 何円？', '円', [80, 240], [1.5, 4.5]],
    ['時速 □km で ○時間 走ると 何km 進む？', 'km', [40, 60], [1.5, 3.5]]
  ];
  function muldWordQ() {
    const w = pf(MULD_WORDS);
    const a = Math.round((w[2][0] + Math.random() * (w[2][1] - w[2][0])) * 100) / 100, b = Math.round((w[3][0] + Math.random() * (w[3][1] - w[3][0])) * 10) / 10;
    const p = Math.round(a * b * 1000) / 1000;
    return dec('小数の 文章題', w[0].replace('□', fx(a)).replace('○', fx(b)), p, { key: 'mw:' + fx(a) + ':' + fx(b), hint: fx(a) + ' × ' + fx(b) + ' を 筆算で。', note: fx(a) + ' × ' + fx(b) + ' = ' + fx(p) + w[1] });
  }
  function kufuuDQ() {
    const w = pf([[2.5, 4], [0.5, 2], [1.25, 8], [0.25, 4]]), c = U.randInt(11, 99) / 10;
    return dec('計算の くふう', '<span class="num">' + fx(w[0]) + ' × ' + fx(c) + ' × ' + w[1] + '</span>', w[0] * w[1] * c, {
      scratch: false, hint: fx(w[0]) + ' × ' + w[1] + ' = ' + fx(w[0] * w[1]) + ' を 先に 計算すると かんたん。', note: fx(w[0] * w[1]) + ' × ' + fx(c) + ' = ' + fx(w[0] * w[1] * c)
    });
  }
  function decAreaQ() {
    const a = U.randInt(11, 45) / 10, b = U.randInt(11, 35) / 10;
    return dec('小数の 面積', 'たて ' + fx(a) + 'cm、横 ' + fx(b) + 'cm の 長方形の 面積は 何cm²？', a * b, { hint: fx(a) + ' × ' + fx(b) + '。', note: fx(a) + ' × ' + fx(b) + ' = ' + fx(a * b) + 'cm²' });
  }
  const stage4 = {
    easy: [intTimesDecQ, function () { return decTimesDecQ(1); }, pointPlaceQ, function () { return decTimesDecQ(1); }],
    normal: [function () { return decTimesDecQ(2); }, muldWordQ, smallerQ, function () { return decTimesDecQ(2); }],
    hard: [function () { return decTimesDecQ(3); }, kufuuDQ, decAreaQ, muldWordQ],
    boss: [function () { return decTimesDecQ(3); }, muldWordQ, kufuuDQ, decAreaQ]
  };

  /* =======================================================
     ステージ5 小数の わり算
     ======================================================= */
  const hintDivD = 'わる数が 整数に なる ように、わる数と わられる数の 小数点を 同じ けただけ 右に うつしてから 計算。';
  function intDivDecQ() {
    const b = U.randInt(11, 25) / 10, q = U.randInt(2, 9);
    const a = Math.round(b * q * 100) / 100;
    return num('整数 ÷ 小数', expr(fx(a), '÷', fx(b)), q, { scratch: false, hint: hintDivD + ' ' + fx(a * 10) + ' ÷ ' + fx(b * 10) + '。', note: fx(a) + ' ÷ ' + fx(b) + ' = ' + q });
  }
  function decDivDecQ(level) {
    let b, q;
    if (level === 1) { b = U.randInt(2, 9) / 10; q = U.randInt(2, 9); }
    else if (level === 2) { b = U.randInt(11, 39) / 10; q = U.randInt(11, 49) / 10; }
    else { b = U.randInt(12, 79) / 10; q = U.randInt(101, 499) / 100; }
    const a = Math.round(b * q * 1000) / 1000;
    return dec('小数 ÷ 小数', expr(fx(a), '÷', fx(b)), q, { layout: 'vertical', a: fx(a), b: fx(b), sign: '÷', hint: hintDivD, note: fx(a) + ' ÷ ' + fx(b) + ' = ' + fx(q) });
  }
  function divWordQ() {
    const w = pf([
      ['□m の 鉄の ぼうの 重さが ○kg。1m の 重さは 何kg？', 'kg'],
      ['□L の ジュースを 同じ かさずつ ○人で 分けます。1人分は 何L？', 'L'],
      ['□m の リボンの ねだんが ○円。1m は 何円？', '円']
    ]);
    const b = U.randInt(12, 45) / 10, q = w[1] === '円' ? U.randInt(2, 9) * 10 : U.randInt(2, 9) / 2;
    const a = Math.round(b * q * 100) / 100;
    const text = w[0].replace('□', fx(b)).replace('○', w[1] === '人' ? fx(b) : fx(a));
    // 「○人で」の 文は b を 人数に
    if (w[0].indexOf('○人') >= 0) {
      const n = U.randInt(3, 8), total = Math.round(n * q * 10) / 10;
      return dec('小数の 文章題', w[0].replace('□', fx(total)).replace('○', n), q, { key: 'dw:' + fx(total) + ':' + n, hint: fx(total) + ' ÷ ' + n + '。', note: fx(total) + ' ÷ ' + n + ' = ' + fx(q) + w[1] });
    }
    return dec('小数の 文章題', text, q, { key: 'dw:' + fx(a) + ':' + fx(b), hint: fx(a) + ' ÷ ' + fx(b) + '。', note: fx(a) + ' ÷ ' + fx(b) + ' = ' + fx(q) + w[1] });
  }
  function divRemDecQ() {
    const b = U.randInt(12, 35) / 10, q = U.randInt(2, 6), r = U.randInt(1, Math.floor(b * 10) - 1) / 10;
    const a = Math.round((b * q + r) * 100) / 100;
    return dec('あまりの ある わり算', expr(fx(a), '÷', fx(b)) + ' の 商を 整数で もとめた ときの あまりは？', r, {
      hint: '商は ' + q + '。あまりの 小数点は、わられる数の もとの 小数点の 位置。', note: fx(a) + ' ÷ ' + fx(b) + ' = ' + q + ' あまり ' + fx(r)
    });
  }
  function divQuotQ() {
    const b = U.randInt(12, 35) / 10, q = U.randInt(2, 6), r = U.randInt(1, Math.floor(b * 10) - 1) / 10;
    const a = Math.round((b * q + r) * 100) / 100;
    return num('あまりの ある わり算', expr(fx(a), '÷', fx(b)) + ' の 商を 整数で もとめると？', q, { hint: fx(b) + ' × 何 で ' + fx(a) + ' に いちばん 近く なるか。', note: fx(a) + ' ÷ ' + fx(b) + ' = ' + q + ' あまり ' + fx(r) });
  }
  function roundDivQ() {
    let a, b, q;
    do { a = U.randInt(11, 99) / 10; b = U.randInt(3, 9); q = a / b; } while (Math.abs(q * 100 - Math.round(q * 100)) < 1e-9);
    const r = Math.round(q * 10) / 10;
    return dec('商を がい数で', expr(fx(a), '÷', b) + ' の 商を ' + SHASHA + 'して 小数第一位まで もとめると？', r, {
      hint: '小数第二位まで 計算して、その 数字で 四捨五入。', note: fx(a) + ' ÷ ' + b + ' ≒ ' + fx(r)
    });
  }
  function timesDecQ() {
    const b = U.randInt(12, 39) / 10, k = U.randInt(15, 45) / 10;
    const a = Math.round(b * k * 100) / 100;
    return dec('何倍', fx(a) + 'm は ' + fx(b) + 'm の 何倍？', k, { hint: fx(a) + ' ÷ ' + fx(b) + '。', note: fx(a) + ' ÷ ' + fx(b) + ' = ' + fx(k) + '（' + fx(k) + '倍）' });
  }
  function biggerQuotQ() {
    const a = U.randInt(12, 99) / 10;
    const right = pf([0.5, 0.8, 0.4]);
    return choice('商の 大きさ', fx(a) + ' を わると 商が ' + fx(a) + ' より 大きく なる 数は？', [fx(right)].concat(U.shuffle([1.2, 1.5, 2.5, 1.1]).slice(0, 3).map(fx)), {
      key: 'bq:' + fx(a) + ':' + right, hint: '1 より 小さい 数で わると、商は わられる数より 大きく なる。', note: fx(a) + ' ÷ ' + fx(right) + ' > ' + fx(a)
    });
  }
  const stage5 = {
    easy: [intDivDecQ, function () { return decDivDecQ(1); }, biggerQuotQ, function () { return decDivDecQ(1); }],
    normal: [function () { return decDivDecQ(2); }, divWordQ, divQuotQ, timesDecQ],
    hard: [function () { return decDivDecQ(3); }, divRemDecQ, roundDivQ, divWordQ],
    boss: [function () { return decDivDecQ(3); }, roundDivQ, divRemDecQ, timesDecQ]
  };

  /* =======================================================
     ステージ6 合同な 図形
     ======================================================= */
  const CONG_WORDS = [
    ['ぴったり かさね合わせる ことが できる 2つの 図形を 何と いう？', '合同な 図形', ['にた 図形', '同じ 大きさの 図形', '平行な 図形'], 'うら返して かさなる ものも 合同。'],
    ['合同な 図形で、かさなり合う ちょう点・辺・角を 何と いう？', '対応する ちょう点・辺・角', ['平行な ちょう点・辺・角', '等しい ちょう点・辺・角', '同じ 位置の ちょう点・辺・角'], '対応する 辺の 長さ、対応する 角の 大きさは 等しい。'],
    ['合同な 2つの 三角形で、対応する 辺の 長さは？', '等しい', ['2倍', 'ちがう', 'わからない'], '合同なら 対応する 辺も 角も 等しい。'],
    ['平行四辺形を 1本の 対角線で 分けると、できる 2つの 三角形は？', '合同', ['正三角形', '合同では ない', '直角三角形'], '平行四辺形は 対角線で 合同な 2つの 三角形に 分けられる。'],
    ['三角形を かく とき、合同な 三角形が 1つに 決まる きまりは？', '3つの 辺の 長さ', ['3つの 角の 大きさ', '1つの 辺と 1つの 角', '2つの 角の 大きさ'], '3つの 辺／2つの 辺と その 間の 角／1つの 辺と 両はしの 角 の どれか。'],
    ['2つの 辺の 長さと、その 間の 角の 大きさが 決まって いる 三角形は？', '合同な 三角形が 1つに 決まる', ['いろいろな 形が かける', 'かけない', '正三角形に なる'], 'これも 合同な 三角形を かく ときの 3つの きまりの 1つ。'],
    ['3つの 角の 大きさだけが 決まって いる 三角形は？', '大きさの ちがう 三角形が いくつも かける', ['1つに 決まる', 'かけない', 'かならず 正三角形'], '角だけでは 大きさが 決まらない。'],
    ['長方形を 2本の 対角線で 4つの 三角形に 分けると、合同な 三角形は？', '2組 できる', ['4つとも 合同', 'できない', '1組だけ'], '向かい合う 三角形どうしが 合同。']
  ];
  function congWordQ() {
    const w = pf(CONG_WORDS);
    return choice('合同', w[0], [w[1]].concat(w[2]), { key: 'cw:' + w[1], hint: w[3], note: w[1] });
  }
  function congPickQ() {
    const ans = U.randInt(0, 2);
    return choice('合同な 図形', congSvg(ans) + '「もと」の 三角形と 合同な ものは？', [['あ', 'い', 'う'][ans]].concat(['あ', 'い', 'う'].filter(function (x, i) { return i !== ans; })), {
      key: 'cp:' + ans + ':' + U.randInt(0, 3), hint: '回したり うら返したり して ぴったり かさなる ものを さがそう。大きさが ちがう ものは 合同では ない。', note: ['あ', 'い', 'う'][ans] + ' が 合同'
    });
  }
  const CORR = [['ちょう点A', 'ちょう点D', ['ちょう点E', 'ちょう点F']], ['ちょう点B', 'ちょう点E', ['ちょう点D', 'ちょう点F']], ['ちょう点C', 'ちょう点F', ['ちょう点D', 'ちょう点E']],
    ['辺AB', '辺DE', ['辺EF', '辺DF']], ['辺BC', '辺EF', ['辺DE', '辺DF']], ['辺CA', '辺FD', ['辺DE', '辺EF']],
    ['角A', '角D', ['角E', '角F']], ['角B', '角E', ['角D', '角F']], ['角C', '角F', ['角D', '角E']]];
  function corrQ() {
    const c = pf(CORR);
    return choice('対応', corrSvg() + '三角形ABC と 三角形DEF は 合同。' + c[0] + ' に 対応するのは？', [c[1]].concat(c[2]), {
      key: 'corr:' + c[0], hint: '三角形DEF は 三角形ABC を 180度 回した もの。A→D、B→E、C→F が 対応する。', note: c[0] + ' ↔ ' + c[1]
    });
  }
  function corrLenQ() {
    const ab = U.randInt(3, 9), bc = U.randInt(4, 12), ca = U.randInt(3, 9);
    const pick = pf([['辺AB', ab, '辺DE'], ['辺BC', bc, '辺EF'], ['辺CA', ca, '辺FD']]);
    return num('対応する 辺の 長さ', corrSvg() + '合同な 三角形ABC と DEF。辺AB = ' + ab + 'cm、辺BC = ' + bc + 'cm、辺CA = ' + ca + 'cm の とき、' + pick[2] + ' は 何cm？', pick[1], {
      key: 'cl:' + pick[0] + ':' + pick[1], hint: pick[2] + ' に 対応する 辺は ' + pick[0] + '。合同なら 長さは 同じ。', note: pick[2] + ' = ' + pick[0] + ' = ' + pick[1] + 'cm'
    });
  }
  function corrAngQ() {
    const a = U.randInt(30, 80), b = U.randInt(30, 80), c = 180 - a - b;
    if (c < 20 || c > 120) return corrAngQ();
    const pick = pf([['角A', a, '角D'], ['角B', b, '角E'], ['角C', c, '角F']]);
    return num('対応する 角', '合同な 三角形ABC と DEF（A→D、B→E、C→F が 対応）。角A = ' + a + '度、角B = ' + b + '度、角C = ' + c + '度 の とき、' + pick[2] + ' は 何度？', pick[1], {
      key: 'ca:' + pick[0] + ':' + pick[1], scratch: false, hint: '合同なら 対応する 角の 大きさも 同じ。', note: pick[2] + ' = ' + pick[0] + ' = ' + pick[1] + '度'
    });
  }
  function splitQ() {
    const w = pf([['平行四辺形を 2本の 対角線で 分けると、合同な 三角形は ぜんぶで いくつ？', 4, '向かい合う 三角形が 合同（2組）。ぜんぶで 4つ。'], ['ひし形を 2本の 対角線で 分けると、合同な 直角三角形は いくつ？', 4, 'ひし形の 対角線は すいちょくに 交わり、4つの 合同な 直角三角形が できる。'], ['正方形を 1本の 対角線で 分けると、合同な 三角形は いくつ？', 2, '2つの 合同な 直角二等辺三角形。'], ['正六角形を 中心から 6つの ちょう点に 線を ひいて 分けると、合同な 三角形は いくつ？', 6, '6つの 合同な 正三角形。']]);
    return num('図形を 分ける', w[0], w[1], { key: 'sp:' + w[1] + w[0].slice(0, 4), scratch: false, hint: w[2], note: w[1] + 'つ' });
  }
  const stage6 = {
    easy: [congWordQ, congPickQ, corrQ, congPickQ],
    normal: [corrLenQ, corrAngQ, corrQ, congWordQ],
    hard: [splitQ, corrLenQ, corrAngQ, congWordQ],
    boss: [corrAngQ, splitQ, corrLenQ, congPickQ]
  };

  /* =======================================================
     ステージ7 図形の 角
     ======================================================= */
  function triSumQ() {
    let a = U.randInt(25, 95), b = U.randInt(25, 95);
    const c = 180 - a - b;
    if (c < 15) return triSumQ();
    const labels = U.shuffle([[a + '°', b + '°', '？'], [a + '°', '？', b + '°'], ['？', a + '°', b + '°']])[0];
    return num('三角形の 角', figQ('三角形の ？の 角は 何度？', triAngSvg(labels)), c, {
      key: 'ts:' + a + ':' + b + ':' + labels.indexOf('？'), hint: '三角形の 3つの 角の 和は 180度。180 − ' + a + ' − ' + b + '。', note: '180 − ' + a + ' − ' + b + ' = ' + c + '度'
    });
  }
  function isoAngQ() {
    const top = pf([20, 30, 40, 50, 70, 80, 100, 120]);
    const base = (180 - top) / 2;
    const askTop = Math.random() < 0.5;
    const labels = askTop ? ['？', base + '°', base + '°'] : [top + '°', '？', base + '°'];
    return num('二等辺三角形の 角', figQ('二等辺三角形。？は 何度？', triAngSvg(labels, 'iso')), askTop ? top : base, {
      key: 'ia:' + top + ':' + askTop, hint: askTop ? '180 − ' + base + ' × 2。' : '二等辺三角形の 2つの 角は 等しい。（180 − ' + top + '）÷ 2。', note: (askTop ? top : base) + '度'
    });
  }
  function quadSumQ() {
    let a = U.randInt(50, 130), b = U.randInt(50, 130), c = U.randInt(50, 130);
    const d = 360 - a - b - c;
    if (d < 30 || d > 150) return quadSumQ();
    return num('四角形の 角', figQ('四角形の ？の 角は 何度？', quadAngSvg([a + '°', b + '°', c + '°', '？'])), d, {
      key: 'qs:' + a + ':' + b + ':' + c, hint: '四角形の 4つの 角の 和は 360度。', note: '360 − ' + a + ' − ' + b + ' − ' + c + ' = ' + d + '度'
    });
  }
  function outerAngQ() {
    const a = U.randInt(30, 80), b = U.randInt(30, 80);
    return num('外がわの 角', '三角形の 2つの 角が ' + a + '度 と ' + b + '度。のこりの 角の となりに できる 外がわの 角（一直線から 引いた 角）は 何度？', a + b, {
      scratch: false, hint: 'のこりの 角は 180 − ' + a + ' − ' + b + ' = ' + (180 - a - b) + '度。外がわの 角は 180 − ' + (180 - a - b) + '。', note: a + ' + ' + b + ' = ' + (a + b) + '度'
    });
  }
  const POLY_NAMES = { 3: '三角形', 4: '四角形', 5: '五角形', 6: '六角形', 7: '七角形', 8: '八角形' };
  function polySumQ() {
    const n = pf([5, 6, 7, 8]);
    return num('多角形の 角の 和', POLY_NAMES[n] + 'の 角の 大きさの 和は 何度？', (n - 2) * 180, {
      scratch: false, hint: '1つの ちょう点から 対角線を ひくと 三角形が ' + (n - 2) + 'こ できる。180 × ' + (n - 2) + '。', note: '180 × ' + (n - 2) + ' = ' + ((n - 2) * 180) + '度'
    });
  }
  function polyTrisQ() {
    const n = pf([5, 6, 7, 8]);
    return num('多角形と 三角形', POLY_NAMES[n] + 'を 1つの ちょう点から 対角線を ひいて 三角形に 分けると、三角形は いくつ できる？', n - 2, {
      scratch: false, hint: '辺の 数 − 2。', note: n + ' − 2 = ' + (n - 2) + 'つ'
    });
  }
  function regAngQ() {
    const n = pf([3, 4, 5, 6, 8]);
    const a = (n - 2) * 180 / n;
    return num('正多角形の 角', '正' + POLY_NAMES[n] + 'の 1つの 角の 大きさは 何度？', a, {
      scratch: false, hint: '角の 和 ' + ((n - 2) * 180) + '度 を ' + n + ' で わる。', note: ((n - 2) * 180) + ' ÷ ' + n + ' = ' + a + '度'
    });
  }
  function angWordQ() {
    const w = pf([['三角形の 3つの 角の 和は？', 180], ['四角形の 4つの 角の 和は？', 360], ['直角三角形の 直角では ない 2つの 角の 和は？', 90], ['正三角形の 1つの 角は？', 60], ['直角二等辺三角形の 直角では ない 角は？', 45]]);
    return num('角の きまり', w[0], w[1], { key: 'aw:' + w[1], scratch: false, hint: '三角形は 180度、四角形は 360度。', note: w[1] + '度' });
  }
  function twoStepAngQ() {
    const a = U.randInt(30, 70), b = U.randInt(30, 70);
    const c = 180 - a - b;
    return num('角の 計算', '三角形の 1つの 角が ' + a + '度、もう 1つが ' + b + '度。のこりの 角を 半分に 分けた 1つ分は 何度？', c / 2, {
      decimal: true, hint: 'のこりの 角 = 180 − ' + a + ' − ' + b + ' = ' + c + '度。その 半分。', note: c + ' ÷ 2 = ' + fx(c / 2) + '度'
    });
  }
  const stage7 = {
    easy: [triSumQ, angWordQ, quadSumQ, triSumQ],
    normal: [isoAngQ, outerAngQ, polyTrisQ, quadSumQ],
    hard: [polySumQ, regAngQ, isoAngQ, twoStepAngQ],
    boss: [polySumQ, regAngQ, twoStepAngQ, outerAngQ]
  };

  /* =======================================================
     ステージ8 整数（偶数と 奇数・倍数と 約数）
     ======================================================= */
  function evenOddQ() {
    const n = U.randInt(11, 999);
    return choice('偶数と 奇数', '<span class="num">' + n + '</span> は ' + GUU + '？ ' + KI + '？', [n % 2 === 0 ? '偶数' : '奇数', n % 2 === 0 ? '奇数' : '偶数'], {
      key: 'eo:' + n, hint: '一の位が 0・2・4・6・8 なら 偶数、1・3・5・7・9 なら 奇数。', note: n + ' は ' + (n % 2 === 0 ? '偶数' : '奇数')
    });
  }
  function multipleQ() {
    const a = U.randInt(3, 9), k = U.randInt(3, 8);
    return num('倍数', a + ' の 倍数を 小さい じゅんに ならべた とき、' + k + 'ばんめは？', a * k, { scratch: false, hint: a + ' × ' + k + '。', note: a + ' × ' + k + ' = ' + (a * k) });
  }
  function isMultipleQ() {
    const a = pf([3, 4, 6, 7, 8, 9]);
    const right = a * U.randInt(4, 12);
    const wrongs = []; while (wrongs.length < 3) { const w = U.randInt(20, 99); if (w % a !== 0 && wrongs.indexOf(w) < 0) wrongs.push(w); }
    return choice('倍数', a + ' の 倍数は どれ？', [String(right)].concat(wrongs.map(String)), { key: 'im:' + a + ':' + right, hint: a + ' で わりきれる 数を さがそう。', note: right + ' = ' + a + ' × ' + (right / a) });
  }
  function divisorCountQ() {
    const n = pf([12, 16, 18, 20, 24, 28, 30, 36]);
    return num('約数', n + ' の 約数は ぜんぶで 何こ？', divisors(n).length, { hint: '1 から じゅんに、' + n + ' を わりきれる 数を 数えよう。', note: n + ' の 約数: ' + divisors(n).join('・') + '（' + divisors(n).length + 'こ）' });
  }
  function isDivisorQ() {
    const n = pf([24, 30, 36, 40, 42, 48]);
    const ds = divisors(n).filter(function (d) { return d > 1 && d < n; });
    const right = pf(ds);
    const wrongs = []; while (wrongs.length < 3) { const w = U.randInt(2, n - 1); if (n % w !== 0 && wrongs.indexOf(w) < 0) wrongs.push(w); }
    return choice('約数', n + ' の 約数は どれ？', [String(right)].concat(wrongs.map(String)), { key: 'id:' + n + ':' + right, hint: n + ' を わりきれる 数。', note: n + ' ÷ ' + right + ' = ' + (n / right) });
  }
  function lcmQ(three) {
    let a, b, c;
    do { a = U.randInt(2, 12); b = U.randInt(2, 12); c = U.randInt(2, 9); } while (a === b || (three && (c === a || c === b)));
    const l = three ? lcm(lcm(a, b), c) : lcm(a, b);
    return num('最小公倍数', (three ? a + '、' + b + '、' + c : a + ' と ' + b) + ' の 最小公倍数は？', l, { hint: '大きい ほうの 倍数を じゅんに 書いて、' + (three ? 'ほかの 2つ' : 'もう 1つ') + 'の 倍数にも なって いる 数を さがそう。', note: '最小公倍数 = ' + l });
  }
  function gcdQ(three) {
    let a, b, c, g;
    do { const base = U.randInt(2, 12); a = base * U.randInt(1, 5); b = base * U.randInt(1, 5); c = base * U.randInt(1, 5); g = three ? gcd(gcd(a, b), c) : gcd(a, b); } while (a === b || g < 2 || a > 60 || b > 60);
    return num('最大公約数', (three ? a + '、' + b + '、' + c : a + ' と ' + b) + ' の 最大公約数は？', g, { hint: '小さい ほうの 約数を 大きい じゅんに 見て、' + (three ? 'ほかの' : 'もう 1つの') + ' 数も わりきれる 数を さがそう。', note: '最大公約数 = ' + g });
  }
  function tileQ() {
    let a, b; do { a = U.randInt(4, 12); b = U.randInt(4, 12); } while (a === b || gcd(a, b) === Math.min(a, b));
    return num('倍数の 文章題', 'たて ' + a + 'cm、横 ' + b + 'cm の 長方形の タイルを すきまなく ならべて、いちばん 小さい 正方形を 作ります。正方形の 1辺は 何cm？', lcm(a, b), { hint: a + ' と ' + b + ' の 最小公倍数。', note: '最小公倍数 ' + lcm(a, b) + 'cm' });
  }
  function shareQ() {
    let a, b; do { const g = U.randInt(3, 8); a = g * U.randInt(2, 6); b = g * U.randInt(2, 6); } while (a === b || gcd(a, b) < 3);
    const g = gcd(a, b);
    return num('約数の 文章題', 'りんご ' + a + 'こ と みかん ' + b + 'こ を、あまりが 出ない ように 同じ 数ずつ できるだけ 多くの 人に 分けます。何人に 分けられる？', g, { hint: a + ' と ' + b + ' の 最大公約数。', note: '最大公約数 ' + g + ' → ' + g + '人' });
  }
  function busQ() {
    let a, b; do { a = pf([6, 8, 10, 12, 15]); b = pf([6, 8, 9, 10, 12, 15, 20]); } while (a === b);
    return num('倍数の 文章題', 'A の バスは ' + a + '分ごと、B の バスは ' + b + '分ごとに 出発します。同時に 出発した あと、つぎに 同時に 出発するのは 何分後？', lcm(a, b), { hint: a + ' と ' + b + ' の 最小公倍数。', note: lcm(a, b) + '分後' });
  }
  const stage8 = {
    easy: [evenOddQ, multipleQ, isMultipleQ, isDivisorQ],
    normal: [function () { return lcmQ(false); }, function () { return gcdQ(false); }, divisorCountQ, isMultipleQ],
    hard: [tileQ, shareQ, busQ, function () { return lcmQ(true); }],
    boss: [function () { return gcdQ(three()); }, busQ, tileQ, shareQ]
  };
  function three() { return Math.random() < 0.5; }

  /* =======================================================
     ステージ9 分数（約分・通分・分数と 小数）
     ======================================================= */
  const FRAC_RULE = '（約分した 形で）';
  function reduceQ(level) {
    let n, d, k;
    do { d = U.randInt(2, level > 1 ? 12 : 8); n = U.randInt(1, d - 1); k = U.randInt(2, level > 1 ? 6 : 4); } while (gcd(n, d) !== 1);
    return fracQ('約分', fr(n * k, d * k) + ' を 約分すると？ ' + FRAC_RULE, n, d, {
      key: 'red:' + (n * k) + '/' + (d * k), scratch: false, hint: '分子と 分母を 同じ 数（' + k + '）で わろう。', note: ft(n * k, d * k) + ' = ' + ft(n, d)
    });
  }
  function commonDenQ() {
    let a, b; do { a = U.randInt(2, 9); b = U.randInt(2, 9); } while (a === b || a % b === 0 || b % a === 0);
    const l = lcm(a, b), n1 = U.randInt(1, a - 1);
    return num('通分', fr(n1, a) + ' と ' + fr(U.randInt(1, b - 1), b) + ' を 通分する とき、分母は いくつに する？', l, { key: 'cd:' + a + ':' + b + ':' + n1, scratch: false, hint: a + ' と ' + b + ' の 最小公倍数。', note: '分母は ' + l });
  }
  function commonDenNumQ() {
    let a, b; do { a = U.randInt(2, 9); b = U.randInt(2, 9); } while (a === b || a % b === 0 || b % a === 0);
    const l = lcm(a, b), n1 = U.randInt(1, a - 1);
    return num('通分', fr(n1, a) + ' を 分母 ' + l + ' の 分数に すると、分子は？', n1 * (l / a), { key: 'cn:' + n1 + '/' + a + ':' + l, scratch: false, hint: '分母を ' + (l / a) + '倍 したので、分子も ' + (l / a) + '倍。', note: ft(n1, a) + ' = ' + ft(n1 * (l / a), l) });
  }
  function fracToDecQ() {
    const w = pf([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [3, 10], [7, 10], [1, 20], [9, 20], [7, 25]]);
    return dec('分数と 小数', fr(w[0], w[1]) + ' を 小数で 表すと？', w[0] / w[1], { key: 'f2d:' + w[0] + '/' + w[1], scratch: false, hint: '分子 ÷ 分母。' + w[0] + ' ÷ ' + w[1] + '。', note: ft(w[0], w[1]) + ' = ' + fx(w[0] / w[1]) });
  }
  function decToFracQ() {
    const w = pf([[0.5, 1, 2], [0.25, 1, 4], [0.75, 3, 4], [0.2, 1, 5], [0.4, 2, 5], [0.6, 3, 5], [0.8, 4, 5], [0.125, 1, 8], [0.375, 3, 8], [0.3, 3, 10], [0.9, 9, 10], [0.05, 1, 20], [0.15, 3, 20], [0.12, 3, 25]]);
    return fracQ('分数と 小数', fx(w[0]) + ' を 分数で 表すと？ ' + FRAC_RULE, w[1], w[2], { key: 'd2f:' + w[0], scratch: false, hint: fx(w[0]) + ' = ' + (w[0] * 100) + '/100 として 約分。', note: fx(w[0]) + ' = ' + ft(w[1], w[2]) });
  }
  function divToFracQ() {
    let a, b; do { a = U.randInt(1, 9); b = U.randInt(2, 9); } while (a % b === 0);
    const g = gcd(a, b);
    return fracQ('わり算と 分数', expr(a, '÷', b) + ' の 商を 分数で 表すと？ ' + FRAC_RULE, a, b, { key: 'dv:' + a + ':' + b, scratch: false, hint: 'わられる数が 分子、わる数が 分母。', note: a + ' ÷ ' + b + ' = ' + ft(a / g, b / g) });
  }
  function fracCmpQ() {
    let a, b, c, d; do { b = U.randInt(2, 9); d = U.randInt(2, 9); a = U.randInt(1, b - 1); c = U.randInt(1, d - 1); } while (b === d || a * d === c * b);
    const big = a * d > c * b ? ft(a, b) : ft(c, d), small = a * d > c * b ? ft(c, d) : ft(a, b);
    return choice('分数の 大小', fr(a, b) + ' と ' + fr(c, d) + '。大きいのは？', [big, small], { key: 'fc:' + a + '/' + b + ':' + c + '/' + d, hint: '通分して 分子を くらべよう。分母は ' + lcm(b, d) + '。', note: (a * d > c * b ? ft(a, b) : ft(c, d)) + ' の ほうが 大きい' });
  }
  function fracDecCmpQ() {
    const w = pf([[3, 4, 0.7], [2, 5, 0.5], [1, 2, 0.4], [3, 5, 0.7], [1, 4, 0.3], [7, 10, 0.75], [4, 5, 0.85]]);
    const fv = w[0] / w[1];
    const big = fv > w[2] ? ft(w[0], w[1]) : fx(w[2]);
    return choice('分数と 小数の 大小', fr(w[0], w[1]) + ' と ' + fx(w[2]) + '。大きいのは？', [big, fv > w[2] ? fx(w[2]) : ft(w[0], w[1])], { key: 'fdc:' + w[0] + '/' + w[1] + ':' + w[2], hint: '分数を 小数に 直して くらべよう。' + ft(w[0], w[1]) + ' = ' + fx(fv) + '。', note: (fv > w[2] ? ft(w[0], w[1]) : fx(w[2])) + ' の ほうが 大きい' });
  }
  function improperQ() {
    const d = U.randInt(2, 7), w = U.randInt(1, 4), n = U.randInt(1, d - 1);
    if (gcd(n, d) !== 1) return improperQ();
    return fracQ('仮分数と 帯分数', mixed(w, n, d) + ' を 仮分数に すると？ ' + FRAC_RULE, w * d + n, d, { key: 'imp:' + w + ':' + n + '/' + d, scratch: false, hint: '整数の 部分 ' + w + ' は ' + ft(w * d, d) + '。分子は ' + w + ' × ' + d + ' + ' + n + '。', note: mt(w, n, d) + ' = ' + ft(w * d + n, d) });
  }
  function mixedQ() {
    const d = U.randInt(2, 7), w = U.randInt(1, 4), n = U.randInt(1, d - 1);
    if (gcd(n, d) !== 1) return mixedQ();
    return num('仮分数と 帯分数', fr(w * d + n, d) + ' を 帯分数に した ときの 整数の 部分は？', w, { key: 'mx:' + w + ':' + n + '/' + d, scratch: false, hint: '分子 ÷ 分母 の 商が 整数の 部分。' + (w * d + n) + ' ÷ ' + d + '。', note: ft(w * d + n, d) + ' = ' + mt(w, n, d) });
  }
  function fracRuleQ() {
    const w = pf([['分数の 分子と 分母に 同じ 数を かけると、大きさは？', '変わらない', ['大きく なる', '小さく なる', '2倍に なる']], ['分数の 分子と 分母を 同じ 数で わると、大きさは？', '変わらない', ['小さく なる', '大きく なる', '半分に なる']], ['分母の ちがう 分数を、分母の 同じ 分数に なおす ことを 何と いう？', '通分', ['約分', '合同', '整理']], ['分子と 分母を 同じ 数で わって、かんたんな 分数に する ことを 何と いう？', '約分', ['通分', '整数', '仮分数']]]);
    return choice('分数の きまり', w[0], [w[1]].concat(w[2]), { key: 'fr:' + w[1] + w[0].slice(0, 5), hint: '分子と 分母に 同じ 数を かけても わっても 大きさは 同じ。', note: w[1] });
  }
  const stage9 = {
    easy: [function () { return reduceQ(1); }, fracRuleQ, fracToDecQ, divToFracQ],
    normal: [commonDenQ, commonDenNumQ, decToFracQ, fracCmpQ, function () { return reduceQ(2); }],
    hard: [improperQ, mixedQ, fracDecCmpQ, commonDenNumQ],
    boss: [function () { return reduceQ(2); }, improperQ, fracDecCmpQ, decToFracQ]
  };

  /* =======================================================
     ステージ10 分数の たし算と ひき算（分母が ちがう）
     ======================================================= */
  function pickPair(level) {
    let b, d, a, c;
    do {
      b = U.randInt(2, level > 1 ? 9 : 6); d = U.randInt(2, level > 1 ? 9 : 6);
      a = U.randInt(1, b - 1); c = U.randInt(1, d - 1);
    } while (b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || (level === 1 && lcm(b, d) > 12));
    return { a: a, b: b, c: c, d: d };
  }
  function fracAddQ(level) {
    const p = pickPair(level);
    const l = lcm(p.b, p.d), n = p.a * (l / p.b) + p.c * (l / p.d);
    const g = gcd(n, l);
    return fracQ('分数の たし算', fr(p.a, p.b) + ' + ' + fr(p.c, p.d) + ' = ？ ' + FRAC_RULE, n, l, {
      key: 'fa:' + p.a + '/' + p.b + '+' + p.c + '/' + p.d, scratch: false, hint: '分母を ' + l + ' に 通分。' + ft(p.a * (l / p.b), l) + ' + ' + ft(p.c * (l / p.d), l) + '。', note: ft(p.a, p.b) + ' + ' + ft(p.c, p.d) + ' = ' + ft(n / g, l / g)
    });
  }
  function fracSubQ(level) {
    let p, l, n;
    do { p = pickPair(level); l = lcm(p.b, p.d); n = p.a * (l / p.b) - p.c * (l / p.d); } while (n <= 0);
    const g = gcd(n, l);
    return fracQ('分数の ひき算', fr(p.a, p.b) + ' − ' + fr(p.c, p.d) + ' = ？ ' + FRAC_RULE, n, l, {
      key: 'fs:' + p.a + '/' + p.b + '-' + p.c + '/' + p.d, scratch: false, hint: '分母を ' + l + ' に 通分。' + ft(p.a * (l / p.b), l) + ' − ' + ft(p.c * (l / p.d), l) + '。', note: ft(p.a, p.b) + ' − ' + ft(p.c, p.d) + ' = ' + ft(n / g, l / g)
    });
  }
  function fracWordQ(add) {
    const p = pickPair(1);
    const l = lcm(p.b, p.d);
    let n = add ? p.a * (l / p.b) + p.c * (l / p.d) : p.a * (l / p.b) - p.c * (l / p.d);
    if (n <= 0) return fracWordQ(add);
    const g = gcd(n, l);
    const w = add ? pf([['ジュースを ' + fr(p.a, p.b) + 'L と ' + fr(p.c, p.d) + 'L のみました。合わせて 何L？', 'L'], ['リボンを ' + fr(p.a, p.b) + 'm と ' + fr(p.c, p.d) + 'm つなぐと 何m？', 'm']])
      : pf([['さとうが ' + fr(p.a, p.b) + 'kg あります。' + fr(p.c, p.d) + 'kg 使うと のこりは 何kg？', 'kg'], ['道のり ' + fr(p.a, p.b) + 'km の うち ' + fr(p.c, p.d) + 'km 歩きました。のこりは 何km？', 'km']]);
    return fracQ('分数の 文章題', w[0] + ' ' + FRAC_RULE, n, l, { key: 'fw:' + (add ? 'a' : 's') + p.a + '/' + p.b + ':' + p.c + '/' + p.d, scratch: false, hint: '分母を ' + l + ' に 通分してから ' + (add ? 'たそう' : 'ひこう') + '。', note: '= ' + ft(n / g, l / g) + w[1] });
  }
  function fracThreeQ() {
    let b, d, e, n, l;
    do {
      b = pf([2, 3, 4, 6]); d = pf([2, 3, 4, 6]); e = pf([2, 3, 4, 6, 12]);
      l = lcm(lcm(b, d), e);
      n = l / b + l / d + l / e;
    } while (b === d || d === e || b === e || n % l === 0);   // 答えが 整数（1/2 + 1/3 + 1/6 = 1）に なる 組は 出さない
    const g = gcd(n, l);
    return fracQ('3つの 分数', fr(1, b) + ' + ' + fr(1, d) + ' + ' + fr(1, e) + ' = ？ ' + FRAC_RULE, n, l, { key: 'f3:' + b + ':' + d + ':' + e, scratch: false, hint: '3つの 分母の 最小公倍数 ' + l + ' で 通分。', note: '= ' + ft(n / g, l / g) });
  }
  function mixedSubQ() {
    let w1, w2, p, l, n1, n2;
    do {
      w1 = U.randInt(2, 4); w2 = U.randInt(1, w1 - 1); p = pickPair(1); l = lcm(p.b, p.d);
      n1 = w1 * l + p.a * (l / p.b); n2 = w2 * l + p.c * (l / p.d);
    } while (n1 - n2 <= 0);
    const n = n1 - n2, g = gcd(n, l);
    return fracQ('帯分数の ひき算', mixed(w1, p.a, p.b) + ' − ' + mixed(w2, p.c, p.d) + ' = ？（答えは 仮分数で）' + FRAC_RULE, n, l, { key: 'ms:' + w1 + p.a + '/' + p.b + ':' + w2 + p.c + '/' + p.d, scratch: false, hint: '仮分数に なおして 通分。' + ft(n1, l) + ' − ' + ft(n2, l) + '。', note: '= ' + ft(n / g, l / g) });
  }
  function mixedAddQ() {
    const w1 = U.randInt(1, 3), w2 = U.randInt(1, 3), p = pickPair(1), l = lcm(p.b, p.d);
    const n = (w1 + w2) * l + p.a * (l / p.b) + p.c * (l / p.d), g = gcd(n, l);
    return fracQ('帯分数の たし算', mixed(w1, p.a, p.b) + ' + ' + mixed(w2, p.c, p.d) + ' = ？（答えは 仮分数で）' + FRAC_RULE, n, l, { key: 'ma:' + w1 + p.a + '/' + p.b + ':' + w2 + p.c + '/' + p.d, scratch: false, hint: '整数どうし、分数どうしを 分けて 計算しても よい。', note: '= ' + ft(n / g, l / g) });
  }
  const stage10 = {
    easy: [function () { return fracAddQ(1); }, function () { return fracSubQ(1); }, function () { return fracAddQ(1); }, function () { return fracWordQ(true); }],
    normal: [function () { return fracAddQ(2); }, function () { return fracSubQ(2); }, function () { return fracWordQ(false); }, fracThreeQ],
    hard: [mixedAddQ, mixedSubQ, fracThreeQ, function () { return fracSubQ(2); }],
    boss: [mixedSubQ, mixedAddQ, function () { return fracWordQ(false); }, fracThreeQ]
  };

  /* =======================================================
     ステージ11 平均
     ======================================================= */
  const AVG_THINGS = [['テストの 点数', '点'], ['たまごの 重さ', 'g'], ['ジュースの かさ', 'mL'], ['読んだ ページ数', 'ページ'], ['とんだ 回数', '回']];
  function avgQ(level) {
    const t = pf(AVG_THINGS), n = level > 1 ? U.randInt(4, 6) : U.randInt(3, 4);
    const avg = level > 1 ? U.randInt(10, 90) + pf([0, 0.5, 0.2, 0.4]) : U.randInt(5, 90);
    // 平均が avg に なる ように 数を 作る
    const vals = [];
    let sum = 0;
    for (let i = 0; i < n - 1; i++) { const v = Math.round(avg + U.randInt(-8, 8)); vals.push(v); sum += v; }
    const last = Math.round(avg * n * 10) / 10 - sum;
    vals.push(Math.round(last * 10) / 10);
    if (vals.some(function (v) { return v < 0; })) return avgQ(level);
    return dec('平均', t[0] + '： ' + vals.map(function (v) { return fx(v) + t[1]; }).join('、') + '。平均は 何' + t[1] + '？', avg, {
      key: 'avg:' + vals.join(','), hint: '合計 ÷ こ数。（' + vals.map(fx).join(' + ') + '）÷ ' + n + '。', note: '合計 ' + fx(avg * n) + ' ÷ ' + n + ' = ' + fx(avg) + t[1]
    });
  }
  function totalQ() {
    const t = pf(AVG_THINGS), n = U.randInt(3, 8), avg = U.randInt(10, 90);
    return num('合計を もとめる', t[0] + 'の 平均が ' + avg + t[1] + ' で、' + n + '回 ありました。合計は 何' + t[1] + '？', avg * n, { key: 'tot:' + avg + ':' + n, hint: '合計 = 平均 × 個数。', note: avg + ' × ' + n + ' = ' + (avg * n) + t[1] });
  }
  function zeroAvgQ() {
    const vals = [U.randInt(2, 8), 0, U.randInt(2, 8), U.randInt(2, 8)];
    const sum = vals.reduce(function (s, v) { return s + v; }, 0);
    return dec('0 も 数に 入れる', '4日間に 食べた みかんの 数： ' + vals.join('こ、') + 'こ。1日 平均 何こ？', sum / 4, { key: 'z:' + vals.join(','), hint: '0 の 日も 数に 入れて 4 で わる。', note: sum + ' ÷ 4 = ' + fx(sum / 4) + 'こ' });
  }
  function nextScoreQ() {
    const n = U.randInt(3, 5), avg = U.randInt(70, 85), goal = avg + U.randInt(2, 5);
    const need = goal * (n + 1) - avg * n;
    if (need > 100) return nextScoreQ();
    return num('平均の 文章題', 'テスト ' + n + '回の 平均は ' + avg + '点。つぎの テストで 何点 とれば ' + (n + 1) + '回の 平均が ' + goal + '点に なる？', need, { key: 'ns:' + n + ':' + avg + ':' + goal, hint: goal + ' × ' + (n + 1) + ' − ' + avg + ' × ' + n + '。', note: (goal * (n + 1)) + ' − ' + (avg * n) + ' = ' + need + '点' });
  }
  function stepQ() {
    const step = pf([0.6, 0.65, 0.7, 0.5, 0.55]), n = U.randInt(200, 900);
    return dec('歩はばで はかる', '歩はばの 平均が ' + fx(step) + 'm の 人が ' + n + '歩 歩きました。道のりは 約何m？', step * n, { key: 'st:' + step + ':' + n, hint: fx(step) + ' × ' + n + '。', note: fx(step) + ' × ' + n + ' = ' + fx(step * n) + 'm' });
  }
  function avgWordQ() {
    const w = pf([['1日に 平均 □ページ 読むと、○日で 何ページ？', 12, 30, 5, 14, 'ページ'], ['1こ 平均 □g の たまごが ○こ。ぜんぶで 何g？', 55, 65, 6, 12, 'g']]);
    const a = U.randInt(w[1], w[2]), b = U.randInt(w[3], w[4]);
    return num('平均の 文章題', w[0].replace('□', a).replace('○', b), a * b, { key: 'aw:' + a + ':' + b, hint: a + ' × ' + b + '。', note: a + ' × ' + b + ' = ' + (a * b) + w[5] });
  }
  const stage11 = {
    easy: [function () { return avgQ(1); }, totalQ, function () { return avgQ(1); }, avgWordQ],
    normal: [function () { return avgQ(2); }, zeroAvgQ, stepQ, totalQ],
    hard: [nextScoreQ, function () { return avgQ(2); }, stepQ, zeroAvgQ],
    boss: [nextScoreQ, function () { return avgQ(2); }, stepQ, avgWordQ]
  };

  /* =======================================================
     ステージ12 単位量あたりの 大きさ
     ======================================================= */
  function perOneQ() {
    const w = pf([['□円で ○こ の あめ。1こ あたり 何円？', '円'], ['□円で ○m の リボン。1m あたり 何円？', '円'], ['□g の さとうを ○ふくろに 同じ 重さずつ。1ふくろ 何g？', 'g']]);
    const n = U.randInt(3, 9), per = U.randInt(3, 40) * 5;
    return num('1つ あたり', w[0].replace('□', per * n).replace('○', n), per, { key: 'po:' + per + ':' + n, hint: (per * n) + ' ÷ ' + n + '。', note: (per * n) + ' ÷ ' + n + ' = ' + per + w[1] });
  }
  function crowdQ() {
    const people = U.randInt(2, 9) * 6, area = pf([6, 8, 12]);
    return dec('こみぐあい', area + 'm² の 部屋に ' + people + '人 います。1m² あたり 何人？', people / area, { key: 'cr:' + people + ':' + area, hint: '人数 ÷ 面積。', note: people + ' ÷ ' + area + ' = ' + fx(people / area) + '人' });
  }
  function whichCrowdQ() {
    const a = [U.randInt(10, 30), pf([4, 5, 6])], b = [U.randInt(10, 30), pf([4, 5, 6])];
    const da = a[0] / a[1], db = b[0] / b[1];
    if (Math.abs(da - db) < 0.2) return whichCrowdQ();
    return choice('こみぐあい', 'A の 部屋： ' + a[1] + 'm² に ' + a[0] + '人。B の 部屋： ' + b[1] + 'm² に ' + b[0] + '人。こんで いるのは？', [da > db ? 'A' : 'B', da > db ? 'B' : 'A'], { key: 'wc:' + a.join(',') + ':' + b.join(','), hint: '1m² あたりの 人数を くらべよう。A は ' + fx(da) + '人、B は ' + fx(db) + '人。', note: (da > db ? 'A' : 'B') + ' の ほうが こんで いる' });
  }
  function densityQ() {
    const area = pf([20, 40, 50, 80, 100, 250]), per = U.randInt(2, 30) * 10;
    return num('人口の こみぐあい', '面積 ' + area + 'km² の 市に ' + comma(area * per) + '人 住んで います。1km² あたりの 人数は？', per, { key: 'dn:' + area + ':' + per, maxLen: 6, hint: '人口 ÷ 面積。', note: comma(area * per) + ' ÷ ' + area + ' = ' + per + '人' });
  }
  function fuelQ() {
    const l = U.randInt(2, 9) * 5, per = U.randInt(8, 20);
    return num('ガソリン 1L あたり', 'ガソリン ' + l + 'L で ' + (l * per) + 'km 走る 車。1L あたり 何km 走る？', per, { key: 'fu:' + l + ':' + per, hint: (l * per) + ' ÷ ' + l + '。', note: (l * per) + ' ÷ ' + l + ' = ' + per + 'km' });
  }
  function fuelNeedQ() {
    const per = U.randInt(8, 20), km = per * U.randInt(4, 12);
    return num('ガソリン 1L あたり', '1L で ' + per + 'km 走る 車が ' + km + 'km 走るには、ガソリンは 何L いる？', km / per, { key: 'fn:' + per + ':' + km, hint: km + ' ÷ ' + per + '。', note: km + ' ÷ ' + per + ' = ' + (km / per) + 'L' });
  }
  function cheaperQ() {
    const a = [U.randInt(3, 8), 0], b = [U.randInt(3, 8), 0];
    a[1] = a[0] * U.randInt(20, 60); b[1] = b[0] * U.randInt(20, 60);
    if (a[1] / a[0] === b[1] / b[0]) return cheaperQ();
    const cheapA = a[1] / a[0] < b[1] / b[0];
    return choice('どちらが お買いどく', 'A： ' + a[0] + 'こ で ' + a[1] + '円。B： ' + b[0] + 'こ で ' + b[1] + '円。1こ あたりが 安いのは？', [cheapA ? 'A' : 'B', cheapA ? 'B' : 'A'], { key: 'ch:' + a.join(',') + ':' + b.join(','), hint: '1こ あたりの ねだんを くらべよう。A は ' + (a[1] / a[0]) + '円、B は ' + (b[1] / b[0]) + '円。', note: (cheapA ? 'A' : 'B') + ' の ほうが 安い' });
  }
  function harvestQ() {
    const a = pf([2, 3, 4, 5]), per = U.randInt(40, 70) * 10;
    return num('1a あたり', a + 'a の 畑から ' + (a * per) + 'kg の じゃがいもが とれました。1a あたり 何kg？', per, { key: 'hv:' + a + ':' + per, hint: (a * per) + ' ÷ ' + a + '。', note: (a * per) + ' ÷ ' + a + ' = ' + per + 'kg' });
  }
  const stage12 = {
    easy: [perOneQ, crowdQ, fuelQ, perOneQ],
    normal: [whichCrowdQ, densityQ, fuelNeedQ, cheaperQ],
    hard: [densityQ, harvestQ, whichCrowdQ, fuelNeedQ],
    boss: [densityQ, cheaperQ, harvestQ, whichCrowdQ]
  };

  /* =======================================================
     ステージ13 速さ
     ======================================================= */
  function speedQ() {
    const t = U.randInt(2, 5), v = U.randInt(30, 90);
    return num('速さ', t + '時間で ' + (v * t) + 'km 走る 車の 時速は？', v, { key: 'sp:' + t + ':' + v, hint: '速さ = 道のり ÷ 時間。', note: (v * t) + ' ÷ ' + t + ' = 時速 ' + v + 'km' });
  }
  function distQ() {
    const t = U.randInt(2, 6), v = U.randInt(30, 90);
    return num('道のり', '時速 ' + v + 'km で ' + t + '時間 走ると 何km 進む？', v * t, { key: 'ds:' + t + ':' + v, hint: '道のり = 速さ × 時間。', note: v + ' × ' + t + ' = ' + (v * t) + 'km' });
  }
  function timeQ() {
    const t = U.randInt(2, 6), v = U.randInt(30, 90);
    return num('時間', '時速 ' + v + 'km で ' + (v * t) + 'km 進むには 何時間 かかる？', t, { key: 'tm:' + t + ':' + v, hint: '時間 = 道のり ÷ 速さ。', note: (v * t) + ' ÷ ' + v + ' = ' + t + '時間' });
  }
  function minSpeedQ() {
    const m = U.randInt(3, 12), v = U.randInt(50, 90) * 10;
    return num('分速', m + '分で ' + (v * m) + 'm 歩く 人の 分速は 何m？', v, { key: 'ms:' + m + ':' + v, hint: (v * m) + ' ÷ ' + m + '。', note: '分速 ' + v + 'm' });
  }
  function convertQ() {
    const w = pf([['分速 □m は 時速 何km？', 1, 60, 0.001, 'km', [500, 900], 100], ['時速 □km は 分速 何m？', 1000, 1, 1 / 60, 'm', [30, 90], 6], ['秒速 □m は 分速 何m？', 60, 1, 1, 'm', [5, 20], 1], ['分速 □m は 秒速 何m？', 1, 1, 1 / 60, 'm', [120, 900], 60]]);
    let x;
    do { x = U.randInt(w[5][0], w[5][1]); } while (x % w[6] !== 0);
    const ans = Math.round(x * w[1] * w[2] * w[3] * 1000) / 1000;
    return dec('速さの 単位', w[0].replace('□', x), ans, { key: 'cv:' + w[0].slice(0, 4) + ':' + x, hint: '1時間 = 60分、1分 = 60秒、1km = 1000m。', note: w[0].replace('□', x).replace('何', fx(ans)).replace('？', '') });
  }
  function speedWordQ() {
    const w = pf([['分速 □m で ○分 歩くと 何m？', 'm', [60, 90], [5, 20]], ['秒速 □m で ○秒 走ると 何m？', 'm', [5, 9], [8, 20]], ['時速 □km の 電車が ○時間 走ると 何km？', 'km', [60, 120], [2, 5]]]);
    const a = U.randInt(w[2][0], w[2][1]), b = U.randInt(w[3][0], w[3][1]);
    return num('速さの 文章題', w[0].replace('□', a).replace('○', b), a * b, { key: 'sw:' + a + ':' + b, hint: a + ' × ' + b + '。', note: a + ' × ' + b + ' = ' + (a * b) + w[1] });
  }
  function fasterQ() {
    const a = [U.randInt(100, 400), U.randInt(2, 5)], b = [U.randInt(100, 400), U.randInt(2, 5)];
    const va = a[0] / a[1], vb = b[0] / b[1];
    if (Math.abs(va - vb) < 5) return fasterQ();
    return choice('速さくらべ', 'A は ' + a[1] + '分で ' + a[0] + 'm、B は ' + b[1] + '分で ' + b[0] + 'm 歩きました。速いのは？', [va > vb ? 'A' : 'B', va > vb ? 'B' : 'A'], { key: 'fa:' + a.join(',') + ':' + b.join(','), hint: '分速を くらべよう。A は ' + fx(va) + 'm、B は ' + fx(vb) + 'm。', note: (va > vb ? 'A' : 'B') + ' の ほうが 速い' });
  }
  function timeMinQ() {
    const v = U.randInt(6, 9) * 10, t = U.randInt(5, 25);
    return num('時間（分）', '分速 ' + v + 'm で ' + (v * t) + 'm 歩くと 何分 かかる？', t, { key: 'tq:' + v + ':' + t, hint: (v * t) + ' ÷ ' + v + '。', note: (v * t) + ' ÷ ' + v + ' = ' + t + '分' });
  }
  function decHourQ() {
    const v = U.randInt(4, 12) * 10, t = pf([0.5, 1.5, 2.5]);
    return num('時間が 小数', '時速 ' + v + 'km で ' + fx(t) + '時間 走ると 何km？', v * t, { key: 'dh:' + v + ':' + t, hint: v + ' × ' + fx(t) + '。', note: v + ' × ' + fx(t) + ' = ' + (v * t) + 'km' });
  }
  const stage13 = {
    easy: [speedQ, distQ, minSpeedQ, timeQ],
    normal: [convertQ, speedWordQ, timeMinQ, fasterQ],
    hard: [convertQ, decHourQ, fasterQ, timeQ],
    boss: [convertQ, decHourQ, fasterQ, speedWordQ]
  };

  /* =======================================================
     ステージ14 四角形と 三角形の 面積
     ======================================================= */
  function paraQ(big) {
    const b = big ? U.randInt(12, 40) : U.randInt(3, 9), hh = big ? U.randInt(8, 25) : U.randInt(2, 8);
    const text = '底辺 ' + b + 'cm、高さ ' + hh + 'cm の 平行四辺形。面積は 何cm²？';
    return num('平行四辺形の 面積', big ? text : figQ(text, paraSvg(b, hh, [b + 'cm', hh + 'cm'])), b * hh, { key: 'pa:' + b + ':' + hh, hint: '面積 = 底辺 × 高さ。', note: b + ' × ' + hh + ' = ' + (b * hh) + 'cm²' });
  }
  function triQ(big) {
    let b, hh;
    do { b = big ? U.randInt(12, 40) : U.randInt(3, 9); hh = big ? U.randInt(8, 25) : U.randInt(2, 8); } while ((b * hh) % 2 !== 0);
    const text = '底辺 ' + b + 'cm、高さ ' + hh + 'cm の 三角形。面積は 何cm²？';
    return num('三角形の 面積', big ? text : figQ(text, triASvg(b, hh, [b + 'cm', hh + 'cm'], Math.random() < 0.3)), b * hh / 2, { key: 'tr:' + b + ':' + hh, hint: '面積 = 底辺 × 高さ ÷ 2。', note: b + ' × ' + hh + ' ÷ 2 = ' + (b * hh / 2) + 'cm²' });
  }
  function trapQ() {
    let a, b, hh;
    do { a = U.randInt(2, 6); b = U.randInt(a + 1, 10); hh = U.randInt(2, 6); } while (((a + b) * hh) % 2 !== 0);
    return num('台形の 面積', figQ('上底 ' + a + 'cm、下底 ' + b + 'cm、高さ ' + hh + 'cm の 台形。面積は？', trapSvg(a, b, hh, [a + 'cm', b + 'cm', hh + 'cm'])), (a + b) * hh / 2, { key: 'tz:' + a + ':' + b + ':' + hh, hint: '面積 = （上底 + 下底）× 高さ ÷ 2。', note: '（' + a + ' + ' + b + '）× ' + hh + ' ÷ 2 = ' + ((a + b) * hh / 2) + 'cm²' });
  }
  function rhombusQ() {
    let a, b;
    do { a = U.randInt(3, 10); b = U.randInt(3, 10); } while ((a * b) % 2 !== 0 || a === b);
    return num('ひし形の 面積', figQ('対角線が ' + a + 'cm と ' + b + 'cm の ひし形。面積は？', rhombusSvg(a, b, [a + 'cm', b + 'cm'])), a * b / 2, { key: 'rh:' + a + ':' + b, hint: '面積 = 対角線 × 対角線 ÷ 2。', note: a + ' × ' + b + ' ÷ 2 = ' + (a * b / 2) + 'cm²' });
  }
  function heightQ(kind) {
    const b = U.randInt(3, 12), hh = U.randInt(2, 9);
    if (kind === 'tri') return num('高さを もとめる', '面積 ' + (b * hh / 2) + 'cm²、底辺 ' + b + 'cm の 三角形。高さは 何cm？', hh, { key: 'ht:' + b + ':' + hh, decimal: (b * hh) % 2 !== 0 ? false : false, hint: '面積 × 2 ÷ 底辺。', note: (b * hh / 2) + ' × 2 ÷ ' + b + ' = ' + hh + 'cm' });
    return num('高さを もとめる', '面積 ' + (b * hh) + 'cm²、底辺 ' + b + 'cm の 平行四辺形。高さは 何cm？', hh, { key: 'hp:' + b + ':' + hh, hint: '面積 ÷ 底辺。', note: (b * hh) + ' ÷ ' + b + ' = ' + hh + 'cm' });
  }
  function decAreaQ5() {
    const b = U.randInt(11, 45) / 10, hh = U.randInt(2, 8);
    return dec('小数の 面積', '底辺 ' + fx(b) + 'cm、高さ ' + hh + 'cm の 平行四辺形。面積は？', b * hh, { key: 'da:' + b + ':' + hh, hint: fx(b) + ' × ' + hh + '。', note: fx(b) + ' × ' + hh + ' = ' + fx(b * hh) + 'cm²' });
  }
  function formulaQ() {
    const w = pf([['平行四辺形の 面積の 公式は？', '底辺 × 高さ', ['底辺 × 高さ ÷ 2', '（上底 + 下底）× 高さ ÷ 2', '対角線 × 対角線 ÷ 2']], ['三角形の 面積の 公式は？', '底辺 × 高さ ÷ 2', ['底辺 × 高さ', '（上底 + 下底）× 高さ ÷ 2', '底辺 + 高さ']], ['台形の 面積の 公式は？', '（上底 + 下底）× 高さ ÷ 2', ['上底 × 下底 ÷ 2', '底辺 × 高さ', '（上底 + 下底）× 高さ']], ['ひし形の 面積の 公式は？', '対角線 × 対角線 ÷ 2', ['1辺 × 1辺', '底辺 × 高さ ÷ 2', '対角線 × 対角線']]]);
    return choice('面積の 公式', w[0], [w[1]].concat(w[2]), { key: 'fm:' + w[1], hint: '三角形は 平行四辺形の 半分、台形は 上底と 下底を たした 平行四辺形の 半分。', note: w[1] });
  }
  function comboAreaQ() {
    const b = U.randInt(4, 10), hh = U.randInt(2, 6), b2 = U.randInt(2, 6);
    if ((b2 * hh) % 2 !== 0) return comboAreaQ();
    return num('組み合わせた 面積', '底辺 ' + b + 'cm、高さ ' + hh + 'cm の 平行四辺形と、底辺 ' + b2 + 'cm、高さ ' + hh + 'cm の 三角形を 合わせた 図形の 面積は？', b * hh + b2 * hh / 2, { key: 'co:' + b + ':' + hh + ':' + b2, hint: b + ' × ' + hh + ' と ' + b2 + ' × ' + hh + ' ÷ 2 を たす。', note: (b * hh) + ' + ' + (b2 * hh / 2) + ' = ' + (b * hh + b2 * hh / 2) + 'cm²' });
  }
  const stage14 = {
    easy: [function () { return paraQ(false); }, function () { return triQ(false); }, formulaQ, function () { return triQ(false); }],
    normal: [trapQ, rhombusQ, function () { return paraQ(true); }, function () { return heightQ('para'); }],
    hard: [function () { return triQ(true); }, function () { return heightQ('tri'); }, decAreaQ5, comboAreaQ],
    boss: [trapQ, comboAreaQ, function () { return heightQ('tri'); }, decAreaQ5]
  };

  /* =======================================================
     ステージ15 割合
     ======================================================= */
  function ratioQ() {
    const base = pf([20, 25, 40, 50, 80, 100, 200]), r = pf([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 0.9]);
    const part = base * r;
    return dec('割合', pf(['クラス', 'チーム', 'クラブ']) + ' ' + base + '人の うち ' + part + '人が 女子です。女子の 人数は 全体の どれだけの ' + WARI + '？（小数で）', r, { key: 'ra:' + base + ':' + r, hint: '割合 = くらべる量 ÷ もとにする量。' + part + ' ÷ ' + base + '。', note: part + ' ÷ ' + base + ' = ' + fx(r) });
  }
  function pctQ() {
    const r = pf([0.03, 0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1.2, 0.025]);
    return dec('百分率', '小数の 割合 ' + fx(r) + ' を 百分率で 表すと 何%？', r * 100, { key: 'pc:' + r, scratch: false, hint: '割合 × 100。', note: fx(r) + ' = ' + fx(r * 100) + '%' });
  }
  function pctToDecQ() {
    const p = pf([5, 12, 30, 45, 60, 75, 90, 110, 2.5]);
    return dec('百分率', p + '% を 小数の 割合で 表すと？', p / 100, { key: 'pd:' + p, scratch: false, hint: '% ÷ 100。', note: p + '% = ' + fx(p / 100) });
  }
  function buaiQ() {
    const w = pf([['3割', 0.3], ['5割', 0.5], ['2割5分', 0.25], ['7割', 0.7], ['1割2分', 0.12], ['8割', 0.8], ['4割5分', 0.45], ['9分', 0.09]]);
    return dec('歩合', '「' + w[0].replace('割', '<ruby>割<rt>わり</rt></ruby>') + '」を 小数の 割合で 表すと？', w[1], { key: 'bu:' + w[0], scratch: false, hint: '1割 = 0.1、1分 = 0.01。', note: w[0] + ' = ' + fx(w[1]) });
  }
  function partQ() {
    const base = pf([200, 300, 400, 500, 800, 1200, 2000]), p = pf([5, 10, 15, 20, 25, 30, 40, 60, 75]);
    return num('くらべる量', base + '円の ' + p + '% は 何円？', base * p / 100, { key: 'pt:' + base + ':' + p, hint: 'くらべる量 = もとにする量 × 割合。' + base + ' × ' + fx(p / 100) + '。', note: base + ' × ' + fx(p / 100) + ' = ' + (base * p / 100) + '円' });
  }
  function baseQ() {
    const base = pf([200, 300, 400, 500, 800, 1000, 1500]), p = pf([10, 20, 25, 30, 40, 50, 60, 80]);
    return num('もとにする量', 'ある 数の ' + p + '% が ' + (base * p / 100) + ' です。ある 数は？', base, { key: 'bs:' + base + ':' + p, hint: 'もとにする量 = くらべる量 ÷ 割合。' + (base * p / 100) + ' ÷ ' + fx(p / 100) + '。', note: (base * p / 100) + ' ÷ ' + fx(p / 100) + ' = ' + base });
  }
  function discountQ() {
    const price = pf([500, 800, 1000, 1200, 1500, 2000, 2500, 3000]), off = pf([1, 2, 3, 4]);
    return num('割引', price + '円の 品物を ' + off + WARIBIKI + 'で 買うと 何円？', price * (10 - off) / 10, { key: 'dc:' + price + ':' + off, hint: off + '割引は もとの ねだんの （1 − 0.' + off + '）倍。' + price + ' × 0.' + (10 - off) + '。', note: price + ' × 0.' + (10 - off) + ' = ' + (price * (10 - off) / 10) + '円' });
  }
  function increaseQ() {
    const base = pf([200, 400, 500, 800, 1000, 1500]), p = pf([10, 20, 25, 30, 50]);
    return num('増えた 量', '去年 ' + base + '人だった 会員が 今年は ' + p + '% 増えました。今年の 人数は？', base * (100 + p) / 100, { key: 'in:' + base + ':' + p, hint: base + ' × （1 + ' + fx(p / 100) + '）。', note: base + ' × ' + fx((100 + p) / 100) + ' = ' + (base * (100 + p) / 100) + '人' });
  }
  function pctWordQ() {
    const base = pf([20, 25, 40, 50, 80]), r = pf([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8]);
    const part = base * r;
    return num('百分率の 文章題', 'シュートを ' + base + '回 して ' + part + '回 入りました。入った 割合は 何%？', r * 100, { key: 'pw:' + base + ':' + r, hint: part + ' ÷ ' + base + ' × 100。', note: part + ' ÷ ' + base + ' = ' + fx(r) + ' → ' + fx(r * 100) + '%' });
  }
  const stage15 = {
    easy: [ratioQ, pctQ, pctToDecQ, buaiQ],
    normal: [partQ, pctWordQ, buaiQ, baseQ],
    hard: [discountQ, increaseQ, baseQ, partQ],
    boss: [discountQ, increaseQ, baseQ, pctWordQ]
  };

  /* =======================================================
     ステージ16 帯グラフと 円グラフ
     ======================================================= */
  const GRAPH_SETS = [
    { title: 'すきな きゅう食', items: ['カレー', 'あげパン', 'うどん', 'その他'] },
    { title: 'すきな 教科', items: ['体育', '図工', '算数', 'その他'] },
    { title: '通学の しかた', items: ['歩き', '自転車', 'バス', 'その他'] },
    { title: '土地の 使われ方', items: ['田', '畑', '住たく', 'その他'] }
  ];
  function graphItems() {
    const set = pf(GRAPH_SETS);
    let pcts;
    do { pcts = [U.randInt(30, 50), U.randInt(15, 30), U.randInt(10, 20)]; pcts.push(100 - pcts[0] - pcts[1] - pcts[2]); } while (pcts[3] < 5 || pcts[3] > pcts[2]);
    return { set: set, items: set.items.map(function (n, i) { return { name: n, pct: pcts[i] }; }) };
  }
  function readGraphQ(pie) {
    const g = graphItems(), hide = U.randInt(0, 3);
    const svg = pie ? pieSvg(g.items, hide) : bandSvg(g.items, hide);
    const text = (pie ? '円グラフ' : '帯グラフ') + '「' + g.set.title + '」。' + g.items[hide].name + 'は 何%？';
    return num('グラフを 読む', svg + text, g.items[hide].pct, { key: 'rg:' + g.set.title + ':' + g.items.map(function (i) { return i.pct; }).join(',') + ':' + hide, hint: '全体は 100%。ほかの 3つを たして 100 から ひこう。', note: '100 − ' + g.items.filter(function (i, k) { return k !== hide; }).map(function (i) { return i.pct; }).join(' − ') + ' = ' + g.items[hide].pct + '%' });
  }
  function graphCountQ(pie) {
    const g = graphItems(), total = pf([100, 200, 400, 500, 1000]), i = U.randInt(0, 2);
    const svg = pie ? pieSvg(g.items, -1) : bandSvg(g.items, -1);
    const text = '「' + g.set.title + '」全体は ' + total + '人。' + g.items[i].name + 'は 何人？';
    return num('人数を もとめる', svg + text, total * g.items[i].pct / 100, { key: 'gc:' + total + ':' + g.items[i].pct + ':' + g.set.title, hint: total + ' × ' + fx(g.items[i].pct / 100) + '。', note: total + ' × ' + fx(g.items[i].pct / 100) + ' = ' + (total * g.items[i].pct / 100) + '人' });
  }
  function graphMostQ(pie) {
    const g = graphItems();
    const svg = pie ? pieSvg(g.items, -1) : bandSvg(g.items, -1);
    const ask = Math.random() < 0.5;
    const text = '「' + g.set.title + '」で いちばん ' + (ask ? '多い' : '少ない') + 'のは？（その他を のぞく）';
    const sorted = g.items.slice(0, 3).sort(function (a, b) { return b.pct - a.pct; });
    const right = ask ? sorted[0] : sorted[2];
    return choice('グラフを 読む', svg + text, [right.name].concat(g.items.filter(function (it) { return it !== right; }).map(function (it) { return it.name; })), { key: 'gm:' + g.set.title + ':' + ask + ':' + g.items.map(function (i) { return i.pct; }).join(','), hint: '帯や おうぎ形の 大きさを くらべよう。', note: right.name + '（' + right.pct + '%）' });
  }
  function graphTimesQ() {
    const g = graphItems();
    const a = g.items[0], b = g.items[2];
    if (a.pct % b.pct !== 0) return graphTimesQ();
    const svg = bandSvg(g.items, -1);
    return num('割合を くらべる', svg + '「' + g.set.title + '」。' + a.name + 'の 割合は ' + b.name + 'の 何倍？', a.pct / b.pct, { key: 'gt:' + a.pct + ':' + b.pct + ':' + g.set.title, hint: a.pct + ' ÷ ' + b.pct + '。', note: a.pct + ' ÷ ' + b.pct + ' = ' + (a.pct / b.pct) + '倍' });
  }
  function pctForGraphQ() {
    const total = pf([40, 50, 200, 400]), part = total * pf([0.1, 0.2, 0.25, 0.3, 0.45]) ;
    return num('グラフを かく', '全体 ' + total + '人の うち ' + part + '人を 帯グラフに かきます。帯の 何% の 長さに する？', part / total * 100, { key: 'pg:' + total + ':' + part, hint: part + ' ÷ ' + total + ' × 100。', note: part + ' ÷ ' + total + ' = ' + fx(part / total) + ' → ' + (part / total * 100) + '%' });
  }
  function graphWordQ() {
    const w = pf([['帯グラフや 円グラフで 表すのに 向いて いるのは？', '全体に 対する 部分の 割合', ['時間による 変わり方', 'それぞれの 数の 大きさ', '2つの ことがらの 関係']], ['帯グラフで、ふつう いちばん 左に かく ものは？', '割合の いちばん 大きい もの', ['割合の いちばん 小さい もの', 'その他', '五十音の 早い もの']], ['円グラフの 全体（1周）は 何% を 表す？', '100%', ['360%', '50%', '10%']], ['帯グラフで「その他」は どこに かく？', 'いちばん 右（さいご）', ['いちばん 左', 'まん中', 'かかない']]]);
    return choice('グラフの きまり', w[0], [w[1]].concat(w[2]), { key: 'gw:' + w[1], hint: '帯グラフ・円グラフは 割合を 見る グラフ。', note: w[1] });
  }
  const stage16 = {
    easy: [function () { return readGraphQ(false); }, function () { return graphMostQ(true); }, graphWordQ, function () { return readGraphQ(true); }],
    normal: [function () { return graphCountQ(false); }, function () { return readGraphQ(true); }, graphTimesQ, function () { return graphMostQ(false); }],
    hard: [function () { return graphCountQ(true); }, pctForGraphQ, graphTimesQ, function () { return graphCountQ(false); }],
    boss: [function () { return graphCountQ(true); }, pctForGraphQ, graphTimesQ, function () { return readGraphQ(false); }]
  };

  /* =======================================================
     ステージ17 正多角形と 円周の 長さ
     ======================================================= */
  function centerAngQ() {
    const n = pf([3, 4, 5, 6, 8, 9, 10, 12]);
    return num('正多角形の 中心の 角', figQ('正' + (POLY_NAMES[n] || n + '角形') + 'を 中心と ちょう点を むすんで 分けた ときの、1つの 中心の 角は 何度？', polySvg(n, { center: true })), 360 / n, { key: 'ca:' + n, hint: '360 ÷ ' + n + '。', note: '360 ÷ ' + n + ' = ' + (360 / n) + '度' });
  }
  function regAngQ2() {
    const n = pf([5, 6, 8, 9, 10, 12]);
    return num('正多角形の 角', '正' + (POLY_NAMES[n] || n + '角形') + 'の 1つの 角の 大きさは 何度？', (n - 2) * 180 / n, { key: 'ra2:' + n, scratch: false, hint: '中心の 角は 360 ÷ ' + n + ' = ' + (360 / n) + '度。1つの 角は 180 − ' + (360 / n) + '。', note: '180 − ' + (360 / n) + ' = ' + ((n - 2) * 180 / n) + '度' });
  }
  function regPerimQ() {
    const n = pf([5, 6, 8]), a = U.randInt(2, 9);
    return num('正多角形の まわり', figQ('1辺 ' + a + 'cm の 正' + POLY_NAMES[n] + '。まわりの 長さは？', polySvg(n, { side: a + 'cm' })), a * n, { key: 'rp:' + n + ':' + a, hint: a + ' × ' + n + '。', note: a + ' × ' + n + ' = ' + (a * n) + 'cm' });
  }
  function circumQ(byRadius) {
    const r = U.randInt(2, 15);
    const d = byRadius ? r * 2 : r;
    const text = byRadius ? '半径 ' + r + 'cm の 円の 円周は 何cm？' : '直径 ' + r + 'cm の 円の 円周は 何cm？';
    return dec('円周', figQ(text, circleSvg(byRadius ? 'radius' : 'diameter', r + 'cm')), d * 3.14, { key: 'ci:' + r + ':' + byRadius, hint: '円周 = 直径 × 3.14。' + (byRadius ? '直径は ' + d + 'cm。' : ''), note: d + ' × 3.14 = ' + fx(d * 3.14) + 'cm' });
  }
  function diamFromCircQ() {
    const d = U.randInt(2, 30);
    return num('直径を もとめる', '円周が ' + fx(d * 3.14) + 'cm の 円の 直径は 何cm？', d, { key: 'dc:' + d, hint: '直径 = 円周 ÷ 3.14。', note: fx(d * 3.14) + ' ÷ 3.14 = ' + d + 'cm' });
  }
  function wheelQ() {
    const d = pf([40, 50, 60, 70]), n = U.randInt(5, 20);
    return dec('円周の 文章題', '直径 ' + d + 'cm の 車輪が ' + n + '回転 すると、何m 進む？', d * 3.14 * n / 100, { key: 'wh:' + d + ':' + n, maxLen: 7, hint: '1回転で ' + fx(d * 3.14) + 'cm。× ' + n + ' を m に。', note: fx(d * 3.14) + ' × ' + n + ' = ' + fx(d * 3.14 * n) + 'cm = ' + fx(d * 3.14 * n / 100) + 'm' });
  }
  function halfCircQ() {
    const d = U.randInt(4, 20) * 2;
    const ans = d * 3.14 / 2 + d;
    return dec('半円の まわり', '直径 ' + d + 'cm の 半円の まわりの 長さ（直線の 部分も 入れる）は？', ans, { key: 'hc:' + d, hint: '円周の 半分 ' + fx(d * 3.14 / 2) + 'cm に 直径 ' + d + 'cm を たす。', note: fx(d * 3.14 / 2) + ' + ' + d + ' = ' + fx(ans) + 'cm' });
  }
  function piQ() {
    const w = pf([['円周 ÷ 直径 の 答えを 何と いう？', '円周率', ['半径', '直径', '中心角']], ['円周率は およそ いくつ？', '3.14', ['3.41', '3', '31.4']], ['正多角形の 辺の 数を ふやして いくと、形は 何に 近づく？', '円', ['正方形', '三角形', '直線']], ['円の 中に かいた 正六角形の 1辺の 長さは？', '円の 半径と 同じ', ['円の 直径と 同じ', '円周の 半分', '半径の 半分']]]);
    return choice('円周率', w[0], [w[1]].concat(w[2]), { key: 'pi:' + w[1], hint: '円周 = 直径 × 円周率（3.14）。', note: w[1] });
  }
  const stage17 = {
    easy: [centerAngQ, piQ, function () { return circumQ(false); }, regPerimQ],
    normal: [function () { return circumQ(true); }, regAngQ2, diamFromCircQ, function () { return circumQ(false); }],
    hard: [wheelQ, halfCircQ, diamFromCircQ, regAngQ2],
    boss: [wheelQ, halfCircQ, function () { return circumQ(true); }, centerAngQ]
  };

  /* =======================================================
     ステージ18 角柱と 円柱
     ======================================================= */
  const PRISMS = [['tri', '三角柱', 3], ['quad', '四角柱', 4], ['pent', '五角柱', 5], ['hex', '六角柱', 6]];
  function prismNameQ() {
    const p = pf(PRISMS.concat([['cyl', '円柱', 0]]));
    return choice('立体の 名前', figQ('この 立体の 名前は？', prismSvg(p[0])), [p[1]].concat(PRISMS.concat([['cyl', '円柱', 0]]).filter(function (x) { return x[1] !== p[1]; }).map(function (x) { return x[1]; }).slice(0, 3)), { key: 'pn:' + p[0], hint: '底面の 形で 名前が 決まる。', note: p[1] });
  }
  function prismCountQ() {
    const p = pf(PRISMS), kind = pf([['面', p[2] + 2], ['辺', p[2] * 3], ['ちょう点', p[2] * 2]]);
    return num('角柱の ' + kind[0], figQ(p[1] + 'の ' + kind[0] + 'の 数は？', prismSvg(p[0])), kind[1], { key: 'pc:' + p[0] + ':' + kind[0], hint: kind[0] === '面' ? '底面 2つ ＋ 側面 ' + p[2] + 'つ。' : kind[0] === '辺' ? '底面の 辺 ' + p[2] + ' × 2 ＋ 側面の たての 辺 ' + p[2] + '。' : '底面の ちょう点 ' + p[2] + ' × 2。', note: kind[1] + (kind[0] === '辺' ? '本' : 'つ') });
  }
  function prismPartQ() {
    const w = pf([['角柱の 上下の 2つの 面を 何と いう？', '底面', ['側面', '正面', '上面']], ['角柱の まわりの 面を 何と いう？', '側面', ['底面', '上の面', '表面']], ['角柱の 側面の 形は？', '長方形（または 正方形）', ['三角形', '円', '台形']], ['円柱の 側面を ' + TENKAI + 'に すると 何の 形？', '長方形', ['円', '三角形', 'おうぎ形']], ['角柱や 円柱の 2つの 底面は？', '合同で 平行', ['大きさが ちがう', 'すいちょく', '1つだけ']], ['角柱の 側面は 底面に 対して どう なって いる？', 'すいちょく', ['平行', 'ななめ', '同じ 形']]]);
    return choice('角柱と 円柱', w[0], [w[1]].concat(w[2]), { key: 'pp:' + w[1] + w[0].slice(0, 4), hint: '底面は 上下、側面は まわり。', note: w[1] });
  }
  function cylNetQ() {
    const r = U.randInt(2, 10), hh = U.randInt(3, 12);
    const ask = Math.random() < 0.6;
    return dec('円柱の てん開図', figQ('半径 ' + r + 'cm、高さ ' + hh + 'cm の 円柱の ' + TENKAI + '。側面の 長方形の ' + (ask ? '横の 長さは？' : 'たての 長さは？'), cylNetSvg([ask ? '？' : hh + 'cm', ask ? hh + 'cm' : '？'])), ask ? r * 2 * 3.14 : hh, { key: 'cn:' + r + ':' + hh + ':' + ask, hint: ask ? '横の 長さ = 底面の 円周 = 直径 × 3.14。' : 'たての 長さ = 円柱の 高さ。', note: ask ? (r * 2) + ' × 3.14 = ' + fx(r * 2 * 3.14) + 'cm' : hh + 'cm' });
  }
  function prismHeightQ() {
    const p = pf(PRISMS), hh = U.randInt(3, 15);
    return num('角柱の 高さ', figQ(p[1] + 'の 2つの 底面の 間の 長さが ' + hh + 'cm。この 立体の 高さは？', prismSvg(p[0], [hh + 'cm'])), hh, { key: 'ph:' + p[0] + ':' + hh, hint: '底面と 底面の 間の 長さが 高さ。', note: hh + 'cm' });
  }
  function baseShapeQ() {
    const p = pf(PRISMS);
    const names = { tri: '三角形', quad: '四角形', pent: '五角形', hex: '六角形' };
    return choice('底面の 形', figQ(p[1] + 'の 底面の 形は？', prismSvg(p[0])), [names[p[0]]].concat(['三角形', '四角形', '五角形', '六角形', '円'].filter(function (x) { return x !== names[p[0]]; }).slice(0, 3)), { key: 'bs:' + p[0], hint: '名前の「○角」が 底面の 形。', note: names[p[0]] });
  }
  function edgeLenQ() {
    const p = pf(PRISMS), a = U.randInt(2, 6), hh = U.randInt(3, 10);
    return num('辺の 長さの 合計', '底面が 1辺 ' + a + 'cm の 正' + POLY_NAMES[p[2]] + '、高さ ' + hh + 'cm の ' + p[1] + '。辺の 長さの 合計は？', a * p[2] * 2 + hh * p[2], { key: 'el:' + p[0] + ':' + a + ':' + hh, hint: '底面の 辺 ' + a + ' × ' + p[2] + ' × 2 ＋ 高さ ' + hh + ' × ' + p[2] + '。', note: (a * p[2] * 2) + ' + ' + (hh * p[2]) + ' = ' + (a * p[2] * 2 + hh * p[2]) + 'cm' });
  }
  const stage18 = {
    easy: [prismNameQ, baseShapeQ, prismPartQ, prismCountQ],
    normal: [prismCountQ, prismHeightQ, cylNetQ, prismPartQ],
    hard: [cylNetQ, edgeLenQ, prismCountQ, prismPartQ],
    boss: [cylNetQ, edgeLenQ, prismCountQ, prismNameQ]
  };

  /* =======================================================
     まとめ
     ======================================================= */
  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10, 11: stage11, 12: stage12, 13: stage13, 14: stage14, 15: stage15, 16: stage16, 17: stage17, 18: stage18 };
  const figs5 = { paraSvg: paraSvg, triASvg: triASvg, trapSvg: trapSvg, rhombusSvg: rhombusSvg, triAngSvg: triAngSvg, quadAngSvg: quadAngSvg, polySvg: polySvg, congSvg: congSvg, corrSvg: corrSvg, bandSvg: bandSvg, pieSvg: pieSvg, prismSvg: prismSvg, cylNetSvg: cylNetSvg, fr: fr, mixed: mixed };

  function cycle(list, n) {
    const out = [];
    if (!list || !list.length) return out;
    let order = U.shuffle(list);
    for (let i = 0; i < n; i++) {
      if (i % list.length === 0 && i > 0) order = U.shuffle(list);
      out.push(order[i % list.length]);
    }
    return out;
  }
  function levelCounts(n) {
    const easy = Math.ceil(n / 3);
    const hard = Math.floor(n / 3);
    return [easy, n - easy - hard, hard];
  }
  const TIERS = { 1: 'easy', 2: 'normal', 3: 'hard' };
  function make(stageNo, n, opts) {
    const st = stages[stageNo];
    if (!st) return [];
    let plan;
    if (opts && opts.boss) plan = [[st.boss, 3, n]];
    else if (opts && opts.lv) plan = [[st[TIERS[opts.lv]] || st.normal, opts.lv, n]];
    else { const c = levelCounts(n); plan = [[st.easy, 1, c[0]], [st.normal, 2, c[1]], [st.hard, 3, c[2]]]; }
    const out = [], seen = {};
    function idOf(q) { return 'sansu5-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }
    plan.forEach(function (p) {
      cycle(p[0], p[2]).forEach(function (maker) {
        let q = maker(), tries = 0;
        while (seen[idOf(q)] && tries++ < 16) q = maker();
        q.lv = p[1];
        q.id = idOf(q);
        seen[q.id] = true;
        out.push(q);
      });
    });
    return out;
  }

  return { make: make, stages: stages, levelCounts: levelCounts, figs5: figs5 };
})();
