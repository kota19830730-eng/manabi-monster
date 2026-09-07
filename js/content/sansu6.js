/* ---------------------------------------------------------
   小6 算数：問題を その場で作る（日本文教出版『小学算数』6年の 単元の じゅん・v10.6）

   ステージ 1〜5 は 1学期、6〜11 は 2学期、12〜15 は 3学期（目安。学校で 前後する）。
   出すか どうかは 学期の しくみ（terms.js・おうちの人ページ）が 決める。

   ステージごとに 4つの グループ（easy / normal / hard / boss）。sansu5.js と 同じ 形。

   ことばの きまり：小5までの かん字 ＋ 6年の 単元の かん字（G6_EXTRA＝称拡縮値割捨展尺）。
   むずかしい 字は ふりがな（<ruby>）を つける：対称・拡大図・縮図・比の値・割合・
   四捨五入・展開図。ほかの 6年・中学の 字は ひらがな（ならべ方・さいひん値 など）。
   tools/smoke.js が 1問ずつ 検査する。

   答えの 形は 小5と 同じ：number（decimal つき）・choice・frac（分子と 分母）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu6 = (function () {
  const U = MQ.util;

  /* =======================================================
     問題を作る 小さな道具（sansu5.js と そろえて ある）
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
  // 分数の 答え（分子 n・分母 d）。約分ずみの 形で 入れる きまり
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

  // 分数の 見た目（画面）と 文字（ヒント・note・choices）
  function fr(n, d) { return '<span class="frac"><span class="frac__n">' + n + '</span><span class="frac__d">' + d + '</span></span>'; }
  function ft(n, d) { return d + '分の' + n; }
  function red(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
  function frt(n, d) { const r = red(n, d); return ft(r[0], r[1]); }

  // ふりがな（prompt だけ HTML が 使える）
  const TAISHO = '対<ruby>称<rt>しょう</rt></ruby>';
  const KAKUDAI = '<ruby>拡<rt>かく</rt></ruby>大図';
  const SHUKU = '<ruby>縮<rt>しゅく</rt></ruby>図';
  const SHUKUSHAKU = '<ruby>縮尺<rt>しゅくしゃく</rt></ruby>';
  const ATAI = '<ruby>値<rt>あたい</rt></ruby>';
  const WARI = '<ruby>割<rt>わり</rt></ruby>合';

  /* =======================================================
     図の 道具（inline SVG）。色は sansu3/4/5 と そろえる
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
  function circ(cx, cy, r, fill, stroke, sw, dash) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || FF) + '" stroke="' + (stroke || FS) + '" stroke-width="' + (sw || 3.4) + '"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>';
  }
  function dot(x, y, color) { return '<circle cx="' + x + '" cy="' + y + '" r="3.2" fill="' + (color || FR) + '"/>'; }

  // 正多角形の 点（上を とがらせる）
  function regPts(n, cx, cy, r, rot) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (rot == null ? -Math.PI / 2 : rot) + i * 2 * Math.PI / n;
      out.push([Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10]);
    }
    return out;
  }

  /* ---- 対称な 図形（ステージ1）---- */
  const SHAPES6 = [
    { id: 'seisan', name: '正三角形', axes: 3, point: false },
    { id: 'nitohen', name: '二等辺三角形', axes: 1, point: false },
    { id: 'chohokei', name: '長方形', axes: 2, point: true },
    { id: 'seihokei', name: '正方形', axes: 4, point: true },
    { id: 'hishi', name: 'ひし形', axes: 2, point: true },
    { id: 'heiko', name: '平行四辺形', axes: 0, point: true },
    { id: 'daikei', name: '台形', axes: 0, point: false },
    { id: 'seigo', name: '正五角形', axes: 5, point: false },
    { id: 'seiroku', name: '正六角形', axes: 6, point: true },
    { id: 'en', name: '円', axes: -1, point: true }
  ];
  function symSvg(id, axis) {
    const cx = 80, cy = 60;
    let s = '';
    if (id === 'seisan') s = poly(regPts(3, cx, cy + 6, 44));
    else if (id === 'nitohen') s = poly([[cx, cy - 40], [cx + 32, cy + 38], [cx - 32, cy + 38]]);
    else if (id === 'chohokei') s = poly([[cx - 52, cy - 28], [cx + 52, cy - 28], [cx + 52, cy + 28], [cx - 52, cy + 28]]);
    else if (id === 'seihokei') s = poly([[cx - 38, cy - 38], [cx + 38, cy - 38], [cx + 38, cy + 38], [cx - 38, cy + 38]]);
    else if (id === 'hishi') s = poly([[cx, cy - 42], [cx + 44, cy], [cx, cy + 42], [cx - 44, cy]]);
    else if (id === 'heiko') s = poly([[cx - 36, cy + 28], [cx + 52, cy + 28], [cx + 36, cy - 28], [cx - 52, cy - 28]]);
    else if (id === 'daikei') s = poly([[cx - 50, cy + 30], [cx + 50, cy + 30], [cx + 26, cy - 30], [cx - 18, cy - 30]]);
    else if (id === 'seigo') s = poly(regPts(5, cx, cy + 2, 44));
    else if (id === 'seiroku') s = poly(regPts(6, cx, cy, 44));
    else s = circ(cx, cy, 42);
    if (axis) s += line([cx, 8], [cx, 112], FR, 2.4, true);
    return svgBox(s);
  }
  function symKindQ() {
    const sh = pf(SHAPES6.filter(function (s) { return s.axes !== -1; }));
    const both = sh.axes > 0 && sh.point;
    const ans = both ? '線' + TAISHO + 'でも 点' + TAISHO + 'でも ある'
      : sh.axes > 0 ? '線' + TAISHO + 'だけ'
        : sh.point ? '点' + TAISHO + 'だけ' : 'どちらでも ない';
    const plain = function (t) { return U.stripTags(t); };
    return choice(TAISHO + 'な 図形', figQ(sh.name + 'は？', symSvg(sh.id)),
      withDistractors(plain(ans), ['線対称でも 点対称でも ある', '線対称だけ', '点対称だけ', 'どちらでも ない']), {
        key: 'sk:' + sh.id,
        hint: '半分に おって ぴったり 重なれば 線対称。180度 回して 重なれば 点対称。',
        note: sh.name + 'は ' + plain(ans) + '。'
      });
  }
  function axesCountQ() {
    const sh = pf(SHAPES6.filter(function (s) { return s.axes > 0; }));
    return num(TAISHO + 'の じく', figQ(sh.name + 'の ' + TAISHO + 'の じくは 何本？', symSvg(sh.id, true)), sh.axes, {
      key: 'ax:' + sh.id, hint: 'おって ぴったり 重なる 線を さがそう。正多角形は 辺の 数と 同じ。',
      note: sh.name + 'の 対称の じくは ' + sh.axes + '本。'
    });
  }
  function pointSymQ() {
    const yes = pf(SHAPES6.filter(function (s) { return s.point; }));
    const no = U.shuffle(SHAPES6.filter(function (s) { return !s.point; })).slice(0, 3);
    return choice('点' + TAISHO, '点' + TAISHO + 'な 図形は どれ？', [yes.name].concat(no.map(function (s) { return s.name; })), {
      key: 'ps:' + yes.id, hint: '中心の まわりに 180度 回すと もとの 形に 重なる もの。',
      note: yes.name + 'は 点対称。'
    });
  }
  function lineSymQ() {
    const yes = pf(SHAPES6.filter(function (s) { return s.axes > 0; }));
    const no = U.shuffle(SHAPES6.filter(function (s) { return s.axes === 0; })).slice(0, 2);
    if (no.length < 2) return pointSymQ();
    return choice('線' + TAISHO, '線' + TAISHO + 'な 図形は どれ？', [yes.name].concat(no.map(function (s) { return s.name; })), {
      key: 'ls:' + yes.id, hint: '1本の 線で おって ぴったり 重なる もの。',
      note: yes.name + 'は 線対称。'
    });
  }
  function symLenQ() {
    const a = U.randInt(3, 12);
    const pt = pf(['ア', 'イ', 'ウ']);
    let s = poly([[24, 96], [64, 20], [96, 96]], FF);
    s += poly([[96, 96], [128, 20], [64, 20]], '#e8f2ff');
    s += line([80, 6], [80, 112], FR, 2.4, true);
    s += txt(80, 118, 'じく', 11, FR);
    s += txt(44, 62, pt, 12, FB) + txt(118, 62, '?', 12, FR);
    return num('対応する 辺', figQ('線' + TAISHO + 'な 図形です。辺 ' + pt + ' が ' + a + 'cm の とき、対応する 辺は 何cm？', svgBox(s)), a, {
      key: 'sl:' + a + ':' + pt, hint: '線対称な 図形では、対応する 辺の 長さは 同じ。',
      note: '対応する 辺なので 同じ ' + a + 'cm。'
    });
  }
  function symAngleQ() {
    const a = pf([35, 40, 55, 65, 70, 80, 110, 125]);
    let s = poly([[20, 30], [76, 30], [76, 96], [20, 96]], FF);
    s += poly([[84, 30], [140, 30], [140, 96], [84, 96]], '#e8f2ff');
    s += line([80, 8], [80, 112], FR, 2.4, true);
    s += txt(34, 46, a + '度', 11, FB) + txt(126, 46, '?', 12, FR);
    return num('対応する 角', figQ('点' + TAISHO + 'な 図形です。対応する 角が ' + a + '度の とき、この 角は 何度？', svgBox(s)), a, {
      key: 'sa:' + a, hint: '対称な 図形では、対応する 角の 大きさは 同じ。',
      note: '対応する 角なので ' + a + '度。'
    });
  }
  function symCountQ() {
    const list = U.shuffle(SHAPES6).slice(0, 4);
    const n = list.filter(function (s) { return s.point; }).length;
    return num('点' + TAISHO + 'の 数', list.map(function (s) { return s.name; }).join('・') + ' の 中で、点' + TAISHO + 'な 図形は いくつ？', n, {
      key: 'scn:' + list.map(function (s) { return s.id; }).sort().join(','),
      hint: '180度 回して もとの 形に 重なる ものを 数えよう。',
      note: list.filter(function (s) { return s.point; }).map(function (s) { return s.name; }).join('・') + ' の ' + n + 'つ。'
    });
  }
  const stage1 = {
    easy: [lineSymQ, pointSymQ, axesCountQ, symKindQ],
    normal: [symKindQ, axesCountQ, symLenQ, symAngleQ],
    hard: [symCountQ, symKindQ, symAngleQ, symLenQ],
    boss: [symCountQ, symKindQ, axesCountQ, symLenQ]
  };

  /* =======================================================
     ステージ2 文字と 式
     ======================================================= */
  const ITEMS6 = [['りんご', 'こ'], ['ノート', 'さつ'], ['えんぴつ', '本'], ['クッキー', 'まい'], ['ジュース', '本']];
  function exprMakeQ() {
    const it = pf(ITEMS6), n = U.randInt(3, 9);
    return choice('式に あらわす', '1' + it[1] + ' <span class="num">x</span> 円の ' + it[0] + 'を ' + n + it[1] + ' 買った ときの 代金を 式で あらわすと？',
      ['x × ' + n, 'x + ' + n, 'x − ' + n, 'x ÷ ' + n], {
        key: 'em:' + it[0] + ':' + n, hint: '1つぶんの ねだん × 数 ＝ 代金。',
        note: 'x × ' + n + ' 円。'
      });
  }
  function exprPlusQ() {
    const it = pf(ITEMS6), n = U.randInt(2, 8), box = U.randInt(50, 200);
    return choice('式に あらわす', '1' + it[1] + ' <span class="num">x</span> 円の ' + it[0] + 'を ' + n + it[1] + ' 買い、' + box + ' 円の ふくろに 入れました。代金を 式で あらわすと？',
      ['x × ' + n + ' + ' + box, 'x + ' + n + ' + ' + box, '(x + ' + box + ') × ' + n, 'x × ' + n + ' − ' + box], {
        key: 'ep:' + it[0] + ':' + n + ':' + box, hint: '品物の 代金に ふくろの ねだんを たす。',
        note: 'x × ' + n + ' + ' + box + ' 円。'
      });
  }
  function valueQ6() {
    const a = U.randInt(2, 9), b = U.randInt(1, 20), x = U.randInt(2, 12);
    return num('式の ' + ATAI, '<span class="num">x</span> = ' + x + ' の とき、<span class="num">' + a + ' × x + ' + b + '</span> の ' + ATAI + 'は?', a * x + b, {
      key: 'vq:' + a + ':' + b + ':' + x, hint: 'x の ところに ' + x + ' を 入れて 計算しよう。',
      note: a + ' × ' + x + ' + ' + b + ' = ' + (a * x + b)
    });
  }
  function valueMinusQ() {
    const a = U.randInt(3, 9), x = U.randInt(3, 12), b = U.randInt(1, a * x - 1);
    return num('式の ' + ATAI, '<span class="num">x</span> = ' + x + ' の とき、<span class="num">' + a + ' × x − ' + b + '</span> の ' + ATAI + 'は?', a * x - b, {
      key: 'vm:' + a + ':' + b + ':' + x, hint: '先に ' + a + ' × ' + x + ' を 計算しよう。',
      note: a + ' × ' + x + ' − ' + b + ' = ' + (a * x - b)
    });
  }
  function solveMulQ() {
    const a = U.randInt(3, 12), x = U.randInt(3, 15);
    return num('x を もとめる', '<span class="num">x × ' + a + ' = ' + a * x + '</span> の とき、x は いくつ？', x, {
      key: 'sm:' + a + ':' + x, hint: a * x + ' ÷ ' + a + ' で もとめられる。',
      note: 'x = ' + a * x + ' ÷ ' + a + ' = ' + x
    });
  }
  function solvePlusQ() {
    const x = U.randInt(5, 40), b = U.randInt(3, 30);
    return num('x を もとめる', '<span class="num">x + ' + b + ' = ' + (x + b) + '</span> の とき、x は いくつ？', x, {
      key: 'sp:' + b + ':' + x, hint: (x + b) + ' − ' + b + ' で もとめられる。',
      note: 'x = ' + (x + b) + ' − ' + b + ' = ' + x
    });
  }
  function solveMixQ() {
    const a = U.randInt(2, 8), b = U.randInt(2, 20), x = U.randInt(2, 12);
    return num('x を もとめる', '<span class="num">' + a + ' × x + ' + b + ' = ' + (a * x + b) + '</span> の とき、x は いくつ？', x, {
      key: 'sx:' + a + ':' + b + ':' + x, hint: 'まず ' + (a * x + b) + ' − ' + b + ' = ' + a * x + '。つぎに ' + a + ' で わる。',
      note: 'x = (' + (a * x + b) + ' − ' + b + ') ÷ ' + a + ' = ' + x
    });
  }
  function areaExprQ() {
    const h = U.randInt(3, 12);
    return choice('式に あらわす', 'たて ' + h + 'cm、よこ <span class="num">x</span> cm の 長方形の 面積を 式で あらわすと？',
      ['x × ' + h, 'x + ' + h, '(x + ' + h + ') × 2', 'x ÷ ' + h], {
        key: 'ae:' + h, hint: '長方形の 面積 ＝ たて × よこ。',
        note: 'x × ' + h + ' cm²。'
      });
  }
  function meaningQ() {
    const a = U.randInt(2, 9), it = pf(ITEMS6);
    return choice('式の 意味', '<span class="num">x × ' + a + '</span> は どんな ことを あらわして いる？',
      ['1' + it[1] + ' x 円の ' + it[0] + ' ' + a + it[1] + 'の 代金',
        'x 円と ' + a + ' 円を 合わせた 代金',
        'x 円を ' + a + '人で 分けた ときの 1人ぶん',
        'x 円から ' + a + ' 円 使った のこり'], {
        key: 'mn:' + a + ':' + it[0], hint: '×（かける）は「いくつぶん」を あらわす。',
        note: '1つぶん x 円が ' + a + it[1] + 'ぶん。'
      });
  }
  const stage2 = {
    easy: [exprMakeQ, areaExprQ, valueQ6, solveMulQ],
    normal: [exprPlusQ, valueMinusQ, solvePlusQ, meaningQ],
    hard: [solveMixQ, exprPlusQ, valueMinusQ, meaningQ],
    boss: [solveMixQ, exprPlusQ, meaningQ, valueQ6]
  };

  /* =======================================================
     ステージ3 分数の かけ算
     ======================================================= */
  function fracTimesIntQ() {
    const d = pf([3, 4, 5, 6, 7, 8, 9]), n = U.randInt(1, d - 1), k = U.randInt(2, 6);
    if (n * k % d === 0) return fracTimesIntQ();   // 答えが 整数に なる ものは 出さない
    return fracQ('分数 × 整数', fr(n, d) + ' × ' + k + ' は？ <span class="hintx">（かりの 分数で 答えよう）</span>', n * k, d, {
      key: 'fti:' + n + ':' + d + ':' + k, hint: '分子だけに ' + k + ' を かける。約分できたら する。',
      note: ft(n, d) + ' × ' + k + ' = ' + frt(n * k, d)
    });
  }
  function fracTimesFracQ() {
    const d1 = pf([2, 3, 4, 5, 6, 7]), n1 = U.randInt(1, d1 - 1);
    const d2 = pf([2, 3, 4, 5, 6, 7]), n2 = U.randInt(1, d2 - 1);
    return fracQ('分数 × 分数', fr(n1, d1) + ' × ' + fr(n2, d2) + ' は？', n1 * n2, d1 * d2, {
      key: 'ftf:' + n1 + ':' + d1 + ':' + n2 + ':' + d2,
      hint: '分子どうし、分母どうしを かける。約分を わすれずに。',
      note: ft(n1, d1) + ' × ' + ft(n2, d2) + ' = ' + frt(n1 * n2, d1 * d2)
    });
  }
  function fracTimesRedQ() {
    // かならず 約分が いる ように 作る
    const g = pf([2, 3, 4]), d1 = pf([3, 5, 7]), n1 = U.randInt(1, d1 - 1);
    const d2 = d1 * g, n2 = g * U.randInt(1, Math.max(1, Math.floor((d2 - 1) / g)));
    return fracQ('分数 × 分数', fr(n1, d1) + ' × ' + fr(n2, d2) + ' は？', n1 * n2, d1 * d2, {
      key: 'ftr:' + n1 + ':' + d1 + ':' + n2 + ':' + d2,
      hint: 'かける 前に ななめに 約分できるよ。',
      note: ft(n1, d1) + ' × ' + ft(n2, d2) + ' = ' + frt(n1 * n2, d1 * d2)
    });
  }
  function fracAreaQ() {
    const d1 = pf([2, 3, 4, 5]), n1 = U.randInt(1, d1 - 1);
    const d2 = pf([3, 4, 5, 6]), n2 = U.randInt(1, d2 - 1);
    return fracQ('面積', 'たて ' + fr(n1, d1) + ' m、よこ ' + fr(n2, d2) + ' m の 長方形の 面積は 何m²？', n1 * n2, d1 * d2, {
      key: 'fa:' + n1 + ':' + d1 + ':' + n2 + ':' + d2,
      hint: '面積 ＝ たて × よこ。分数どうしの かけ算。',
      note: ft(n1, d1) + ' × ' + ft(n2, d2) + ' = ' + frt(n1 * n2, d1 * d2) + ' m²'
    });
  }
  function fracWorkQ() {
    const d = pf([3, 4, 5, 6]), n = U.randInt(1, d - 1), k = U.randInt(2, 8);
    if (n * k % d === 0) return fracWorkQ();
    return fracQ('文しょうだい', '1m の 重さが ' + fr(n, d) + ' kg の ぼうが あります。この ぼう ' + k + 'm の 重さは 何kg？', n * k, d, {
      key: 'fw:' + n + ':' + d + ':' + k, hint: '1m ぶんの 重さ × 長さ。',
      note: ft(n, d) + ' × ' + k + ' = ' + frt(n * k, d) + ' kg'
    });
  }
  function reciprocalQ() {
    const d = pf([2, 3, 4, 5, 6, 7, 8, 9]), n = U.randInt(1, d - 1);
    return choice('ぎゃく数', fr(n, d) + ' の ぎゃく数は？',
      withDistractors(ft(d, n), [ft(d, n), ft(n, d), ft(d + 1, n), ft(d, n + 1)]), {
        key: 'rc:' + n + ':' + d, hint: '分子と 分母を 入れかえた 数が ぎゃく数。',
        note: ft(n, d) + ' の ぎゃく数は ' + ft(d, n) + '（かけると 1 に なる）。'
      });
  }
  function threeTimesQ() {
    const a = pf([2, 3, 4]), b = pf([3, 5, 7]), c = pf([2, 4, 5]);
    return fracQ('3つの かけ算', fr(1, a) + ' × ' + fr(1, b) + ' × ' + fr(1, c) + ' は？', 1, a * b * c, {
      key: 'tt:' + a + ':' + b + ':' + c, hint: '分母どうしを ぜんぶ かける。',
      note: ft(1, a) + ' × ' + ft(1, b) + ' × ' + ft(1, c) + ' = ' + frt(1, a * b * c)
    });
  }
  function fracCompareQ() {
    const d = pf([3, 4, 5, 6, 7]), n = U.randInt(1, d - 1);
    return choice('大きさの くらべ方', fr(n, d) + ' に ' + fr(1, pf([2, 3, 4])) + ' を かけると、答えは もとの 数と くらべて どう なる？',
      ['もとの 数より 小さく なる', 'もとの 数より 大きく なる', 'もとの 数と 同じに なる', '1 に なる'], {
        key: 'fc:' + n + ':' + d, hint: '1より 小さい 数を かけると、答えは もとより 小さく なる。',
        note: '1より 小さい 数を かけたので 小さく なる。'
      });
  }
  const stage3 = {
    easy: [fracTimesIntQ, fracTimesFracQ, reciprocalQ, fracWorkQ],
    normal: [fracTimesFracQ, fracTimesRedQ, fracAreaQ, fracWorkQ],
    hard: [fracTimesRedQ, threeTimesQ, fracAreaQ, fracCompareQ],
    boss: [fracTimesRedQ, threeTimesQ, fracAreaQ, fracTimesFracQ]
  };

  /* =======================================================
     ステージ4 分数の わり算
     ======================================================= */
  function fracDivIntQ() {
    const d = pf([3, 4, 5, 6, 7]), n = U.randInt(1, d - 1), k = U.randInt(2, 6);
    return fracQ('分数 ÷ 整数', fr(n, d) + ' ÷ ' + k + ' は？', n, d * k, {
      key: 'fdi:' + n + ':' + d + ':' + k, hint: '分母に ' + k + ' を かける（÷' + k + ' は ×' + ft(1, k) + '）。',
      note: ft(n, d) + ' ÷ ' + k + ' = ' + frt(n, d * k)
    });
  }
  function fracDivFracQ() {
    const d1 = pf([2, 3, 4, 5, 7]), n1 = U.randInt(1, d1 - 1);
    const d2 = pf([2, 3, 4, 5, 7]), n2 = U.randInt(1, d2 - 1);
    if (n1 * d2 % (d1 * n2) === 0) return fracDivFracQ();
    return fracQ('分数 ÷ 分数', fr(n1, d1) + ' ÷ ' + fr(n2, d2) + ' は？ <span class="hintx">（かりの 分数で 答えよう）</span>', n1 * d2, d1 * n2, {
      key: 'fdf:' + n1 + ':' + d1 + ':' + n2 + ':' + d2,
      hint: 'わる数の 分子と 分母を 入れかえて かける。',
      note: ft(n1, d1) + ' ÷ ' + ft(n2, d2) + ' = ' + ft(n1, d1) + ' × ' + ft(d2, n2) + ' = ' + frt(n1 * d2, d1 * n2)
    });
  }
  function intDivFracQ() {
    const k = U.randInt(2, 6), d = pf([3, 4, 5, 7]), n = U.randInt(2, d - 1);
    if (k * d % n === 0) return intDivFracQ();
    return fracQ('整数 ÷ 分数', k + ' ÷ ' + fr(n, d) + ' は？ <span class="hintx">（かりの 分数で 答えよう）</span>', k * d, n, {
      key: 'idf:' + k + ':' + n + ':' + d, hint: k + ' × ' + ft(d, n) + ' に なおして 計算しよう。',
      note: k + ' ÷ ' + ft(n, d) + ' = ' + k + ' × ' + ft(d, n) + ' = ' + frt(k * d, n)
    });
  }
  function fracDivWorkQ() {
    const d = pf([3, 4, 5]), n = U.randInt(1, d - 1), k = U.randInt(2, 5);
    return fracQ('文しょうだい', fr(n, d) + ' L の ジュースを ' + k + '人で 同じ 量ずつ 分けます。1人ぶんは 何L？', n, d * k, {
      key: 'fdw:' + n + ':' + d + ':' + k, hint: '全体 ÷ 人数。',
      note: ft(n, d) + ' ÷ ' + k + ' = ' + frt(n, d * k) + ' L'
    });
  }
  function fracDivLenQ() {
    const d1 = pf([2, 3, 4, 5]), n1 = U.randInt(1, d1 - 1);
    const d2 = pf([2, 3, 4, 5]), n2 = U.randInt(1, d2 - 1);
    if (n2 * d1 % (d2 * n1) === 0) return fracDivLenQ();
    return fracQ('文しょうだい', fr(n1, d1) + ' m の ぼうの 重さが ' + fr(n2, d2) + ' kg です。この ぼう 1m の 重さは 何kg？',
      n2 * d1, d2 * n1, {
        key: 'fdl:' + n1 + ':' + d1 + ':' + n2 + ':' + d2,
        hint: '重さ ÷ 長さ で 1m ぶんが 出る。',
        note: ft(n2, d2) + ' ÷ ' + ft(n1, d1) + ' = ' + frt(n2 * d1, d2 * n1) + ' kg'
      });
  }
  function divBigQ() {
    const d = pf([3, 4, 5, 6]), n = U.randInt(1, d - 1);
    return choice('商の 大きさ', 'ある 数を ' + fr(n, d) + ' で わると、商は もとの 数と くらべて どう なる？',
      ['もとの 数より 大きく なる', 'もとの 数より 小さく なる', 'もとの 数と 同じに なる', '1 に なる'], {
        key: 'db:' + n + ':' + d, hint: '1より 小さい 数で わると、商は もとより 大きく なる。',
        note: ft(n, d) + ' は 1より 小さい ので 商は 大きく なる。'
      });
  }
  function divMulQ() {
    const d1 = pf([2, 3, 5]), n1 = U.randInt(1, d1 - 1);
    const k = U.randInt(2, 5), d2 = pf([3, 4, 5]), n2 = U.randInt(1, d2 - 1);
    if (n1 * k * d2 % (d1 * n2) === 0) return divMulQ();
    return fracQ('かけ算と わり算', fr(n1, d1) + ' × ' + k + ' ÷ ' + fr(n2, d2) + ' は？ <span class="hintx">（かりの 分数で 答えよう）</span>',
      n1 * k * d2, d1 * n2, {
        key: 'dm:' + n1 + ':' + d1 + ':' + k + ':' + n2 + ':' + d2,
        hint: 'わり算は ぎゃく数の かけ算に なおして、まとめて 計算しよう。',
        note: ft(n1, d1) + ' × ' + k + ' × ' + ft(d2, n2) + ' = ' + frt(n1 * k * d2, d1 * n2)
      });
  }
  const stage4 = {
    easy: [fracDivIntQ, fracDivFracQ, fracDivWorkQ, divBigQ],
    normal: [fracDivFracQ, intDivFracQ, fracDivWorkQ, divBigQ],
    hard: [fracDivLenQ, divMulQ, intDivFracQ, fracDivFracQ],
    boss: [fracDivLenQ, divMulQ, intDivFracQ, fracDivFracQ]
  };

  /* =======================================================
     ステージ5 分数・小数・整数の 計算
     ======================================================= */
  const DEC2FRAC = [[0.5, 1, 2], [0.25, 1, 4], [0.75, 3, 4], [0.2, 1, 5], [0.4, 2, 5], [0.6, 3, 5], [0.8, 4, 5], [0.125, 1, 8], [0.375, 3, 8], [0.625, 5, 8]];
  function decToFracQ() {
    const p = pf(DEC2FRAC);
    return fracQ('小数を 分数に', '<span class="num">' + fx(p[0]) + '</span> を 分数で あらわすと？', p[1], p[2], {
      key: 'd2f:' + p[0], hint: fx(p[0]) + ' は ' + (String(p[0]).length - 2) + 'けたの 小数。分母を 10・100・1000 に して 約分しよう。',
      note: fx(p[0]) + ' = ' + ft(p[1], p[2])
    });
  }
  function fracToDecQ() {
    const p = pf(DEC2FRAC);
    return dec('分数を 小数に', fr(p[1], p[2]) + ' を 小数で あらわすと？', p[0], {
      scratch: true, key: 'f2d:' + p[0], hint: '分子 ÷ 分母 で 計算しよう。',
      note: ft(p[1], p[2]) + ' = ' + fx(p[0])
    });
  }
  function decTimesFracQ() {
    const p = pf(DEC2FRAC), d = pf([3, 5, 7]), n = U.randInt(1, d - 1);
    return fracQ('小数 × 分数', '<span class="num">' + fx(p[0]) + '</span> × ' + fr(n, d) + ' は？', p[1] * n, p[2] * d, {
      key: 'dtf:' + p[0] + ':' + n + ':' + d, hint: '小数を 分数に なおしてから かけよう（' + fx(p[0]) + ' = ' + ft(p[1], p[2]) + '）。',
      note: ft(p[1], p[2]) + ' × ' + ft(n, d) + ' = ' + frt(p[1] * n, p[2] * d)
    });
  }
  function decDivFracQ() {
    const p = pf(DEC2FRAC), d = pf([3, 4, 5]), n = U.randInt(1, d - 1);
    if (p[1] * d % (p[2] * n) === 0) return decDivFracQ();
    return fracQ('小数 ÷ 分数', '<span class="num">' + fx(p[0]) + '</span> ÷ ' + fr(n, d) + ' は？ <span class="hintx">（かりの 分数で 答えよう）</span>', p[1] * d, p[2] * n, {
      key: 'ddf:' + p[0] + ':' + n + ':' + d, hint: fx(p[0]) + ' = ' + ft(p[1], p[2]) + ' に なおして、ぎゃく数を かけよう。',
      note: ft(p[1], p[2]) + ' × ' + ft(d, n) + ' = ' + frt(p[1] * d, p[2] * n)
    });
  }
  function mixCompareQ() {
    const p = pf(DEC2FRAC.filter(function (x) { return x[0] !== 0.5; }));
    const other = 0.5;
    const big = p[0] > other ? ft(p[1], p[2]) : '0.5';
    const small = p[0] > other ? '0.5' : ft(p[1], p[2]);
    return choice('大きさくらべ', fr(p[1], p[2]) + ' と <span class="num">0.5</span>。大きいのは？', [big, small], {
      key: 'mc:' + p[0], hint: '分数を 小数に なおすと くらべやすい（' + ft(p[1], p[2]) + ' = ' + fx(p[0]) + '）。',
      note: fx(p[0]) + ' と 0.5 を くらべると ' + big + ' の ほう。'
    });
  }
  function threeMixQ() {
    const p = pf(DEC2FRAC), d = pf([3, 5]), n = U.randInt(1, d - 1), k = U.randInt(2, 4);
    if (p[1] * n * k % (p[2] * d) === 0) return threeMixQ();
    return fracQ('まざった 計算', '<span class="num">' + fx(p[0]) + '</span> × ' + fr(n, d) + ' × ' + k + ' は？', p[1] * n * k, p[2] * d, {
      key: 'tm:' + p[0] + ':' + n + ':' + d + ':' + k, hint: '小数を 分数に なおして、まとめて かけよう。',
      note: ft(p[1], p[2]) + ' × ' + ft(n, d) + ' × ' + k + ' = ' + frt(p[1] * n * k, p[2] * d)
    });
  }
  function orderQ() {
    return choice('計算の じゅんじょ', '小数と 分数が まざった かけ算・わり算は、ふつう どう 計算する？',
      ['小数を 分数に なおして 計算する', '分数を かならず 小数に なおす', '先に たし算を する', 'どちらでも 答えは 変わるので できない'], {
        key: 'oq', hint: '0.3 の ような 小数は 分数に すると きっちり 計算できる。',
        note: '分数に そろえると 約分できて かんたん。'
      });
  }
  const stage5 = {
    easy: [decToFracQ, fracToDecQ, mixCompareQ, orderQ],
    normal: [decTimesFracQ, decToFracQ, mixCompareQ, fracToDecQ],
    hard: [decDivFracQ, threeMixQ, decTimesFracQ, mixCompareQ],
    boss: [decDivFracQ, threeMixQ, decTimesFracQ, decToFracQ]
  };

  /* =======================================================
     ステージ6 比
     ======================================================= */
  function ratioValueQ() {
    const a = U.randInt(2, 12), b = U.randInt(2, 12);
    if (a === b || a % b === 0) return ratioValueQ();   // 比の 値が 整数に なる ものは 出さない
    return fracQ('比の ' + ATAI, '<span class="num">' + a + ' : ' + b + '</span> の 比の ' + ATAI + 'は？', a, b, {
      key: 'rv:' + a + ':' + b, hint: '比の 値は 「前 ÷ 後ろ」＝ ' + ft(a, b) + '。',
      note: a + ' : ' + b + ' の 比の 値は ' + frt(a, b)
    });
  }
  function simplifyQ() {
    const g = pf([2, 3, 4, 5, 6]), a = U.randInt(2, 9), b = U.randInt(2, 9);
    if (gcd(a, b) !== 1) return simplifyQ();
    const A = a * g, B = b * g;
    return choice('かんたんな 比', '<span class="num">' + A + ' : ' + B + '</span> を いちばん かんたんな 比に すると？',
      withDistractors(a + ' : ' + b, [a + ' : ' + b, A + ' : ' + b, a + ' : ' + B, (a + 1) + ' : ' + b]), {
        key: 'sq:' + A + ':' + B, hint: '両方を 同じ 数（' + g + '）で わろう。',
        note: A + ' : ' + B + ' = ' + a + ' : ' + b
      });
  }
  function findRatioQ() {
    const a = U.randInt(2, 9), b = U.randInt(2, 9), k = U.randInt(2, 8);
    return num('等しい 比', '<span class="num">' + a + ' : ' + b + ' = ' + a * k + ' : x</span> の とき、x は いくつ？', b * k, {
      key: 'fr:' + a + ':' + b + ':' + k, hint: a + ' が ' + a * k + ' に なったので ' + k + '倍。' + b + ' も ' + k + '倍。',
      note: 'x = ' + b + ' × ' + k + ' = ' + b * k
    });
  }
  function shareQ() {
    const a = U.randInt(1, 6), b = U.randInt(1, 6), unit = U.randInt(5, 40);
    const total = (a + b) * unit;
    return num('比で 分ける', total + ' 円を ' + a + ' : ' + b + ' の ' + WARI + 'で 分けます。多い ほうは 何円？',
      Math.max(a, b) * unit, {
        key: 'sh:' + a + ':' + b + ':' + unit, hint: '全体を ' + (a + b) + ' つに 分けて、その ' + Math.max(a, b) + ' つぶん。',
        note: total + ' ÷ ' + (a + b) + ' × ' + Math.max(a, b) + ' = ' + Math.max(a, b) * unit + ' 円'
      });
  }
  function shareBothQ() {
    const a = U.randInt(1, 5), b = U.randInt(1, 5), unit = U.randInt(4, 20);
    const total = (a + b) * unit;
    return num('比で 分ける', '長さ ' + total + 'cm の テープを ' + a + ' : ' + b + ' に 分けます。みじかい ほうは 何cm？',
      Math.min(a, b) * unit, {
        key: 'sb:' + a + ':' + b + ':' + unit, hint: '1つぶんは ' + total + ' ÷ ' + (a + b) + ' = ' + unit + 'cm。',
        note: unit + ' × ' + Math.min(a, b) + ' = ' + Math.min(a, b) * unit + 'cm'
      });
  }
  function ratioMakeQ() {
    const a = U.randInt(2, 12), b = U.randInt(2, 12);
    return choice('比を つくる', '男子 ' + a + '人、女子 ' + b + '人の クラスです。男子と 女子の 人数の 比は？',
      withDistractors(a + ' : ' + b, [a + ' : ' + b, b + ' : ' + a, (a + b) + ' : ' + a, a + ' : ' + (a + b)]), {
        key: 'rm:' + a + ':' + b, hint: '聞かれた じゅんばんに ならべる。',
        note: '男子 : 女子 ＝ ' + a + ' : ' + b
      });
  }
  function ratioUnitQ() {
    const m = U.randInt(2, 9), cm = U.randInt(10, 90);
    return choice('たんいを そろえる', '<span class="num">' + m + ' m</span> と <span class="num">' + cm + ' cm</span> の 比を かんたんに すると？',
      withDistractors(red(m * 100, cm)[0] + ' : ' + red(m * 100, cm)[1],
        [red(m * 100, cm)[0] + ' : ' + red(m * 100, cm)[1], m + ' : ' + cm, cm + ' : ' + m, (m * 100) + ' : ' + cm]), {
        key: 'ru:' + m + ':' + cm, hint: 'まず たんいを cm に そろえる（' + m + 'm = ' + m * 100 + 'cm）。',
        note: m * 100 + ' : ' + cm + ' = ' + red(m * 100, cm)[0] + ' : ' + red(m * 100, cm)[1]
      });
  }
  function ratioFindTotalQ() {
    const a = U.randInt(2, 6), b = U.randInt(2, 6), unit = U.randInt(3, 15);
    return num('全体を もとめる', 'すと 油の 量の 比を ' + a + ' : ' + b + ' に します。すが ' + a * unit + ' mL の とき、油は 何mL？',
      b * unit, {
        key: 'rt:' + a + ':' + b + ':' + unit, hint: a + ' が ' + a * unit + ' なので ' + unit + '倍。',
        note: b + ' × ' + unit + ' = ' + b * unit + ' mL'
      });
  }
  const stage6 = {
    easy: [ratioMakeQ, ratioValueQ, simplifyQ, findRatioQ],
    normal: [simplifyQ, findRatioQ, ratioFindTotalQ, ratioValueQ],
    hard: [shareQ, shareBothQ, ratioUnitQ, ratioFindTotalQ],
    boss: [shareQ, shareBothQ, ratioUnitQ, findRatioQ]
  };

  /* =======================================================
     ステージ7 拡大図と 縮図
     ======================================================= */
  function scaleSvg(k) {
    let s = poly([[16, 92], [56, 92], [56, 62]], FF);
    s += txt(36, 106, '4cm', 11, FB);
    const w = Math.min(70, 40 * k);
    s += poly([[74, 92], [74 + w, 92], [74 + w, 92 - w * 0.75]], '#e8f2ff');
    s += txt(74 + w / 2, 106, '?', 12, FR);
    return svgBox(s);
  }
  function scaleLenQ() {
    const k = pf([2, 3, 4]), a = U.randInt(2, 9);
    return num(KAKUDAI, figQ('左の 三角形の ' + k + '倍の ' + KAKUDAI + 'を かきます。' + a + 'cm の 辺は 何cm に なる？', scaleSvg(k)), a * k, {
      key: 'sl6:' + k + ':' + a, hint: KAKUDAI + 'では、辺の 長さが ぜんぶ ' + k + '倍に なる。',
      note: a + ' × ' + k + ' = ' + a * k + 'cm'
    });
  }
  function reduceLenQ() {
    const k = pf([2, 3, 4]), a = U.randInt(2, 9) * k;
    return num(SHUKU, ft(1, k) + ' の ' + SHUKU + 'を かきます。' + a + 'cm の 辺は 何cm に なる？', a / k, {
      key: 'rl:' + k + ':' + a, hint: SHUKU + 'では、辺の 長さが ' + ft(1, k) + ' に なる。',
      note: a + ' ÷ ' + k + ' = ' + a / k + 'cm'
    });
  }
  function scaleAngleQ() {
    const ang = pf([35, 40, 55, 60, 70, 85, 105]), k = pf([2, 3, 4]);
    return num('角の 大きさ', '三角形の ' + k + '倍の ' + KAKUDAI + 'を かきました。もとの 図の ' + ang + '度の 角は、' + KAKUDAI + 'では 何度？', ang, {
      key: 'sa6:' + ang + ':' + k, hint: KAKUDAI + 'でも ' + SHUKU + 'でも、角の 大きさは 変わらない。',
      note: '角の 大きさは そのまま ' + ang + '度。'
    });
  }
  function scaleRatioQ() {
    const k = pf([2, 3, 4, 5]), a = U.randInt(2, 8);
    return choice('何倍の 図', 'もとの 図の ' + a + 'cm の 辺が ' + a * k + 'cm に なりました。これは 何倍の ' + KAKUDAI + '？',
      withDistractors(k + '倍', [k + '倍', (k + 1) + '倍', ft(1, k) + '', (k * 2) + '倍']), {
        key: 'sr:' + k + ':' + a, hint: a * k + ' ÷ ' + a + ' で もとめられる。',
        note: a * k + ' ÷ ' + a + ' = ' + k + '倍。'
      });
  }
  function realLenQ() {
    const sc = pf([1000, 2000, 5000, 10000]), cm = U.randInt(2, 9);
    const m = sc * cm / 100;
    return num(SHUKUSHAKU, SHUKUSHAKU + ' ' + ft(1, sc) + ' の 地図で、' + cm + 'cm の 長さは 実さいには 何m？', m, {
      key: 'rl6:' + sc + ':' + cm, hint: cm + ' × ' + sc + ' = ' + cm * sc + 'cm。100 で わって m に する。',
      note: cm * sc + 'cm = ' + m + 'm'
    });
  }
  function mapLenQ() {
    const sc = pf([1000, 2000, 5000]), m = sc / 100 * U.randInt(2, 8);
    const cm = m * 100 / sc;
    return num(SHUKUSHAKU, SHUKUSHAKU + ' ' + ft(1, sc) + ' の 地図では、実さい ' + m + 'm の 長さは 何cm に なる？', cm, {
      key: 'ml:' + sc + ':' + m, hint: m + 'm = ' + m * 100 + 'cm。それを ' + sc + ' で わる。',
      note: m * 100 + ' ÷ ' + sc + ' = ' + cm + 'cm'
    });
  }
  function heightQ6() {
    const k = pf([200, 300, 500]), cm = U.randInt(2, 9);
    return num(SHUKU + 'の 利用', '木の ' + ft(1, k) + ' の ' + SHUKU + 'を かいたら、木の 高さが ' + cm + 'cm でした。実さいの 高さは 何m？',
      k * cm / 100, {
        key: 'hq:' + k + ':' + cm, hint: cm + ' × ' + k + ' = ' + cm * k + 'cm。m に なおそう。',
        note: cm * k + 'cm = ' + (k * cm / 100) + 'm'
      });
  }
  function sameShapeQ() {
    return choice(KAKUDAI + 'と ' + SHUKU, KAKUDAI + 'や ' + SHUKU + 'に ついて、正しい ものは？',
      ['対応する 角の 大きさは 変わらない', '対応する 角の 大きさも 何倍かに なる', '辺の 長さは 変わらない', '形が 変わって しまう'], {
        key: 'ss', hint: '形は 同じで 大きさだけ ちがう。',
        note: '辺の 長さは 何倍かに なるが、角の 大きさは 同じ。'
      });
  }
  const stage7 = {
    easy: [scaleLenQ, scaleAngleQ, sameShapeQ, scaleRatioQ],
    normal: [reduceLenQ, scaleRatioQ, scaleLenQ, scaleAngleQ],
    hard: [realLenQ, mapLenQ, heightQ6, reduceLenQ],
    boss: [realLenQ, heightQ6, mapLenQ, scaleRatioQ]
  };

  /* =======================================================
     ステージ8 円の 面積
     ======================================================= */
  function circleSvg6(kind, label) {
    const cx = 80, cy = 60, r = 42;
    let s = '';
    if (kind === 'half') {
      s += '<path d="M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy + ' Z" fill="' + FF + '" stroke="' + FS + '" stroke-width="3.4"/>';
      s += line([cx, cy], [cx + r, cy], FR, 2.2, true) + dot(cx, cy);
      s += txt(cx + r / 2, cy - 5, label, 11, FR);
    } else if (kind === 'quarter') {
      s += '<path d="M ' + cx + ' ' + cy + ' L ' + (cx + r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 0 ' + cx + ' ' + (cy - r) + ' Z" fill="' + FF + '" stroke="' + FS + '" stroke-width="3.4"/>';
      s += txt(cx + r / 2, cy - 5, label, 11, FR) + dot(cx, cy);
    } else if (kind === 'ring') {
      s += circ(cx, cy, r, FF) + circ(cx, cy, r * 0.55, '#ffffff');
      s += line([cx, cy], [cx + r, cy], FR, 2.2, true);
      s += txt(cx + r / 2, cy - 5, label, 11, FR) + dot(cx, cy);
    } else {
      s += circ(cx, cy, r);
      s += line([cx, cy], [cx + r, cy], FR, 2.2, true) + dot(cx, cy);
      s += txt(cx + r / 2, cy - 5, label, 11, FR);
    }
    return svgBox(s);
  }
  function circleAreaQ() {
    const r = U.randInt(2, 10);
    return dec('円の 面積', figQ('半径 ' + r + 'cm の 円の 面積は 何cm²？（円周率は 3.14）', circleSvg6('circle', r + 'cm')), r * r * 3.14, {
      key: 'ca:' + r, hint: '半径 × 半径 × 3.14。',
      note: r + ' × ' + r + ' × 3.14 = ' + fx(r * r * 3.14) + ' cm²'
    });
  }
  function circleAreaDiaQ() {
    const r = U.randInt(2, 9), d = r * 2;
    return dec('円の 面積', '直径 ' + d + 'cm の 円の 面積は 何cm²？（円周率は 3.14）', r * r * 3.14, {
      key: 'cd:' + d, hint: '半径は 直径の 半分（' + r + 'cm）。半径 × 半径 × 3.14。',
      note: r + ' × ' + r + ' × 3.14 = ' + fx(r * r * 3.14) + ' cm²'
    });
  }
  function circumferenceQ() {
    const r = U.randInt(2, 12);
    return dec('円周', '半径 ' + r + 'cm の 円の 円周は 何cm？（円周率は 3.14）', r * 2 * 3.14, {
      key: 'cf:' + r, hint: '直径 × 3.14。直径は ' + r * 2 + 'cm。',
      note: r * 2 + ' × 3.14 = ' + fx(r * 2 * 3.14) + ' cm'
    });
  }
  function halfCircleQ() {
    const r = pf([2, 4, 6, 8, 10]);
    return dec('半円の 面積', figQ('半径 ' + r + 'cm の 半円の 面積は 何cm²？（円周率は 3.14）', circleSvg6('half', r + 'cm')), r * r * 3.14 / 2, {
      key: 'hc:' + r, hint: '円の 面積を もとめて 2 で わる。',
      note: r + ' × ' + r + ' × 3.14 ÷ 2 = ' + fx(r * r * 3.14 / 2) + ' cm²'
    });
  }
  function quarterCircleQ() {
    const r = pf([2, 4, 6, 8, 10]);
    return dec('4分の1の 円', figQ('半径 ' + r + 'cm の 円を 4等分した 図の 面積は 何cm²？（円周率は 3.14）', circleSvg6('quarter', r + 'cm')), r * r * 3.14 / 4, {
      key: 'qc:' + r, hint: '円の 面積 ÷ 4。',
      note: r + ' × ' + r + ' × 3.14 ÷ 4 = ' + fx(r * r * 3.14 / 4) + ' cm²'
    });
  }
  function ringAreaQ() {
    const R = pf([4, 6, 8, 10]), r = R / 2;
    return dec('わの 面積', figQ('外がわの 半径 ' + R + 'cm、内がわの 半径 ' + r + 'cm の わの 面積は 何cm²？（円周率は 3.14）', circleSvg6('ring', R + 'cm')),
      (R * R - r * r) * 3.14, {
        key: 'ra:' + R, hint: '大きい 円の 面積から 小さい 円の 面積を ひく。',
        note: '(' + R * R + ' − ' + r * r + ') × 3.14 = ' + fx((R * R - r * r) * 3.14) + ' cm²'
      });
  }
  function radiusFromAreaQ() {
    const r = U.randInt(2, 9);
    return num('半径を もとめる', '面積が ' + fx(r * r * 3.14) + ' cm² の 円が あります。半径は 何cm？（円周率は 3.14）', r, {
      key: 'rf:' + r, hint: '面積 ÷ 3.14 = 半径 × 半径。同じ 数を 2回 かけて ' + r * r + ' に なる 数は？',
      note: fx(r * r * 3.14) + ' ÷ 3.14 = ' + r * r + '。' + r + ' × ' + r + ' = ' + r * r + ' なので 半径は ' + r + 'cm。'
    });
  }
  function areaCompareQ() {
    const r = U.randInt(2, 6);
    return choice('面積の くらべ方', '半径を 2倍に すると、円の 面積は 何倍に なる？',
      ['4倍', '2倍', '3倍', '8倍'], {
        key: 'ac:' + r, hint: '半径 × 半径 なので、2 × 2 で 考える。',
        note: '半径が 2倍なら 面積は 2 × 2 ＝ 4倍。'
      });
  }
  const stage8 = {
    easy: [circleAreaQ, circumferenceQ, circleAreaDiaQ, areaCompareQ],
    normal: [circleAreaDiaQ, halfCircleQ, circleAreaQ, circumferenceQ],
    hard: [ringAreaQ, quarterCircleQ, radiusFromAreaQ, halfCircleQ],
    boss: [ringAreaQ, radiusFromAreaQ, quarterCircleQ, areaCompareQ]
  };

  /* =======================================================
     ステージ9 角柱と 円柱の 体積
     ======================================================= */
  function prismSvg6(kind) {
    let s = '';
    if (kind === 'cyl') {
      s += '<ellipse cx="80" cy="26" rx="34" ry="12" fill="' + FF + '" stroke="' + FS + '" stroke-width="3"/>';
      s += '<path d="M 46 26 L 46 92 A 34 12 0 0 0 114 92 L 114 26" fill="' + FF + '" stroke="' + FS + '" stroke-width="3"/>';
      s += line([80, 26], [114, 26], FR, 2.2, true);
      s += line([124, 26], [124, 92], FB, 2.2);
      s += txt(97, 20, '半径', 10, FR) + txt(136, 62, '高さ', 10, FB);
    } else if (kind === 'tri') {
      s += poly([[40, 30], [110, 30], [76, 14]], '#e8f2ff', FS, 3);
      s += poly([[40, 30], [40, 92], [76, 106], [76, 44]], FF, FS, 3);
      s += poly([[76, 44], [76, 106], [110, 92], [110, 30]], '#f5f0d8', FS, 3);
      s += line([124, 30], [124, 92], FB, 2.2) + txt(138, 64, '高さ', 10, FB);
    } else {
      s += poly([[34, 30], [104, 30], [126, 16], [56, 16]], '#e8f2ff', FS, 3);
      s += poly([[34, 30], [34, 92], [104, 92], [104, 30]], FF, FS, 3);
      s += poly([[104, 30], [126, 16], [126, 78], [104, 92]], '#f5f0d8', FS, 3);
      s += line([138, 30], [138, 92], FB, 2.2) + txt(150, 64, '高', 10, FB);
    }
    return svgBox(s);
  }
  function prismVolQ() {
    const base = U.randInt(4, 30), h = U.randInt(3, 15);
    return num('角柱の 体積', figQ('底面積が ' + base + 'cm²、高さが ' + h + 'cm の 角柱の 体積は 何cm³？', prismSvg6('prism')), base * h, {
      key: 'pv:' + base + ':' + h, hint: '角柱の 体積 ＝ 底面積 × 高さ。',
      note: base + ' × ' + h + ' = ' + base * h + ' cm³'
    });
  }
  function triPrismVolQ() {
    const b = U.randInt(2, 12), bh = U.randInt(2, 12), h = U.randInt(2, 12);
    if (b * bh % 2 !== 0) return triPrismVolQ();
    return num('三角柱の 体積', figQ('底面が 底辺 ' + b + 'cm・高さ ' + bh + 'cm の 三角形、高さ ' + h + 'cm の 三角柱の 体積は 何cm³？', prismSvg6('tri')),
      b * bh / 2 * h, {
        key: 'tv:' + b + ':' + bh + ':' + h, hint: 'まず 底面積（' + b + ' × ' + bh + ' ÷ 2）。それに 高さを かける。',
        note: b * bh / 2 + ' × ' + h + ' = ' + (b * bh / 2 * h) + ' cm³'
      });
  }
  function cylVolQ() {
    const r = U.randInt(2, 8), h = U.randInt(2, 12);
    return dec('円柱の 体積', figQ('底面の 半径 ' + r + 'cm、高さ ' + h + 'cm の 円柱の 体積は 何cm³？（円周率は 3.14）', prismSvg6('cyl')),
      r * r * 3.14 * h, {
        key: 'cv:' + r + ':' + h, hint: '底面積（半径 × 半径 × 3.14）× 高さ。',
        note: r + ' × ' + r + ' × 3.14 × ' + h + ' = ' + fx(r * r * 3.14 * h) + ' cm³'
      });
  }
  function baseFromVolQ() {
    const base = U.randInt(4, 30), h = U.randInt(2, 12);
    return num('底面積を もとめる', '体積が ' + base * h + 'cm³、高さが ' + h + 'cm の 角柱の 底面積は 何cm²？', base, {
      key: 'bf:' + base + ':' + h, hint: '体積 ÷ 高さ ＝ 底面積。',
      note: base * h + ' ÷ ' + h + ' = ' + base + ' cm²'
    });
  }
  function heightFromVolQ() {
    const base = U.randInt(4, 25), h = U.randInt(2, 12);
    return num('高さを もとめる', '体積が ' + base * h + 'cm³、底面積が ' + base + 'cm² の 角柱の 高さは 何cm？', h, {
      key: 'hf:' + base + ':' + h, hint: '体積 ÷ 底面積 ＝ 高さ。',
      note: base * h + ' ÷ ' + base + ' = ' + h + ' cm'
    });
  }
  function cubeVolQ() {
    const a = U.randInt(3, 12), b = U.randInt(2, 12), c = U.randInt(2, 12);
    return num('直方体の 体積', 'たて ' + a + 'cm、よこ ' + b + 'cm、高さ ' + c + 'cm の 直方体の 体積は 何cm³？', a * b * c, {
      key: 'cb:' + a + ':' + b + ':' + c, hint: 'たて × よこ × 高さ。底面積 × 高さ でも 同じ。',
      note: a + ' × ' + b + ' × ' + c + ' = ' + a * b * c + ' cm³'
    });
  }
  function volFormulaQ() {
    return choice('体積の 公式', '角柱でも 円柱でも つかえる 体積の 公式は？',
      ['底面積 × 高さ', 'たて × よこ', '底面積 ÷ 高さ', '半径 × 半径 × 3.14'], {
        key: 'vf', hint: 'どちらも 底面が そのまま 上まで つみ上がった 形。',
        note: '底面積 × 高さ。'
      });
  }
  const stage9 = {
    easy: [prismVolQ, cubeVolQ, volFormulaQ, baseFromVolQ],
    normal: [triPrismVolQ, cylVolQ, baseFromVolQ, cubeVolQ],
    hard: [cylVolQ, triPrismVolQ, heightFromVolQ, prismVolQ],
    boss: [cylVolQ, triPrismVolQ, heightFromVolQ, baseFromVolQ]
  };

  /* =======================================================
     ステージ10 およその 面積と 体積
     ======================================================= */
  const APPROX = [
    { name: '池', shape: '円', a: 'r' }, { name: '公園', shape: '長方形', a: 'rect' },
    { name: '島', shape: '三角形', a: 'tri' }, { name: '畑', shape: '台形', a: 'trap' }
  ];
  function approxShapeQ() {
    const p = pf(APPROX);
    return choice('およその 形', 'およその 面積を もとめる とき、まるい ' + p.name + 'は どんな 形と 見ると よい？',
      withDistractors(p.shape === '円' ? '円' : p.shape, ['円', '長方形', '三角形', '台形']), {
        key: 'as:' + p.name, hint: 'その 形に いちばん 近い 図形に おきかえる。',
        note: p.name + 'は ' + p.shape + 'と 見ると もとめやすい。'
      });
  }
  function approxRectQ() {
    const a = U.randInt(3, 30), b = U.randInt(3, 30);
    return num('およその 面積', 'ある 公園を たて 約' + a + 'm、よこ 約' + b + 'm の 長方形と 見ると、およその 面積は 何m²？', a * b, {
      key: 'ar:' + a + ':' + b, hint: '長方形の 面積 ＝ たて × よこ。',
      note: a + ' × ' + b + ' = ' + a * b + ' m²'
    });
  }
  function approxTriQ() {
    const a = U.randInt(4, 30), b = U.randInt(4, 30);
    if (a * b % 2 !== 0) return approxTriQ();
    return num('およその 面積', 'ある 土地を 底辺 約' + a + 'm、高さ 約' + b + 'm の 三角形と 見ると、およその 面積は 何m²？', a * b / 2, {
      key: 'at:' + a + ':' + b, hint: '三角形の 面積 ＝ 底辺 × 高さ ÷ 2。',
      note: a + ' × ' + b + ' ÷ 2 = ' + a * b / 2 + ' m²'
    });
  }
  function approxCircleQ() {
    const r = U.randInt(2, 10);
    return dec('およその 面積', 'まるい 池を 半径 約' + r + 'm の 円と 見ると、およその 面積は 何m²？（円周率は 3.14）', r * r * 3.14, {
      key: 'aci:' + r, hint: '円の 面積 ＝ 半径 × 半径 × 3.14。',
      note: r + ' × ' + r + ' × 3.14 = ' + fx(r * r * 3.14) + ' m²'
    });
  }
  function approxVolQ() {
    const a = U.randInt(3, 20), b = U.randInt(3, 20), c = U.randInt(2, 15);
    return num('およその 体積', 'ある 入れものを たて 約' + a + 'cm、よこ 約' + b + 'cm、高さ 約' + c + 'cm の 直方体と 見ると、およその 体積は 何cm³？',
      a * b * c, {
        key: 'av:' + a + ':' + b + ':' + c, hint: '直方体の 体積 ＝ たて × よこ × 高さ。',
        note: a + ' × ' + b + ' × ' + c + ' = ' + a * b * c + ' cm³'
      });
  }
  function approxTrapQ() {
    const a = U.randInt(3, 15), b = U.randInt(3, 15), h = U.randInt(2, 12);
    if ((a + b) * h % 2 !== 0) return approxTrapQ();
    return num('およその 面積', 'ある 畑を 上底 約' + a + 'm、下底 約' + b + 'm、高さ 約' + h + 'm の 台形と 見ると、およその 面積は 何m²？',
      (a + b) * h / 2, {
        key: 'atr:' + a + ':' + b + ':' + h, hint: '台形の 面積 ＝ (上底 ＋ 下底) × 高さ ÷ 2。',
        note: '(' + a + ' + ' + b + ') × ' + h + ' ÷ 2 = ' + (a + b) * h / 2 + ' m²'
      });
  }
  function approxWhyQ() {
    return choice('およその 大きさ', 'およその 面積を もとめる とき、大切な ことは？',
      ['近い 形に おきかえて 計算する', 'かならず ぴったりの 答えを 出す', '大きさを 数えなくて よい', '長さを はからない'], {
        key: 'aw', hint: 'およそ ＝ だいたい。近い 形で 見当を つける。',
        note: '近い 図形に おきかえると、およその 大きさが わかる。'
      });
  }
  const stage10 = {
    easy: [approxShapeQ, approxRectQ, approxWhyQ, approxTriQ],
    normal: [approxTriQ, approxCircleQ, approxRectQ, approxShapeQ],
    hard: [approxTrapQ, approxVolQ, approxCircleQ, approxTriQ],
    boss: [approxTrapQ, approxVolQ, approxCircleQ, approxRectQ]
  };

  /* =======================================================
     ステージ11 比例
     ======================================================= */
  function propTableQ() {
    const k = U.randInt(2, 12), x = U.randInt(2, 9), x2 = x + U.randInt(1, 6);
    const rows = [['x', String(x), String(x2)], ['y', String(k * x), '?']];
    return num('比例の 表', figQ('y は x に 比例します。表の ? に 入る 数は？',
      '<table class="tbl"><tr><td>x</td><td>' + x + '</td><td>' + x2 + '</td></tr><tr><td>y</td><td>' + k * x + '</td><td>?</td></tr></table>'),
      k * x2, {
        key: 'pt:' + k + ':' + x + ':' + x2, hint: 'y ÷ x が いつも 同じ（' + k + '）。x が ' + x2 + ' の とき y は？',
        note: k + ' × ' + x2 + ' = ' + k * x2
      });
  }
  function propFormulaQ() {
    const k = U.randInt(2, 12);
    return choice('比例の 式', 'y が x に 比例し、x = 1 の とき y = ' + k + ' です。式は？',
      withDistractors('y = ' + k + ' × x', ['y = ' + k + ' × x', 'y = x + ' + k, 'y = ' + k + ' ÷ x', 'y = x ÷ ' + k]), {
        key: 'pf:' + k, hint: '比例の 式は y ＝ 決まった 数 × x。',
        note: '決まった 数は ' + k + ' なので y = ' + k + ' × x。'
      });
  }
  function propRuleQ() {
    const m = pf([2, 3, 4]);
    return choice('比例の きまり', '比例では、x が ' + m + '倍に なると y は どう なる？',
      withDistractors(m + '倍に なる', [m + '倍に なる', ft(1, m) + 'に なる', '変わらない', (m + 1) + '倍に なる']), {
        key: 'pr:' + m, hint: 'y ÷ x が いつも 同じ に なる 関係。',
        note: 'x が ' + m + '倍なら y も ' + m + '倍。'
      });
  }
  function propWordQ() {
    const k = U.randInt(2, 15), x = U.randInt(2, 12);
    return num('比例の 文しょうだい', '1m の 重さが ' + k + 'g の はりがねが あります。' + x + 'm の 重さは 何g？', k * x, {
      key: 'pw:' + k + ':' + x, hint: '重さは 長さに 比例する。' + k + ' × ' + x + '。',
      note: k + ' × ' + x + ' = ' + k * x + ' g'
    });
  }
  function propBackQ() {
    const k = U.randInt(2, 12), x = U.randInt(2, 12);
    return num('比例の 文しょうだい', '1m の 重さが ' + k + 'g の はりがねが あります。' + k * x + 'g では 長さは 何m？', x, {
      key: 'pb:' + k + ':' + x, hint: k * x + ' ÷ ' + k + ' で 長さが 出る。',
      note: k * x + ' ÷ ' + k + ' = ' + x + ' m'
    });
  }
  function propGraphSvg(k) {
    let s = line([28, 88], [148, 88], FS, 2) + line([28, 88], [28, 12], FS, 2);
    for (let i = 1; i <= 5; i++) s += line([28 + i * 22, 88], [28 + i * 22, 84], FS, 1.4);
    for (let i = 1; i <= 4; i++) s += line([28, 88 - i * 18], [32, 88 - i * 18], FS, 1.4);
    const x = 5, y = Math.min(4, k * 5 / 3);
    s += line([28, 88], [28 + x * 22, 88 - y * 18], FB, 3);
    s += txt(150, 96, 'x', 11, FS) + txt(20, 14, 'y', 11, FS);
    return svgBox(s);
  }
  function propGraphQ() {
    const k = U.randInt(2, 6), x = U.randInt(2, 8);
    return num('比例の グラフ', figQ('比例の グラフです。x = 1 の とき y = ' + k + ' です。x = ' + x + ' の とき y は いくつ？', propGraphSvg(k)),
      k * x, {
        key: 'pg:' + k + ':' + x, hint: '比例の グラフは 0 を 通る 直線。y = ' + k + ' × x。',
        note: k + ' × ' + x + ' = ' + k * x
      });
  }
  function propGraphShapeQ() {
    return choice('比例の グラフ', '比例の グラフは どんな 形に なる？',
      ['0 を 通る 直線', '曲がった 線', '0 を 通らない 直線', '円'], {
        key: 'pgs', hint: 'x が 0 の とき y も 0 に なる。',
        note: '0 の 点を 通る まっすぐな 線。'
      });
  }
  const stage11 = {
    easy: [propFormulaQ, propRuleQ, propWordQ, propGraphShapeQ],
    normal: [propTableQ, propWordQ, propFormulaQ, propGraphQ],
    hard: [propGraphQ, propBackQ, propTableQ, propRuleQ],
    boss: [propGraphQ, propBackQ, propTableQ, propWordQ]
  };

  /* =======================================================
     ステージ12 反比例
     ======================================================= */
  function invTableQ() {
    const k = pf([12, 18, 24, 36, 48, 60]);
    const ds = [1, 2, 3, 4, 6, 12].filter(function (d) { return k % d === 0; });
    const x = pf(ds), x2 = pf(ds.filter(function (d) { return d !== x; }));
    return num('反比例の 表', figQ('y は x に 反比例します。表の ? に 入る 数は？',
      '<table class="tbl"><tr><td>x</td><td>' + x + '</td><td>' + x2 + '</td></tr><tr><td>y</td><td>' + k / x + '</td><td>?</td></tr></table>'),
      k / x2, {
        key: 'it:' + k + ':' + x + ':' + x2, hint: 'x × y が いつも 同じ（' + k + '）。' + k + ' ÷ ' + x2 + '。',
        note: k + ' ÷ ' + x2 + ' = ' + k / x2
      });
  }
  function invFormulaQ() {
    const k = pf([12, 18, 24, 36, 48]);
    return choice('反比例の 式', 'y が x に 反比例し、x × y は いつも ' + k + ' です。式は？',
      withDistractors('y = ' + k + ' ÷ x', ['y = ' + k + ' ÷ x', 'y = ' + k + ' × x', 'y = x ÷ ' + k, 'y = x + ' + k]), {
        key: 'if:' + k, hint: '反比例の 式は y ＝ 決まった 数 ÷ x。',
        note: 'x × y ＝ ' + k + ' なので y = ' + k + ' ÷ x。'
      });
  }
  function invRuleQ() {
    const m = pf([2, 3, 4]);
    return choice('反比例の きまり', '反比例では、x が ' + m + '倍に なると y は どう なる？',
      withDistractors(ft(1, m) + 'に なる', [ft(1, m) + 'に なる', m + '倍に なる', '変わらない', ft(1, m + 1) + 'に なる']), {
        key: 'ir:' + m, hint: 'x × y が いつも 同じ に なる 関係。',
        note: 'x が ' + m + '倍なら y は ' + ft(1, m) + '。'
      });
  }
  function invWordQ() {
    const total = pf([24, 36, 48, 60, 72]);
    const ds = [2, 3, 4, 6, 8, 12].filter(function (d) { return total % d === 0; });
    const x = pf(ds);
    return num('反比例の 文しょうだい', total + ' このを あめを 何人かで 同じ 数ずつ 分けます。' + x + '人で 分けると 1人 何こ？', total / x, {
      key: 'iw:' + total + ':' + x, hint: '人数が ふえると 1人ぶんは へる（反比例）。' + total + ' ÷ ' + x + '。',
      note: total + ' ÷ ' + x + ' = ' + total / x + ' こ'
    });
  }
  function invAreaQ() {
    const area = pf([24, 36, 48, 60]);
    const ds = [2, 3, 4, 6, 8, 12].filter(function (d) { return area % d === 0; });
    const x = pf(ds);
    return num('反比例の 文しょうだい', '面積が ' + area + 'cm² の 長方形が あります。たてが ' + x + 'cm の とき、よこは 何cm？', area / x, {
      key: 'ia:' + area + ':' + x, hint: 'たて × よこ ＝ ' + area + ' なので、たてが ふえると よこは へる。',
      note: area + ' ÷ ' + x + ' = ' + area / x + ' cm'
    });
  }
  function invGraphQ() {
    return choice('反比例の グラフ', '反比例の グラフは どんな 形に なる？',
      ['なめらかに 曲がった 線', '0 を 通る 直線', '0 を 通らない 直線', '四角'], {
        key: 'ig', hint: 'x が 大きく なるほど y は 小さく なって いく。',
        note: '曲線に なる（0 は 通らない）。'
      });
  }
  function distinguishQ() {
    const which = pf(['prop', 'inv']);
    const c = which === 'prop'
      ? ['1m ' + U.randInt(2, 9) + 'g の はりがねの 長さと 重さ', '面積が 決まった 長方形の たてと よこ', '同じ 道のりを 進む 速さと 時間', 'あめを 分ける 人数と 1人ぶん']
      : ['面積が 決まった 長方形の たてと よこ', '1m ' + U.randInt(2, 9) + 'g の はりがねの 長さと 重さ', '正方形の 1辺と まわりの 長さ', '買った 数と 代金'];
    return choice('比例か 反比例か', which === 'prop' ? '比例して いる ものは どれ？' : '反比例して いる ものは どれ？', c, {
      key: 'dq:' + which + ':' + c[0].length,
      hint: which === 'prop' ? 'x が 2倍なら y も 2倍に なる ものを えらぶ。' : 'x × y が いつも 同じに なる ものを えらぶ。',
      note: which === 'prop' ? '長さが 2倍なら 重さも 2倍＝比例。' : 'たて × よこ が いつも 同じ＝反比例。'
    });
  }
  const stage12 = {
    easy: [invFormulaQ, invRuleQ, invWordQ, invGraphQ],
    normal: [invTableQ, invWordQ, invAreaQ, invFormulaQ],
    hard: [invTableQ, invAreaQ, distinguishQ, invRuleQ],
    boss: [invTableQ, invAreaQ, distinguishQ, invWordQ]
  };

  /* =======================================================
     ステージ13 ならべ方と 組み合わせ方
     ======================================================= */
  function fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
  function permN(n, r) { let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return v; }
  function combN(n, r) { return permN(n, r) / fact(r); }
  const NAMES6 = ['A・B・C', 'アイ・ケン・ユイ', '赤・青・黄'];
  function lineUpQ() {
    const n = U.randInt(3, 6);
    return num('ならべ方', n + '人が 1れつに ならびます。ならび方は 何とおり？', fact(n), {
      key: 'lu:' + n, hint: '1番目が ' + n + 'とおり、2番目が ' + (n - 1) + 'とおり…と かけて いく。',
      note: Array.from({ length: n }, function (_, i) { return n - i; }).join(' × ') + ' = ' + fact(n) + ' とおり'
    });
  }
  function twoDigitQ() {
    const n = U.randInt(3, 6);
    return num('ならべ方', n + 'まいの カード（1〜' + n + '）から 2まい えらんで 2けたの 数を つくります。何とおり？', permN(n, 2), {
      key: 'td:' + n, hint: '十の位が ' + n + 'とおり、一の位が のこり ' + (n - 1) + 'とおり。',
      note: n + ' × ' + (n - 1) + ' = ' + permN(n, 2) + ' とおり'
    });
  }
  function threeDigitQ() {
    const n = U.randInt(4, 6);
    return num('ならべ方', n + 'まいの カードから 3まい えらんで 3けたの 数を つくります。何とおり？', permN(n, 3), {
      key: 'thd:' + n, hint: n + ' × ' + (n - 1) + ' × ' + (n - 2) + '。',
      note: n + ' × ' + (n - 1) + ' × ' + (n - 2) + ' = ' + permN(n, 3) + ' とおり'
    });
  }
  function combTeamQ() {
    const n = U.randInt(4, 8);
    return num('組み合わせ方', n + 'チームが どの チームとも 1回ずつ 試合を します。試合は 何回？', combN(n, 2), {
      key: 'ct:' + n, hint: n + ' × ' + (n - 1) + ' ÷ 2（同じ 組み合わせを 2回 数えて いる）。',
      note: n + ' × ' + (n - 1) + ' ÷ 2 = ' + combN(n, 2) + ' 回'
    });
  }
  function combPickQ() {
    const n = U.randInt(4, 7), r = pf([2, 3]);
    const rr = Math.min(r, n - 1);
    return num('組み合わせ方', n + '人から ' + rr + '人を えらびます。えらび方は 何とおり？', combN(n, rr), {
      key: 'cp:' + n + ':' + rr, hint: 'じゅんばんは 関係ないので、ならべ方を ' + fact(rr) + ' で わる。',
      note: permN(n, rr) + ' ÷ ' + fact(rr) + ' = ' + combN(n, rr) + ' とおり'
    });
  }
  function coinQ6() {
    const n = U.randInt(2, 5);
    return num('ならべ方', 'コインを ' + n + '回 なげます。表と うらの 出方は 何とおり？', Math.pow(2, n), {
      key: 'cq:' + n, hint: '1回に 2とおり。それが ' + n + '回。',
      note: Array(n).fill('2').join(' × ') + ' = ' + Math.pow(2, n) + ' とおり'
    });
  }
  function pairMenuQ() {
    const a = U.randInt(2, 6), b = U.randInt(2, 6);
    return num('組み合わせ方', 'パンが ' + a + 'しゅるい、飲み物が ' + b + 'しゅるい あります。1つずつ えらぶ 組み合わせは 何とおり？', a * b, {
      key: 'pm:' + a + ':' + b, hint: 'パン ' + a + ' とおりの それぞれに 飲み物 ' + b + ' とおり。',
      note: a + ' × ' + b + ' = ' + a * b + ' とおり'
    });
  }
  function orderMatterQ() {
    return choice('ならべ方と 組み合わせ', 'つぎの うち、じゅんばんを 考えなくて よい（組み合わせ）のは どれ？',
      ['5人から そうじ当番 2人を えらぶ', '5人が 1れつに ならぶ', '3まいの カードで 3けたの 数を つくる', 'リレーの 走る じゅんを 決める'], {
        key: 'om', hint: '「えらぶ だけ」なら じゅんばんは 関係ない。',
        note: '当番は だれと だれかだけ。ならぶ・走る じゅんは じゅんばんが 大事。'
      });
  }
  const stage13 = {
    easy: [lineUpQ, pairMenuQ, coinQ6, orderMatterQ],
    normal: [twoDigitQ, combTeamQ, pairMenuQ, lineUpQ],
    hard: [threeDigitQ, combPickQ, combTeamQ, twoDigitQ],
    boss: [threeDigitQ, combPickQ, combTeamQ, orderMatterQ]
  };

  /* =======================================================
     ステージ14 データの 調べ方
     ======================================================= */
  function sampleData(n, lo, hi) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(U.randInt(lo, hi));
    return out;
  }
  function meanQ6() {
    const n = pf([4, 5, 6]);
    const base = U.randInt(3, 20);
    const data = sampleData(n - 1, base, base + 10);
    const want = U.randInt(base, base + 10);
    const sum = data.reduce(function (a, b) { return a + b; }, 0);
    const last = want * n - sum;
    if (last < 1 || last > 40) return meanQ6();
    const all = data.concat([last]);
    return num('平均', all.join('、') + ' の ' + n + 'つの 数の 平均は いくつ？', want, {
      key: 'mn6:' + all.join(','), hint: 'ぜんぶ たして 個数（' + n + '）で わる。',
      note: all.join(' + ') + ' = ' + (sum + last) + '。' + (sum + last) + ' ÷ ' + n + ' = ' + want
    });
  }
  function medianQ() {
    const n = pf([5, 7]);
    const data = sampleData(n, 1, 30);
    const sorted = data.slice().sort(function (a, b) { return a - b; });
    return num('中央の 数', data.join('、') + ' の ' + n + 'つの 数を 小さい じゅんに ならべた とき、まん中の 数は？',
      sorted[(n - 1) / 2], {
        key: 'md:' + data.join(','), hint: '小さい じゅんに ならべて、まん中の ' + ((n + 1) / 2) + '番目。',
        note: sorted.join('、') + ' の まん中は ' + sorted[(n - 1) / 2] + '。'
      });
  }
  function modeQ() {
    const v = U.randInt(1, 12), other = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(function (x) { return x !== v; })).slice(0, 3);
    const data = U.shuffle([v, v, v].concat(other));
    return num('いちばん 多い 数', data.join('、') + ' の 中で、いちばん たくさん 出て くる 数（さいひん' + ATAI + '）は？', v, {
      key: 'mo:' + data.join(','), hint: '同じ 数が いくつ あるか 数えよう。',
      note: v + ' が 3回 出て いる。'
    });
  }
  function histSvg(bars) {
    const w = 26, base = 92;
    let s = line([20, base], [156, base], FS, 2);
    bars.forEach(function (v, i) {
      const h = v * 12;
      s += '<rect x="' + (24 + i * w) + '" y="' + (base - h) + '" width="' + (w - 6) + '" height="' + h + '" fill="' + FB + '" stroke="' + FS + '" stroke-width="1.6"/>';
      s += txt(24 + i * w + (w - 6) / 2, base + 14, String(i * 10) + '〜', 8, FS, 'middle', false);
    });
    return svgBox(s);
  }
  function histReadQ() {
    const bars = [U.randInt(1, 5), U.randInt(1, 5), U.randInt(1, 5), U.randInt(1, 5)];
    const i = U.randInt(0, 3);
    return num('柱状グラフ', figQ('柱状グラフです。' + (i * 10) + '以上 ' + (i * 10 + 10) + '未満の 人数は 何人？', histSvg(bars)), bars[i], {
      key: 'hr:' + bars.join(',') + ':' + i, hint: 'その はんいの ぼうの 高さを 読もう。',
      note: (i * 10) + '〜' + (i * 10 + 10) + ' は ' + bars[i] + '人。'
    });
  }
  function histTotalQ() {
    const bars = [U.randInt(1, 6), U.randInt(1, 6), U.randInt(1, 6), U.randInt(1, 6)];
    const sum = bars.reduce(function (a, b) { return a + b; }, 0);
    return num('柱状グラフ', figQ('柱状グラフです。ぜんぶで 何人？', histSvg(bars)), sum, {
      key: 'ht:' + bars.join(','), hint: 'ぼうの 高さを ぜんぶ たそう。',
      note: bars.join(' + ') + ' = ' + sum + '人'
    });
  }
  function histMostQ() {
    const bars = U.shuffle([U.randInt(1, 3), U.randInt(1, 3), U.randInt(4, 7), U.randInt(1, 3)]);
    const i = bars.indexOf(Math.max.apply(null, bars));
    return choice('柱状グラフ', figQ('いちばん 人数が 多い はんいは どれ？', histSvg(bars)),
      withDistractors((i * 10) + '以上 ' + (i * 10 + 10) + '未満',
        [0, 1, 2, 3].map(function (j) { return (j * 10) + '以上 ' + (j * 10 + 10) + '未満'; })), {
        key: 'hm:' + bars.join(','), hint: 'いちばん 高い ぼうを さがそう。',
        note: (i * 10) + '〜' + (i * 10 + 10) + ' が ' + bars[i] + '人で いちばん 多い。'
      });
  }
  function tableRangeQ() {
    const bars = [U.randInt(2, 6), U.randInt(2, 6), U.randInt(2, 6)];
    const sum = bars.reduce(function (a, b) { return a + b; }, 0);
    return num('度数分布表', '<table class="tbl"><tr><td>0以上10未満</td><td>' + bars[0] + '人</td></tr><tr><td>10以上20未満</td><td>' + bars[1] + '人</td></tr><tr><td>20以上30未満</td><td>' + bars[2] + '人</td></tr></table>10以上の 人は 何人？',
      bars[1] + bars[2], {
        key: 'tr6:' + bars.join(','), hint: '10〜20 と 20〜30 を たそう。',
        note: bars[1] + ' + ' + bars[2] + ' = ' + (bars[1] + bars[2]) + '人'
      });
  }
  function statsMeaningQ() {
    const kind = pf(['mean', 'median', 'mode']);
    const c = kind === 'mean'
      ? ['ぜんぶ たして 個数で わった 数', '小さい じゅんに ならべた まん中の 数', 'いちばん 多く 出て くる 数', 'いちばん 大きい 数']
      : kind === 'median'
        ? ['小さい じゅんに ならべた まん中の 数', 'ぜんぶ たして 個数で わった 数', 'いちばん 多く 出て くる 数', 'いちばん 小さい 数']
        : ['いちばん 多く 出て くる 数', 'ぜんぶ たして 個数で わった 数', '小さい じゅんに ならべた まん中の 数', 'いちばん 大きい 数'];
    const name = kind === 'mean' ? '平均' : kind === 'median' ? '中央' + ATAI : 'さいひん' + ATAI;
    return choice('データの ことば', name + 'とは どんな 数？', c, {
      key: 'sm6:' + kind, hint: 'データの まん中や 代表を あらわす 数。',
      note: U.stripTags(name) + 'は ' + c[0] + '。'
    });
  }
  const stage14 = {
    easy: [meanQ6, modeQ, statsMeaningQ, histReadQ],
    normal: [medianQ, histReadQ, histTotalQ, meanQ6],
    hard: [medianQ, histMostQ, tableRangeQ, meanQ6],
    boss: [medianQ, histMostQ, tableRangeQ, histTotalQ]
  };

  /* =======================================================
     ステージ15 量の たんいの しくみ
     ======================================================= */
  function lenConvQ() {
    const p = pf([['1km', 'm', 1000], ['1m', 'cm', 100], ['1cm', 'mm', 10], ['1m', 'mm', 1000], ['1km', 'cm', 100000]]);
    return num('長さの たんい', p[0] + ' は 何' + p[1] + '？', p[2], {
      key: 'lc:' + p[0] + p[1], hint: 'k は 1000倍、c は 100分の1、m（ミリ）は 1000分の1。',
      note: p[0] + ' = ' + p[2] + p[1]
    });
  }
  function areaConvQ() {
    const p = pf([['1m²', 'cm²', 10000], ['1km²', 'm²', 1000000], ['1a', 'm²', 100], ['1ha', 'm²', 10000], ['1ha', 'a', 100]]);
    return num('面積の たんい', p[0] + ' は 何' + p[1] + '？', p[2], {
      key: 'ac6:' + p[0] + p[1], hint: '長さが 100倍なら 面積は 100 × 100 倍。',
      note: p[0] + ' = ' + p[2] + p[1]
    });
  }
  function volConvQ() {
    const p = pf([['1L', 'mL', 1000], ['1L', 'cm³', 1000], ['1m³', 'L', 1000], ['1dL', 'mL', 100], ['1kL', 'L', 1000]]);
    return num('かさの たんい', p[0] + ' は 何' + p[1] + '？', p[2], {
      key: 'vc:' + p[0] + p[1], hint: '1L ＝ 1000mL ＝ 1000cm³。1m³ ＝ 1000L。',
      note: p[0] + ' = ' + p[2] + p[1]
    });
  }
  function weightConvQ() {
    const p = pf([['1kg', 'g', 1000], ['1t', 'kg', 1000], ['1t', 'g', 1000000], ['1g', 'mg', 1000]]);
    return num('重さの たんい', p[0] + ' は 何' + p[1] + '？', p[2], {
      key: 'wc:' + p[0] + p[1], hint: 'k は 1000倍。t（トン）は 1000kg。',
      note: p[0] + ' = ' + p[2] + p[1]
    });
  }
  function prefixQ() {
    const p = pf([['k（キロ）', '1000倍', ['1000倍', '100倍', '1000分の1', '10分の1']],
      ['c（センチ）', '100分の1', ['100分の1', '100倍', '1000分の1', '10倍']],
      ['m（ミリ）', '1000分の1', ['1000分の1', '1000倍', '100分の1', '10倍']],
      ['d（デシ）', '10分の1', ['10分の1', '10倍', '100分の1', '1000倍']]]);
    return choice('たんいの あたま文字', 'たんいに つく ' + p[0] + ' は もとの たんいの 何倍？', p[2], {
      key: 'pq6:' + p[0], hint: 'k・c・m・d は どの たんいでも 同じ 意味。',
      note: p[0] + ' は ' + p[1] + '。'
    });
  }
  function convCalcQ() {
    const m = U.randInt(2, 90);
    return num('たんいの 計算', m + 'm は 何cm？', m * 100, {
      key: 'cc6:' + m, hint: '1m ＝ 100cm。' + m + ' × 100。',
      note: m + 'm = ' + m * 100 + 'cm'
    });
  }
  function convCalc2Q() {
    const g = U.randInt(2, 90);
    return num('たんいの 計算', (g * 1000) + 'g は 何kg？', g, {
      key: 'cc2:' + g, hint: '1000g ＝ 1kg。1000 で わる。',
      note: (g * 1000) + 'g = ' + g + 'kg'
    });
  }
  function volCalcQ() {
    const l = U.randInt(2, 40);
    return num('たんいの 計算', l + 'L は 何cm³？', l * 1000, {
      key: 'vcq:' + l, hint: '1L ＝ 1000cm³。',
      note: l + 'L = ' + l * 1000 + 'cm³'
    });
  }
  const stage15 = {
    easy: [lenConvQ, weightConvQ, volConvQ, convCalcQ],
    normal: [areaConvQ, prefixQ, convCalc2Q, volConvQ],
    hard: [areaConvQ, volCalcQ, prefixQ, convCalc2Q],
    boss: [areaConvQ, volCalcQ, prefixQ, lenConvQ]
  };

  /* =======================================================
     まとめ
     ======================================================= */
  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10, 11: stage11, 12: stage12, 13: stage13, 14: stage14, 15: stage15 };
  const figs6 = { symSvg: symSvg, scaleSvg: scaleSvg, circleSvg6: circleSvg6, prismSvg6: prismSvg6, propGraphSvg: propGraphSvg, histSvg: histSvg, fr: fr };

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
    function idOf(q) { return 'sansu6-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }
    plan.forEach(function (p) {
      cycle(p[0], p[2]).forEach(function (maker) {
        let q = maker(), tries = 0;
        // 同じ 問題・分母 1 の 分数（＝答えが 整数）は 引き直す
        while ((seen[idOf(q)] || (q.type === 'frac' && q.answer.d < 2)) && tries++ < 24) q = maker();
        q.lv = p[1];
        q.id = idOf(q);
        seen[q.id] = true;
        out.push(q);
      });
    });
    return out;
  }

  return { make: make, stages: stages, levelCounts: levelCounts, figs6: figs6 };
})();
