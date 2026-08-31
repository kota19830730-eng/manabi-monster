/* ---------------------------------------------------------
   ドット絵エディタ（v2.9）：マス目を ゆびで 直す

   子どもの お絵かきが ドット絵に なるのが うれしい ところ（ユーザー）。
   写真（や AI）から できた ドット絵を、そのまま 自分の 手で 直せる ように する。
   まっしろから かく ことも できる（size だけ わたす）。

   MQ.ui.pixedit.open({ png, size, title, onDone(pngDataUrl), onCancel })
     png    … 直したい ドット絵（dataURL）。ない ときは まっしろ
     size   … マスの 数（png が ある ときは その 大きさ。ない ときの 初期 48）
     onDone … 「これで OK」で できあがりの PNG（N×N）を もらう

   しくみ：
     ・#stage の 上に かぶせる 1枚（.pixed）。下の 画面は そのまま のこる
     ・絵は N×N の canvas（ImageData）を CSS で 拡大（image-rendering: pixelated）
     ・ゆび 1本 = 道具（ペン／けしゴム／ぬる／スポイト／うごかす）、ゆび 2本 = うごかす
     ・かくだい ×1 ×2 ×4（64マスは ×2 で 1マス 約12px・×4 で 約24px → ゆびで おせる）
     ・もどす（40回まで）
     ・色：この 絵に ある 色（多い じゅん 16色）＋ きほんの 24色
     ・iPad 対策：touchmove を preventDefault（メモ欄と 同じ）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.pixedit = (function () {
  const h = MQ.util.h;
  const MAX_UNDO = 40;
  const MAX_IMG_COLORS = 16;
  const BASIC = [
    ['#1c1a18', 'くろ'], ['#5a5a66', 'はいいろ'], ['#a8a8b4', 'うすい はいいろ'], ['#ffffff', 'しろ'],
    ['#7a4a22', 'ちゃいろ'], ['#c2322d', 'あか'], ['#f2a23a', 'オレンジ'], ['#ffd447', 'きいろ'],
    ['#9ccc3a', 'きみどり'], ['#4caf50', 'みどり'], ['#1f7a1c', 'こい みどり'], ['#5ce1e6', 'みずいろ'],
    ['#3f7fd6', 'あお'], ['#22336e', 'こい あお'], ['#8e44ad', 'むらさき'], ['#ff7ab8', 'ピンク'],
    ['#f7c9a0', 'はだいろ'], ['#fff2c8', 'クリーム'], ['#7d1f1f', 'こい あか'], ['#1e8f8f', 'あおみどり'],
    ['#d4a017', 'きん'], ['#e0e6f0', 'ぎんいろ'], ['#e91e63', 'あかむらさき'], ['#4a2c8a', 'こい むらさき']
  ];
  const TOOLS = [['pen', 'ペン'], ['eraser', 'けしゴム'], ['fill', 'ぬる'], ['pick', 'スポイト'], ['move', 'うごかす']];
  const BRUSHES = [[1, '小'], [2, '中'], [3, '大']];
  const ZOOMS = [[1, '×1'], [2, '×2'], [4, '×4']];

  let current = null;   // 開いている エディタ（1つだけ）

  function hex2rgb(s) { return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; }
  function rgb2hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function sameRgb(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

  // 絵の 中に ある 色（多い じゅん）
  function colorsOf(data, n) {
    const m = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const k = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
      m[k] = (m[k] || 0) + 1;
    }
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, n)
      .map(function (k) { return k.split(',').map(Number); });
  }

  function open(opts) {
    opts = opts || {};
    if (current) current.close();
    if (opts.png) {
      const im = new Image();
      im.onload = function () { build(opts, im); };
      im.onerror = function () { build(opts, null); };
      im.src = opts.png;
    } else build(opts, null);
  }

  function build(opts, im) {
    // マスの 数：png の 大きさ（128 まで）。大きな 画像（古い 写真など）は 64マスに 落とす
    const nat = im ? im.naturalWidth : 0;
    const N = opts.size || (nat && nat <= 128 ? nat : nat ? 64 : 48);
    const stage = document.getElementById('stage') || document.body;
    const stH = (MQ.stage && MQ.stage.size) ? MQ.stage.size().h : 700;
    const VIEW = Math.max(300, Math.min(376, stH - 330));   // たて700の 端末でも 下の ボタンまで 入る

    /* ---- 絵（N×N） ---- */
    const cv = h('canvas', { class: 'pixed__cv' });
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    let img = ctx.createImageData(N, N);
    if (im) {
      try {
        const t = document.createElement('canvas');
        t.width = N; t.height = N;
        const tx = t.getContext('2d');
        tx.imageSmoothingEnabled = false;
        tx.drawImage(im, 0, 0, N, N);
        img = tx.getImageData(0, 0, N, N);
      } catch (e) {}
    }
    const D = img.data;
    const st = { N: N, tool: 'pen', color: [28, 26, 24], brush: 1, zoom: 1, pan: { x: 0, y: 0 }, undo: [], pointers: {}, drawing: null, panning: null, dirty: false };

    function idx(x, y) { return (y * N + x) * 4; }
    function setPx(x, y, c) {
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const i = idx(x, y);
      if (c) { D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255; }
      else { D[i] = 0; D[i + 1] = 0; D[i + 2] = 0; D[i + 3] = 0; }
      st.dirty = true;
    }
    function pixel(x, y) {
      if (x < 0 || y < 0 || x >= N || y >= N) return null;
      const i = idx(x, y);
      return [D[i], D[i + 1], D[i + 2], D[i + 3]];
    }
    function paint() { ctx.putImageData(img, 0, 0); }
    // ふでの 大きさぶん（1／2×2／3×3）
    function dot(c) {
      const b = st.brush, o = Math.floor((b - 1) / 2);
      const col = st.tool === 'eraser' ? null : st.color;
      for (let dy = 0; dy < b; dy++) for (let dx = 0; dx < b; dx++) setPx(c.x - o + dx, c.y - o + dy, col);
    }
    // マスと マスの あいだを うめる（速く 動かしても 線が 切れない）
    function line(a, b) {
      let x0 = a.x, y0 = a.y;
      const x1 = b.x, y1 = b.y;
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let g = 0; g < 4096; g++) {
        dot({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function same(i, c) {
      return c ? (D[i + 3] === 255 && D[i] === c[0] && D[i + 1] === c[1] && D[i + 2] === c[2]) : D[i + 3] === 0;
    }
    // ぬる：同じ 色で つながっている ところを ぜんぶ
    function fill(c) {
      if (c.x < 0 || c.y < 0 || c.x >= N || c.y >= N) return;
      const i0 = idx(c.x, c.y);
      const from = D[i0 + 3] ? [D[i0], D[i0 + 1], D[i0 + 2]] : null;
      const to = st.color;
      if (same(i0, to)) return;
      const seen = new Uint8Array(N * N);
      const stack = [c.y * N + c.x];
      while (stack.length) {
        const k = stack.pop();
        if (seen[k]) continue;
        const x = k % N, y = (k - x) / N;
        if (!same(k * 4, from)) continue;
        seen[k] = 1;
        setPx(x, y, to);
        if (x > 0) stack.push(k - 1);
        if (x < N - 1) stack.push(k + 1);
        if (y > 0) stack.push(k - N);
        if (y < N - 1) stack.push(k + N);
      }
    }
    function pick(c) {
      const p = pixel(c.x, c.y);
      if (!p || !p[3]) return;
      setColor([p[0], p[1], p[2]]);
      setTool('pen');
    }
    function snapshot() {
      st.undo.push(D.slice(0));
      if (st.undo.length > MAX_UNDO) st.undo.shift();
      undoBtn.disabled = false;
    }
    function undo() {
      const s = st.undo.pop();
      if (!s) return;
      D.set(s);
      paint();
      undoBtn.disabled = !st.undo.length;
    }

    /* ---- 画面の 部品 ---- */
    function chips(list, get, set) {
      const wrap = h('div', { class: 'chips chips--tight pixed__chips' });
      list.forEach(function (it) {
        const b = h('button', {
          class: 'chip chip--s' + (get() === it[0] ? ' is-on' : ''), type: 'button', text: it[1], 'data-v': String(it[0]),
          onclick: function () { MQ.sfx.tap(); set(it[0]); }
        });
        wrap.appendChild(b);
      });
      wrap.sync = function () {
        wrap.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-v') === String(get())); });
      };
      return wrap;
    }
    const grid = h('div', { class: 'pixed__grid' });
    const view = h('div', { class: 'pixed__view', style: { width: VIEW + 'px', height: VIEW + 'px' } }, [cv, grid]);
    const cur = h('span', { class: 'pixed__cur', title: 'いまの 色' });
    const pal = h('div', { class: 'pixed__pal' });
    const undoBtn = h('button', { class: 'btn btn--small btn--cream', type: 'button', text: 'もどす', disabled: true, onclick: function () { MQ.sfx.tap(); undo(); } });
    const toolChips = chips(TOOLS, function () { return st.tool; }, setTool);
    const brushChips = chips(BRUSHES, function () { return st.brush; }, function (v) { st.brush = v; brushChips.sync(); });
    const zoomChips = chips(ZOOMS, function () { return st.zoom; }, function (v) { setZoom(v); zoomChips.sync(); });

    function setTool(t) { st.tool = t; toolChips.sync(); view.setAttribute('data-tool', t); }
    function setColor(c) {
      st.color = [c[0], c[1], c[2]];
      cur.style.background = rgb2hex(st.color);
      pal.querySelectorAll('.pixed__sw').forEach(function (b) { b.classList.toggle('is-on', sameRgb(b._c, st.color)); });
    }
    function swatch(c, name, cls) {
      const b = h('button', {
        class: 'pixed__sw' + (cls ? ' ' + cls : ''), type: 'button', title: name, 'aria-label': name,
        style: { background: rgb2hex(c) },
        onclick: function () {
          MQ.sfx.tap();
          setColor(c);
          if (st.tool !== 'pen' && st.tool !== 'fill') setTool('pen');
        }
      });
      b._c = c;
      return b;
    }
    function buildPal() {
      pal.innerHTML = '';
      const own = colorsOf(D, MAX_IMG_COLORS);
      own.forEach(function (c, i) { pal.appendChild(swatch(c, 'この 絵の 色', i === 0 ? 'pixed__sw--own' : '')); });
      BASIC.forEach(function (b, i) { pal.appendChild(swatch(hex2rgb(b[0]), b[1], i === 0 && own.length ? 'pixed__sw--sep' : '')); });
      setColor(own.length ? own[0] : hex2rgb(BASIC[0][0]));
    }
    // 絵の 場所と 大きさ（かくだい・うごかす）
    function layout() {
      const size = VIEW * st.zoom;
      const minP = VIEW - size;
      st.pan.x = Math.max(minP, Math.min(0, st.pan.x));
      st.pan.y = Math.max(minP, Math.min(0, st.pan.y));
      [cv, grid].forEach(function (el) {
        el.style.width = size + 'px'; el.style.height = size + 'px';
        el.style.left = st.pan.x + 'px'; el.style.top = st.pan.y + 'px';
      });
      const cell = size / N;
      grid.style.display = cell >= 7 ? 'block' : 'none';
      grid.style.backgroundSize = cell + 'px ' + cell + 'px';
    }
    function setZoom(z) {
      const k = z / st.zoom;
      st.pan.x = (st.pan.x - VIEW / 2) * k + VIEW / 2;
      st.pan.y = (st.pan.y - VIEW / 2) * k + VIEW / 2;
      st.zoom = z;
      layout();
    }

    /* ---- ゆび ---- */
    function cellAt(e) {
      const r = cv.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) / r.width * N), y: Math.floor((e.clientY - r.top) / r.height * N) };
    }
    // 画面の px → ステージの px（画面ぜんたいが 拡大縮小されている）
    function screenScale() { const r = view.getBoundingClientRect(); return (r.width / VIEW) || 1; }
    function mid() {
      const ks = Object.keys(st.pointers);
      const a = st.pointers[ks[0]], b = st.pointers[ks[1]];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    view.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      st.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      if (Object.keys(st.pointers).length >= 2) {
        // ゆび 2本 → うごかす（1本目で 描きかけの 線は そのまま。もどす で 消せる）
        st.drawing = null;
        st.panning = { kind: 'two', at: mid() };
        return;
      }
      const c = cellAt(e);
      if (st.tool === 'move') { st.panning = { kind: 'one', at: { x: e.clientX, y: e.clientY } }; return; }
      if (st.tool === 'pick') { pick(c); return; }
      if (st.tool === 'fill') { snapshot(); fill(c); paint(); return; }
      snapshot();
      st.drawing = { id: e.pointerId, last: c };
      dot(c);
      paint();
    });
    view.addEventListener('pointermove', function (e) {
      if (!st.pointers[e.pointerId]) return;
      e.preventDefault();
      st.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (st.panning) {
        let now = null;
        if (st.panning.kind === 'two') { if (Object.keys(st.pointers).length >= 2) now = mid(); }
        else now = { x: e.clientX, y: e.clientY };
        if (!now) return;
        const s = screenScale();
        st.pan.x += (now.x - st.panning.at.x) / s;
        st.pan.y += (now.y - st.panning.at.y) / s;
        st.panning.at = now;
        layout();
        return;
      }
      if (st.drawing && st.drawing.id === e.pointerId) {
        const c = cellAt(e);
        if (c.x !== st.drawing.last.x || c.y !== st.drawing.last.y) {
          line(st.drawing.last, c);
          st.drawing.last = c;
          paint();
        }
      }
    });
    function up(e) {
      delete st.pointers[e.pointerId];
      if (st.drawing && st.drawing.id === e.pointerId) st.drawing = null;
      if (st.panning && (st.panning.kind === 'one' || Object.keys(st.pointers).length < 2)) st.panning = null;
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { view.addEventListener(t, up); });
    // iPad などで 画面が スクロールしようとして 線が 切れるのを ふせぐ
    ['touchstart', 'touchmove', 'touchend'].forEach(function (t) {
      view.addEventListener(t, function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    });

    /* ---- おわり ---- */
    const root = h('div', { class: 'pixed' }, [
      h('div', { class: 'pixed__head' }, [
        h('span', { class: 'pixed__title', text: opts.title || 'ドットを 直す' }),
        h('span', { class: 'pixed__hint', text: N + '×' + N + '・ゆび 2本で うごかす' }),
        undoBtn
      ]),
      view,
      toolChips,
      h('div', { class: 'pixed__row' }, [
        h('span', { class: 'pixed__lbl', text: 'ふとさ' }), brushChips,
        h('span', { class: 'pixed__lbl', text: 'かくだい' }), zoomChips
      ]),
      h('div', { class: 'pixed__palwrap' }, [cur, pal]),
      h('div', { class: 'pixed__foot' }, [
        h('button', {
          class: 'btn btn--stone', type: 'button', text: 'やめる',
          onclick: function () {
            MQ.sfx.tap();
            if (st.dirty && !window.confirm('直した ところを すてて やめますか？')) return;
            close();
            if (opts.onCancel) opts.onCancel();
          }
        }),
        h('button', {
          class: 'btn', type: 'button', text: 'これで OK',
          onclick: function () {
            MQ.sfx.tap();
            let url = '';
            try { url = cv.toDataURL('image/png'); } catch (e) { url = ''; }
            close();
            if (opts.onDone) opts.onDone(url);
          }
        })
      ])
    ]);
    function close() {
      if (root.parentNode) root.parentNode.removeChild(root);
      current = null;
      MQ.ui.pixedit.test = null;
    }
    stage.appendChild(root);
    paint();
    buildPal();
    setTool('pen');
    layout();
    current = { close: close };

    // テスト用（tools/harness.html）
    MQ.ui.pixedit.test = {
      state: function () { return st; },
      pixel: pixel,
      tool: setTool,
      color: setColor,
      zoom: function (z) { setZoom(z); zoomChips.sync(); },
      brush: function (b) { st.brush = b; brushChips.sync(); },
      undo: undo,
      paintCell: function (x, y) { snapshot(); dot({ x: x, y: y }); paint(); },
      canvas: cv,
      view: view
    };
  }

  return {
    open: open,
    close: function () { if (current) current.close(); },
    isOpen: function () { return !!current; },
    colorsOf: colorsOf,
    BASIC: BASIC,
    test: null
  };
})();
