/* ---------------------------------------------------------
   小4 算数：問題を その場で作る（日本文教出版『小学算数』4年の順）

   ステージ 1〜5 は 1学期、6〜11 は 2学期、12〜15 は 3学期。
   出すか どうかは 学期の しくみ（terms.js・おうちの人ページ）が 決める。

   問題の作り方は 関数として 入っていて、数字は 毎回かわります。
   ステージごとに 4つの グループが あります：
     easy   … やさしい（たたかいの さいしょに 出る）    lv 1
     normal … ふつう                                    lv 2
     hard   … むずかしい（ボスの 前に 出る）            lv 3
     boss   … ボスの 問題（ザコより むずかしい まとめ問題）
   たたかいでは easy → normal → hard の じゅんに 出ます。

   ことばの きまり：小3までの かん字＋その 単元で ならう かん字だけ。
   中学の かん字（垂・概・頂 など）は ひらがなで 書く
   （すいちょく・がい数・ちょう点）。tools/smoke.js が 検査する。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu4 = (function () {
  const U = MQ.util;

  /* =======================================================
     問題を作る 小さな道具（sansu3.js と 同じ 形）
     ======================================================= */
  function expr(a, sign, b) {
    return '<span class="num">' + a + ' ' + sign + ' ' + b + '</span>';
  }

  function num(unit, prompt, answer, extra) {
    return Object.assign({ type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: true }, extra || {});
  }

  function choice(unit, prompt, choices, extra) {
    return Object.assign({ type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0 }, extra || {});
  }

  function divrem(unit, a, b, extra) {
    return Object.assign({
      type: 'divrem', unit: unit, prompt: expr(a, '÷', b), a: a, b: b,
      answer: { q: Math.floor(a / b), r: a % b }, scratch: true
    }, extra || {});
  }

  /* 小数の 答え。かならず 整数から わり算して 作る
     （そうすると 子どもが うつ 「0.35」と ぴったり 同じ 数に なる） */
  function fx(v) { return String(Math.round(v * 1000) / 1000); }
  function dec(unit, prompt, value, extra) {
    return num(unit, prompt, Math.round(value * 1000) / 1000, Object.assign({ decimal: true }, extra || {}));
  }

  function pf(list) { return list[U.randInt(0, list.length - 1)]; }

  // 正解 1つ ＋ まちがい3つ（かぶらないように）
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

  // けたを 3つずつ 区切って 読みやすく（12,345,678）
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // sansu3 / sansu2 の 図と 道具を かりる（読みこみ じゅんは index.html のとおり）
  function kanjiNum(n) { return MQ.sansu3.figs3.kanjiNum(n); }
  function numLine(max, div, mark, labelEvery, fmt) { return MQ.sansu3.figs3.lineSvg(max, div, mark, labelEvery, fmt); }

  /* =======================================================
     図の 道具（inline SVG）
     色は sansu3.js と そろえる
     ======================================================= */
  const FS = '#1a1a1a', FF = '#FFF3C4', FR = '#d42a20', FB = '#4F8CFF';

  /* 教科書の ことばの うち、小4では まだ ならって いない かん字に ふりがな。
     prompt だけ HTML が 使える（hint・note は そのままの 字で 出る） */
  const SHASHA = '四<ruby>捨<rt>しゃ</rt></ruby>五入';
  const TENKAI = '<ruby>展<rt>てん</rt></ruby>開図';

  function svgBox(inner) {
    return '<span class="figbox"><svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg></span>';
  }
  // 文字の 右に 図
  function figQ(text, svg) { return '<span class="figq"><span class="figq__t">' + text + '</span>' + svg + '</span>'; }
  /* ---- 折れ線グラフ（ステージ2） ----
     たてじくは base から step ずつ 10目もり。点は かならず 目もりの 上に のせる */
  function lineGraphSvg(set, values) {
    const W = 300, H = 106, left = 34, top = 15, bottom = 22, right = 8;
    const plotH = H - top - bottom, plotW = W - left - right;
    const span = set.step * 10;
    function yOf(v) { return top + plotH - plotH * (v - set.base) / span; }
    function xOf(i) { return left + plotW * (i + 0.5) / values.length; }

    let s = '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + U.esc(set.title) + 'の おれ線グラフ">';
    s += '<text x="' + left + '" y="11" font-size="11" fill="#1F2D3A">' + U.esc(set.title) + '（' + set.unit + '）</text>';
    for (let i = 0; i <= 10; i++) {
      const y = top + plotH - plotH * i / 10;
      const big = i % 2 === 0;
      s += '<line x1="' + left + '" y1="' + y + '" x2="' + (W - right) + '" y2="' + y + '" stroke="' + (big ? '#B9B29A' : '#E3DCC4') + '" stroke-width="0.8"/>';
      if (big) s += '<text x="' + (left - 5) + '" y="' + (y + 3.5) + '" font-size="10" text-anchor="end" fill="#1F2D3A">' + (set.base + set.step * i) + '</text>';
    }
    // たてじくの 目もりの 線（点の 場所）
    values.forEach(function (v, i) {
      s += '<line x1="' + xOf(i) + '" y1="' + top + '" x2="' + xOf(i) + '" y2="' + (top + plotH) + '" stroke="#E3DCC4" stroke-width="0.8"/>';
      s += '<text x="' + xOf(i) + '" y="' + (H - 7) + '" font-size="10" text-anchor="middle" fill="#1F2D3A">' + U.esc(set.labels[i]) + '</text>';
    });
    // おれ線
    let d = '';
    values.forEach(function (v, i) { d += (i ? ' L ' : 'M ') + xOf(i) + ' ' + yOf(v); });
    s += '<path d="' + d + '" fill="none" stroke="' + FB + '" stroke-width="2.4" stroke-linejoin="round"/>';
    values.forEach(function (v, i) { s += '<circle cx="' + xOf(i) + '" cy="' + yOf(v) + '" r="3.2" fill="' + FB + '"/>'; });
    s += '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + (top + plotH) + '" stroke="#1F2D3A" stroke-width="1.2"/>';
    s += '<line x1="' + left + '" y1="' + (top + plotH) + '" x2="' + (W - right) + '" y2="' + (top + plotH) + '" stroke="#1F2D3A" stroke-width="1.2"/>';
    return s + '</svg>';
  }

  /* ---- 角（ステージ4）。ちょう点は (80,88)・はんけい 62 ----
     deg は 0〜180。outer が true なら 大きい ほうの 角に ？ を つける */
  function angleSvg(deg, outer, label) {
    const cx = 80, cy = 88, r = 62;
    function pt(a, rad) { return [cx + rad * Math.cos(a * Math.PI / 180), cy - rad * Math.sin(a * Math.PI / 180)]; }
    const p0 = pt(0, r), p1 = pt(deg, r);
    let s = '<line x1="' + cx + '" y1="' + cy + '" x2="' + p0[0] + '" y2="' + p0[1] + '" stroke="' + FS + '" stroke-width="3.4" stroke-linecap="round"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p1[0] + '" y2="' + p1[1] + '" stroke="' + FS + '" stroke-width="3.4" stroke-linecap="round"/>';
    if (outer) {
      const ar = 30, a0 = pt(0, ar), a1 = pt(deg, ar);
      s += '<path d="M ' + a0[0] + ' ' + a0[1] + ' A ' + ar + ' ' + ar + ' 0 1 1 ' + a1[0] + ' ' + a1[1] + '" fill="none" stroke="' + FR + '" stroke-width="2.6"/>';
      const m = pt(deg / 2 + 180, 40);
      s += '<text x="' + m[0] + '" y="' + (m[1] + 5) + '" font-size="17" font-weight="bold" text-anchor="middle" fill="' + FR + '">' + (label || '？') + '</text>';
    } else {
      const ar = 26, a0 = pt(0, ar), a1 = pt(deg, ar);
      s += '<path d="M ' + a0[0] + ' ' + a0[1] + ' A ' + ar + ' ' + ar + ' 0 0 0 ' + a1[0] + ' ' + a1[1] + '" fill="none" stroke="' + FR + '" stroke-width="2.6"/>';
      const m = pt(deg / 2, 40);
      s += '<text x="' + m[0] + '" y="' + (m[1] + 5) + '" font-size="17" font-weight="bold" text-anchor="middle" fill="' + FR + '">' + (label || '？') + '</text>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + FS + '"/>';
    return svgBox(s);
  }

  /* ---- 分どき（分度器）を あてた 角（ステージ4）。カードの はば いっぱいに 出す ----
     子どもは 目もりを 読んで 答える。目もりは 5度ごと、数字は 30度ごと。 */
  function protractorSvg(deg) {
    const W = 300, H = 118, cx = 150, cy = 110, r = 104;
    function pt(a, rad) { return [cx + rad * Math.cos(a * Math.PI / 180), cy - rad * Math.sin(a * Math.PI / 180)]; }
    let s = '<svg class="figwide" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="分どきで はかった 角">';
    // 分どきの 半円
    const a0 = pt(0, r), a1 = pt(180, r);
    s += '<path d="M ' + a1[0] + ' ' + a1[1] + ' A ' + r + ' ' + r + ' 0 0 1 ' + a0[0] + ' ' + a0[1] + ' Z" fill="#EAF3FF" stroke="#8FA8C8" stroke-width="1.6"/>';
    for (let g = 0; g <= 180; g += 5) {
      const big = g % 30 === 0, mid = g % 10 === 0;
      const p1 = pt(g, r), p2 = pt(g, r - (big ? 13 : mid ? 9 : 5));
      s += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#5B7C9E" stroke-width="1"/>';
      if (big) {
        const t = pt(g, r - 22);
        s += '<text x="' + t[0] + '" y="' + (t[1] + (g === 0 || g === 180 ? -5 : 4)) + '" font-size="11" text-anchor="middle" fill="#33506E">' + g + '</text>';
      }
    }
    // 中心と 0度の 線
    s += '<line x1="' + (cx - r) + '" y1="' + cy + '" x2="' + (cx + r) + '" y2="' + cy + '" stroke="#8FA8C8" stroke-width="1.6"/>';
    // はかる 角（黒い 2本の 線）
    const e0 = pt(0, r + 8), e1 = pt(deg, r + 8);
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e0[0] + '" y2="' + e0[1] + '" stroke="' + FS + '" stroke-width="3.2" stroke-linecap="round"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e1[0] + '" y2="' + e1[1] + '" stroke="' + FS + '" stroke-width="3.2" stroke-linecap="round"/>';
    const b0 = pt(0, 30), b1 = pt(deg, 30);
    s += '<path d="M ' + b0[0] + ' ' + b0[1] + ' A 30 30 0 0 0 ' + b1[0] + ' ' + b1[1] + '" fill="none" stroke="' + FR + '" stroke-width="2.4"/>';
    const m = pt(deg / 2, 44);
    s += '<text x="' + m[0] + '" y="' + (m[1] + 6) + '" font-size="18" font-weight="bold" text-anchor="middle" fill="' + FR + '">？</text>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + FS + '"/>';
    return s + '</svg>';
  }

  /* ---- 一直線の 上の 角（ステージ4）。？は 左がわ ---- */
  function straightSvg(deg) {
    const cx = 80, cy = 88, r = 66;
    function pt(a, rad) { return [cx + rad * Math.cos(a * Math.PI / 180), cy - rad * Math.sin(a * Math.PI / 180)]; }
    const pR = pt(0, r), pL = pt(180, r), pU = pt(deg, r);
    let s = '<line x1="' + pL[0] + '" y1="' + pL[1] + '" x2="' + pR[0] + '" y2="' + pR[1] + '" stroke="' + FS + '" stroke-width="3.4" stroke-linecap="round"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pU[0] + '" y2="' + pU[1] + '" stroke="' + FS + '" stroke-width="3.4" stroke-linecap="round"/>';
    let a0 = pt(0, 24), a1 = pt(deg, 24);
    s += '<path d="M ' + a0[0] + ' ' + a0[1] + ' A 24 24 0 0 0 ' + a1[0] + ' ' + a1[1] + '" fill="none" stroke="' + FB + '" stroke-width="2.4"/>';
    let m = pt(deg / 4, 46);
    s += '<text x="' + m[0] + '" y="' + (m[1] + 5) + '" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FB + '">' + deg + '度</text>';
    a0 = pt(deg, 32); a1 = pt(180, 32);
    s += '<path d="M ' + a0[0] + ' ' + a0[1] + ' A 32 32 0 0 0 ' + a1[0] + ' ' + a1[1] + '" fill="none" stroke="' + FR + '" stroke-width="2.6"/>';
    m = pt((deg + 180) / 2, 46);
    s += '<text x="' + m[0] + '" y="' + (m[1] + 5) + '" font-size="17" font-weight="bold" text-anchor="middle" fill="' + FR + '">？</text>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + FS + '"/>';
    return svgBox(s);
  }

  /* ---- 2本の 直線（すいちょく・平行）（ステージ8） ---- */
  function linesSvg(kind) {
    let s = '';
    if (kind === 'perp') {
      s += '<line x1="14" y1="62" x2="146" y2="62" stroke="' + FS + '" stroke-width="3.4"/>';
      s += '<line x1="80" y1="12" x2="80" y2="112" stroke="' + FB + '" stroke-width="3.4"/>';
      s += '<rect x="82" y="48" width="12" height="12" fill="none" stroke="' + FR + '" stroke-width="2"/>';
    } else if (kind === 'para') {
      s += '<line x1="14" y1="42" x2="146" y2="42" stroke="' + FS + '" stroke-width="3.4"/>';
      s += '<line x1="14" y1="86" x2="146" y2="86" stroke="' + FB + '" stroke-width="3.4"/>';
      s += '<line x1="60" y1="42" x2="60" y2="86" stroke="' + FR + '" stroke-width="1.6" stroke-dasharray="4 3"/>';
      s += '<line x1="118" y1="42" x2="118" y2="86" stroke="' + FR + '" stroke-width="1.6" stroke-dasharray="4 3"/>';
    } else {   // まじわる（すいちょくでは ない）
      s += '<line x1="14" y1="62" x2="146" y2="62" stroke="' + FS + '" stroke-width="3.4"/>';
      s += '<line x1="42" y1="112" x2="118" y2="12" stroke="' + FB + '" stroke-width="3.4"/>';
    }
    return svgBox(s);
  }

  /* ---- 四角形（ステージ8） ---- */
  const QUADS = {
    // ちょう点の ならび（左上から 時計まわり）
    square:   [[38, 22], [122, 22], [122, 106], [38, 106]],
    rect:     [[16, 34], [144, 34], [144, 94], [16, 94]],
    para:     [[42, 28], [150, 28], [118, 100], [10, 100]],
    trape:    [[54, 28], [116, 28], [148, 100], [12, 100]],
    trapeR:   [[36, 28], [116, 28], [116, 100], [36, 100]],   // 下だけ のばす（下で 直す）
    rhombus:  [[80, 16], [140, 64], [80, 112], [20, 64]]
  };
  QUADS.trapeR = [[36, 28], [110, 28], [140, 100], [36, 100]];

  function quadSvg(kind, opts) {
    opts = opts || {};
    const pts = QUADS[kind] || QUADS.square;
    let s = '<polygon points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="4" stroke-linejoin="round"/>';
    if (opts.diag) {
      s += '<line x1="' + pts[0][0] + '" y1="' + pts[0][1] + '" x2="' + pts[2][0] + '" y2="' + pts[2][1] + '" stroke="' + FR + '" stroke-width="2.4" stroke-dasharray="5 4"/>';
      s += '<line x1="' + pts[1][0] + '" y1="' + pts[1][1] + '" x2="' + pts[3][0] + '" y2="' + pts[3][1] + '" stroke="' + FR + '" stroke-width="2.4" stroke-dasharray="5 4"/>';
    }
    if (opts.angle) {
      // 左上の 角に 印
      s += '<text x="' + (pts[0][0] + 14) + '" y="' + (pts[0][1] + 22) + '" font-size="15" font-weight="bold" fill="' + FR + '">' + opts.angle + '</text>';
    }
    return svgBox(s);
  }

  /* ---- 長方形・正方形の 面積（ステージ11） ---- */
  function rectSvg(w, h, wLabel, hLabel, mark) {
    const maxW = 112, maxH = 76;
    const sc = Math.min(maxW / w, maxH / h, 14);
    const bw = Math.max(30, w * sc), bh = Math.max(22, h * sc);
    const x = 34, y = 20 + (maxH - bh) / 2;
    let s = '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="4"/>';
    s += '<text x="' + (x + bw / 2) + '" y="' + (y + bh + 20) + '" font-size="13" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + wLabel + '</text>';
    s += '<text x="' + (x - 5) + '" y="' + (y + bh / 2 + 5) + '" font-size="13" text-anchor="end" fill="' + FR + '" font-weight="bold">' + hLabel + '</text>';
    if (mark) s += '<text x="' + (x + bw / 2) + '" y="' + (y + bh / 2 + 7) + '" font-size="20" text-anchor="middle" font-weight="bold" fill="' + FR + '">？</text>';
    return svgBox(s);
  }

  /* ---- L字の 図形（ステージ11） ---- */
  function lShapeSvg(a, b, c, d) {
    // 外わく a×b、右下を c×d だけ 切りとる
    const sc = Math.min(104 / a, 74 / b, 12);
    const W = a * sc, H = b * sc, cw = c * sc, ch = d * sc;
    const x = 28, y = 22;
    const p = [[x, y], [x + W, y], [x + W, y + H - ch], [x + W - cw, y + H - ch], [x + W - cw, y + H], [x, y + H]];
    let s = '<polygon points="' + p.map(function (q) { return q[0] + ',' + q[1]; }).join(' ') + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="4" stroke-linejoin="round"/>';
    // 外の 4つの へんに 長さを 書く（a・b・a−c・b−d）
    s += '<text x="' + (x + W / 2) + '" y="' + (y - 5) + '" font-size="12" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + a + 'cm</text>';
    s += '<text x="' + (x - 4) + '" y="' + (y + H / 2 + 4) + '" font-size="12" text-anchor="end" fill="' + FR + '" font-weight="bold">' + b + 'cm</text>';
    s += '<text x="' + (x + (W - cw) / 2) + '" y="' + (y + H + 14) + '" font-size="12" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + (a - c) + 'cm</text>';
    s += '<text x="' + (x + W + 3) + '" y="' + (y + (H - ch) / 2 + 4) + '" font-size="12" fill="' + FR + '" font-weight="bold">' + (b - d) + 'cm</text>';
    return svgBox(s);
  }

  /* ---- 直方体・立方体と 展開図（ステージ15） ---- */
  function boxSvg(cube, labels) {
    const w = cube ? 62 : 86, h = cube ? 62 : 44, dx = 24, dy = 20;
    const x = 20, y = 34;
    let s = '';
    // 見えない へんは てんせん
    s += '<line x1="' + (x + dx) + '" y1="' + (y - dy) + '" x2="' + (x + dx) + '" y2="' + (y - dy + h) + '" stroke="' + FS + '" stroke-width="2" stroke-dasharray="4 3"/>';
    s += '<line x1="' + (x + dx) + '" y1="' + (y - dy + h) + '" x2="' + x + '" y2="' + (y + h) + '" stroke="' + FS + '" stroke-width="2" stroke-dasharray="4 3"/>';
    s += '<line x1="' + (x + dx) + '" y1="' + (y - dy + h) + '" x2="' + (x + dx + w) + '" y2="' + (y - dy + h) + '" stroke="' + FS + '" stroke-width="2" stroke-dasharray="4 3"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="3.4"/>';
    s += '<polygon points="' + x + ',' + y + ' ' + (x + dx) + ',' + (y - dy) + ' ' + (x + dx + w) + ',' + (y - dy) + ' ' + (x + w) + ',' + y + '" fill="#FFE9A8" stroke="' + FS + '" stroke-width="3.4" stroke-linejoin="round"/>';
    s += '<polygon points="' + (x + w) + ',' + y + ' ' + (x + dx + w) + ',' + (y - dy) + ' ' + (x + dx + w) + ',' + (y - dy + h) + ' ' + (x + w) + ',' + (y + h) + '" fill="#F2D98A" stroke="' + FS + '" stroke-width="3.4" stroke-linejoin="round"/>';
    if (labels) {
      s += '<text x="' + (x + w / 2) + '" y="' + (y + h + 16) + '" font-size="12" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + labels[0] + '</text>';
      s += '<text x="' + (x - 4) + '" y="' + (y + h / 2 + 4) + '" font-size="12" text-anchor="end" fill="' + FR + '" font-weight="bold">' + labels[1] + '</text>';
      s += '<text x="' + (x + w + dx + 3) + '" y="' + (y - dy / 2 + 4) + '" font-size="12" fill="' + FR + '" font-weight="bold">' + labels[2] + '</text>';
    }
    return svgBox(s);
  }

  // 展開図（十字がた・T字がた・だんちがい）
  function netSvg(kind) {
    const u = 26, x0 = 30, y0 = 14;
    const maps = {
      cross: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]],
      tee:   [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3]],
      step:  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
      bad:   [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1]]
    };
    let s = '';
    (maps[kind] || maps.cross).forEach(function (c) {
      s += '<rect x="' + (x0 + c[0] * u) + '" y="' + (y0 + c[1] * u) + '" width="' + u + '" height="' + u + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="2.6"/>';
    });
    return svgBox(s);
  }

  /* ---- 表（ステージ7「整理の しかた」）。HTML の 表 ---- */
  function tableHtml(head, rows) {
    let s = '<table class="tbl"><tr><th></th>';
    head.forEach(function (t) { s += '<th>' + t + '</th>'; });
    s += '</tr>';
    rows.forEach(function (r) {
      s += '<tr><th>' + r[0] + '</th>';
      for (let i = 1; i < r.length; i++) {
        const v = r[i];
        s += (v === '？') ? '<td class="tbl__q">？</td>' : '<td>' + v + '</td>';
      }
      s += '</tr>';
    });
    return s + '</table>';
  }

  /* ---- 見出しの 行が ない 表（ステージ14「かわり方」） ---- */
  function tableRows(rows) {
    let s = '<table class="tbl">';
    rows.forEach(function (r) {
      s += '<tr><th>' + r[0] + '</th>';
      for (let i = 1; i < r.length; i++) s += (r[i] === '？' ? '<td class="tbl__q">？</td>' : '<td>' + r[i] + '</td>');
      s += '</tr>';
    });
    return s + '</table>';
  }

  /* =======================================================
     ステージ1 大きい 数（億・兆）
     ======================================================= */
  function manNum() {
    const man = pf([U.randInt(11, 99), U.randInt(101, 999), U.randInt(1001, 9999)]);
    const low = pf([0, 0, 0, U.randInt(1, 9) * 1000]);
    return man * 10000 + low;
  }
  function okuNum() {
    const oku = U.randInt(1, 9);
    const man = pf([0, U.randInt(1, 99) * 100, U.randInt(1, 9999), U.randInt(1, 9) * 1000]);
    return oku * 100000000 + man * 10000;
  }

  const BIG_UNITS = [
    { q: '1000万を 10こ あつめた 数', a: '1億' , w: ['1000億', '100万', '1兆'] },
    { q: '1億を 10こ あつめた 数',    a: '10億', w: ['1000万', '1兆', '100億'] },
    { q: '1000億を 10こ あつめた 数', a: '1兆' , w: ['1億', '100億', '10兆'] },
    { q: '100万を 10こ あつめた 数',  a: '1000万', w: ['10万', '1億', '100億'] },
    { q: '1億を 10で わった 数',      a: '1000万', w: ['100万', '10億', '1万'] },
    { q: '1兆を 10で わった 数',      a: '1000億', w: ['100億', '10兆', '1億'] }
  ];
  function bigUnitQ() {
    const s = pf(BIG_UNITS);
    return choice('億と 兆', s.q + 'は？', [s.a].concat(s.w), {
      key: 'bu:' + s.q, hint: '位は 一 → 万 → 億 → 兆 と 4けたずつ 上がるよ。',
      note: s.q + 'は ' + s.a
    });
  }

  function kanjiToNumQ(big) {
    const n = big ? okuNum() : manNum();
    return num('漢数字を 数字で', '<span class="num">' + kanjiNum(n) + '</span><br>数字で 書くと？', n, {
      key: 'k2n:' + n, maxLen: 10, scratch: false,
      hint: big ? '億の 下は 8けた。万の 下は 4けた だよ。' : '万の 下は 4けた。ないところは 0 を 書こう。',
      note: kanjiNum(n) + ' = ' + comma(n)
    });
  }

  function numToKanjiQ(big) {
    const n = big ? okuNum() : manNum();
    const cands = [n + 10000, n - 10000, n * 10, Math.floor(n / 10), n + 1000000].filter(function (x) { return x > 0 && x !== n; });
    return choice('数字を 漢数字で', '<span class="num">' + comma(n) + '</span><br>漢数字で 書くと？',
      withDistractors(n, cands, kanjiNum), {
        key: 'n2k:' + n, hint: '右から 4けたずつ 区切って、万・億 を つけよう。',
        note: comma(n) + ' = ' + kanjiNum(n)
      });
  }

  const PLACES4 = [
    { i: 4, name: '一万' }, { i: 5, name: '十万' }, { i: 6, name: '百万' },
    { i: 7, name: '千万' }, { i: 8, name: '一億' }
  ];
  function placeDigitQ() {
    const n = okuNum();
    const p = pf(PLACES4);
    const d = Math.floor(n / Math.pow(10, p.i)) % 10;
    return num('位', '<span class="num">' + comma(n) + '</span><br>' + p.name + 'の 位の 数字は？', d, {
      key: 'pd:' + n + ':' + p.i, scratch: false, maxLen: 1,
      hint: '右から 一・十・百・千・一万・十万・百万・千万・一億 の じゅん。',
      note: comma(n) + ' の ' + p.name + 'の 位は ' + d
    });
  }

  function times10Q() {
    const n = U.randInt(11, 999) * 10000;
    const k = pf([10, 100]);
    return num('10倍・100倍', expr(comma(n), '×', k), n * k, {
      key: 'x10:' + n + ':' + k, maxLen: 11, scratch: false,
      hint: '0を ' + (k === 10 ? '1つ' : '2つ') + ' つけるだけ。位が ' + (k === 10 ? '1つ' : '2つ') + ' 上がるよ。',
      note: comma(n) + ' × ' + k + ' = ' + comma(n * k)
    });
  }
  function div10Q() {
    const n = U.randInt(11, 999) * 100000;
    return num('10で わる', expr(comma(n), '÷', 10), n / 10, {
      key: 'd10:' + n, maxLen: 11, scratch: false,
      hint: '0を 1つ とるだけ。位が 1つ 下がるよ。',
      note: comma(n) + ' ÷ 10 = ' + comma(n / 10)
    });
  }

  function bigLineQ() {
    const max = pf([100000000, 10000000]);
    const div = 10, mark = U.randInt(1, 9);
    const val = max / div * mark;
    const fmt = function (v) {
      if (v === 0) return '0';
      if (v === 100000000) return '1億';
      return (v / 10000) + '万';
    };
    const cands = [val * 10, val / 10, val + max / div, val - max / div, val * 2].filter(function (x) { return x > 0 && x !== val && x % 10000 === 0; });
    return choice('数直線', numLine(max, div, mark, 5, fmt) + '↓ の 目もりの 数は？',
      withDistractors(val, cands, function (v) { return v >= 100000000 ? (v / 100000000) + '億' : comma(v / 10000) + '万'; }), {
        key: 'bl:' + max + ':' + mark,
        hint: '0 から ' + fmt(max) + ' までを 10等分。1目もりは ' + fmt(max / div) + '。',
        note: '↓ は ' + comma(val)
      });
  }

  function compareBigQ() {
    let a = okuNum(), b = okuNum();
    while (a === b) b = okuNum();
    return choice('大きさくらべ', '<span class="num">' + comma(a) + '</span><br><span class="num">' + comma(b) + '</span><br>大きいのは？',
      [comma(Math.max(a, b)), comma(Math.min(a, b))], {
        key: 'cmp:' + a + ':' + b, hint: 'けたの 数を くらべて、同じなら 上の 位から くらべよう。',
        note: comma(Math.max(a, b)) + ' の ほうが 大きい'
      });
  }

  function countOfQ() {
    const unit = pf([10000, 1000000, 10000000, 100000000]);
    const k = U.randInt(2, 99);
    const uname = unit === 10000 ? '1万' : unit === 1000000 ? '100万' : unit === 10000000 ? '1000万' : '1億';
    return num('いくつ分', '<span class="num">' + comma(unit * k) + '</span> は<br>' + uname + 'を 何こ あつめた 数？', k, {
      key: 'co:' + unit + ':' + k, scratch: false, maxLen: 3,
      hint: uname + 'の いくつ分か 考えよう。上の 位を 見れば わかるよ。',
      note: comma(unit * k) + ' は ' + uname + 'の ' + k + 'こ分'
    });
  }

  const BIG_TIMES = [
    { q: '1億は 1万の 何倍？', a: 10000 },
    { q: '1兆は 1億の 何倍？', a: 10000 },
    { q: '1億は 1000万の 何倍？', a: 10 },
    { q: '1兆は 1000億の 何倍？', a: 10 },
    { q: '1億は 100万の 何倍？', a: 100 },
    { q: '1000万は 1万の 何倍？', a: 1000 }
  ];
  function bigTimesQ() {
    const s = pf(BIG_TIMES);
    return choice('位の しくみ', s.q, withDistractors(s.a, [10, 100, 1000, 10000, 100000], comma), {
      key: 'bt:' + s.q, hint: '位は 4けたごとに 万・億・兆 と 上がるよ。',
      note: s.q.replace('何倍？', comma(s.a) + '倍')
    });
  }

  function unitAddQ() {
    const u = pf(['億', '万', '兆']);
    const a = U.randInt(2, 9), b = U.randInt(1, 9);
    const plus = Math.random() < 0.5 || a <= b;
    const ans = plus ? a + b : a - b;
    return num('大きい数の 計算', '<span class="num">' + a + u + ' ' + (plus ? '+' : '−') + ' ' + b + u + '</span> = □' + u + '<br>□に 入る 数は？', ans, {
      key: 'ua:' + u + ':' + a + (plus ? '+' : '-') + b, scratch: false, maxLen: 2,
      hint: u + 'の いくつ分 かで 考えよう。' + a + ' ' + (plus ? '+' : '−') + ' ' + b + ' だね。',
      note: a + u + (plus ? ' + ' : ' − ') + b + u + ' = ' + ans + u
    });
  }

  function wordBigQ() {
    const n = okuNum();
    const w = pf([
      ['ある 国の 人口は ' + kanjiNum(n) + '人です。', '人口'],
      ['きょ年 この 港に とどいた にもつは ' + kanjiNum(n) + 'こでした。', 'にもつの 数'],
      ['ある 会社の 1年の 売り上げは ' + kanjiNum(n) + '円です。', '売り上げ']
    ]);
    return num('大きい数の 文しょうだい', w[0] + '<br>' + w[1] + 'を 数字で 書くと？', n, {
      key: 'wb:' + n + ':' + w[1], maxLen: 10, scratch: false,
      hint: '億の 下は 8けた、万の 下は 4けた。ないところは 0。',
      note: kanjiNum(n) + ' = ' + comma(n)
    });
  }

  const stage1 = {
    easy: [bigUnitQ, function () { return kanjiToNumQ(false); }, function () { return numToKanjiQ(false); }, placeDigitQ],
    normal: [times10Q, div10Q, bigLineQ, compareBigQ, function () { return numToKanjiQ(true); }],
    hard: [countOfQ, bigTimesQ, unitAddQ, function () { return kanjiToNumQ(true); }],
    boss: [wordBigQ, countOfQ, function () { return numToKanjiQ(true); }, bigTimesQ]
  };

  /* =======================================================
     ステージ2 おれ線グラフ
     ======================================================= */
  const GRAPH4 = [
    { title: '1日の 気温', unit: '度', what: '気温', hi: '高い', lo: 'ひくい',
      labels: ['9時', '10時', '11時', '12時', '1時', '2時', '3時'], base: 0, step: 2, kLo: 3, kHi: 10 },
    { title: '1年の 気温', unit: '度', what: '気温', hi: '高い', lo: 'ひくい',
      labels: ['4月', '5月', '6月', '7月', '8月', '9月', '10月'], base: 0, step: 3, kLo: 4, kHi: 10 },
    { title: '本を かりた 数', unit: 'さつ', what: 'かりた 数', hi: '多い', lo: '少ない',
      labels: ['4月', '5月', '6月', '7月', '8月', '9月'], base: 0, step: 10, kLo: 2, kHi: 9 },
    { title: '図書室に 来た 人', unit: '人', what: '来た 人の 数', hi: '多い', lo: '少ない',
      labels: ['月', '火', '水', '木', '金'], base: 0, step: 5, kLo: 2, kHi: 10 }
  ];

  function graphData(tries) {
    const set = pf(GRAPH4);
    const ks = [];
    for (let i = 0; i < set.labels.length; i++) ks.push(U.randInt(set.kLo, set.kHi));
    const mx = Math.max.apply(null, ks), mn = Math.min.apply(null, ks);
    const okMax = ks.filter(function (k) { return k === mx; }).length === 1;
    const okMin = ks.filter(function (k) { return k === mn; }).length === 1;
    if ((!okMax || !okMin || mx - mn < 3) && (tries || 0) < 20) return graphData((tries || 0) + 1);
    const values = ks.map(function (k) { return set.base + set.step * k; });
    return { set: set, values: values, svg: lineGraphSvg(set, values), sig: values.join('-') };
  }
  function gKey(tag, g, extra) { return tag + ':' + g.set.title + ':' + g.sig + (extra != null ? ':' + extra : ''); }

  function readPointQ() {
    const g = graphData(), i = U.randInt(0, g.values.length - 1);
    return num('グラフを 読む', g.svg + g.set.labels[i] + 'は 何' + g.set.unit + '？', g.values[i], {
      key: gKey('gr', g, i), scratch: false, maxLen: 4,
      hint: 'たてじくの 1目もりは ' + g.set.step + g.set.unit + '。点の 高さを 読もう。',
      note: g.set.labels[i] + ' は ' + g.values[i] + g.set.unit
    });
  }

  function peakQ(low) {
    const g = graphData();
    const target = low ? Math.min.apply(null, g.values) : Math.max.apply(null, g.values);
    const idx = g.values.indexOf(target);
    const others = g.set.labels.filter(function (l, i) { return i !== idx; });
    return choice('グラフを 読む', g.svg + 'いちばん ' + (low ? g.set.lo : g.set.hi) + 'のは？',
      [g.set.labels[idx]].concat(U.shuffle(others).slice(0, 3)), {
        key: gKey(low ? 'glo' : 'ghi', g), hint: '点の 高さを くらべよう。',
        note: g.set.labels[idx] + '（' + target + g.set.unit + '）'
      });
  }

  function scaleQ() {
    const g = graphData();
    return num('グラフの 目もり', g.svg + 'たてじくの 1目もりは 何' + g.set.unit + '？', g.set.step, {
      key: gKey('gs', g), scratch: false, maxLen: 3,
      hint: '数字と 数字の あいだが 2目もり だよ。',
      note: '1目もりは ' + g.set.step + g.set.unit
    });
  }

  function diffQ(far) {
    const g = graphData();
    const n = g.values.length;
    let i = 0, j = 1;
    for (let t = 0; t < 30; t++) {
      i = U.randInt(0, n - 2);
      j = far ? U.randInt(Math.min(i + 2, n - 1), n - 1) : i + 1;
      if (g.values[i] !== g.values[j]) break;
    }
    if (g.values[i] === g.values[j]) return diffQ(far);
    const d = Math.abs(g.values[i] - g.values[j]);
    return num('ちがいを 読む', g.svg + g.set.labels[i] + 'と ' + g.set.labels[j] + 'の ちがいは？', d, {
      key: gKey('gd', g, i + '-' + j), scratch: false, maxLen: 4,
      hint: g.set.labels[i] + ' は ' + g.values[i] + g.set.unit + '、' + g.set.labels[j] + ' は ' + g.values[j] + g.set.unit + '。ひき算だよ。',
      note: Math.max(g.values[i], g.values[j]) + ' − ' + Math.min(g.values[i], g.values[j]) + ' = ' + d + g.set.unit
    });
  }

  function riseQ(tries) {
    const g = graphData();
    let best = -1, bi = 0, tie = false;
    for (let i = 0; i + 1 < g.values.length; i++) {
      const d = Math.abs(g.values[i + 1] - g.values[i]);
      if (d > best) { best = d; bi = i; tie = false; } else if (d === best) tie = true;
    }
    if (tie && (tries || 0) < 20) return riseQ((tries || 0) + 1);
    const label = g.set.labels[bi] + ' 〜 ' + g.set.labels[bi + 1];
    const cands = [];
    for (let i = 0; i + 1 < g.values.length; i++) if (i !== bi) cands.push(g.set.labels[i] + ' 〜 ' + g.set.labels[i + 1]);
    return choice('かわり方', g.svg + 'いちばん 大きく かわったのは？',
      [label].concat(U.shuffle(cands).slice(0, 3)), {
        key: gKey('gu', g), hint: '線の かたむきが いちばん 急な ところだよ。',
        note: label + '（' + best + g.set.unit + ' かわった）'
      });
  }

  function downQ(tries) {
    const g = graphData();
    const downs = [], ups = [];
    for (let i = 0; i + 1 < g.values.length; i++) {
      const lb = g.set.labels[i] + ' 〜 ' + g.set.labels[i + 1];
      (g.values[i + 1] < g.values[i] ? downs : ups).push(lb);
    }
    if ((!downs.length || !ups.length) && (tries || 0) < 20) return downQ((tries || 0) + 1);
    if (!downs.length || !ups.length) return riseQ();
    const ans = pf(downs);
    return choice('ふえた・へった', g.svg + 'へって いるのは どこ？',
      [ans].concat(U.shuffle(ups).slice(0, 3)), {
        key: gKey('gdn', g, ans), hint: '線が 右下がりの ところを さがそう。',
        note: ans + ' で へって いる'
      });
  }

  const GRAPH_KIND = [
    { q: '気温の かわり方を しらべるには、どの グラフが よい？', a: 'おれ線グラフ', w: ['ぼうグラフ', '表だけ', '数直線'] },
    { q: 'クラスごとの 人数を くらべるには、どの グラフが よい？', a: 'ぼうグラフ', w: ['おれ線グラフ', '数直線', '地図'] },
    { q: 'おれ線グラフで 線が 右上がりの とき、どうなって いる？', a: 'ふえて いる', w: ['へって いる', 'かわらない', '0に なった'] },
    { q: 'おれ線グラフで 線が 右下がりの とき、どうなって いる？', a: 'へって いる', w: ['ふえて いる', 'かわらない', '2ばいに なった'] },
    { q: 'おれ線グラフで 線の かたむきが 急な ところは？', a: 'かわり方が 大きい', w: ['かわり方が 小さい', 'かわって いない', '目もりが 大きい'] },
    { q: 'おれ線グラフで 線が よこに まっすぐの ところは？', a: 'かわって いない', w: ['ふえて いる', 'へって いる', '0に なった'] },
    { q: 'おれ線グラフの よこじくには ふつう 何を とる？', a: '時こくや 月', w: ['気温', '人数', 'ねだん'] }
  ];
  function graphKindQ() {
    const s = pf(GRAPH_KIND);
    return choice('グラフの えらび方', s.q, [s.a].concat(s.w), {
      key: 'gk:' + s.q, hint: 'おれ線グラフは「かわり方」、ぼうグラフは「大きさくらべ」。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }

  const stage2 = {
    easy: [readPointQ, function () { return peakQ(false); }, function () { return peakQ(true); }, scaleQ],
    normal: [function () { return diffQ(false); }, graphKindQ, readPointQ, function () { return peakQ(false); }],
    hard: [riseQ, downQ, function () { return diffQ(true); }, graphKindQ],
    boss: [riseQ, function () { return diffQ(true); }, downQ, graphKindQ]
  };

  /* =======================================================
     ステージ3 わり算の 筆算（1）… 1けたで わる
     ======================================================= */
  function divMentalQ() {
    const b = U.randInt(2, 9);
    const q = U.randInt(2, 9);
    const a = b * q * 10;
    return num('何十の わり算', expr(a, '÷', b), q * 10, {
      key: 'dm:' + a + ':' + b, scratch: false, maxLen: 3,
      hint: '10の たばで 考えよう。' + (b * q) + ' ÷ ' + b + ' = ' + q + ' だから 10ばい。',
      note: a + ' ÷ ' + b + ' = ' + (q * 10)
    });
  }
  function divExactQ(dig) {
    const b = dig === 2 ? U.randInt(2, 7) : U.randInt(2, 9);
    let q;
    if (dig === 2) q = U.randInt(11, Math.floor(99 / b));
    else q = U.randInt(Math.ceil(100 / b), Math.floor(999 / b));
    const a = q * b;
    return num('わり算の 筆算', expr(a, '÷', b), q, {
      key: 'de:' + a + ':' + b, maxLen: 3,
      hint: '上の 位から じゅんに わっていこう。',
      note: a + ' ÷ ' + b + ' = ' + q
    });
  }
  function divRemQ(dig) {
    const b = U.randInt(3, 9);
    let a;
    do { a = dig === 2 ? U.randInt(20, 99) : U.randInt(100, 999); } while (a % b === 0 || Math.floor(a / b) < 10);
    return divrem('あまりの ある わり算', a, b, {
      key: 'dr:' + a + ':' + b,
      hint: '上の 位から わって、さいごに のこった 数が あまり。あまりは ' + b + ' より 小さいよ。',
      note: a + ' ÷ ' + b + ' = ' + Math.floor(a / b) + ' あまり ' + (a % b)
    });
  }
  function divZeroQ() {
    const b = U.randInt(2, 4);
    const x = U.randInt(1, Math.floor(9 / b));
    const z = U.randInt(1, 9);
    const q = x * 100 + z;
    const a = q * b;
    if (a > 999) return divZeroQ();
    return num('商に 0が 立つ わり算', expr(a, '÷', b), q, {
      key: 'dz:' + a + ':' + b, maxLen: 3,
      hint: '十の 位で われない ときは、商に 0 を 書いて つぎの 位へ。',
      note: a + ' ÷ ' + b + ' = ' + q + '（十の 位は 0）'
    });
  }
  function divCheckQ() {
    const b = U.randInt(3, 9);
    const q = U.randInt(11, 99);
    const r = U.randInt(1, b - 1);
    return num('たしかめの 式', '<span class="num">□ ÷ ' + b + ' = ' + q + ' あまり ' + r + '</span><br>□に 入る 数は？', q * b + r, {
      key: 'dc:' + b + ':' + q + ':' + r, maxLen: 4,
      hint: 'わる数 × 商 + あまり = わられる数。' + b + ' × ' + q + ' + ' + r + '。',
      note: b + ' × ' + q + ' + ' + r + ' = ' + (q * b + r)
    });
  }
  function divWordQ(rem) {
    const b = U.randInt(3, 8);
    const q = U.randInt(12, 99);
    const r = rem ? U.randInt(1, b - 1) : 0;
    const a = q * b + r;
    if (a > 999) return divWordQ(rem);
    const w = pf([
      ['<b>' + a + '</b>まいの 色紙を <b>' + b + '</b>人で 同じ 数ずつ 分けます。1人分は 何まい？', q],
      ['<b>' + a + '</b>この あめを <b>' + b + '</b>こずつ ふくろに 入れます。ふくろは 何ふくろ できる？', q],
      ['<b>' + a + '</b>cmの リボンを <b>' + b + '</b>cmずつ 切ります。何本 とれる？', q],
      ['<b>' + a + '</b>ページの 本を 1日 <b>' + b + '</b>ページずつ 読みます。何日 かかる？', rem ? q + 1 : q]
    ]);
    return num('わり算の 文しょうだい', w[0] + (rem ? '' : ''), w[1], {
      key: 'dw:' + a + ':' + b + ':' + w[1],
      maxLen: 4,
      hint: a + ' ÷ ' + b + ' を 筆算で。' + (rem ? 'あまりが 出るよ。答えに あまりを 入れるか よく 考えよう。' : ''),
      note: a + ' ÷ ' + b + ' = ' + q + (r ? ' あまり ' + r : '') + ' → 答えは ' + w[1]
    });
  }

  const stage3 = {
    easy: [divMentalQ, function () { return divExactQ(2); }, function () { return divRemQ(2); }],
    normal: [function () { return divExactQ(3); }, function () { return divRemQ(2); }, divCheckQ, function () { return divWordQ(false); }],
    hard: [function () { return divRemQ(3); }, divZeroQ, function () { return divExactQ(3); }, divCheckQ],
    boss: [function () { return divWordQ(true); }, function () { return divRemQ(3); }, divZeroQ, divCheckQ]
  };

  /* =======================================================
     ステージ4 角の 大きさ
     ======================================================= */
  const ANGLE_FACT = [
    { q: '直角は 何度？', a: 90 },
    { q: '2直角（半回転）は 何度？', a: 180 },
    { q: '4直角（1回転）は 何度？', a: 360 },
    { q: '3直角は 何度？', a: 270 },
    { q: '1回転は 直角の 何こ分？', a: 4 },
    { q: '半回転は 直角の 何こ分？', a: 2 }
  ];
  function angleFactQ() {
    const s = pf(ANGLE_FACT);
    return num('角の 大きさ', s.q, s.a, {
      key: 'af:' + s.q, scratch: false, maxLen: 3,
      hint: '直角は 90度。90度ずつ ふえて いくよ。',
      note: s.q.replace('何度？', s.a + '度').replace('何こ分？', s.a + 'こ分')
    });
  }

  const ANG_SMALL = [30, 40, 45, 50, 60, 70, 80];
  const ANG_BIG = [100, 110, 120, 130, 135, 140, 150, 160];
  function readAngleQ(big) {
    const d = pf(big ? ANG_BIG : ANG_SMALL);
    return num('分どきで はかる', protractorSvg(d) + '？の 角は 何度？', d, {
      key: 'ra:' + d, scratch: false, maxLen: 3,
      hint: '0の 目もりから ' + (big ? '左' : '右') + 'まわりに 数えよう。' + (big ? '直角（90度）より 大きいね。' : '直角（90度）より 小さいね。'),
      note: '？ は ' + d + '度'
    });
  }
  function outerAngleQ() {
    const d = pf([30, 45, 60, 70, 80, 100, 120, 135, 150]);
    return num('180度より 大きい 角', figQ('小さい 角が <b>' + d + '度</b>。？は 何度？', angleSvg(d, true)), 360 - d, {
      key: 'oa:' + d, scratch: false, maxLen: 3,
      hint: '小さい ほうの 角は ' + d + '度。1回転は 360度だから、360 − ' + d + '。',
      note: '360 − ' + d + ' = ' + (360 - d) + '度'
    });
  }
  function straightQ() {
    const d = pf([25, 35, 40, 55, 65, 70, 110, 125, 140]);
    return num('一直線の 角', figQ('一直線の 上の 角。？は 何度？', straightSvg(d)), 180 - d, {
      key: 'sa:' + d, scratch: false, maxLen: 3,
      hint: '一直線は 180度。180 − ' + d + ' だよ。',
      note: '180 − ' + d + ' = ' + (180 - d) + '度'
    });
  }

  const TRI_FACT = [
    { q: '三角じょうぎの 1つは 90度・60度・□度。□は？', a: 30 },
    { q: '三角じょうぎの 1つは 90度・45度・□度。□は？', a: 45 },
    { q: '30度・60度・90度の 三角じょうぎ。いちばん 大きい 角は 何度？', a: 90 },
    { q: '45度の 角と 30度の 角を 合わせると 何度？', a: 75 },
    { q: '45度の 角と 60度の 角を 合わせると 何度？', a: 105 },
    { q: '90度の 角と 45度の 角を 合わせると 何度？', a: 135 },
    { q: '60度の 角から 45度の 角を ひくと 何度？', a: 15 },
    { q: '90度の 角から 30度の 角を ひくと 何度？', a: 60 },
    { q: '90度の 角から 45度の 角を ひくと 何度？', a: 45 },
    { q: '60度の 角と 60度の 角を 合わせると 何度？', a: 120 }
  ];
  function triFactQ() {
    const s = pf(TRI_FACT);
    return num('三角じょうぎの 角', s.q, s.a, {
      key: 'tf:' + s.q, scratch: false, maxLen: 3,
      hint: '三角じょうぎの 角は 90・60・30 と 90・45・45。',
      note: s.q.replace('□は？', '□は ' + s.a).replace('何度？', s.a + '度')
    });
  }

  const ANGLE_WORD = [
    { q: '時計の 長い はりは 1時間で 1回転します。15分では 何度 回る？', a: 90 },
    { q: '時計の 長い はりは 1時間で 1回転します。30分では 何度 回る？', a: 180 },
    { q: '時計の 長い はりは 1時間で 1回転します。20分では 何度 回る？', a: 120 },
    { q: '時計の 長い はりは 1時間で 1回転します。45分では 何度 回る？', a: 270 },
    { q: '正方形の 4つの 角を ぜんぶ 合わせると 何度？', a: 360 },
    { q: '長方形の 1つの 角は 何度？', a: 90 },
    { q: '半回転して、さらに 直角ぶん 回ると 何度 回った？', a: 270 }
  ];
  function angleWordQ() {
    const s = pf(ANGLE_WORD);
    return num('角の 文しょうだい', s.q, s.a, {
      key: 'aw:' + s.q, scratch: true, maxLen: 3,
      hint: '1回転は 360度、半回転は 180度、直角は 90度。',
      note: s.q.replace('何度 回る？', s.a + '度').replace('何度？', s.a + '度').replace('何度 回った？', s.a + '度')
    });
  }

  const stage4 = {
    easy: [angleFactQ, function () { return readAngleQ(false); }, triFactQ],
    normal: [function () { return readAngleQ(true); }, triFactQ, straightQ, angleFactQ],
    hard: [outerAngleQ, straightQ, angleWordQ, function () { return readAngleQ(true); }],
    boss: [outerAngleQ, straightQ, angleWordQ, triFactQ]
  };

  /* =======================================================
     ステージ5 小数（1/100・1/1000の 位）
     ======================================================= */
  function hun() { return U.randInt(101, 999); }     // 1.01 〜 9.99 の 100ばい

  const DEC_PLACES = [
    { i: 100, name: '一' }, { i: 10, name: '小数第一' }, { i: 1, name: '小数第二' }
  ];
  function decPlaceQ() {
    const t = hun(), p = pf(DEC_PLACES);
    const d = Math.floor(t / p.i) % 10;
    return num('小数の 位', '<span class="num">' + fx(t / 100) + '</span><br>' + p.name + '位の 数字は？', d, {
      key: 'dp:' + t + ':' + p.i, scratch: false, maxLen: 1,
      hint: '小数点の 左が 一の位。右へ 小数第一位・小数第二位 と つづくよ。',
      note: fx(t / 100) + ' の ' + p.name + '位は ' + d
    });
  }
  function decCountQ() {
    const kind = pf([10, 100, 1000]);
    const k = U.randInt(11, 99) * (kind === 1000 ? 1 : 1);
    const one = kind === 10 ? '0.1' : kind === 100 ? '0.01' : '0.001';
    return dec('小数の しくみ', one + ' を ' + k + 'こ あつめた 数は？', k / kind, {
      key: 'dcnt:' + kind + ':' + k, scratch: false,
      hint: one + 'の ' + k + 'こ分。位を 1つ 上げて 考えよう。',
      note: one + ' × ' + k + ' = ' + fx(k / kind)
    });
  }
  function decMakeQ() {
    const a = U.randInt(1, 9), b = U.randInt(0, 9), c = U.randInt(1, 9);
    return dec('小数の しくみ', '1を ' + a + 'こ、0.1を ' + b + 'こ、0.01を ' + c + 'こ<br>合わせた 数は？', (a * 100 + b * 10 + c) / 100, {
      key: 'dmk:' + a + b + c, scratch: false,
      hint: '一の位が ' + a + '、小数第一位が ' + b + '、小数第二位が ' + c + '。',
      note: '答えは ' + fx((a * 100 + b * 10 + c) / 100)
    });
  }

  const DEC_UNITS = [
    { t: 'cm', to: 'm',  div: 100,  max: 99,  one: '1cm = 0.01m' },
    { t: 'mm', to: 'cm', div: 10,   max: 9,   one: '1mm = 0.1cm' },
    { t: 'm',  to: 'km', div: 1000, max: 999, one: '1m = 0.001km' },
    { t: 'dL', to: 'L',  div: 10,   max: 9,   one: '1dL = 0.1L' },
    { t: 'g',  to: 'kg', div: 1000, max: 999, one: '1g = 0.001kg' },
    { t: 'mm', to: 'm',  div: 1000, max: 999, one: '1mm = 0.001m' }
  ];
  function decUnitQ() {
    const s = pf(DEC_UNITS);
    const k = U.randInt(2, s.max);
    return dec('小数と 単位', '<span class="num">' + k + s.t + '</span> は 何' + s.to + '？', k / s.div, {
      key: 'du:' + s.t + s.to + ':' + k, scratch: false,
      hint: s.one + ' だよ。', note: k + s.t + ' = ' + fx(k / s.div) + s.to
    });
  }

  function decLineQ() {
    const mark = U.randInt(1, 9);
    const val = mark / 10;
    const cands = [val * 10, val / 10, (mark + 1) / 10, (mark - 1) / 10, val + 1].filter(function (x) { return x > 0 && Math.abs(x - val) > 1e-9; });
    return choice('小数の 数直線', numLine(1, 10, mark, 5, function (v) { return v === 0 ? '0' : String(v); }) + '↓ の 目もりの 数は？',
      withDistractors(val, cands, function (v) { return fx(v); }), {
        key: 'dl:' + mark, hint: '0 から 1 までを 10等分。1目もりは 0.1。',
        note: '↓ は ' + fx(val)
      });
  }

  function decAddQ() {
    const a = hun(), b = U.randInt(101, 999 - 0);
    return dec('小数の たし算', expr(fx(a / 100), '+', fx(b / 100)), (a + b) / 100, {
      key: 'da:' + a + ':' + b, layout: 'vertical', a: fx(a / 100), b: fx(b / 100), sign: '+',
      hint: '小数点を そろえて 筆算。0.01 が ' + a + 'こ と ' + b + 'こ。',
      note: fx(a / 100) + ' + ' + fx(b / 100) + ' = ' + fx((a + b) / 100)
    });
  }
  function decSubQ(borrow) {
    let a, b, t = 0;
    do {
      a = U.randInt(200, 999); b = U.randInt(101, 899); t++;
    } while (t < 40 && (a <= b || (borrow ? (a % 100) >= (b % 100) : (a % 100) < (b % 100))));
    if (a <= b) { const x = a; a = b + 10; b = x; }
    return dec('小数の ひき算', expr(fx(a / 100), '−', fx(b / 100)), (a - b) / 100, {
      key: 'ds:' + a + ':' + b, layout: 'vertical', a: fx(a / 100), b: fx(b / 100), sign: '−',
      hint: '小数点を そろえて 筆算。' + (borrow ? 'くり下がりに 気を つけて。' : ''),
      note: fx(a / 100) + ' − ' + fx(b / 100) + ' = ' + fx((a - b) / 100)
    });
  }

  function decCompareQ() {
    let a = hun(), b = hun();
    while (a === b) b = hun();
    return choice('小数の 大きさ', '<span class="num">' + fx(a / 100) + '</span> と <span class="num">' + fx(b / 100) + '</span><br>大きいのは？',
      [fx(Math.max(a, b) / 100), fx(Math.min(a, b) / 100)], {
        key: 'dcmp:' + a + ':' + b, hint: '上の 位（一の位）から じゅんに くらべよう。',
        note: fx(Math.max(a, b) / 100) + ' の ほうが 大きい'
      });
  }

  function decX10Q() {
    const t = hun();
    const up = Math.random() < 0.5;
    return dec('10倍・10分の1', '<span class="num">' + fx(t / 100) + '</span> を ' + (up ? '10倍 すると？' : '10分の1に すると？'), up ? t / 10 : t / 1000, {
      key: 'dx:' + t + ':' + (up ? 'u' : 'd'), scratch: false,
      hint: up ? '小数点が 右へ 1つ うごくよ。' : '小数点が 左へ 1つ うごくよ。',
      note: fx(t / 100) + (up ? ' × 10 = ' : ' ÷ 10 = ') + fx(up ? t / 10 : t / 1000)
    });
  }

  function decWordQ() {
    const a = U.randInt(200, 900), b = U.randInt(101, 199);
    const w = pf([
      ['リボンが <b>' + fx(a / 100) + '</b>m あります。<b>' + fx(b / 100) + '</b>m 使いました。のこりは 何m？', (a - b) / 100, 'm'],
      ['水が <b>' + fx(a / 100) + '</b>L あります。<b>' + fx(b / 100) + '</b>L たすと 何L？', (a + b) / 100, 'L'],
      ['さとうが <b>' + fx(a / 100) + '</b>kg、しおが <b>' + fx(b / 100) + '</b>kg あります。合わせて 何kg？', (a + b) / 100, 'kg'],
      ['ひもが <b>' + fx(a / 100) + '</b>m あります。<b>' + fx(b / 100) + '</b>m 短い ひもは 何m？', (a - b) / 100, 'm']
    ]);
    return dec('小数の 文しょうだい', w[0], w[1], {
      key: 'dw4:' + a + ':' + b + ':' + w[2] + ':' + w[1],
      hint: '小数点を そろえて 筆算しよう。',
      note: '答えは ' + fx(w[1]) + w[2]
    });
  }

  const stage5 = {
    easy: [decPlaceQ, decCountQ, decUnitQ, decLineQ],
    normal: [decAddQ, function () { return decSubQ(false); }, decCompareQ, decMakeQ],
    hard: [decX10Q, function () { return decSubQ(true); }, decUnitQ, decMakeQ],
    boss: [decWordQ, decX10Q, decAddQ, function () { return decSubQ(true); }]
  };

  /* =======================================================
     ステージ6 わり算の 筆算（2）… 2けたで わる
     ======================================================= */
  function div2MentalQ() {
    const b = U.randInt(2, 9), q = U.randInt(2, 9);
    return num('何十で わる', expr(b * q * 10, '÷', b * 10), q, {
      key: 'd2m:' + b + ':' + q, scratch: false, maxLen: 2,
      hint: '10の たばで 考えよう。' + (b * q) + ' ÷ ' + b + ' と 同じ 答えだよ。',
      note: (b * q * 10) + ' ÷ ' + (b * 10) + ' = ' + q
    });
  }
  function div2ExactQ(two) {
    const b = U.randInt(12, 48);
    const q = two ? U.randInt(11, Math.floor(999 / b)) : U.randInt(2, 9);
    const a = b * q;
    if (a > 999 || a < 100) return div2ExactQ(two);
    return num('2けたで わる 筆算', expr(a, '÷', b), q, {
      key: 'd2e:' + a + ':' + b, maxLen: 3,
      hint: b + ' を 何十と 見て 見当を つけよう（' + Math.round(b / 10) * 10 + ' くらい）。',
      note: a + ' ÷ ' + b + ' = ' + q
    });
  }
  function div2RemQ(three) {
    const b = U.randInt(12, 48);
    let a, t = 0;
    do { a = three ? U.randInt(100, 999) : U.randInt(b + 1, 99); t++; } while (t < 60 && (a % b === 0 || a < b));
    if (a % b === 0) a = a + 1;
    return divrem('2けたで わる（あまり）', a, b, {
      key: 'd2r:' + a + ':' + b,
      hint: 'あまりは わる数（' + b + '）より 小さく なるよ。',
      note: a + ' ÷ ' + b + ' = ' + Math.floor(a / b) + ' あまり ' + (a % b)
    });
  }
  const DIV2_RULE = [
    { q: 'わられる数と わる数を 同じ 数で わると、商は どう なる？', a: 'かわらない', w: ['半分に なる', '2ばいに なる', '0に なる'] },
    { q: 'わられる数と わる数を 同じ 数で かけると、商は どう なる？', a: 'かわらない', w: ['2ばいに なる', '半分に なる', '大きく なる'] },
    { q: '900 ÷ 300 は、9 ÷ 3 と 同じ 答え？', a: '同じ', w: ['ちがう', '10ばい', '100ばい'] },
    { q: '240 ÷ 60 を かんたんに すると？', a: '24 ÷ 6', w: ['24 ÷ 60', '240 ÷ 6', '2 ÷ 6'] },
    { q: 'あまりの ある わり算で、あまりは わる数と くらべて？', a: 'かならず 小さい', w: ['かならず 大きい', '同じ', 'きまりは ない'] },
    { q: '156 ÷ 26 の 商の 見当を つけるには？', a: '150 ÷ 30 と 考える', w: ['100 ÷ 20 と 考える', '156 × 26 と 考える', '156 + 26 と 考える'] }
  ];
  function div2RuleQ() {
    const s = pf(DIV2_RULE);
    return choice('わり算の きまり', s.q, [s.a].concat(s.w), {
      key: 'd2k:' + s.q, hint: 'わられる数と わる数を 同じ 数で かけたり わったり しても 商は かわらないよ。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }
  function div2WordQ() {
    const b = U.randInt(12, 45), q = U.randInt(11, 40);
    const r = pf([0, U.randInt(1, b - 1)]);
    const a = b * q + r;
    if (a > 999) return div2WordQ();
    const w = pf([
      ['<b>' + a + '</b>この みかんを <b>' + b + '</b>こずつ 箱に 入れます。箱は 何箱 いる？', r ? q + 1 : q],
      ['<b>' + a + '</b>人が <b>' + b + '</b>人ずつ グループに なります。グループは いくつ できる？', q],
      ['<b>' + a + '</b>円で <b>' + b + '</b>円の えんぴつを 買います。何本 買える？', q],
      ['<b>' + a + '</b>cmの テープを <b>' + b + '</b>cmずつ 切ります。何本 とれる？', q]
    ]);
    return num('わり算の 文しょうだい', w[0], w[1], {
      key: 'd2w:' + a + ':' + b + ':' + w[1], maxLen: 3,
      hint: a + ' ÷ ' + b + ' を 筆算で。' + (r ? 'あまりを どう するか 考えよう。' : ''),
      note: a + ' ÷ ' + b + ' = ' + q + (r ? ' あまり ' + r : '') + ' → 答えは ' + w[1]
    });
  }

  const stage6 = {
    easy: [div2MentalQ, function () { return div2ExactQ(false); }, div2RuleQ],
    normal: [function () { return div2ExactQ(false); }, function () { return div2RemQ(false); }, div2RuleQ, function () { return div2RemQ(true); }],
    hard: [function () { return div2ExactQ(true); }, function () { return div2RemQ(true); }, div2WordQ, div2RuleQ],
    boss: [div2WordQ, function () { return div2ExactQ(true); }, function () { return div2RemQ(true); }, div2RuleQ]
  };

  /* =======================================================
     ステージ7 整理の しかた（2つの ことがらの 表）
     ======================================================= */
  const TBL_SETS = [
    { title: 'けがの しらべ', unit: '人', rows: ['校てい', '体育かん'], cols: ['すりきず', 'うちみ'] },
    { title: '本の かしだし', unit: 'さつ', rows: ['月よう日', '火よう日'], cols: ['ものがたり', 'ずかん'] },
    { title: 'すきな あそび', unit: '人', rows: ['1組', '2組'], cols: ['サッカー', 'なわとび'] },
    { title: '生きもの しらべ', unit: '人', rows: ['犬 いる', '犬 いない'], cols: ['ねこ いる', 'ねこ いない'], both: true }
  ];
  function tblData(only) {
    const set = only || pf(TBL_SETS);
    const v = [[U.randInt(3, 19), U.randInt(3, 19)], [U.randInt(3, 19), U.randInt(3, 19)]];
    const rt = [v[0][0] + v[0][1], v[1][0] + v[1][1]];
    const ct = [v[0][0] + v[1][0], v[0][1] + v[1][1]];
    const all = rt[0] + rt[1];
    return { set: set, v: v, rt: rt, ct: ct, all: all, sig: v[0].join(',') + '/' + v[1].join(',') };
  }
  function tblHtml(d, blank, noTot) {
    const g = function (r, c) { return (blank && blank[0] === r && blank[1] === c) ? '？' : String(d.v[r][c]); };
    const rt = function (r) { return (blank && blank[0] === r && blank[1] === 2) ? '？' : String(d.rt[r]); };
    const ct = function (c) { return (blank && blank[0] === 2 && blank[1] === c) ? '？' : String(d.ct[c]); };
    const al = (blank && blank[0] === 2 && blank[1] === 2) ? '？' : String(d.all);
    if (noTot) {
      return tableHtml(d.set.cols, [
        [d.set.rows[0], g(0, 0), g(0, 1)],
        [d.set.rows[1], g(1, 0), g(1, 1)]
      ]);
    }
    return tableHtml(d.set.cols.concat(['合計']), [
      [d.set.rows[0], g(0, 0), g(0, 1), rt(0)],
      [d.set.rows[1], g(1, 0), g(1, 1), rt(1)],
      ['合計', ct(0), ct(1), al]
    ]);
  }
  function tblReadQ() {
    const d = tblData(), r = U.randInt(0, 1), c = U.randInt(0, 1);
    return num('表を 読む ・ ' + d.set.title, tblHtml(d) + '「' + d.set.rows[r] + '」で「' + d.set.cols[c] + '」は？', d.v[r][c], {
      key: 'tr:' + d.set.title + ':' + d.sig + ':' + r + c, scratch: false, maxLen: 3,
      hint: 'たてと よこが 交わる ところを 見よう。',
      note: d.set.rows[r] + ' × ' + d.set.cols[c] + ' は ' + d.v[r][c] + d.set.unit
    });
  }
  function tblTotalQ() {
    const d = tblData();
    const kind = pf(['all', 'row', 'col']);
    let q, a, note;
    if (kind === 'all') { q = 'ぜんぶで 何' + d.set.unit + '？'; a = d.all; note = d.rt[0] + ' + ' + d.rt[1] + ' = ' + d.all; }
    else if (kind === 'row') { const r = U.randInt(0, 1); q = '「' + d.set.rows[r] + '」は ぜんぶで？'; a = d.rt[r]; note = d.v[r][0] + ' + ' + d.v[r][1] + ' = ' + d.rt[r]; }
    else { const c = U.randInt(0, 1); q = '「' + d.set.cols[c] + '」は ぜんぶで？'; a = d.ct[c]; note = d.v[0][c] + ' + ' + d.v[1][c] + ' = ' + d.ct[c]; }
    return num('表の 合計 ・ ' + d.set.title, tblHtml(d, null, true) + q, a, {
      key: 'tt:' + d.set.title + ':' + d.sig + ':' + kind + ':' + a, scratch: false, maxLen: 3,
      hint: 'たて（か よこ）に たしていこう。', note: note
    });
  }
  function tblBlankQ(hard) {
    const d = tblData();
    const spot = hard ? pf([[0, 0], [0, 1], [1, 0], [1, 1]]) : pf([[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]]);
    const ans = spot[0] === 2 ? (spot[1] === 2 ? d.all : d.ct[spot[1]]) : (spot[1] === 2 ? d.rt[spot[0]] : d.v[spot[0]][spot[1]]);
    return num('表を うめる ・ ' + d.set.title, tblHtml(d, spot) + '？に 入る 数は？', ans, {
      key: 'tb:' + d.set.title + ':' + d.sig + ':' + spot.join(''), scratch: false, maxLen: 3,
      hint: hard ? '合計から ほかの 数を ひこう。' : 'たてか よこに たすと 合計に なるよ。',
      note: '？ は ' + ans + d.set.unit
    });
  }
  const TBL_BOTH = TBL_SETS.filter(function (s) { return s.both; })[0];
  function tblBothQ(neither) {
    const d = tblData(TBL_BOTH);
    const a = neither ? d.v[1][1] : d.v[0][0];
    return num('どちらも ・ ' + d.set.title, tblHtml(d) + (neither ? '犬も ねこも いない 人は？' : '犬も ねこも いる 人は？'), a, {
      key: 'tbo:' + d.sig + ':' + (neither ? 'n' : 'b'), scratch: false, maxLen: 3,
      hint: neither ? '「犬が いない」と「ねこが いない」が 交わる ところ。' : '「犬が いる」と「ねこが いる」が 交わる ところ。',
      note: '答えは ' + a + '人'
    });
  }
  const TBL_FACT = [
    { q: '2つの ことがらを 一どに しらべる ときに べんりなのは？', a: '2つに 分けた 表', w: ['おれ線グラフ', '数直線', '地図'] },
    { q: '表の いちばん 右下の 数は 何を あらわす？', a: 'ぜんたいの 合計', w: ['いちばん 多い 数', 'いちばん 少ない 数', '真ん中の 数'] },
    { q: 'たての 合計と よこの 合計を たすと、どちらも 同じ 数に なる？', a: 'なる', w: ['ならない', 'ときどき なる', '2ばいに なる'] },
    { q: '「正」の 字を 書いて かぞえる とき、「正」1つで いくつ？', a: '5', w: ['4', '3', '10'] },
    { q: '調べた ことを 表に する よさは？', a: '見て すぐ わかる', w: ['字が ふえる', '計算が いらない', '色が つく'] }
  ];
  function tblFactQ() {
    const s = pf(TBL_FACT);
    return choice('表の きまり', s.q, [s.a].concat(s.w), {
      key: 'tf4:' + s.q, hint: '表は たてと よこの 2つの ことがらを 一どに 見られるよ。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }

  const stage7 = {
    easy: [tblReadQ, tblTotalQ, tblFactQ],
    normal: [function () { return tblBlankQ(false); }, tblTotalQ, tblFactQ, tblReadQ],
    hard: [function () { return tblBlankQ(true); }, function () { return tblBothQ(false); }, function () { return tblBothQ(true); }, tblFactQ],
    boss: [function () { return tblBlankQ(true); }, function () { return tblBothQ(true); }, tblTotalQ, function () { return tblBothQ(false); }]
  };

  /* =======================================================
     ステージ8 すいちょくと 平行・四角形
     ======================================================= */
  const LINE_KIND = [
    { k: 'perp', a: 'すいちょく' }, { k: 'para', a: '平行' }, { k: 'cross', a: 'どちらでも ない' }
  ];
  function lineKindQ() {
    const s = pf(LINE_KIND);
    return choice('すいちょくと 平行', figQ('この 2本の 直線は？', linesSvg(s.k)), [s.a, 'すいちょく', '平行', 'どちらでも ない'].filter(function (x, i) { return i === 0 || x !== s.a; }), {
      key: 'lk:' + s.k, hint: '直角に まじわれば すいちょく。どこまでも まじわらなければ 平行。',
      note: 'この 2本は ' + s.a
    });
  }

  const QUAD_NAME = { square: '正方形', rect: '長方形', para: '平行四辺形', trape: '台形', trapeR: '台形', rhombus: 'ひし形' };
  const QUAD_KINDS = ['square', 'rect', 'para', 'trape', 'rhombus'];
  function quadNameQ() {
    const k = pf(QUAD_KINDS);
    const a = QUAD_NAME[k];
    const all = ['正方形', '長方形', '平行四辺形', '台形', 'ひし形'];
    return choice('四角形の 名前', figQ('この 四角形の 名前は？', quadSvg(k)),
      [a].concat(U.shuffle(all.filter(function (x) { return x !== a; })).slice(0, 3)), {
        key: 'qn:' + k, hint: '平行な へんが 何くみ あるか、へんの 長さは 同じか 見よう。',
        note: 'これは ' + a
      });
  }

  const QUAD_FEAT = [
    { q: '向かい合った 1くみの へんだけが 平行な 四角形は？', a: '台形', w: ['平行四辺形', 'ひし形', '長方形'] },
    { q: '向かい合った 2くみの へんが 平行な 四角形は？', a: '平行四辺形', w: ['台形', '正方形だけ', '三角形'] },
    { q: '4つの へんの 長さが ぜんぶ 同じ 四角形は？', a: 'ひし形', w: ['台形', '長方形', '平行四辺形'] },
    { q: '平行四辺形の 向かい合った 角の 大きさは？', a: '同じ', w: ['ちがう', 'たすと 90度', 'いつも 90度'] },
    { q: '平行四辺形の 向かい合った へんの 長さは？', a: '同じ', w: ['ちがう', '2ばい', '半分'] },
    { q: '平行四辺形の となり合った 角を たすと 何度？', a: '180度', w: ['90度', '360度', '60度'] },
    { q: 'ひし形の 2本の 対角線は どう まじわる？', a: 'すいちょくに まじわる', w: ['平行に なる', 'まじわらない', 'ななめに ずれる'] },
    { q: '長方形の 2本の 対角線の 長さは？', a: '同じ', w: ['ちがう', '2ばい', '半分'] },
    { q: '正方形は ひし形と いえる？', a: 'いえる', w: ['いえない', '三角形だから ちがう', '台形だから ちがう'] },
    { q: '2本の 直線が 直角に まじわる とき、この 2本は？', a: 'すいちょく', w: ['平行', '同じ 長さ', '対角線'] },
    { q: '1本の 直線に すいちょくな 2本の 直線は？', a: '平行', w: ['すいちょく', 'まじわる', '同じ 長さ'] },
    { q: '平行な 2本の 直線の はばは どこでも？', a: '同じ', w: ['ちがう', 'だんだん ひろい', 'だんだん せまい'] },
    { q: '平行な 直線に 1本の 直線が まじわる とき、できる 角は？', a: '同じ 大きさに なる', w: ['ぜんぶ 直角', 'ばらばら', '90度と 60度'] }
  ];
  function quadFeatQ() {
    const s = pf(QUAD_FEAT);
    return choice('四角形の とくちょう', s.q, [s.a].concat(s.w), {
      key: 'qf:' + s.q, hint: '平行な へんの くみの 数と、へんの 長さで 見分けよう。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }

  function paraAngleQ(next) {
    const d = pf([50, 55, 60, 65, 70, 75, 80, 100, 110, 120, 125]);
    return num('平行四辺形の 角', figQ('平行四辺形の 1つの 角が <b>' + d + '度</b>です。' + (next ? 'となり合った 角は 何度？' : '向かい合った 角は 何度？'), quadSvg('para', { angle: d + '度' })),
      next ? 180 - d : d, {
        key: 'pa:' + d + ':' + (next ? 'n' : 'o'), scratch: false, maxLen: 3,
        hint: next ? 'となり合った 角を たすと 180度に なるよ。' : '向かい合った 角は 同じ 大きさだよ。',
        note: next ? '180 − ' + d + ' = ' + (180 - d) + '度' : '向かい合った 角も ' + d + '度'
      });
  }

  function quadPerimQ() {
    const kind = pf(['para', 'rhombus']);
    const a = U.randInt(3, 15), b = U.randInt(3, 15);
    if (kind === 'rhombus') {
      return num('まわりの 長さ', figQ('ひし形の 1つの へんは <b>' + a + 'cm</b>です。まわりの 長さは 何cm？', quadSvg('rhombus')), a * 4, {
        key: 'qp:r:' + a, scratch: false, maxLen: 3,
        hint: 'ひし形の 4つの へんは ぜんぶ 同じ 長さ。', note: a + ' × 4 = ' + (a * 4) + 'cm'
      });
    }
    return num('まわりの 長さ', figQ('平行四辺形の となり合った へんが <b>' + a + 'cm</b> と <b>' + b + 'cm</b>です。まわりの 長さは 何cm？', quadSvg('para')), (a + b) * 2, {
      key: 'qp:p:' + a + ':' + b, scratch: false, maxLen: 3,
      hint: '向かい合った へんは 同じ 長さ。(' + a + ' + ' + b + ') × 2。',
      note: '(' + a + ' + ' + b + ') × 2 = ' + ((a + b) * 2) + 'cm'
    });
  }

  function diagQ() {
    const k = pf(['rhombus', 'rect', 'square', 'para']);
    return choice('対角線', figQ('この 四角形の 2本の 対角線は？', quadSvg(k, { diag: true })),
      k === 'rhombus' ? ['すいちょくに まじわる', '長さが 同じ', 'まじわらない', '平行'] :
      k === 'rect' ? ['長さが 同じ', 'すいちょくに まじわる', 'まじわらない', '平行'] :
      k === 'square' ? ['長さが 同じで すいちょく', '長さが ちがう', 'まじわらない', '平行'] :
                       ['真ん中で 交わる', '長さが 同じ', 'すいちょくに まじわる', 'まじわらない'], {
        key: 'dg:' + k, hint: 'ひし形は すいちょく、長方形は 長さが 同じ、正方形は りょうほう。',
        note: QUAD_NAME[k] + 'の 対角線'
      });
  }

  const stage8 = {
    easy: [lineKindQ, quadNameQ, quadFeatQ],
    normal: [quadFeatQ, function () { return paraAngleQ(false); }, quadNameQ, quadPerimQ],
    hard: [function () { return paraAngleQ(true); }, diagQ, quadPerimQ, quadFeatQ],
    boss: [function () { return paraAngleQ(true); }, diagQ, quadPerimQ, quadNameQ]
  };

  /* =======================================================
     ステージ9 がい数（四捨五入と 見つもり）
     ======================================================= */
  const ROUND_UNITS = [
    { u: 10, name: '一の位', to: '十の位' },
    { u: 100, name: '十の位', to: '百の位' },
    { u: 1000, name: '百の位', to: '千の位' },
    { u: 10000, name: '千の位', to: '一万の位' }
  ];
  function roundQ() {
    const s = pf(ROUND_UNITS);
    let n;
    do { n = U.randInt(s.u * 10, s.u * 100 - 1); } while (n % s.u === 0);
    const a = Math.round(n / s.u) * s.u;
    return num('四捨五入', '<span class="num">' + comma(n) + '</span><br>' + s.name + 'を ' + SHASHA + 'すると？', a, {
      key: 'r4:' + n + ':' + s.u, scratch: true, maxLen: 8,
      hint: s.name + 'が 0〜4なら 切りすて、5〜9なら 切り上げ。',
      note: comma(n) + ' → ' + comma(a) + '（' + s.to + 'までの がい数）'
    });
  }
  function roundTopQ(k) {
    const n = U.randInt(1000, 999999);
    const d = String(n).length;
    const u = Math.pow(10, d - k);
    const a = Math.round(n / u) * u;
    if (a === n) return roundTopQ(k);
    return num('上から ○けたの がい数', '<span class="num">' + comma(n) + '</span><br>上から ' + k + 'けたの がい数に すると？', a, {
      key: 'rt:' + n + ':' + k, scratch: true, maxLen: 8,
      hint: '上から ' + (k + 1) + 'つめの 数字を 四捨五入するよ。',
      note: comma(n) + ' → ' + comma(a)
    });
  }
  const RANGE_FACT = [
    { q: '「30以上」に 30は 入る？', a: '入る', w: ['入らない', 'ときどき 入る', 'わからない'] },
    { q: '「30より 大きい」に 30は 入る？', a: '入らない', w: ['入る', 'ときどき 入る', 'わからない'] },
    { q: '「30以下」に 30は 入る？', a: '入る', w: ['入らない', 'ときどき 入る', 'わからない'] },
    { q: '「30みまん」に 30は 入る？', a: '入らない', w: ['入る', 'ときどき 入る', 'わからない'] },
    { q: '十の位までの がい数に する とき、一の位が 5なら？', a: '切り上げる', w: ['切りすてる', 'そのまま', '0に する'] },
    { q: '十の位までの がい数に する とき、一の位が 4なら？', a: '切りすてる', w: ['切り上げる', 'そのまま', '10に する'] },
    { q: '「およそ 500人」の ような 数を 何と いう？', a: 'がい数', w: ['整数', '小数', '分数'] },
    { q: '合計の 見当を つける ときは、どう する？', a: 'がい数に して たす', w: ['きちんと 計算する', 'かけ算に する', '10で わる'] }
  ];
  function rangeFactQ() {
    const s = pf(RANGE_FACT);
    return choice('がい数の きまり', s.q, [s.a].concat(s.w), {
      key: 'rf:' + s.q, hint: '「以上」「以下」は その 数を ふくむ。「より 大きい」「みまん」は ふくまない。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }
  function rangeMinMaxQ() {
    const u = pf([10, 100]);
    const a = U.randInt(3, 40) * u;
    const min = Math.random() < 0.5;
    return num('がい数に なる 数', SHASHA + 'して ' + (u === 10 ? '十' : '百') + 'の位までの がい数に した とき<br><span class="num">' + comma(a) + '</span> に なる 整数の うち、いちばん ' + (min ? '小さい' : '大きい') + ' 数は？',
      min ? a - u / 2 : a + u / 2 - 1, {
        key: 'rm:' + a + ':' + u + ':' + (min ? 's' : 'b'), scratch: true, maxLen: 6,
        hint: min ? '切り上げに なる いちばん 小さい 数は ' + comma(a - u / 2) + ' だよ。' : '切りすてに なる いちばん 大きい 数を さがそう。',
        note: comma(a - u / 2) + ' 以上 ' + comma(a + u / 2) + ' みまん が ' + comma(a) + ' に なる'
      });
  }
  function estSumQ() {
    const a = U.randInt(1001, 9999), b = U.randInt(1001, 9999);
    const minus = Math.random() < 0.4 && a > b;
    const ra = Math.round(a / 100) * 100, rb = Math.round(b / 100) * 100;
    return num('見つもり（たし算）', '<span class="num">' + comma(a) + (minus ? ' − ' : ' + ') + comma(b) + '</span><br>百の位までの がい数に して 見つもると？',
      minus ? ra - rb : ra + rb, {
        key: 'es:' + a + ':' + b + ':' + (minus ? '-' : '+'), scratch: true, maxLen: 7,
        hint: comma(a) + ' → ' + comma(ra) + '、' + comma(b) + ' → ' + comma(rb) + ' に してから 計算。',
        note: comma(ra) + (minus ? ' − ' : ' + ') + comma(rb) + ' = ' + comma(minus ? ra - rb : ra + rb)
      });
  }
  function estProdQ() {
    const a = U.randInt(101, 899), b = U.randInt(21, 89);
    const ra = Math.round(a / 100) * 100, rb = Math.round(b / 10) * 10;
    if (!ra || !rb) return estProdQ();
    return num('見つもり（かけ算）', '<span class="num">' + a + ' × ' + b + '</span><br>上から 1けたの がい数に して 見つもると？', ra * rb, {
      key: 'ep:' + a + ':' + b, scratch: true, maxLen: 7,
      hint: a + ' → ' + ra + '、' + b + ' → ' + rb + ' に してから かけ算。',
      note: ra + ' × ' + rb + ' = ' + comma(ra * rb)
    });
  }

  const stage9 = {
    easy: [roundQ, function () { return roundTopQ(1); }, rangeFactQ],
    normal: [function () { return roundTopQ(2); }, roundQ, rangeFactQ, estSumQ],
    hard: [estProdQ, rangeMinMaxQ, estSumQ, function () { return roundTopQ(2); }],
    boss: [rangeMinMaxQ, estProdQ, estSumQ, function () { return roundTopQ(2); }]
  };

  /* =======================================================
     ステージ10 計算の きまり
     ======================================================= */
  function parenQ() {
    const a = U.randInt(11, 49), b = U.randInt(2, 40), c = U.randInt(2, 9);
    const minus = Math.random() < 0.4 && a > b;
    const inner = minus ? a - b : a + b;
    return num('（ ）の ある 式', '<span class="num">( ' + a + (minus ? ' − ' : ' + ') + b + ' ) × ' + c + '</span>', inner * c, {
      key: 'pq:' + a + (minus ? '-' : '+') + b + 'x' + c, maxLen: 5,
      hint: '（ ）の 中を さきに 計算しよう。' + a + (minus ? ' − ' : ' + ') + b + ' = ' + inner + '。',
      note: '( ' + a + (minus ? ' − ' : ' + ') + b + ' ) × ' + c + ' = ' + inner + ' × ' + c + ' = ' + inner * c
    });
  }
  function orderQ() {
    const b = U.randInt(2, 9), c = U.randInt(2, 9);
    const plus = Math.random() < 0.6;
    const a = plus ? U.randInt(11, 80) : U.randInt(b * c + 1, b * c + 80);
    const ans = plus ? a + b * c : a - b * c;
    return num('×を 先に', '<span class="num">' + a + (plus ? ' + ' : ' − ') + b + ' × ' + c + '</span>', ans, {
      key: 'oq:' + a + (plus ? '+' : '-') + b + 'x' + c, maxLen: 4,
      hint: 'かけ算を さきに。' + b + ' × ' + c + ' = ' + b * c + '。',
      note: a + (plus ? ' + ' : ' − ') + b * c + ' = ' + ans
    });
  }
  function order2Q() {
    const a = U.randInt(2, 9), b = U.randInt(2, 9), d = U.randInt(2, 9), q = U.randInt(2, 9);
    const c = d * q;
    const plus = Math.random() < 0.6 || a * b <= q;
    const ans = plus ? a * b + q : a * b - q;
    return num('×と ÷を 先に', '<span class="num">' + a + ' × ' + b + (plus ? ' + ' : ' − ') + c + ' ÷ ' + d + '</span>', ans, {
      key: 'o2:' + a + 'x' + b + (plus ? '+' : '-') + c + '/' + d, maxLen: 4,
      hint: 'かけ算と わり算を さきに。' + a + ' × ' + b + ' = ' + a * b + '、' + c + ' ÷ ' + d + ' = ' + q + '。',
      note: a * b + (plus ? ' + ' : ' − ') + q + ' = ' + ans
    });
  }
  const RULE_FACT = [
    { q: '（ ）の ある 式は どこから 計算する？', a: '（ ）の 中から', w: ['左から じゅんに', '×から', '右から'] },
    { q: '＋ と × が ある 式は どちらを 先に 計算する？', a: '×を 先に', w: ['＋を 先に', '左から じゅんに', 'どちらでも よい'] },
    { q: '− と ÷ が ある 式は どちらを 先に 計算する？', a: '÷を 先に', w: ['−を 先に', '左から じゅんに', 'どちらでも よい'] },
    { q: '(□ + ○) × △ と 同じ 答えに なる 式は？', a: '□ × △ + ○ × △', w: ['□ × △ + ○', '□ + ○ × △', '(□ × ○) + △'] },
    { q: '25 × 4 は いくつ？', a: '100', w: ['90', '120', '1000'] },
    { q: '□ + ○ = ○ + □ は 正しい？', a: '正しい', w: ['まちがい', 'ときどき 正しい', 'ひき算だけ 正しい'] },
    { q: '□ − ○ = ○ − □ は 正しい？', a: 'まちがい', w: ['正しい', 'いつも 正しい', 'かけ算なら 正しい'] },
    { q: '(□ × ○) × △ と □ × (○ × △) の 答えは？', a: '同じ', w: ['ちがう', '2ばい', '半分'] },
    { q: '125 × 8 は いくつ？', a: '1000', w: ['100', '800', '10000'] }
  ];
  function ruleFactQ() {
    const s = pf(RULE_FACT);
    return choice('計算の きまり', s.q, [s.a].concat(s.w), {
      key: 'rk:' + s.q, hint: '（ ）が いちばん 先。つぎに × ÷。さいごに ＋ −。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }
  function distQ() {
    const c = U.randInt(3, 9);
    const a = U.randInt(11, 40), b = U.randInt(2, 9);
    const sub = Math.random() < 0.3;
    const ans = sub ? (a - b) * c : (a + b) * c;
    return num('くふうして 計算', '<span class="num">' + a + ' × ' + c + (sub ? ' − ' : ' + ') + b + ' × ' + c + '</span><br>くふうして 計算しよう', ans, {
      key: 'dq:' + a + (sub ? '-' : '+') + b + 'x' + c, maxLen: 5,
      hint: 'どちらも × ' + c + ' だね。( ' + a + (sub ? ' − ' : ' + ') + b + ' ) × ' + c + ' と 同じだよ。',
      note: '( ' + a + (sub ? ' − ' : ' + ') + b + ' ) × ' + c + ' = ' + (sub ? a - b : a + b) + ' × ' + c + ' = ' + ans
    });
  }
  const SMART = [
    { q: '25 × 16', a: 400, h: '25 × 4 = 100 を つかおう。16 = 4 × 4。' },
    { q: '25 × 12', a: 300, h: '25 × 4 = 100 を つかおう。12 = 4 × 3。' },
    { q: '125 × 8', a: 1000, h: '125 × 8 = 1000 だよ。' },
    { q: '99 × 7', a: 693, h: '99 = 100 − 1。100 × 7 − 1 × 7。' },
    { q: '102 × 6', a: 612, h: '102 = 100 + 2。100 × 6 + 2 × 6。' },
    { q: '98 × 5', a: 490, h: '98 = 100 − 2。100 × 5 − 2 × 5。' },
    { q: '4 × 27 × 25', a: 2700, h: '4 × 25 = 100 を 先に。' },
    { q: '2 × 38 × 50', a: 3800, h: '2 × 50 = 100 を 先に。' },
    { q: '101 × 9', a: 909, h: '101 = 100 + 1。' }
  ];
  function smartQ() {
    const s = pf(SMART);
    return num('くふうして 計算', '<span class="num">' + s.q + '</span><br>くふうして 計算しよう', s.a, {
      key: 'sm:' + s.q, maxLen: 5, hint: s.h, note: s.q + ' = ' + comma(s.a)
    });
  }
  function wordExprQ() {
    const p = U.randInt(80, 250), n = U.randInt(2, 6), j = U.randInt(60, 200);
    const w = pf([
      ['1こ <b>' + p + '</b>円の パンを <b>' + n + '</b>こと、<b>' + j + '</b>円の ジュースを 1本 買いました。ぜんぶで いくら？', p * n + j, p + ' × ' + n + ' + ' + j],
      ['<b>' + (p * n + j) + '</b>円 もって、1こ <b>' + p + '</b>円の パンを <b>' + n + '</b>こ 買いました。のこりは いくら？', j, (p * n + j) + ' − ' + p + ' × ' + n],
      ['1はこ <b>' + p + '</b>円の おかしを <b>' + n + '</b>はこと、<b>' + j + '</b>円の ふくろを 1つ 買いました。ぜんぶで いくら？', p * n + j, p + ' × ' + n + ' + ' + j]
    ]);
    return num('1つの 式に する', w[0], w[1], {
      key: 'we:' + p + ':' + n + ':' + j + ':' + w[1], maxLen: 5,
      hint: '1つの 式に すると ' + w[2] + '。× を 先に 計算するよ。',
      note: w[2] + ' = ' + comma(w[1]) + '円'
    });
  }

  const stage10 = {
    easy: [parenQ, orderQ, ruleFactQ],
    normal: [order2Q, parenQ, ruleFactQ, orderQ],
    hard: [distQ, smartQ, order2Q, ruleFactQ],
    boss: [wordExprQ, distQ, smartQ, order2Q]
  };

  /* =======================================================
     ステージ11 面積
     ======================================================= */
  const CM2 = 'cm<sup>2</sup>', M2 = 'm<sup>2</sup>';
  function rectAreaQ(square) {
    const a = U.randInt(3, 12), b = square ? a : U.randInt(3, 12);
    if (!square && a === b) return rectAreaQ(false);
    return num('面積', figQ((square ? '正方形' : '長方形') + 'の 面積は 何' + CM2 + '？', rectSvg(a, b, a + 'cm', b + 'cm')), a * b, {
      key: 'ra4:' + (square ? 's' : 'r') + a + ':' + b, scratch: false, maxLen: 4,
      hint: square ? '正方形の 面積 = 1辺 × 1辺。' : '長方形の 面積 = たて × よこ。',
      note: a + ' × ' + b + ' = ' + a * b + ' 平方センチメートル'
    });
  }
  function sideFromAreaQ() {
    const a = U.randInt(3, 12), b = U.randInt(3, 12);
    return num('面積から へんを もとめる', figQ('長方形の 面積は <b>' + a * b + '</b>' + CM2 + '、よこは <b>' + b + 'cm</b>です。たては 何cm？', rectSvg(a, b, b + 'cm', '？')), a, {
      key: 'sf:' + a + ':' + b, scratch: false, maxLen: 3,
      hint: 'たて × よこ = 面積。' + (a * b) + ' ÷ ' + b + ' で もとめよう。',
      note: (a * b) + ' ÷ ' + b + ' = ' + a + 'cm'
    });
  }
  const AREA_UNITS = [
    { q: '1' + M2 + ' は 何' + CM2 + '？', a: 10000, h: '1m = 100cm。100 × 100 = 10000。' },
    { q: '1a は 何' + M2 + '？', a: 100, h: 'a は アール。1a は 1辺が 10mの 正方形の 面積。' },
    { q: '1ha は 何' + M2 + '？', a: 10000, h: 'ha は ヘクタール。1ha は 1辺が 100mの 正方形の 面積。' },
    { q: '1ha は 何a？', a: 100, h: '1ha = 10000' + M2 + '、1a = 100' + M2 + '。' },
    { q: '1km<sup>2</sup> は 何' + M2 + '？', a: 1000000, h: '1km = 1000m。1000 × 1000。' },
    { q: '1km<sup>2</sup> は 何ha？', a: 100, h: '1ha = 10000' + M2 + '、1km<sup>2</sup> = 1000000' + M2 + '。' }
  ];
  function areaUnitQ() {
    const s = pf(AREA_UNITS);
    return num('面積の 単位', s.q, s.a, {
      key: 'au:' + s.q, scratch: false, maxLen: 8, hint: s.h,
      note: s.q.replace('？', '') + ' → ' + comma(s.a)
    });
  }
  function bigAreaQ() {
    const a = U.randInt(3, 30), b = U.randInt(3, 30);
    return num('大きい 面積', '<b>たて ' + a + 'm</b>、<b>よこ ' + b + 'm</b>の 長方形の 面積は 何' + M2 + '？', a * b, {
      key: 'ba:' + a + ':' + b, scratch: true, maxLen: 5,
      hint: '長方形の 面積 = たて × よこ。単位は ' + M2 + '。',
      note: a + ' × ' + b + ' = ' + comma(a * b) + ' 平方メートル'
    });
  }
  function lShapeQ() {
    const a = U.randInt(9, 15), b = U.randInt(6, 11);
    const c = U.randInt(3, a - 5), d = U.randInt(2, b - 3);
    return num('L字の 面積', figQ('この 図形の 面積は 何' + CM2 + '？', lShapeSvg(a, b, c, d)), a * b - c * d, {
      key: 'ls:' + a + ':' + b + ':' + c + ':' + d, scratch: false, maxLen: 4,
      hint: '2つの 長方形に 分けるか、大きな 長方形から 切りとった ぶんを ひこう。',
      note: a + ' × ' + b + ' − ' + c + ' × ' + d + ' = ' + (a * b - c * d) + ' 平方センチメートル'
    });
  }
  function areaWordQ() {
    const a = U.randInt(4, 12), b = U.randInt(4, 12);
    const w = pf([
      ['たて <b>' + a + 'm</b>、よこ <b>' + b + 'm</b>の 花だんが あります。面積は 何' + M2 + '？', a * b, a + ' × ' + b],
      ['1辺が <b>' + a + 'm</b>の 正方形の 土地の 面積は 何' + M2 + '？', a * a, a + ' × ' + a],
      ['面積が <b>' + (a * b) + '</b>' + M2 + '、たてが <b>' + a + 'm</b>の 長方形。よこは 何m？', b, (a * b) + ' ÷ ' + a]
    ]);
    return num('面積の 文しょうだい', w[0], w[1], {
      key: 'aw:' + a + ':' + b + ':' + w[1] + ':' + w[2], scratch: true, maxLen: 5,
      hint: '面積 = たて × よこ。もとめる ものを たしかめよう。',
      note: w[2] + ' = ' + comma(w[1])
    });
  }

  const stage11 = {
    easy: [function () { return rectAreaQ(false); }, function () { return rectAreaQ(true); }, areaUnitQ],
    normal: [sideFromAreaQ, bigAreaQ, areaUnitQ, function () { return rectAreaQ(false); }],
    hard: [lShapeQ, areaUnitQ, areaWordQ, sideFromAreaQ],
    boss: [lShapeQ, areaWordQ, areaUnitQ, sideFromAreaQ]
  };

  /* =======================================================
     ステージ12 小数の かけ算と わり算
     ======================================================= */
  function decMulTenQ() {
    const t = U.randInt(2, 9), k = U.randInt(2, 9);
    return dec('小数の かけ算', expr(fx(t / 10), '×', k), t * k / 10, {
      key: 'dmt:' + t + ':' + k, scratch: false,
      hint: '0.1が ' + t + 'こ。それが ' + k + 'つ分で 0.1が ' + (t * k) + 'こ。',
      note: fx(t / 10) + ' × ' + k + ' = ' + fx(t * k / 10)
    });
  }
  function decDivTenQ() {
    const q = U.randInt(2, 9), k = U.randInt(2, 9);
    const t = q * k;
    if (t > 99) return decDivTenQ();
    return dec('小数の わり算', expr(fx(t / 10), '÷', k), q / 10, {
      key: 'ddt:' + t + ':' + k, scratch: false,
      hint: '0.1が ' + t + 'こ。' + k + 'つに 分けると 0.1が ' + q + 'こ。',
      note: fx(t / 10) + ' ÷ ' + k + ' = ' + fx(q / 10)
    });
  }
  function decMulQ() {
    const t = U.randInt(11, 99), k = U.randInt(3, 9);
    return dec('小数の かけ算（筆算）', expr(fx(t / 10), '×', k), t * k / 10, {
      key: 'dm4:' + t + ':' + k, layout: 'vertical', a: fx(t / 10), b: String(k), sign: '×',
      hint: '小数点を わすれて ' + t + ' × ' + k + ' を 計算して、さいごに 小数点を うつよ。',
      note: fx(t / 10) + ' × ' + k + ' = ' + fx(t * k / 10)
    });
  }
  function decDivQ() {
    const k = U.randInt(3, 9), q = U.randInt(11, 99);
    const t = q * k;
    if (t > 999) return decDivQ();
    return dec('小数の わり算（筆算）', expr(fx(t / 10), '÷', k), q / 10, {
      key: 'dd4:' + t + ':' + k, scratch: true,
      hint: '小数点は そのまま 上に あげて、' + t + ' ÷ ' + k + ' と 同じように 計算しよう。',
      note: fx(t / 10) + ' ÷ ' + k + ' = ' + fx(q / 10)
    });
  }
  function decMul100Q() {
    const h = U.randInt(105, 995), k = U.randInt(3, 8);
    return dec('小数の かけ算（1/100の位）', expr(fx(h / 100), '×', k), h * k / 100, {
      key: 'dm100:' + h + ':' + k, layout: 'vertical', a: fx(h / 100), b: String(k), sign: '×',
      hint: h + ' × ' + k + ' を 計算して、小数点を 左に 2つ うつすよ。',
      note: fx(h / 100) + ' × ' + k + ' = ' + fx(h * k / 100)
    });
  }
  /* 整数 ÷ 整数 を わりきれるまで（答えが 小数）。
     かならず 小数第二位までで わりきれる 組み合わせだけ 出す */
  function intDivDecQ() {
    const b = pf([2, 4, 5, 8, 20, 25]);
    let a = 0;
    for (let t = 0; t < 60; t++) {
      a = U.randInt(3, 99);
      if (a % b !== 0 && (a * 100) % b === 0) break;
      a = 0;
    }
    if (!a) a = b * U.randInt(2, 9) + (b === 8 ? 4 : b === 25 ? 5 : b === 20 ? 5 : 1);
    return dec('わりきれるまで', expr(a, '÷', b), a / b, {
      key: 'idd:' + a + ':' + b, scratch: true,
      hint: 'わりきれるまで 0を つけて 計算を つづけよう。' + a + '.0 ÷ ' + b + ' と 考えるよ。',
      note: a + ' ÷ ' + b + ' = ' + fx(a / b)
    });
  }
  function decWord2Q() {
    const t = U.randInt(12, 48), k = U.randInt(3, 8);
    const w = pf([
      ['1本 <b>' + fx(t / 10) + '</b>mの リボンが <b>' + k + '</b>本 あります。合わせて 何m？', t * k / 10, 'm'],
      ['<b>' + fx(t * k / 10) + '</b>Lの ジュースを <b>' + k + '</b>本の びんに 同じ 量ずつ 分けます。1本は 何L？', t / 10, 'L'],
      ['<b>' + fx(t / 10) + '</b>kgの おもりが <b>' + k + '</b>こ あります。合わせて 何kg？', t * k / 10, 'kg'],
      ['テープ <b>' + fx(t * k / 10) + '</b>mを <b>' + k + '</b>等分すると、1本は 何m？', t / 10, 'm']
    ]);
    return dec('小数の 文しょうだい', w[0], w[1], {
      key: 'dw2:' + t + ':' + k + ':' + w[2] + ':' + w[1],
      hint: 'かけ算か わり算か 考えよう。小数点の 場所に 気を つけて。',
      note: '答えは ' + fx(w[1]) + w[2]
    });
  }

  const stage12 = {
    easy: [decMulTenQ, decDivTenQ, decMulQ],
    normal: [decMulQ, decDivQ, decMulTenQ, decDivTenQ],
    hard: [decMul100Q, decDivQ, intDivDecQ, decMulQ],
    boss: [decWord2Q, decMul100Q, intDivDecQ, decDivQ]
  };

  /* =======================================================
     ステージ13 分数（かり分数・帯分数）
     ======================================================= */
  function bunsu(n, d) { return d + '分の' + n; }
  function mixed(a, n, d) { return a + 'と ' + d + '分の' + n; }

  const FRAC_KIND = [
    { q: '分子が 分母より 小さい 分数を 何と いう？', a: '真分数', w: ['かり分数', '帯分数', '小数'] },
    { q: '分子が 分母と 同じか 大きい 分数を 何と いう？', a: 'かり分数', w: ['真分数', '帯分数', '整数'] },
    { q: '整数と 真分数が いっしょに なった 分数を 何と いう？', a: '帯分数', w: ['かり分数', '真分数', '小数'] },
    { q: '5分の5 は いくつ？', a: '1', w: ['5', '0', '10分の5'] },
    { q: '3分の7 は 1より？', a: '大きい', w: ['小さい', '同じ', 'くらべられない'] },
    { q: '4分の3 は 1より？', a: '小さい', w: ['大きい', '同じ', 'くらべられない'] },
    { q: '分母が 同じ 分数を くらべる ときは？', a: '分子で くらべる', w: ['分母で くらべる', 'たして くらべる', 'くらべられない'] }
  ];
  function fracKindQ() {
    const s = pf(FRAC_KIND);
    return choice('分数の なまえ', s.q, [s.a].concat(s.w), {
      key: 'fk4:' + s.q, hint: '分子（上）と 分母（下）を くらべよう。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }
  function fracLine4Q() {
    const d = U.randInt(3, 8), n = U.randInt(d + 1, d * 2 - 1);
    return choice('分数の 数直線', numLine(2, d * 2, n, d, function (v) { return v === 0 ? '0' : String(v); }) + '↓ の 目もりを かり分数で 書くと？',
      withDistractors(bunsu(n, d), [bunsu(d, n), bunsu(n + 1, d), bunsu(n - 1, d), bunsu(n, d + 1)]), {
        key: 'fl4:' + n + '/' + d, hint: '1目もりは ' + bunsu(1, d) + '。0から ' + n + 'こめ だよ。',
        note: bunsu(n, d)
      });
  }
  function kari2taiQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, 4), r = U.randInt(1, d - 1);
    const n = a * d + r;
    return choice('かり分数を 帯分数に', '<span class="num">' + bunsu(n, d) + '</span> を 帯分数に すると？',
      withDistractors(mixed(a, r, d), [mixed(a + 1, r, d), mixed(a, r + 1 > d - 1 ? 1 : r + 1, d), mixed(r, a, d), mixed(a, d - r, d)]), {
        key: 'k2t:' + n + '/' + d, hint: n + ' ÷ ' + d + ' = ' + a + ' あまり ' + r + '。整数が ' + a + '、のこりが ' + bunsu(r, d) + '。',
        note: bunsu(n, d) + ' = ' + mixed(a, r, d)
      });
  }
  function tai2kariQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, 4), r = U.randInt(1, d - 1);
    return num('帯分数を かり分数に', '<span class="num">' + mixed(a, r, d) + '</span> を かり分数に すると<br><span class="nw">' + d + '分の □</span>。□に 入る 数は？', a * d + r, {
      key: 't2k:' + a + ':' + r + '/' + d, scratch: false, maxLen: 3,
      hint: a + ' は ' + bunsu(d, d) + ' が ' + a + 'こ ぶん。' + d + ' × ' + a + ' + ' + r + '。',
      note: mixed(a, r, d) + ' = ' + bunsu(a * d + r, d)
    });
  }
  function fracAdd4Q(over) {
    const d = U.randInt(3, 9);
    let a, b;
    if (over) { a = U.randInt(2, d - 1); b = U.randInt(d - a + 1, d - 1); }
    else { a = U.randInt(1, d - 2); b = U.randInt(1, d - 1 - a); }
    return num('分数の たし算', '<span class="num">' + bunsu(a, d) + ' + ' + bunsu(b, d) + '</span> = <span class="nw">' + d + '分の □</span><br>□に 入る 数は？', a + b, {
      key: 'fa4:' + a + '+' + b + '/' + d, scratch: false, maxLen: 2,
      hint: '分母は そのまま。分子を たそう。' + a + ' + ' + b + '。',
      note: bunsu(a, d) + ' + ' + bunsu(b, d) + ' = ' + bunsu(a + b, d)
    });
  }
  function fracSub4Q() {
    const d = U.randInt(3, 9), a = U.randInt(1, 3), r = U.randInt(1, d - 2);
    const b = U.randInt(r + 1, d - 1);          // くり下がりが おきる
    const ansN = a * d + r - b;
    return choice('帯分数の ひき算', '<span class="num">' + mixed(a, r, d) + ' − ' + bunsu(b, d) + '</span> は？',
      withDistractors(ansN >= d ? mixed(Math.floor(ansN / d), ansN % d, d) : bunsu(ansN, d),
        [bunsu(ansN, d), mixed(a, Math.abs(r - b), d), bunsu(a * d + r + b, d), mixed(a - 1, d - b, d)]), {
        key: 'fs4:' + a + ':' + r + '-' + b + '/' + d,
        hint: '整数から 1を くずして ' + bunsu(d, d) + ' に すると ひけるよ。',
        note: mixed(a, r, d) + ' − ' + bunsu(b, d) + ' = ' + (ansN >= d ? mixed(Math.floor(ansN / d), ansN % d, d) : bunsu(ansN, d))
      });
  }
  function fracComp4Q() {
    const d = U.randInt(3, 9);
    let a = U.randInt(1, d * 2 - 1), b = U.randInt(1, d * 2 - 1);
    if (a === b) b = a === 1 ? 2 : a - 1;
    return choice('分数の 大きさ', '<span class="num">' + bunsu(a, d) + '</span> と <span class="num">' + bunsu(b, d) + '</span><br>大きいのは？',
      [bunsu(Math.max(a, b), d), bunsu(Math.min(a, b), d)], {
        key: 'fc4:' + a + ':' + b + '/' + d, hint: '分母が 同じなら、分子の 大きい ほうが 大きいよ。',
        note: bunsu(Math.max(a, b), d) + ' の ほうが 大きい'
      });
  }
  function fracWord4Q() {
    const d = U.randInt(4, 9), a = U.randInt(2, d - 1), b = U.randInt(2, d - 1);
    const w = pf([
      ['ジュースを きのう <b>' + bunsu(a, d) + '</b>L、きょう <b>' + bunsu(b, d) + '</b>L のみました。合わせて 何L？', a + b, '+'],
      ['リボンが <b>' + bunsu(a + b, d) + '</b>m あります。<b>' + bunsu(b, d) + '</b>m 使うと のこりは 何m？', a, '-']
    ]);
    return num('分数の 文しょうだい', w[0] + '<br>答えは <span class="nw">' + d + '分の □</span>。□は？', w[1], {
      key: 'fw4:' + a + ':' + b + '/' + d + ':' + w[2], scratch: false, maxLen: 2,
      hint: '分母は そのまま、分子だけ 計算しよう。',
      note: '答えは ' + bunsu(w[1], d)
    });
  }

  const stage13 = {
    easy: [fracKindQ, fracLine4Q, function () { return fracAdd4Q(false); }],
    normal: [kari2taiQ, tai2kariQ, fracComp4Q, function () { return fracAdd4Q(true); }],
    hard: [fracSub4Q, kari2taiQ, tai2kariQ, fracWord4Q],
    boss: [fracWord4Q, fracSub4Q, kari2taiQ, function () { return fracAdd4Q(true); }]
  };

  /* =======================================================
     ステージ14 かわり方
     ======================================================= */
  const VAR_RELS = [
    { id: 'mul', mk: function () { return U.randInt(2, 9); }, f: function (x, k) { return x * k; }, ex: function (k) { return '○ = □ × ' + k; } },
    { id: 'add', mk: function () { return U.randInt(3, 20); }, f: function (x, k) { return x + k; }, ex: function (k) { return '○ = □ + ' + k; } },
    { id: 'sum', mk: function () { return U.randInt(12, 22); }, f: function (x, k) { return k - x; }, ex: function (k) { return '□ + ○ = ' + k; } },
    { id: 'mul1', mk: function () { return U.randInt(2, 6); }, f: function (x, k) { return x * k + 1; }, ex: function (k) { return '○ = □ × ' + k + ' + 1'; } }
  ];
  function varData() {
    const rel = pf(VAR_RELS), k = rel.mk();
    const xs = [1, 2, 3, 4, 5];
    const ys = xs.map(function (x) { return rel.f(x, k); });
    if (ys.some(function (y) { return y < 1; })) return varData();
    return { rel: rel, k: k, xs: xs, ys: ys, sig: rel.id + ':' + k };
  }
  function varTable(d, extraX) {
    const row1 = ['□'].concat(d.xs.map(String));
    const row2 = ['○'].concat(d.ys.map(String));
    if (extraX != null) { row1.push(String(extraX)); row2.push('？'); }
    return tableRows([row1, row2]);
  }
  function varNextQ() {
    const d = varData();
    const x = U.randInt(6, 12);
    const y = d.rel.f(x, d.k);
    if (y < 1) return varNextQ();
    return num('かわり方の 表', varTable(d, x) + '□が ' + x + 'の とき、○は いくつ？', y, {
      key: 'vn:' + d.sig + ':' + x, scratch: false, maxLen: 3,
      hint: '□が 1 ふえると ○は どう かわる？ きまりを 見つけよう。',
      note: d.rel.ex(d.k) + ' だから ○は ' + y
    });
  }
  function varRelQ() {
    const d = varData();
    const wrong = [];
    VAR_RELS.forEach(function (r) {
      if (r.id === d.rel.id) return;
      wrong.push(r.ex(d.k));
    });
    wrong.push(d.rel.ex(d.k === 9 ? 8 : d.k + 1));
    return choice('きまりを 式に', varTable(d) + '□と ○の かんけいを 式に すると？',
      [d.rel.ex(d.k)].concat(U.shuffle(wrong).slice(0, 3)), {
        key: 'vr:' + d.sig, hint: '□が 1・2・3… の とき ○が どう なるか 見よう。',
        note: d.rel.ex(d.k)
      });
  }
  function varApplyQ() {
    const d = varData();
    const x = U.randInt(6, 20);
    const y = d.rel.f(x, d.k);
    if (y < 1) return varApplyQ();
    return num('式から もとめる', '<span class="num">' + d.rel.ex(d.k) + '</span><br>□が ' + x + 'の とき、○は いくつ？', y, {
      key: 'va:' + d.sig + ':' + x, scratch: true, maxLen: 4,
      hint: '式の □に ' + x + ' を 入れて 計算しよう。',
      note: d.rel.ex(d.k) + ' → ○ = ' + y
    });
  }
  function varBackQ() {
    const d = varData();
    const x = U.randInt(3, 12);
    const y = d.rel.f(x, d.k);
    if (y < 1) return varBackQ();
    return num('○から □を もとめる', '<span class="num">' + d.rel.ex(d.k) + '</span><br>○が ' + y + 'の とき、□は いくつ？', x, {
      key: 'vb:' + d.sig + ':' + y, scratch: true, maxLen: 3,
      hint: '式を さかさに 考えよう。',
      note: '□は ' + x
    });
  }
  const VAR_WORD = [
    { q: '1辺が □cmの 正方形の まわりの 長さを ○cmと します。□が {x}の とき ○は？', f: function (x) { return x * 4; }, ex: '○ = □ × 4', lo: 3, hi: 20 },
    { q: '1こ 60円の あめを □こ 買った ときの 代金を ○円と します。□が {x}の とき ○は？', f: function (x) { return x * 60; }, ex: '○ = □ × 60', lo: 2, hi: 9 },
    { q: 'まわりの 長さが 24cmの 長方形の たてを □cm、よこを ○cmと します。□が {x}の とき ○は？', f: function (x) { return 12 - x; }, ex: '□ + ○ = 12', lo: 2, hi: 10 },
    { q: '18まいの 色紙を 姉と 妹で 分けます。姉が □まい、妹が ○まい。□が {x}の とき ○は？', f: function (x) { return 18 - x; }, ex: '□ + ○ = 18', lo: 2, hi: 16 },
    { q: '水そうに 毎分 3Lずつ 水を 入れます。□分後の 水の 量を ○Lと します。□が {x}の とき ○は？', f: function (x) { return x * 3; }, ex: '○ = □ × 3', lo: 2, hi: 20 }
  ];
  function varWordQ() {
    const s = pf(VAR_WORD);
    const x = U.randInt(s.lo, s.hi);
    return num('かわり方の 文しょうだい', s.q.replace('{x}', '<b>' + x + '</b>'), s.f(x), {
      key: 'vw:' + s.ex + ':' + x, scratch: true, maxLen: 4,
      hint: '式に すると ' + s.ex + ' だよ。',
      note: s.ex + ' → ○ = ' + s.f(x)
    });
  }

  const stage14 = {
    easy: [varNextQ, varApplyQ, varRelQ],
    normal: [varRelQ, varApplyQ, varNextQ, varWordQ],
    hard: [varBackQ, varWordQ, varRelQ, varNextQ],
    boss: [varWordQ, varBackQ, varRelQ, varApplyQ]
  };

  /* =======================================================
     ステージ15 直方体と 立方体
     ======================================================= */
  const BOX_FACT = [
    { q: '直方体の 面は いくつ？', a: 6 },
    { q: '直方体の へんは いくつ？', a: 12 },
    { q: '直方体の ちょう点は いくつ？', a: 8 },
    { q: '立方体の 面は いくつ？', a: 6 },
    { q: '立方体の へんは いくつ？', a: 12 },
    { q: '立方体の ちょう点は いくつ？', a: 8 },
    { q: '直方体で、1つの 面に 平行な 面は いくつ？', a: 1 },
    { q: '直方体で、1つの 面に すいちょくな 面は いくつ？', a: 4 },
    { q: '直方体で、1つの へんに 平行な へんは いくつ？', a: 3 },
    { q: '空間の 中の 位置を 表すには、数が いくつ いる？', a: 3 }
  ];
  function boxFactQ() {
    const s = pf(BOX_FACT);
    return num('直方体と 立方体', s.q, s.a, {
      key: 'bf:' + s.q, scratch: false, maxLen: 2,
      hint: 'はこの 形を 思いうかべて かぞえよう。面 6・へん 12・ちょう点 8。',
      note: s.q.replace('いくつ？', s.a + 'つ').replace('いる？', s.a + 'つ いる')
    });
  }
  function boxNameQ() {
    const cube = Math.random() < 0.5;
    return choice('はこの 名前', figQ('この 形の 名前は？', boxSvg(cube)),
      [cube ? '立方体' : '直方体', cube ? '直方体' : '立方体', '円柱', '角柱'], {
        key: 'bn:' + (cube ? 'c' : 'b'), hint: '面が ぜんぶ 正方形なら 立方体だよ。',
        note: (cube ? '立方体' : '直方体') + ' だね'
      });
  }
  const BOX_SHAPE = [
    { q: '立方体の 面の 形は？', a: '正方形', w: ['長方形', '三角形', '円'] },
    { q: '直方体の 面の 形は？', a: '長方形（正方形の ことも ある）', w: ['三角形', '円', 'ひし形'] },
    { q: '立方体の へんの 長さは？', a: 'ぜんぶ 同じ', w: ['ぜんぶ ちがう', '2しゅるい', '3しゅるい'] },
    { q: '直方体の へんの 長さは 何しゅるい あることが 多い？', a: '3しゅるい', w: ['1しゅるい', '6しゅるい', '12しゅるい'] },
    { q: TENKAI + 'を 組み立てると 何に なる？', a: '立体（はこの 形）', w: ['平面', '直線', '点'] },
    { q: '立方体の ' + TENKAI + 'で 面は いくつ ならぶ？', a: '6つ', w: ['4つ', '8つ', '12こ'] }
  ];
  function boxShapeQ() {
    const s = pf(BOX_SHAPE);
    return choice('はこの とくちょう', s.q, [s.a].concat(s.w), {
      key: 'bs:' + s.q, hint: '立方体は 正方形 6つ。直方体は 長方形 6つ。',
      note: s.q.replace('？', '') + ' → ' + s.a
    });
  }
  function netQ() {
    const ok = Math.random() < 0.6;
    const k = ok ? pf(['cross', 'tee', 'step']) : 'bad';
    return choice('展開図', figQ('この ' + TENKAI + 'を 組み立てると 立方体に なる？', netSvg(k)),
      [ok ? 'なる' : 'ならない', ok ? 'ならない' : 'なる'], {
        key: 'nt:' + k, hint: '面が かさならないか、頭の 中で 組み立てて みよう。',
        note: ok ? '立方体に なる' : 'かさなって しまうので ならない'
      });
  }
  function boxEdgeQ() {
    const a = U.randInt(2, 12), b = U.randInt(2, 12), c = U.randInt(2, 12);
    return num('へんの 長さの 合計', figQ('たて <b>' + a + 'cm</b>、よこ <b>' + b + 'cm</b>、高さ <b>' + c + 'cm</b>の 直方体。<br>へんの 長さの 合計は 何cm？', boxSvg(false, [b + 'cm', a + 'cm', c + 'cm'])), (a + b + c) * 4, {
      key: 'be:' + a + ':' + b + ':' + c, scratch: false, maxLen: 4,
      hint: '同じ 長さの へんが 4本ずつ あるよ。(' + a + ' + ' + b + ' + ' + c + ') × 4。',
      note: '(' + a + ' + ' + b + ' + ' + c + ') × 4 = ' + (a + b + c) * 4 + 'cm'
    });
  }
  function cubeEdgeQ() {
    const a = U.randInt(2, 15);
    return num('へんの 長さの 合計', figQ('1辺が <b>' + a + 'cm</b>の 立方体。へんの 長さの 合計は 何cm？', boxSvg(true)), a * 12, {
      key: 'ce:' + a, scratch: false, maxLen: 4,
      hint: '立方体の へんは 12本。ぜんぶ 同じ 長さ。',
      note: a + ' × 12 = ' + a * 12 + 'cm'
    });
  }
  function boxDimQ() {
    const a = U.randInt(2, 12), b = U.randInt(2, 12), c = U.randInt(2, 12);
    const which = pf([['たて', a], ['よこ', b], ['高さ', c]]);
    return num('同じ 長さの へん', 'たて <b>' + a + 'cm</b>、よこ <b>' + b + 'cm</b>、高さ <b>' + c + 'cm</b>の 直方体。<br>' + which[0] + 'と 同じ 長さの へんは ぜんぶで 何本？', 4, {
      key: 'bd:' + which[0], scratch: false, maxLen: 2,
      hint: '直方体では 同じ 長さの へんが 4本ずつ 3くみ あるよ。',
      note: which[0] + 'の へんは 4本'
    });
  }

  const stage15 = {
    easy: [boxFactQ, boxNameQ, boxShapeQ],
    normal: [netQ, boxShapeQ, cubeEdgeQ, boxFactQ],
    hard: [boxEdgeQ, netQ, boxDimQ, cubeEdgeQ],
    boss: [boxEdgeQ, netQ, boxDimQ, boxShapeQ]
  };

  /* =======================================================
     まとめて 出す
     ======================================================= */
  const stages = {
    1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8,
    9: stage9, 10: stage10, 11: stage11, 12: stage12, 13: stage13, 14: stage14, 15: stage15
  };

  // 図を 見る ため（tools/harness.html #figs4）
  const figs4 = {
    lineGraphSvg: lineGraphSvg, angleSvg: angleSvg, straightSvg: straightSvg, linesSvg: linesSvg, protractorSvg: protractorSvg,
    quadSvg: quadSvg, rectSvg: rectSvg, lShapeSvg: lShapeSvg, boxSvg: boxSvg, netSvg: netSvg,
    tableHtml: tableHtml, tableRows: tableRows, GRAPH4: GRAPH4
  };

  // maker を かたよらないように じゅんばんに 使う
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

  // n 問を やさしい → ふつう → むずかしい の わりあいで（12問なら 4/4/4）
  function levelCounts(n) {
    const easy = Math.ceil(n / 3);
    const hard = Math.floor(n / 3);
    return [easy, n - easy - hard, hard];
  }

  const TIERS = { 1: 'easy', 2: 'normal', 3: 'hard' };

  /* opts.boss … ボスの 問題だけ
     opts.lv   … その むずかしさ だけ（たからばこ など）
     どちらも ないときは やさしい → ふつう → むずかしい の じゅんで n 問 */
  function make(stageNo, n, opts) {
    const st = stages[stageNo];
    if (!st) return [];
    let plan;
    if (opts && opts.boss) {
      plan = [[st.boss, 3, n]];
    } else if (opts && opts.lv) {
      plan = [[st[TIERS[opts.lv]] || st.normal, opts.lv, n]];
    } else {
      const c = levelCounts(n);
      plan = [[st.easy, 1, c[0]], [st.normal, 2, c[1]], [st.hard, 3, c[2]]];
    }
    // 同じ問題が 2回 出ないように 作り直す（乱数の かたよりを ふせぐ）
    const out = [], seen = {};
    function idOf(q) { return 'sansu4-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }
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

  return { make: make, stages: stages, levelCounts: levelCounts, figs4: figs4 };
})();
