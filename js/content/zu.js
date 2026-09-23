/* ---------------------------------------------------------
   問題に つける 図（v4.9）

   息子さんの「地図記号などの 問題は 絵が あると わかりやすい」から。
   とけい（sansu1）・かたち（sansu2）・figs3/figs4 と 同じで、
   画像ファイルは 使わず inline SVG で 描く。

     地図記号 17こ … kigoQ(text, name)      社会（小3・小4）
     方位の 図      … compassQ(text, deg)   八方位（deg=矢じるしの 角度・null で 矢なし）
     方位じしん     … needleQ(text)         赤い はり（ラベルなし＝答えは ばれない）
     ぼうじしゃく   … magnetQ(text, plain)  plain=true で N/S の 字を かくす
     じしゃく 2本   … magnetsQ(text, 'NN'|'NS')
     回路の 図      … circuitQ(text, kind, device)  kind='single'|'series'|'parallel'
     月の 形        … moonQ(text, kind)     kind='full'|'crescent'|'half'|'phases'

   きまり：**答えが 図で ばれる 問題には つけない**
   （「上が 北」の 問題に 北の ラベル入りの 図、など）。
   読みこみは rikashakai3.js より 前（index.html / sw.js / harness / smoke）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.zu = (function () {
  const INK = '#1d1408';

  function box(inner, vw, vh) {
    vw = vw || 100; vh = vh || 100;
    return '<svg viewBox="0 0 ' + vw + ' ' + vh + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="2" y="2" width="' + (vw - 4) + '" height="' + (vh - 4) + '" rx="10" fill="#FFFFFF" stroke="#C9BFA6" stroke-width="2"/>' +
      inner + '</svg>';
  }
  function ln(x1, y1, x2, y2, w, color) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (color || INK) + '" stroke-width="' + w + '" stroke-linecap="round"/>';
  }
  function tx(t, size, x, y, color) {
    return '<text x="' + (x || 50) + '" y="' + (y || 54) + '" font-size="' + size + '" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="' + (color || INK) + '" font-family="serif">' + t + '</text>';
  }
  function vee(cx, cy) {
    return '<path d="M' + (cx - 12) + ',' + (cy - 12) + ' L' + cx + ',' + (cy + 12) + ' L' + (cx + 12) + ',' + (cy - 12) + '" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  // 問題文の 右に 図を おく（sansu2 の figQ と 同じ 形）
  function figQ(text, svg) {
    return '<span class="figq"><span class="figq__t">' + text + '</span><span class="figbox">' + svg + '</span></span>';
  }

  /* ===== 地図記号 17こ ===== */
  const KIGO = {
    school:   function () { return tx('文', 58); },
    post:     function () { return '<circle cx="50" cy="50" r="38" fill="none" stroke="' + INK + '" stroke-width="5"/>' + tx('〒', 42); },
    shrine:   function () { return ln(14, 28, 86, 28, 8) + ln(24, 44, 76, 44, 6) + ln(30, 28, 30, 86, 7) + ln(70, 28, 70, 86, 7); },
    temple:   function () { return tx('卍', 58); },
    library:  function () { return '<path d="M50,34 C41,25 27,23 16,26 V68 C27,65 41,67 50,76 C59,67 73,65 84,68 V26 C73,23 59,25 50,34 Z" fill="' + INK + '"/><path d="M50,36 V74" stroke="#FFFFFF" stroke-width="4"/>'; },
    cityhall: function () { return '<circle cx="50" cy="50" r="34" fill="none" stroke="' + INK + '" stroke-width="6"/><circle cx="50" cy="50" r="13" fill="' + INK + '"/>'; },
    koban:    function () { return ln(26, 26, 74, 74, 9) + ln(74, 26, 26, 74, 9); },
    police:   function () { return '<circle cx="50" cy="50" r="40" fill="none" stroke="' + INK + '" stroke-width="5"/>' + ln(30, 30, 70, 70, 8) + ln(70, 30, 30, 70, 8); },
    rice:     function () { return ln(40, 22, 40, 78, 7) + ln(60, 22, 60, 78, 7); },
    field:    function () { return vee(50, 34) + vee(32, 68) + vee(68, 68); },
    orchard:  function () { return '<circle cx="50" cy="58" r="24" fill="none" stroke="' + INK + '" stroke-width="6"/><path d="M50,34 Q53,24 62,20" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>'; },
    hospital: function () { return '<path d="M50,12 L84,26 V52 C84,72 68,84 50,91 C32,84 16,72 16,52 V26 Z" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' + ln(32, 50, 68, 50, 9) + ln(50, 31, 50, 69, 9); },
    fire:     function () { return '<path d="M22,24 A34,30 0 0 0 78,24" fill="none" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>' + ln(50, 42, 50, 88, 8) + ln(35, 62, 65, 62, 7); },
    elderly:  function () { return '<path d="M50,12 L88,42 H76 V86 H24 V42 H12 Z" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/><path d="M41,56 A9,9 0 0 1 59,56 L59,80" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>'; },
    factory:  function () {
      let s = '<circle cx="50" cy="50" r="24" fill="none" stroke="' + INK + '" stroke-width="8"/><circle cx="50" cy="50" r="7" fill="' + INK + '"/>';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        s += ln((50 + Math.cos(a) * 27).toFixed(1), (50 + Math.sin(a) * 27).toFixed(1), (50 + Math.cos(a) * 38).toFixed(1), (50 + Math.sin(a) * 38).toFixed(1), 9);
      }
      return s;
    },
    onsen:    function () {
      return '<path d="M20,64 A30,18 0 0 0 80,64" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
        [34, 50, 66].map(function (x) { return '<path d="M' + x + ',54 C' + (x - 7) + ',46 ' + (x + 7) + ',38 ' + x + ',26" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>'; }).join('');
    },
    lighthouse: function () {
      let s = '<circle cx="50" cy="50" r="8" fill="' + INK + '"/>';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        s += ln((50 + Math.cos(a) * 15).toFixed(1), (50 + Math.sin(a) * 15).toFixed(1), (50 + Math.cos(a) * 36).toFixed(1), (50 + Math.sin(a) * 36).toFixed(1), 6);
      }
      return s;
    }
  };
  const KIGO_NAMES = {
    school: '学校（小・中）', post: 'ゆうびん局', shrine: '神社', temple: '寺', library: '図書館',
    cityhall: '市役所', koban: '交番', police: '警察署', rice: '田', field: '畑', orchard: '果樹園',
    hospital: '病院', fire: '消ぼうしょ', elderly: 'ろうじんホーム', factory: '工場', onsen: '温泉', lighthouse: '灯台'
  };
  function kigoSvg(name) { return box(KIGO[name]()); }
  function kigoQ(text, name) { return figQ(text, kigoSvg(name)); }

  /* ===== 方位（八方位の 円・北だけ 書く。deg は 北を 0 とした 時計まわり） ===== */
  function compass(deg) {
    let s = '<circle cx="50" cy="56" r="30" fill="none" stroke="#8a8161" stroke-width="3"/>';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2;
      s += '<circle cx="' + (50 + Math.cos(a) * 30).toFixed(1) + '" cy="' + (56 + Math.sin(a) * 30).toFixed(1) + '" r="2.6" fill="#8a8161"/>';
    }
    s += tx('北', 15, 50, 12, INK);
    if (deg != null) {
      const a2 = deg * Math.PI / 180 - Math.PI / 2;
      s += ln(50, 56, (50 + Math.cos(a2) * 26).toFixed(1), (56 + Math.sin(a2) * 26).toFixed(1), 7, '#F08A24');
      s += '<circle cx="50" cy="56" r="6" fill="#F08A24"/>';
    }
    return box(s);
  }
  function compassQ(text, deg) { return figQ(text, compass(deg)); }

  /* 方位じしん（赤い はり・字は 書かない ので 答えは ばれない） */
  function needle() {
    let s = '<circle cx="50" cy="50" r="36" fill="none" stroke="' + INK + '" stroke-width="5"/>';
    s += '<circle cx="50" cy="50" r="30" fill="none" stroke="#C9BFA6" stroke-width="2"/>';
    s += '<path d="M50,24 L58,50 L50,50 Z" fill="#E8443A"/><path d="M50,24 L42,50 L50,50 Z" fill="#B8302A"/>';
    s += '<path d="M50,76 L58,50 L50,50 Z" fill="#B9BCCF"/><path d="M50,76 L42,50 L50,50 Z" fill="#8E93AD"/>';
    s += '<circle cx="50" cy="50" r="5" fill="' + INK + '"/>';
    return box(s);
  }
  function needleQ(text) { return figQ(text, needle()); }

  /* ===== ぼうじしゃく（N＝赤・S＝青） ===== */
  function magnetBody(x, y, w, h, flip, plain) {
    const half = w / 2;
    const nx = flip ? x + half : x, sx = flip ? x : x + half;
    let s = '<rect x="' + nx + '" y="' + y + '" width="' + half + '" height="' + h + '" fill="#E8443A" stroke="' + INK + '" stroke-width="3"/>';
    s += '<rect x="' + sx + '" y="' + y + '" width="' + half + '" height="' + h + '" fill="#4F8CFF" stroke="' + INK + '" stroke-width="3"/>';
    if (!plain) {
      s += tx('N', 17, nx + half / 2, y + h / 2, '#FFFFFF');
      s += tx('S', 17, sx + half / 2, y + h / 2, '#FFFFFF');
    }
    return s;
  }
  function magnet(plain) { return box(magnetBody(14, 38, 72, 24, false, plain)); }
  function magnetQ(text, plain) { return figQ(text, magnet(plain)); }
  // 2本を 近づける 図（pair: 'NN'＝N と N が 向き合う／'NS'＝N と S）
  function magnets(pair) {
    let s = magnetBody(4, 38, 40, 24, true, false);            // 左：右はし（すきまがわ）が N
    s += magnetBody(56, 38, 40, 24, pair === 'NS', false);     // 右：flip なしで 左はしが N、flip で 左はしが S
    s += ln(46, 50, 54, 50, 3, '#8a8161');
    return box(s);
  }
  function magnetsQ(text, pair) { return figQ(text, magnets(pair)); }

  /* ===== 回路の 図（かん電池＋豆電球 か モーター） =====
     kind: 'single'＝電池1こ／'series'＝直列2こ／'parallel'＝へい列2こ */
  function battery(x, y) {
    return '<rect x="' + x + '" y="' + y + '" width="30" height="14" fill="#F2C14E" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="' + (x + 30) + '" y="' + (y + 4) + '" width="4" height="6" fill="' + INK + '"/>' +
      tx('＋', 10, x + 24, y + 7, INK) + tx('−', 10, x + 7, y + 7, INK);
  }
  function device(x, y, kind) {
    if (kind === 'motor') {
      return '<circle cx="' + x + '" cy="' + y + '" r="12" fill="#C9D3DC" stroke="' + INK + '" stroke-width="3"/>' + tx('M', 14, x, y, INK);
    }
    return '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#FFF3B8" stroke="' + INK + '" stroke-width="3"/>' +
      ln(x - 5, y + 4, x, y - 4, 2.5) + ln(x, y - 4, x + 5, y + 4, 2.5);
  }
  function wire(d) { return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>'; }
  function circuit(kind, dev) {
    let s = '';
    if (kind === 'parallel') {
      s += wire('M20,22 H120 V72 H20 Z');
      s += wire('M45,72 V90 H95 V72');
      s += battery(55, 65);
      s += battery(55, 83);
      s += device(70, 22, dev);
    } else {
      s += wire('M20,22 H120 V78 H20 Z');
      if (kind === 'series') { s += battery(35, 71); s += battery(75, 71); }
      else s += battery(55, 71);
      s += device(70, 22, dev);
    }
    return box(s, 140, 100);
  }
  function circuitQ(text, kind, dev) { return figQ(text, circuit(kind, dev)); }

  /* ===== 月の 形 ===== */
  function moonShape(kind, cx, cy, r) {
    const sky = '#2A2A46', glow = '#FFE96B';
    if (kind === 'full') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + glow + '" stroke="#C9A227" stroke-width="2"/>';
    if (kind === 'half') {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + sky + '"/>' +
        '<path d="M' + cx + ',' + (cy - r) + ' A' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (cy + r) + ' Z" fill="' + glow + '"/>';
    }
    // crescent（三日月）
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + glow + '"/>' +
      '<circle cx="' + (cx - r * 0.42) + '" cy="' + cy + '" r="' + (r * 0.92) + '" fill="' + sky + '"/>';
  }
  function moon(kind) {
    const sky = '<rect x="2" y="2" width="96" height="96" rx="10" fill="#2A2A46"/>';
    if (kind === 'phases') {
      let s = sky;
      s += moonShape('crescent', 20, 30, 11);
      s += moonShape('half', 62, 30, 11);
      // 少し 欠けた 月（半月と 満月の あいだ）
      s += '<circle cx="20" cy="70" r="11" fill="#FFE96B"/>';
      s += '<circle cx="6" cy="70" r="9" fill="#2A2A46"/>';
      s += moonShape('full', 62, 70, 11);
      s += '<path d="M34,30 h12 M76,30 h10 M34,70 h12 M76,70 h6" stroke="#8E93AD" stroke-width="2" stroke-dasharray="3,3"/>';
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + sky + moonShape(kind, 50, 50, 26) + '</svg>';
  }
  function moonQ(text, kind) { return figQ(text, moon(kind)); }


  /* ===== 太陽と かげ（v14.20・小3）=====
     kind='sun'    … 太陽と ぼう（かげは 描かない＝答えは ばれない）
     kind='shadow' … ぼうと 北向きの かげ（太陽は 描かない）
     kind='day'    … 朝・昼・夕の 太陽の 高さ（かげは 描かない） */
  function sunPic(kind) {
    const gy = 80;
    let s = '<rect x="4" y="' + gy + '" width="92" height="16" fill="#CFE3B0"/>' + ln(4, gy, 96, gy, 2);
    const pole = function (x) { return ln(x, gy, x, gy - 26, 5, '#7a5c2e') + '<rect x="' + (x - 4) + '" y="' + (gy - 30) + '" width="8" height="5" fill="#7a5c2e"/>'; };
    const sun = function (x, y, r) {
      let o = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFD24A" stroke="#E6A800" stroke-width="2"/>';
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 2 * i / 8;
        o += ln(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), 2, '#E6A800');
      }
      return o;
    };
    if (kind === 'shadow') {
      s += pole(58);
      s += '<polygon points="54,' + gy + ' 62,' + gy + ' 30,' + (gy - 12) + ' 26,' + (gy - 8) + '" fill="#8A93A8" opacity="0.8"/>';
      s += tx('かげ', 9, 30, gy - 18, '#5A6072');
      s += tx('北', 10, 10, 16) + ln(10, 22, 10, 40, 2) + '<polygon points="7,24 13,24 10,18" fill="' + INK + '"/>';
      return box(s);
    }
    if (kind === 'day') {
      s += pole(50);
      s += sun(18, 56, 7) + sun(50, 26, 7) + sun(82, 56, 7);
      s += tx('朝', 9, 18, 72) + tx('昼', 9, 50, 42) + tx('夕', 9, 82, 72);
      return box(s);
    }
    s += pole(66) + sun(24, 30, 9);
    return box(s);
  }
  function sunQ(text, kind) { return figQ(text, sunPic(kind || 'sun')); }

  /* ===== 川の 曲がり（v14.20・小5）=====
     外がわ・内がわ が どこかだけ 見せる（速さ・けずれ方は 描かない） */
  function riverPic() {
    // 曲がりは 1つだけ（上から きて 右へ 曲がる）。
    // ふくらんで いる ほう（左下）が 外がわ、その 反対（右上）が 内がわ。
    const d = 'M30,6 Q30,68 98,68';
    let s = '<path d="' + d + '" fill="none" stroke="#7FB4E8" stroke-width="20" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="#4F8CFF" stroke-width="1.6" stroke-dasharray="5 4"/>';
    // 流れる 向き
    s += '<polygon points="26,30 34,30 30,40" fill="#2a5f9e"/>';
    s += '<polygon points="78,64 78,72 88,68" fill="#2a5f9e"/>';
    // 外がわ（左下）
    s += tx('外がわ', 9, 24, 88, '#d42a20') + ln(30, 80, 38, 68, 1.6, '#d42a20');
    // 内がわ（右上）
    s += tx('内がわ', 9, 74, 26, '#1d6b3a') + ln(68, 32, 56, 44, 1.6, '#1d6b3a');
    return box(s);
  }
  function riverQ(text) { return figQ(text, riverPic()); }

  /* ===== 温度計（v14.20・小4）=====
     deg を 書かない ときは 目もりだけ（読み方の 問題に つかう） */
  function thermoPic(deg) {
    const yTop = 12, yBot = 84, lo = -10, hi = 40;
    const y = function (t) { return yBot - (yBot - yTop) * (t - lo) / (hi - lo); };
    let s = '<rect x="44" y="' + (yTop - 4) + '" width="12" height="' + (yBot - yTop + 12) + '" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="50" cy="' + (yBot + 10) + '" r="7" fill="#d42a20" stroke="' + INK + '" stroke-width="2"/>';
    if (deg != null) s += '<rect x="47" y="' + y(deg) + '" width="6" height="' + (yBot + 6 - y(deg)) + '" fill="#d42a20"/>';
    for (let t = lo; t <= hi; t += 5) {
      const big = t % 10 === 0;
      s += ln(56, y(t), big ? 66 : 62, y(t), big ? 1.8 : 1);
      if (big) s += '<text x="68" y="' + (y(t) + 3) + '" font-size="7" fill="' + INK + '" font-family="serif">' + t + '</text>';
    }
    s += tx('℃', 8, 30, 20);
    return box(s);
  }
  function thermoQ(text, deg) { return figQ(text, thermoPic(deg)); }

  /* ===== 流れ図（v14.20・社会）=====
     steps＝['雨', '川', 'じょう水場', '？'] の ように わたす。'？' は 赤 */
  function flowPic(steps) {
    const n = steps.length, W = 300, H = 56, pad = 6;
    const bw = (W - pad * 2 - (n - 1) * 16) / n;
    let s = '<svg class="figwide" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="ながれ図" style="font-family: var(--f-body)">';
    steps.forEach(function (t, i) {
      const x = pad + i * (bw + 16), q = t === '？';
      s += '<rect x="' + x + '" y="12" width="' + bw + '" height="30" rx="7" fill="' + (q ? '#FFF1EF' : '#FFF8E6') + '" stroke="' + (q ? '#d42a20' : INK) + '" stroke-width="2"/>';
      s += '<text x="' + (x + bw / 2) + '" y="31" font-size="12" text-anchor="middle" fill="' + (q ? '#d42a20' : INK) + '" font-weight="bold">' + t + '</text>';
      if (i < n - 1) {
        const ax = x + bw + 3;
        s += '<line x1="' + ax + '" y1="27" x2="' + (ax + 8) + '" y2="27" stroke="' + INK + '" stroke-width="2"/>';
        s += '<polygon points="' + (ax + 7) + ',23 ' + (ax + 13) + ',27 ' + (ax + 7) + ',31" fill="' + INK + '"/>';
      }
    });
    return s + '</svg>';
  }
  function flowQ(text, steps) { return text + flowPic(steps); }

  /* ===== ここから v14.21（理科の「ようすを 思いうかべる」単元）===== */

  /* 赤い ？の しるし。**場所だけ** 教えて 名前（答え）は 書かない */
  function qmark(x, y, r) {
    r = r || 9;
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFF1EF" stroke="#d42a20" stroke-width="2.5"/>' +
      tx('？', Math.round(r * 1.4), x, y, '#d42a20');
  }
  /* ほのお（アルコールランプ）。yBase＝ほのおの 根もと */
  function flame(x, yBase, h) {
    const w = h * 0.5;
    return '<path d="M' + x + ',' + (yBase - h) +
      ' C' + (x + w) + ',' + (yBase - h * 0.45) + ' ' + (x + w * 0.85) + ',' + yBase + ' ' + x + ',' + yBase +
      ' C' + (x - w * 0.85) + ',' + yBase + ' ' + (x - w) + ',' + (yBase - h * 0.45) + ' ' + x + ',' + (yBase - h) +
      ' Z" fill="#FF9A3C" stroke="#E2620A" stroke-width="1.5"/>';
  }
  function lamp(x, yTop, h) {
    h = h || 18;
    return '<polygon points="' + (x - 15) + ',' + (yTop + h) + ' ' + (x + 15) + ',' + (yTop + h) + ' ' + (x + 10) + ',' + yTop + ' ' + (x - 10) + ',' + yTop +
      '" fill="#DCE6EE" stroke="' + INK + '" stroke-width="2"/>';
  }

  /* ===== てこ（v14.21・小6）=====
     mark='fulcrum'|'effort'|'load' … その 点だけ 赤い ？（名前は 書かない＝答えは ばれない）
     mark='all'                     … 3つとも 名前を 書く（「近づけると どう なる？」の 問題用） */
  function leverPic(mark) {
    const LOAD_X = 31, FUL_X = 62, EFF_X = 116, BAR_Y = 47;
    let s = '';
    s += '<polygon points="' + FUL_X + ',54 50,78 74,78" fill="#B9A98A" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="14" y="' + BAR_Y + '" width="114" height="7" rx="3" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="20" y="26" width="22" height="21" rx="3" fill="#9AA3AE" stroke="' + INK + '" stroke-width="2"/>';
    s += ln(EFF_X, 14, EFF_X, 37, 4);
    s += '<polygon points="' + (EFF_X - 7) + ',36 ' + (EFF_X + 7) + ',36 ' + EFF_X + ',46" fill="' + INK + '"/>';
    if (mark === 'all') {
      s += tx('作用点', 9, LOAD_X, 91) + ln(LOAD_X, 85, LOAD_X, 56, 1.2);
      s += tx('支点', 9, FUL_X, 91) + ln(FUL_X, 85, FUL_X, 79, 1.2);
      s += tx('力点', 9, EFF_X, 91) + ln(EFF_X, 85, EFF_X, 56, 1.2);
    } else if (mark === 'load') { s += qmark(LOAD_X, BAR_Y + 3); }
    else if (mark === 'fulcrum') { s += qmark(FUL_X, BAR_Y + 5); }
    else if (mark === 'effort') { s += qmark(EFF_X, BAR_Y + 3); }
    return box(s, 140, 100);
  }
  function leverQ(text, mark) { return figQ(text, leverPic(mark)); }

  /* ===== 実験用てこ（v14.21・小6）=====
     l・r＝{ pos: 1〜6, text: '20g' }。text に ？ が 入って いれば 赤い わく。
     **答えは 書かない**（聞かれて いる ほうを '？g' に する） */
  function balancePic(l, r) {
    const CX = 70, AY = 40, SP = 8, N = 6;
    let s = '';
    s += '<polygon points="' + CX + ',40 ' + (CX - 11) + ',80 ' + (CX + 11) + ',80" fill="#B9A98A" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="' + (CX - 22) + '" y="80" width="44" height="6" rx="2" fill="#8A7A5C" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="' + (CX - SP * N - 8) + '" y="' + (AY - 3) + '" width="' + (SP * N * 2 + 16) + '" height="6" rx="3" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
    [[-1, l], [1, r]].forEach(function (p) {
      for (let i = 1; i <= N; i++) {
        const x = CX + p[0] * i * SP;
        s += ln(x, AY + 3, x, AY + 8, 1.4);
        if (!(p[1] && p[1].pos === i)) {
          s += '<text x="' + x + '" y="' + (AY + 18) + '" font-size="7" text-anchor="middle" fill="' + INK + '" font-family="serif">' + i + '</text>';
        }
      }
    });
    [[-1, l], [1, r]].forEach(function (p) {
      const w = p[1];
      if (!w) return;
      const x = CX + p[0] * w.pos * SP, q = String(w.text).indexOf('？') >= 0, col = q ? '#d42a20' : INK;
      s += ln(x, AY + 3, x, 62, 1.6, col);
      s += '<rect x="' + (x - 13) + '" y="62" width="26" height="16" rx="3" fill="' + (q ? '#FFF1EF' : '#FFF8E6') + '" stroke="' + col + '" stroke-width="2"/>';
      s += tx(w.text, 9, x, 70, col);
    });
    return box(s, 140, 100);
  }
  function balanceQ(text, l, r) { return figQ(text, balancePic(l, r)); }

  /* ===== ふりこ（v14.21・小5）=====
     'plain' … ふりこと ふれる ようす（**長さの 矢じるしは 描かない**＝「どこから どこまで」の 答えを 出さない）
     'parts' … 長さ・おもり・ふれはば の 3つに 名前（どれが きくかは 書かない）
     'two'   … 長さの ちがう ふりこ 2つ */
  function pendulumPic(kind) {
    if (kind === 'two') {
      let s = '<rect x="10" y="6" width="120" height="6" rx="2" fill="#B9A98A" stroke="' + INK + '" stroke-width="2"/>';
      [[38, 24, '25cm'], [100, 58, '100cm']].forEach(function (p) {
        s += ln(p[0], 12, p[0], 12 + p[1], 2.2);
        s += '<circle cx="' + p[0] + '" cy="' + (12 + p[1] + 8) + '" r="8" fill="#9AA3AE" stroke="' + INK + '" stroke-width="2"/>';
        s += tx(p[2], 9, p[0], 93);
      });
      return box(s, 140, 100);
    }
    const PX = 70, PY = 14, L = 52, A = 0.52;
    const dx = Math.sin(A) * L, dy = Math.cos(A) * L;
    let s = '<rect x="18" y="6" width="104" height="6" rx="2" fill="#B9A98A" stroke="' + INK + '" stroke-width="2"/>';
    s += '<line x1="' + PX + '" y1="' + PY + '" x2="' + PX + '" y2="' + (PY + L + 4) + '" stroke="#B9AE97" stroke-width="1.2" stroke-dasharray="3 3"/>';
    s += '<path d="M' + (PX - dx) + ',' + (PY + dy) + ' Q' + PX + ',' + (PY + L + 6) + ' ' + (PX + dx) + ',' + (PY + dy) + '" fill="none" stroke="#B9AE97" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s += ln(PX, PY, PX + dx, PY + dy, 1.4, '#B9AE97');
    s += '<circle cx="' + (PX + dx) + '" cy="' + (PY + dy) + '" r="8" fill="none" stroke="#B9AE97" stroke-width="2" stroke-dasharray="3 3"/>';
    s += ln(PX, PY, PX - dx, PY + dy, 2.2);
    s += '<circle cx="' + (PX - dx) + '" cy="' + (PY + dy) + '" r="8" fill="#9AA3AE" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="' + PX + '" cy="' + PY + '" r="3.5" fill="' + INK + '"/>';
    if (kind === 'parts') {
      s += tx('長さ', 8, 42, 32) + tx('おもり', 8, 24, 62) + tx('ふれはば', 8, 70, 86);
    }
    return box(s, 140, 100);
  }
  function pendulumQ(text, kind) { return figQ(text, pendulumPic(kind)); }

  /* ===== 電じしゃく（v14.21・小5）=====
     'plain' … コイル＋鉄しん＋かん電池 1こ
     'coil'  … まいて ある ところに 赤い ？（名前は 書かない）
     'core'  … 中の ぼうに 赤い ？
     'series'… かん電池 2こ 直列 */
  function coilPic(kind) {
    let s = wire('M20,22 H120 V78 H20 Z');
    if (kind === 'series') { s += battery(35, 71) + battery(75, 71); }
    else s += battery(55, 71);
    s += '<rect x="44" y="15" width="52" height="14" rx="2" fill="#AEB7C2" stroke="' + INK + '" stroke-width="2"/>';
    [54, 62, 70, 78, 86].forEach(function (cx) {
      s += '<ellipse cx="' + cx + '" cy="22" rx="3.5" ry="10" fill="none" stroke="#C87A4A" stroke-width="3"/>';
    });
    if (kind === 'coil') { s += ln(70, 40, 70, 46, 1.6, '#d42a20') + qmark(70, 54); }
    else if (kind === 'core') { s += ln(93, 29, 101, 38, 1.6, '#d42a20') + qmark(105, 46); }
    return box(s, 140, 100);
  }
  function coilQ(text, kind) { return figQ(text, coilPic(kind)); }

  /* ===== 地そう（v14.21・小6）=====
     しま模様に 重なって いる ことだけ 見せる。**つぶの 形や 名前は 描かない**（答えに なる） */
  function strataPic() {
    const BANDS = [['#8FBF6A', 8], ['#D8C08A', 14], ['#B08A5C', 13], ['#9AA093', 12], ['#C4AE86', 13], ['#7C6650', 12]];
    let s = '', y = 16;
    BANDS.forEach(function (b) {
      s += '<rect x="14" y="' + y + '" width="72" height="' + b[1] + '" fill="' + b[0] + '" stroke="' + INK + '" stroke-width="1.4"/>';
      y += b[1];
    });
    s += '<rect x="14" y="16" width="72" height="' + (y - 16) + '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
    return box(s);
  }
  function strataQ(text) { return figQ(text, strataPic()); }

  /* ===== あたたまり方・水の すがた（v14.21・小4）=====
     **矢じるし（熱の つたわる 向き）は 描かない**＝答えに なる。ようすだけ。
     'bar' 金ぞくの ぼう／'plate' 金ぞくの 板（上から）／'water' ビーカー／
     'boil' ふっとう／'cold' 冷たい コップ／'room' へやと ストーブ／'bath' おふろ */
  function heatPic(kind) {
    if (kind === 'room') {
      let s = '<rect x="12" y="14" width="116" height="72" rx="3" fill="#FFF8E6" stroke="' + INK + '" stroke-width="2.5"/>';
      s += ln(12, 74, 128, 74, 2);
      s += '<rect x="92" y="24" width="26" height="22" fill="#CFE7F7" stroke="' + INK + '" stroke-width="2"/>' + ln(105, 24, 105, 46, 1.6);
      s += '<rect x="26" y="52" width="30" height="22" rx="3" fill="#C0553C" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect x="32" y="58" width="18" height="11" fill="#FFE1A8" stroke="' + INK + '" stroke-width="1.4"/>';
      s += flame(41, 68, 9);
      return box(s, 140, 100);
    }
    if (kind === 'bath') {
      let s = '<path d="M18,34 V70 Q18,80 30,80 H70 Q82,80 82,70 V34" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<path d="M20,40 V70 Q20,78 30,78 H70 Q80,78 80,70 V40 Z" fill="#9FD0F0"/>';
      s += ln(20, 40, 80, 40, 2, '#4F8CFF');
      [30, 50, 70].forEach(function (x) {
        s += '<path d="M' + x + ',34 q4,-6 0,-11 q-4,-5 0,-9" fill="none" stroke="#B9C6D2" stroke-width="2" stroke-linecap="round"/>';
      });
      return box(s);
    }
    if (kind === 'plate') {
      let s = '<rect x="22" y="24" width="56" height="48" rx="3" fill="#C4CDD6" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<circle cx="50" cy="48" r="6" fill="#FF9A3C" stroke="#E2620A" stroke-width="1.6"/>';
      s += ln(50, 72, 50, 82, 2, '#E2620A');
      s += tx('熱する', 8, 50, 90);
      return box(s);
    }
    if (kind === 'bar') {
      let s = '<rect x="14" y="38" width="72" height="9" rx="2" fill="#C4CDD6" stroke="' + INK + '" stroke-width="2"/>';
      s += lamp(28, 72) + '<rect x="26" y="66" width="4" height="6" fill="' + INK + '"/>' + flame(28, 66, 17);
      return box(s);
    }
    if (kind === 'cold') {
      let s = '<path d="M34,22 L38,76 H62 L66,22" fill="#CFE7F7" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
      s += '<path d="M35.4,32 L38,76 H62 L64.6,32 Z" fill="#9FD0F0"/>';
      s += '<rect x="40" y="34" width="11" height="11" rx="2" fill="#EAF6FF" stroke="#6FA8CC" stroke-width="1.4"/>';
      s += '<rect x="52" y="44" width="10" height="10" rx="2" fill="#EAF6FF" stroke="#6FA8CC" stroke-width="1.4"/>';
      [[30, 40], [29, 54], [31, 66], [70, 38], [71, 52], [69, 64]].forEach(function (p) {
        s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="3" ry="4" fill="#8FC8EA" stroke="#4F8CFF" stroke-width="1"/>';
      });
      return box(s);
    }
    /* water / boil */
    let s = '<path d="M30,20 V56 Q30,62 37,62 H63 Q70,62 70,56 V20" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
    s += '<path d="M31.2,30 V56 Q31.2,60.8 37,60.8 H63 Q68.8,60.8 68.8,56 V30 Z" fill="#9FD0F0"/>';
    if (kind === 'boil') {
      [[40, 52, 3], [50, 45, 4], [58, 54, 2.6], [46, 36, 2.4], [62, 40, 3], [36, 42, 2.2]].forEach(function (b) {
        s += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#EAF6FF" stroke="#4F8CFF" stroke-width="1"/>';
      });
    }
    s += lamp(50, 78) + '<rect x="48" y="72" width="4" height="6" fill="' + INK + '"/>' + flame(50, 72, 12);
    return box(s);
  }
  function heatQ(text, kind) { return figQ(text, heatPic(kind)); }

  /* ===== 空気でっぽう・ちゅうしゃき（v14.21・小4）=====
     'gun' 空気でっぽう／'air' 空気だけ／'water' 水だけ／'both' 空気と 水 */
  function airPic(kind) {
    let s = ln(8, 24, 26, 24, 2.4) + '<polygon points="25,20 25,28 33,24" fill="' + INK + '"/>';
    if (kind === 'gun') {
      s += '<rect x="24" y="34" width="94" height="28" rx="6" fill="#FDFBF4" stroke="' + INK + '" stroke-width="3"/>';
      s += '<rect x="4" y="44" width="48" height="8" rx="3" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="60" cy="48" r="9" fill="#C87A4A" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="106" cy="48" r="9" fill="#C87A4A" stroke="' + INK + '" stroke-width="2"/>';
      s += tx('後玉', 8, 60, 76) + tx('前玉', 8, 106, 76);
      return box(s, 140, 100);
    }
    s += '<rect x="30" y="28" width="5" height="40" rx="2" fill="#E8E2D2" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="35" y="34" width="75" height="28" rx="2" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.5"/>';
    s += '<polygon points="110,43 110,53 127,50 127,46" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
    if (kind === 'water') {
      s += '<rect x="46" y="35.5" width="63" height="25" fill="#9FD0F0"/>' + tx('水', 10, 78, 48);
    } else if (kind === 'both') {
      s += '<rect x="78" y="35.5" width="31" height="25" fill="#9FD0F0"/>';
      s += tx('空気', 9, 62, 48) + tx('水', 9, 93, 48);
    } else {
      s += tx('空気', 10, 78, 48);
    }
    s += '<rect x="40" y="35" width="6" height="26" rx="1" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="8" y="44" width="33" height="8" rx="3" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
    s += '<rect x="4" y="38" width="6" height="20" rx="2" fill="#C89A5B" stroke="' + INK + '" stroke-width="2"/>';
    return box(s, 140, 100);
  }
  function airQ(text, kind) { return figQ(text, airPic(kind)); }

  /* ===== 歴史の 年表（v14.23・小6 社会）=====
     歴史の 問題は 87% が 人物・ことばの あんきで、絵を つけると 答えが ばれる。
     つけられるのは 年表だけ ＝ **問題文に 時代か 年が 書いて ある 問題**に、
     その 時代を オレンジと ▼で 教える（答えは 時代では ない ので ばれない）。
     **答えが 時代・年の 問題には つけない**（となりの 時代の 名前から 答えが わかる）。
     じゅんばんの 図で、はばは 長さ（年数）では ない。 */
  const ERAS = ['縄文', '弥生', '古ふん', '飛鳥', '奈良', '平安', '鎌倉', '室町', '戦国',
    '安土桃山', '江戸', '明治', '大正', '昭和', '今'];

  function nenpyoPic(era) {
    const X0 = 6, X1 = 276, TOP = 14, BOT = 60, CY = 37, DY = 11;
    const bw = (X1 - X0) / ERAS.length;
    let s = '<svg class="figwide" viewBox="0 0 300 74" width="100%" role="img" aria-label="年表"' +
      ' style="font-family: var(--f-body)">';
    ERAS.forEach(function (name, i) {
      const x = X0 + i * bw, on = (name === era);
      s += '<rect x="' + x.toFixed(1) + '" y="' + TOP + '" width="' + bw.toFixed(1) + '" height="' + (BOT - TOP) + '"' +
        ' fill="' + (on ? '#FFD34D' : (i % 2 ? '#F6EED9' : '#FFF8E6')) + '"' +
        ' stroke="' + (on ? '#d42a20' : '#C9BFA6') + '" stroke-width="' + (on ? 2 : 0.8) + '"/>';
      const cx = x + bw / 2, ch = name.split(''), y0 = CY - (ch.length - 1) * DY / 2;
      ch.forEach(function (c, k) {
        s += '<text x="' + cx.toFixed(1) + '" y="' + (y0 + k * DY).toFixed(1) + '" font-size="9.5"' +
          ' text-anchor="middle" dominant-baseline="central" font-weight="bold"' +
          ' fill="' + (on ? '#7a1410' : INK) + '">' + c + '</text>';
      });
      if (on) {
        s += '<polygon points="' + (cx - 6).toFixed(1) + ',2 ' + (cx + 6).toFixed(1) + ',2 ' +
          cx.toFixed(1) + ',12" fill="#d42a20"/>';
      }
    });
    /* 右はしの 矢じるし＝時間は 右へ ながれる */
    s += '<polygon points="' + X1 + ',' + (TOP + 10) + ' ' + X1 + ',' + (BOT - 10) + ' 292,' + CY + '" fill="#C9BFA6"/>';
    s += '<text x="' + X0 + '" y="68" font-size="7.5" fill="#8a7a58">むかし</text>';
    s += '<text x="292" y="68" font-size="7.5" text-anchor="end" fill="#8a7a58">いま</text>';
    return s + '</svg>';
  }
  function nenpyoQ(text, era) { return text + nenpyoPic(era); }

  return {
    KIGO_NAMES: KIGO_NAMES, names: Object.keys(KIGO),
    kigoSvg: kigoSvg, kigoQ: kigoQ,
    compass: compass, compassQ: compassQ, needle: needle, needleQ: needleQ,
    magnet: magnet, magnetQ: magnetQ, magnets: magnets, magnetsQ: magnetsQ,
    circuit: circuit, circuitQ: circuitQ, moon: moon, moonQ: moonQ,
    sunPic: sunPic, sunQ: sunQ, riverPic: riverPic, riverQ: riverQ,
    thermoPic: thermoPic, thermoQ: thermoQ, flowPic: flowPic, flowQ: flowQ,
    leverPic: leverPic, leverQ: leverQ, balancePic: balancePic, balanceQ: balanceQ,
    pendulumPic: pendulumPic, pendulumQ: pendulumQ, coilPic: coilPic, coilQ: coilQ,
    strataPic: strataPic, strataQ: strataQ, heatPic: heatPic, heatQ: heatQ,
    airPic: airPic, airQ: airQ,
    ERAS: ERAS, nenpyoPic: nenpyoPic, nenpyoQ: nenpyoQ,
    figQ: figQ
  };
})();
