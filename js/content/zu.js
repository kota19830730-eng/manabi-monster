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

  return {
    KIGO_NAMES: KIGO_NAMES, names: Object.keys(KIGO),
    kigoSvg: kigoSvg, kigoQ: kigoQ,
    compass: compass, compassQ: compassQ, needle: needle, needleQ: needleQ,
    magnet: magnet, magnetQ: magnetQ, magnets: magnets, magnetsQ: magnetsQ,
    circuit: circuit, circuitQ: circuitQ, moon: moon, moonQ: moonQ,
    sunPic: sunPic, sunQ: sunQ, riverPic: riverPic, riverQ: riverQ,
    thermoPic: thermoPic, thermoQ: thermoQ, flowPic: flowPic, flowQ: flowQ,
    figQ: figQ
  };
})();
