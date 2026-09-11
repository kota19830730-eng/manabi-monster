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
      if (!T) moon(L, 40, top - 40);
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

  /* ---------- タイトル（A＋B＋C を 1枚に） ---------- */
  function title(time) {
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
  function titleTop(time) {
    time = skyOf(null, time);
    const L = layer('bgtop tod-' + time);
    if (time === 'evening') sun(L, 216, 10, .5);
    else if (time === 'morning') sun(L, 216, 10, .42);
    else if (time === 'night') { moon(L, 230, 16); star(L, 196, 30); star(L, 284, 38); star(L, 266, 12); }
    return L;
  }

  /* ---------- バトル（エリアごと） ---------- */
  function arena(biome, time) {
    biome = BIOMES.indexOf(biome) >= 0 ? biome : 'mountain';
    time = skyOf(biome, time);
    const t = TONE[time];
    const L = layer('bgfar--arena bgfar--' + biome + ' tod-' + time);
    skyThings(L, time, 'arena');
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
    title: title, titleTop: titleTop, arena: arena, floor: floor, mapFar: mapFar, mapTint: mapTint, count: count
  };
})();
