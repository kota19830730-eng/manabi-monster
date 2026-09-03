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

  return {
    KIGO_NAMES: KIGO_NAMES, names: Object.keys(KIGO),
    kigoSvg: kigoSvg, kigoQ: kigoQ,
    compass: compass, compassQ: compassQ, needle: needle, needleQ: needleQ,
    magnet: magnet, magnetQ: magnetQ, magnets: magnets, magnetsQ: magnetsQ,
    circuit: circuit, circuitQ: circuitQ, moon: moon, moonQ: moonQ,
    figQ: figQ
  };
})();
