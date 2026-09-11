/* 背景の 3案を 本物の タイトル／バトル画面に かぶせる 見本（アプリは さわらない）。
   harness の |js= から <script src=...bgmock.js?v=A> で 読む。A／B／C を src の ?v= で えらぶ。 */
(function () {
  const m = (document.currentScript && document.currentScript.src.match(/[?&]v=([A-C])/)) || [];
  const V = m[1] || 'A';
  const st = document.createElement('style');
  st.textContent = [
    '.bgfar{position:absolute;left:0;right:0;bottom:0;height:150px;z-index:0;pointer-events:none;overflow:hidden}',
    '.arena__bg .bgfar{bottom:74px;height:120px;z-index:0}',
    '.bgfar i{position:absolute;display:block;bottom:0}',
    '.bgfar .bk{box-shadow:inset -2px -2px 0 rgba(0,0,0,.16),inset 2px 2px 0 rgba(255,255,255,.14)}',
    /* ゆか（バトル・3案 共通）：手前が 大きく 奥が 小さい マス目 */
    '.afloor{position:absolute;left:-30%;right:-30%;bottom:0;height:150px;transform-origin:50% 100%;transform:perspective(260px) rotateX(52deg);' +
      'background-color:var(--fl1,#8f9aa8);background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.14) 0 2px,transparent 2px 34px),repeating-linear-gradient(180deg,rgba(0,0,0,.16) 0 2px,transparent 2px 30px);' +
      'box-shadow:inset 0 0 40px rgba(0,0,0,.18)}',
    '.afloorwrap{position:absolute;left:0;right:0;bottom:0;height:70px;overflow:hidden}',
    '.arena__ground.is-mock{background:transparent!important;box-shadow:none!important}',
    '.arena__hills.is-mock{display:none}',
    /* C：空を 夕やけに */
    '.bgC .title__sky{background:linear-gradient(#2a3a7c 0%,#7a4f9a 34%,#e8735f 66%,#ffb36e 86%,#ffe1a0 100%)!important}',
    '.bgC .arena__sky{background:linear-gradient(#3a3f8a 0%,#b45a8a 40%,#ff9a5a 78%,#ffd08a 100%)!important}',
    '.bgC .title__glow{background:radial-gradient(closest-side,rgba(255,220,160,.55),rgba(255,220,160,0))!important}',
    '.bgfar .star{width:3px;height:3px;background:#fff8e0;box-shadow:0 0 4px #fff}',
    '.bgfar .sun{background:#ffe07a;box-shadow:0 0 30px 10px rgba(255,190,90,.55)}',
    '.bgfar .win{background:#ffd447;box-shadow:0 0 6px 2px rgba(255,212,71,.8)}',
    '.bgfar .fog{left:0;right:0;height:26px;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.45))}'
  ].join('\n');
  document.head.appendChild(st);

  const h = function (cls, x, y, w, hh, bg, extra) {
    const el = document.createElement('i');
    el.className = cls || '';
    el.style.cssText = 'left:' + x + 'px;bottom:' + y + 'px;width:' + w + 'px;height:' + hh + 'px;background:' + bg + ';' + (extra || '');
    return el;
  };
  /* 山なみ：点の ならびを 8px の 段に */
  function range(layer, pts, color, step, cap, capColor, yoff) {
    yoff = yoff || 0;
    let prevH = -1, runX = 0;
    for (let x = 0; x <= 400; x += step) {
      let hh = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (x >= a[0] && x <= b[0]) { hh = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); break; }
      }
      hh = Math.round(hh / 6) * 6;
      if (hh !== prevH) {
        if (prevH >= 0) layer.appendChild(h('', runX, yoff, x - runX, prevH, color));
        runX = x; prevH = hh;
      }
    }
    layer.appendChild(h('', runX, yoff, 400 - runX, prevH, color));
    if (cap) pts.forEach(function (p, i) { if (i > 0 && i < pts.length - 1 && p[1] > cap) layer.appendChild(h('', p[0] - 8, yoff + Math.round(p[1] / 6) * 6 - 10, 16, 10, capColor)); });
  }
  function tree(layer, x, y, s, trunk, leaf, leafHi) {
    layer.appendChild(h('bk', x + s * 1.5, y, s * 1.2, s * 3.2, trunk));
    layer.appendChild(h('bk', x, y + s * 2.6, s * 4.2, s * 2, leaf));
    layer.appendChild(h('bk', x + s * 0.6, y + s * 4.4, s * 3, s * 1.6, leaf));
    layer.appendChild(h('bk', x + s * 1.3, y + s * 5.8, s * 1.6, s * 1.2, leafHi));
  }
  function castle(layer, x, y, c, cw) {
    layer.appendChild(h('', x, y, 78, 34, c));
    [0, 30, 60].forEach(function (dx, i) { layer.appendChild(h('', x + dx, y, 18, i === 1 ? 74 : 56, c)); [0, 8, 16].forEach(function (t) { layer.appendChild(h('', x + dx + t, y + (i === 1 ? 74 : 56), 4, 5, c)); }); });
    layer.appendChild(h('win', x + 37, y + 40, 4, 6, '#ffd447'));
    layer.appendChild(h('win', x + 7, y + 30, 3, 5, '#ffd447'));
    if (cw) layer.appendChild(h('', x + 30, y + 74, 2, 14, c)), layer.appendChild(h('', x + 32, y + 82, 10, 6, '#b03a5a'));
  }
  function bird(layer, x, y, c) { layer.appendChild(h('', x, y, 6, 2, c)); layer.appendChild(h('', x + 6, y + 2, 6, 2, c)); layer.appendChild(h('', x - 6, y + 2, 6, 2, c)); }

  function build(kind) {   // kind: 'title' | 'arena'
    const L = document.createElement('div');
    L.className = 'bgfar bgfar--' + V;
    if (V === 'A') {
      range(L, [[0, 46], [60, 96], [120, 56], [190, 118], [260, 66], [330, 104], [400, 50]], '#8fa9d6', 8, 90, '#eef4ff');
      range(L, [[0, 22], [80, 62], [150, 34], [240, 78], [320, 40], [400, 66]], '#6a86bf', 8, 60, '#dfe9fb');
      [[0, 8], [22, 12], [40, 6], [70, 14], [96, 9], [130, 12], [160, 7], [200, 11], [236, 8], [270, 13], [300, 7], [340, 12], [372, 9]].forEach(function (p) { L.appendChild(h('', p[0], 0, 12, 18 + p[1], '#4c6a9c')); L.appendChild(h('', p[0] + 3, 18 + p[1], 6, 8, '#4c6a9c')); });
      castle(L, kind === 'title' ? 300 : 296, 24, '#3f3b73', true);
      bird(L, 90, 118, '#3f4a6e'); bird(L, 118, 110, '#3f4a6e'); bird(L, 60, 104, '#3f4a6e');
      L.appendChild(h('fog', 0, 0, 400, 26, ''));
    } else if (V === 'B') {
      range(L, [[0, 30], [90, 66], [180, 36], [280, 74], [400, 40]], '#7fcf5a', 12, 0);
      range(L, [[0, 30], [90, 66], [180, 36], [280, 74], [400, 40]], '#a8e07a', 12, 0, null, 0);
      L.querySelectorAll('i').forEach(function (el, i) { if (i % 2) el.style.height = (parseFloat(el.style.height) - 6) + 'px'; });
      range(L, [[0, 14], [120, 34], [230, 16], [330, 40], [400, 20]], '#63c24a', 12, 0);
      tree(L, 14, 12, 11, '#7a4d2a', '#3f9e3c', '#6fd35a');
      tree(L, 306, 8, 13, '#7a4d2a', '#3f9e3c', '#6fd35a');
      tree(L, 210, 30, 7, '#7a4d2a', '#3a8f3a', '#63c24a');
      tree(L, 118, 34, 6, '#7a4d2a', '#3a8f3a', '#63c24a');
      [[70, 6, '#e8443a'], [96, 4, '#ffd447'], [250, 5, '#ffffff'], [280, 7, '#e8443a'], [170, 4, '#ffd447']].forEach(function (f) { L.appendChild(h('', f[0], f[1], 5, 5, f[2])); L.appendChild(h('', f[0] + 1, 0, 3, f[1], '#3a8f3a')); });
      L.appendChild(h('bk', 40, 0, 22, 12, '#4fae44')); L.appendChild(h('bk', 340, 0, 26, 14, '#4fae44')); L.appendChild(h('bk', 150, 0, 18, 10, '#4fae44'));
      [[40, 120, 46, 12], [260, 132, 60, 14], [330, 112, 40, 10]].forEach(function (c) { L.appendChild(h('', c[0], c[1], c[2], c[3], 'rgba(255,255,255,.85)')); L.appendChild(h('', c[0] + 10, c[1] + c[3], c[2] - 24, 8, 'rgba(255,255,255,.85)')); });
    } else {
      const sunX = kind === 'title' ? 236 : 250, sunY = 30;
      [[-6, 0, 60, 8], [-14, 8, 76, 8], [-20, 16, 88, 8], [-24, 24, 96, 16], [-20, 40, 88, 8], [-14, 48, 76, 8], [-6, 56, 60, 8]].forEach(function (r) { L.appendChild(h('sun', sunX + r[0], sunY + r[1], r[2], r[3], '#ffe07a')); });
      [[30, 112, 34, 8], [56, 120, 28, 6], [300, 128, 44, 8], [330, 136, 26, 6], [140, 138, 30, 6]].forEach(function (c) { L.appendChild(h('', c[0], c[1], c[2], c[3], '#ffb3a0')); L.appendChild(h('', c[0] + 6, c[1] + c[3], c[2] - 14, 5, '#ffcbb8')); });
      [[20, 140], [70, 146], [120, 132], [180, 148], [260, 142], [340, 134], [380, 146]].forEach(function (s) { L.appendChild(h('star', s[0], s[1], 3, 3, '#fff8e0')); });
      range(L, [[0, 40], [70, 84], [140, 52], [220, 96], [300, 58], [360, 80], [400, 44]], '#5a3d7e', 8, 0);
      range(L, [[0, 18], [90, 46], [170, 24], [260, 60], [340, 30], [400, 50]], '#3a2c5e', 8, 0);
      L.appendChild(h('', 0, 0, 400, 12, 'rgba(60,30,80,.5)'));
      bird(L, 80, 118, '#2c1f45'); bird(L, 104, 110, '#2c1f45');
    }
    return L;
  }
  function floor(bg) {
    const wrap = document.createElement('div'); wrap.className = 'afloorwrap';
    const f = document.createElement('div'); f.className = 'afloor';
    f.style.setProperty('--fl1', V === 'C' ? '#9a7a6a' : V === 'B' ? '#8a6a4a' : '#8f9aa8');
    wrap.appendChild(f); bg.appendChild(wrap);
  }
  let done = { title: false, arena: false };
  const tick = setInterval(function () {
    const scene = document.querySelector('#screen-start .title__scene');
    if (scene && !done.title) { done.title = true; scene.insertBefore(build('title'), scene.firstChild); document.querySelector('#screen-start .title').classList.add('bg' + V); }
    const bg = document.querySelector('#screen-battle .arena__bg');
    if (bg && !done.arena) {
      done.arena = true;
      const hills = bg.querySelector('.arena__hills'); if (hills) hills.classList.add('is-mock');
      const ground = bg.querySelector('.arena__ground'); if (ground) ground.classList.add('is-mock');
      bg.insertBefore(build('arena'), bg.querySelector('.arena__hills') || null);
      floor(bg);
      bg.classList.add('bg' + V); document.querySelector('#screen-battle .arena').classList.add('bg' + V);
    }
    if (done.title && done.arena) clearInterval(tick);
  }, 60);
})();
