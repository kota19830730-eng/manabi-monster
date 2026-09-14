/* ---------------------------------------------------------
   カットインの 主人公を 1まいの 絵に する（v14.3 案B・ユーザーが 見本で えらんだ）

   ユーザー「画面が 大きくなる 必殺技が 多少 カクつく。クオリティは 下げないで」
   → カットインの 3D の 主人公は 面 約300まい。わざの 1コマめで 300まいぶん 描く（メインの Paint）ので、
     タブレット（CPU が おそい）では わざの はじめが 0.2秒ほど 止まる（CPU ×4 で Paint 195ms → 2D の 絵なら 33ms）。
   ここでは **いつもと 同じ 3D の 主人公（同じ ポーズ・同じ カメラ）を 画面の 外で 1回 組んで、
   面を 1まいずつ Canvas に 描き写した 絵**を 作って おく。カットインでは その 絵を 出すだけ（層 1まい）。

   しくみ：
     ・MQ.ui.v3.hero で ポーズつきの 器を 画面の 外（.cisnap-host）に 作る（見えない・動かない）
     ・面（.f）ごとに 器まで の 変形（left/top・transform・transform-origin）を DOMMatrix で かけあわせ、
       器の perspective で 画面に うつした 4つの かどを 出す
     ・面の 背景（色・しま・絵）を 1まいの アトラスに 描いて、WebGL で 面を 四角に 貼る。どちらが 手まえかは 深さで 1点ずつ
       （奥から じゅんに かさねる やり方では、長い けんが 頭の 箱を つきぬける ポーズで かさなりが くるった）
     ・変形と 背景は 要素の style（vox.js が インラインで 書く）から 読む＝vox.js の 描き方が かわっても ついて いく。
       部品の ポーズ（css/specialfx.css の .ci-pose-*）だけ スタイルシートから。読めない ときは getComputedStyle（おそい）
   作るのは たたかいの はじめ（ciWarm の あと）。いまの 教科の わざ → いなずま → メテオ → ビッグバン → スターバースト の じゅんに
   1つずつ すきまの 時間に（1まい PC 約22ms・CPU ×4 で 約90ms・はじめの 1まいだけ 3D を 組む ぶん おそい）。
   まだ できて いない ポーズは いままでの 3D を 出す（get が null）。WebGL が ない 端末も いままでの 3D。
   たしかめ：harness #cisnap[:<大きさ>[:<ポーズ,…>]]（左＝3D・右＝絵）・tools/fxcheck/snapcost.js（作る 時間）
   --------------------------------------------------------- */
(function () {
  const S = 320;                 // 作る 大きさ（器の 1辺）。出す ときに カットインの 大きさ（fig）へ のばす
  const cache = {};              // key → { cv, x, y, w, h }（器の 左上から・S の 大きさの px）
  const pending = {};
  const imgs = {};
  const queue = [];
  let running = false;
  const timing = { style: 0, atlas: 0, gl: 0 };   // さいごの 1まいの 作る 時間の 内わけ（ms・見本と はかる 道具 用）

  function ok() {
    return typeof window !== 'undefined' && !!window.DOMMatrix && !!glCtx();
  }
  function srcOf(player) { return MQ.hero.sprite(player); }
  function keyOf(src, pose) { return src.length + ':' + src.slice(-48) + '|' + pose; }
  function loadImg(url) {
    if (!imgs[url]) imgs[url] = new Promise(function (res) {
      const im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = url;
    });
    return imgs[url];
  }
  function px(v) { return parseFloat(v) || 0; }
  /* 「a, f(b, c), d」を いちばん 外の カンマで 分ける */
  function splitTop(s) {
    const out = []; let dep = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      if (ch === '(') dep++;
      if (ch === ')') dep--;
      if (ch === ',' && dep === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function inner(s) { return s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')); }
  /* 色の しるし（rgb(...)・rgba(...)・#…・ことば）と のこり */
  function colorHead(tok) {
    const m = /^(rgba?\([^)]*\)|#[0-9a-fA-F]+|[a-z]+)\s*(.*)$/.exec(tok);
    return m ? { c: m[1], rest: m[2] } : { c: tok, rest: '' };
  }
  function isColor(tok) { return /^(rgba?\(|#|transparent\b|black\b|white\b)/.test(tok); }
  /* 色の とまり（color stop）→ [[位置0..1, 色], …] */
  function stopsOf(toks, len) {
    const raw = [];
    toks.forEach(function (t) {
      const h = colorHead(t);
      const ps = h.rest ? h.rest.split(/\s+/).filter(Boolean).map(function (p) { return /%$/.test(p) ? px(p) / 100 : px(p) / (len || 1); }) : [];
      if (!ps.length) raw.push([null, h.c]);
      ps.forEach(function (p) { raw.push([p, h.c]); });
    });
    if (!raw.length) return [];
    if (raw[0][0] === null) raw[0][0] = 0;
    if (raw[raw.length - 1][0] === null) raw[raw.length - 1][0] = 1;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i][0] !== null) { if (raw[i][0] < raw[i - 1][0]) raw[i][0] = raw[i - 1][0]; continue; }
      let j = i; while (raw[j][0] === null) j++;
      const a = raw[i - 1][0], b = raw[j][0];
      for (let k = i; k < j; k++) raw[k][0] = a + (b - a) * (k - i + 1) / (j - i + 1);
    }
    return raw;
  }
  /* 面の 背景を 読む（getComputedStyle）。絵は あとで 読みこむ */
  /* 同じ 背景は 1回だけ 読む（絵の data URL は 何万字も ある ので 1字ずつ 見ると 遅い＝url(...) は 先に よけて おく） */
  const bgMemo = new Map();
  function bgOf(cs) {
    const key = cs.backgroundColor + '|' + cs.backgroundImage + '|' + cs.backgroundSize + '|' + cs.backgroundPosition;
    let bg = bgMemo.get(key);
    if (!bg) { bg = bgOf0(cs); bgMemo.set(key, bg); }
    return { color: bg.color, layers: bg.layers.map(function (L) { return Object.assign({}, L); }) };
  }
  function bgOf0(cs) {
    const bg = { color: cs.backgroundColor, layers: [] };
    let img = cs.backgroundImage;
    if (!img || img === 'none') return bg;
    const urls = [];
    img = img.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/g, function (m, q, u) { urls.push(u); return 'url(#' + (urls.length - 1) + ')'; });
    const sizes = splitTop(cs.backgroundSize || 'auto');
    const poss = splitTop(cs.backgroundPosition || '0% 0%');
    splitTop(img).forEach(function (L, i) {
      const sz = (sizes[i % sizes.length] || 'auto').split(/\s+/);
      const ps = (poss[i % poss.length] || '0% 0%').split(/\s+/);
      if (/^url\(/.test(L)) {
        const url = urls[+L.slice(5, -1)];
        bg.layers.push({ t: 'url', url: url, sz: sz, ps: ps });
      } else if (/^linear-gradient\(/.test(L)) {
        const toks = splitTop(inner(L));
        let dir = 'to bottom';
        if (toks.length && !isColor(toks[0])) dir = toks.shift();
        bg.layers.push({ t: 'lin', dir: dir, toks: toks, sz: sz, ps: ps });
      } else if (/^radial-gradient\(/.test(L)) {
        const toks = splitTop(inner(L));
        if (toks.length && !isColor(toks[0])) toks.shift();   // ellipse at center（まん中の だ円・いちばん 遠い かどまで）
        bg.layers.push({ t: 'rad', toks: toks });
      }
    });
    return bg;
  }
  function layerSize(L, w, h, im) {
    const a = L.sz[0], b = L.sz[1] || 'auto';
    let sw = a === 'auto' ? (im ? im.naturalWidth : w) : /%$/.test(a) ? w * px(a) / 100 : px(a);
    let sh = b === 'auto' ? (im ? (a === 'auto' ? im.naturalHeight : im.naturalHeight * sw / im.naturalWidth) : h) : /%$/.test(b) ? h * px(b) / 100 : px(b);
    return [sw, sh];
  }
  function layerPos(L, w, h, sw, sh) {
    const p = function (v, room) { return /%$/.test(v) ? room * px(v) / 100 : px(v); };
    return [p(L.ps[0] || '0%', w - sw), p(L.ps[1] || '0%', h - sh)];
  }
  function paintBg(ctx, bg, w, h) {
    if (bg.color && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg.color)) { ctx.fillStyle = bg.color; ctx.fillRect(0, 0, w, h); }
    for (let i = bg.layers.length - 1; i >= 0; i--) {
      const L = bg.layers[i];
      if (L.t === 'url') {
        if (!L.im) continue;
        const s = layerSize(L, w, h, L.im), p = layerPos(L, w, h, s[0], s[1]);
        ctx.drawImage(L.im, p[0], p[1], s[0], s[1]);
      } else if (L.t === 'lin') {
        const s = layerSize(L, w, h, null), p = layerPos(L, w, h, s[0], s[1]);
        const d = L.dir;
        const x0 = p[0], y0 = p[1], x1 = p[0] + s[0], y1 = p[1] + s[1];
        const g = /right/.test(d) ? ctx.createLinearGradient(x0, 0, x1, 0) : /left/.test(d) ? ctx.createLinearGradient(x1, 0, x0, 0)
          : /top/.test(d) ? ctx.createLinearGradient(0, y1, 0, y0) : ctx.createLinearGradient(0, y0, 0, y1);
        stopsOf(L.toks, /right|left/.test(d) ? s[0] : s[1]).forEach(function (st) { g.addColorStop(Math.max(0, Math.min(1, st[0])), st[1]); });
        ctx.fillStyle = g; ctx.fillRect(x0, y0, s[0], s[1]);
      } else if (L.t === 'rad') {
        const rx = w / 2 * Math.SQRT2, ry = h / 2 * Math.SQRT2;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        stopsOf(L.toks, rx).forEach(function (st) { g.addColorStop(Math.max(0, Math.min(1, st[0])), st[1]); });
        ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2 * rx / ry, w, h * rx / ry);
        ctx.restore();
      }
    }
  }
  /* WebGL（1つを 使いまわす）。面を 三角 2つずつ・模様は アトラス・どちらが 手まえかは 深さで（DOM の 3D と 同じ かさなり） */
  let GLS = null;
  function glCtx() {
    if (GLS !== null) return GLS;
    GLS = false;
    try {
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl', { antialias: true, alpha: true, depth: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) return GLS;
      const sh = function (type, src) { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
      const vs = sh(gl.VERTEX_SHADER, 'attribute vec4 p; attribute vec2 t; varying vec2 v; void main() { gl_Position = p; v = t; }');
      const fs = sh(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D s; varying vec2 v; void main() { vec4 c = texture2D(s, v); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb, 1.0); }');
      if (!vs || !fs) return GLS;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return GLS;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);   // ドットの まま
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      GLS = { cv: cv, gl: gl, prog: prog, tex: tex, buf: gl.createBuffer(), aP: gl.getAttribLocation(prog, 'p'), aT: gl.getAttribLocation(prog, 't'), uS: gl.getUniformLocation(prog, 's') };
    } catch (e) { GLS = false; }
    return GLS;
  }
  /* 要素 1つぶんの 変形（親の 左上から）：位置 → transform-origin を 中心に transform */
  function localOf(cs) {
    const m = new DOMMatrix();
    if (cs.position === 'absolute' || cs.position === 'relative') m.translateSelf(px(cs.left), px(cs.top));
    if (cs.transform && cs.transform !== 'none') {
      const o = cs.transformOrigin.split(/\s+/).map(px);
      m.translateSelf(o[0], o[1], o[2] || 0);
      m.multiplySelf(new DOMMatrix(cs.transform));
      m.translateSelf(-o[0], -o[1], -(o[2] || 0));
    }
    return m;
  }

  /* v14.3：速く する。getComputedStyle で 面 200まいぶん 読むと CPU ×4 で 1ポーズ 150ms かかった（ほぼ ぜんぶ）。
     vox.js は 面・箱の 位置・変形・背景を ぜんぶ style（インライン）に 書いて いるので そこから 読む（画面に 出さない＝スタイルの 計算も なし）。
     部品（.p）の 回し方だけは css/specialfx.css の .ci-pose-<ポーズ> .p--<部品> に ある ので スタイルシートから 1回だけ 読む。
     読めない とき（ファイルを ダブルクリックで ひらいた ときなど）は いままでの getComputedStyle で 読む */
  const poseCss = {};
  function poseRules(pose) {
    if (pose in poseCss) return poseCss[pose];
    let out = null;
    try {
      const pre = '.ci-pose-' + pose + ' .p--';
      const map = {};
      let n = 0;
      Array.prototype.forEach.call(document.styleSheets, function (sh) {
        let rules = null;
        try { rules = sh.cssRules; } catch (e) { return; }   // よその サイトの シート（Google Fonts）は 読めない＝とばす
        Array.prototype.forEach.call(rules || [], function (r) {
          if (!r.selectorText || !r.style) return;
          r.selectorText.split(',').forEach(function (sel) {
            sel = sel.trim();
            if (sel.indexOf(pre) === 0 && /^[A-Za-z]+$/.test(sel.slice(pre.length))) { map[sel.slice(pre.length)] = r.style.transform; n++; }
          });
        });
      });
      out = n ? map : null;
    } catch (e) { out = null; }
    poseCss[pose] = out;
    return out;
  }
  function originOf(v, w, h) {
    const t = String(v).trim().split(/\s+/);
    let x = t[0], y = t.length > 1 ? t[1] : 'center';
    if (x === 'top' || x === 'bottom') { const k = x; x = y; y = k; }
    const one = function (a, len) {
      if (a === 'left' || a === 'top') return 0;
      if (a === 'right' || a === 'bottom') return len;
      if (a === 'center') return len / 2;
      if (/%$/.test(a)) return len * px(a) / 100;
      return px(a);
    };
    return [one(x, w), one(y, h), t[2] ? px(t[2]) : 0];
  }
  /* 要素 1つぶん（style から）。.v3hold の transform-origin は CSS の center bottom */
  function inlineLocal(el, poseMap) {
    const st = el.style, cl = el.classList;
    const m = new DOMMatrix();
    m.translateSelf(px(st.left), px(st.top));
    let tf = st.transform;
    if (poseMap && cl.contains('p')) Object.keys(poseMap).forEach(function (k) { if (cl.contains('p--' + k)) tf = poseMap[k]; });
    if (tf && tf !== 'none') {
      const w = px(st.width), h = px(st.height);
      const o = st.transformOrigin ? originOf(st.transformOrigin, w, h) : cl.contains('v3hold') ? [w / 2, h, 0] : [w / 2, h / 2, 0];
      m.translateSelf(o[0], o[1], o[2]);
      m.multiplySelf(matrixOf(tf));
      m.translateSelf(-o[0], -o[1], -o[2]);
    }
    return m;
  }
  const tfMemo = new Map();
  function matrixOf(tf) { let m = tfMemo.get(tf); if (!m) { m = new DOMMatrix(tf); tfMemo.set(tf, m); } return m; }
  /* 背景（style から）。background の まとめ書きの ときは のこりが 'initial' に なる */
  function inlineBg(st) {
    const v = function (x, d) { return !x || x === 'initial' ? d : x; };
    return bgOf({ backgroundColor: v(st.backgroundColor, 'transparent'), backgroundImage: v(st.backgroundImage, 'none'),
      backgroundSize: v(st.backgroundSize, 'auto'), backgroundPosition: v(st.backgroundPosition, '0% 0%') });
  }

  /* ポーズつきの 主人公を 1まいの 絵に。できたら cache に 入れる */
  function render(player, pose, R) {
    const src = srcOf(player), key = keyOf(src, pose);
    if (cache[key]) return Promise.resolve(cache[key]);
    const poseMap = poseRules(pose);   // 読めれば 画面に 出さずに style から
    const host = document.createElement('div');
    host.className = 'cisnap-host';
    const sc = MQ.ui.v3.hero(player, S, { ry: 22, unit: 4, mo: 'mo-snap', cls: 'ci-pose-' + pose });
    host.appendChild(sc);
    if (!poseMap) document.body.appendChild(host);
    return new Promise(function (res) {
      let n = 0;
      (function wait() { if (sc.v3 || n++ > 60) res(); else setTimeout(wait, 30); })();
    }).then(function () {
      if (!sc.v3) { host.remove(); return null; }
      const tA = performance.now();
      const scs = poseMap ? null : getComputedStyle(sc);
      const po = poseMap ? [S / 2, S / 2] : scs.perspectiveOrigin.split(/\s+/).map(px);
      const P = new DOMMatrix().translateSelf(po[0], po[1]);
      const pp = new DOMMatrix(); pp.m34 = -1 / ((poseMap ? px(sc.style.perspective) : px(scs.perspective)) || 900);
      P.multiplySelf(pp).translateSelf(-po[0], -po[1]);
      const mats = new Map();
      mats.set(sc, new DOMMatrix());
      const matOf = function (el) {
        if (mats.has(el)) return mats.get(el);
        const m = matOf(el.parentElement).multiply(poseMap ? inlineLocal(el, poseMap) : localOf(getComputedStyle(el)));
        mats.set(el, m);
        return m;
      };
      const faces = [];
      let shadow = null;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      Array.prototype.forEach.call(sc.querySelectorAll('.f'), function (f) {
        const cs = poseMap ? f.style : getComputedStyle(f);
        if (cs.display === 'none' || (cs.opacity !== '' && px(cs.opacity) === 0)) return;
        const w = px(cs.width), h = px(cs.height);
        if (w <= 0 || h <= 0) return;
        const M = matOf(f), PM = P.multiply(M);
        const pts = [[0, 0], [w, 0], [w, h], [0, h]].map(function (c) {
          const r = PM.transformPoint(new DOMPoint(c[0], c[1], 0, 1));
          const z = M.transformPoint(new DOMPoint(c[0], c[1], 0, 1)).z;
          return { x: r.x / r.w, y: r.y / r.w, w: r.w, z: z };
        });
        const area = (pts[1].x - pts[0].x) * (pts[3].y - pts[0].y) - (pts[1].y - pts[0].y) * (pts[3].x - pts[0].x);
        if (Math.abs(area) < 0.05) return;   // 真横から 見た 面（線に なる）
        pts.forEach(function (c) { if (c.x < x0) x0 = c.x; if (c.y < y0) y0 = c.y; if (c.x > x1) x1 = c.x; if (c.y > y1) y1 = c.y; });
        const face = { pts: pts, w: w, h: h, bg: poseMap ? inlineBg(cs) : bgOf(cs) };
        if (f.classList.contains('v3__shadow')) shadow = face; else faces.push(face);
      });
      host.remove();
      timing.style = performance.now() - tA;
      timing.inline = !!poseMap;
      const urls = [];
      faces.concat(shadow ? [shadow] : []).forEach(function (f) { f.bg.layers.forEach(function (L) { if (L.t === 'url' && urls.indexOf(L.url) < 0) urls.push(L.url); }); });
      return Promise.all(urls.map(loadImg)).then(function (list) {
        const byUrl = {};
        urls.forEach(function (u, i) { byUrl[u] = list[i]; });
        faces.concat(shadow ? [shadow] : []).forEach(function (f) { f.bg.layers.forEach(function (L) { if (L.t === 'url') L.im = byUrl[L.url]; }); });
        x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
        const cw = Math.max(1, Math.round((x1 - x0) * R)), ch = Math.max(1, Math.round((y1 - y0) * R));
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d');
        /* ① ゆかの 影（すける ので いちばん 先に 2D で） */
        if (shadow) {
          const q = shadow.pts;
          ctx.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
          ctx.save();
          ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); ctx.lineTo(q[1].x, q[1].y); ctx.lineTo(q[2].x, q[2].y); ctx.lineTo(q[3].x, q[3].y); ctx.closePath(); ctx.clip();
          ctx.transform((q[1].x - q[0].x) / shadow.w, (q[1].y - q[0].y) / shadow.w, (q[3].x - q[0].x) / shadow.h, (q[3].y - q[0].y) / shadow.h, q[0].x, q[0].y);
          paintBg(ctx, shadow.bg, shadow.w, shadow.h);
          ctx.restore();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        /* ② 面の 模様を 1まいの 絵（アトラス）に つめる（面ごとに 背景を 描く） */
        const tB = performance.now();
        const T = R;
        const AW = 2048;
        let ax = 0, ay = 0, rowH = 0;
        faces.forEach(function (f) { f.tw = Math.max(2, Math.ceil(f.w * T)); f.th = Math.max(2, Math.ceil(f.h * T)); });
        faces.slice().sort(function (a, b) { return b.th - a.th; }).forEach(function (f) {
          if (ax + f.tw + 2 > AW) { ax = 0; ay += rowH + 2; rowH = 0; }
          f.ax = ax; f.ay = ay; ax += f.tw + 2; if (f.th > rowH) rowH = f.th;
        });
        const AH = ay + rowH;
        const at = document.createElement('canvas');
        at.width = AW; at.height = Math.max(1, AH);
        const actx = at.getContext('2d');
        actx.imageSmoothingEnabled = false;   // 絵は ドット（pixelated）の まま
        faces.forEach(function (f) {
          actx.save();
          actx.beginPath(); actx.rect(f.ax, f.ay, f.tw, f.th); actx.clip();
          actx.setTransform(f.tw / f.w, 0, 0, f.th / f.h, f.ax, f.ay);
          paintBg(actx, f.bg, f.w, f.h);
          actx.restore();
        });
        /* ③ WebGL で 面を 描く（どちらが 手まえかは 1点ずつ しらべる＝本物の 3D と 同じ かさなり） */
        timing.atlas = performance.now() - tB;
        const tC = performance.now();
        const G = glCtx();
        if (!G) return null;
        const gl = G.gl;
        G.cv.width = cw; G.cv.height = ch;
        gl.viewport(0, 0, cw, ch);
        gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        gl.bindTexture(gl.TEXTURE_2D, G.tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, at);
        const ZR = 2000;
        const data = new Float32Array(faces.length * 6 * 6);
        let o = 0;
        faces.forEach(function (f) {
          const u0 = (f.ax + 0.5) / AW, v0 = (f.ay + 0.5) / at.height, u1 = (f.ax + f.tw - 0.5) / AW, v1 = (f.ay + f.th - 0.5) / at.height;
          const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
          [0, 1, 2, 0, 2, 3].forEach(function (i) {
            const p = f.pts[i];
            const nx = (p.x - x0) / (x1 - x0) * 2 - 1, ny = 1 - (p.y - y0) / (y1 - y0) * 2;
            const nz = Math.max(-0.999, Math.min(0.999, -p.z / ZR));
            data[o++] = nx * p.w; data[o++] = ny * p.w; data[o++] = nz * p.w; data[o++] = p.w;
            data[o++] = uv[i][0]; data[o++] = uv[i][1];
          });
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.useProgram(G.prog);
        gl.enableVertexAttribArray(G.aP); gl.vertexAttribPointer(G.aP, 4, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(G.aT); gl.vertexAttribPointer(G.aT, 2, gl.FLOAT, false, 24, 16);
        gl.uniform1i(G.uS, 0);
        gl.drawArrays(gl.TRIANGLES, 0, faces.length * 6);
        ctx.drawImage(G.cv, 0, 0);
        G.cv.width = G.cv.height = 1;   // WebGL の 描く ところ（アンチエイリアスつき・数十MB）は つぎまで いらない ので すぐ 小さく
        timing.gl = performance.now() - tC;
        const out = { cv: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, faces: faces.length };
        cache[key] = out;
        return out;
      });
    });
  }
  function resolution() {
    const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    return Math.max(1.5, Math.min(2.2, k * (window.devicePixelRatio || 1) * 1.2));   // カットインの 大きい 形（顔の アップ）でも ぼやけない くらい。ポーズ 8まい とって おく ので 大きすぎると メモリを 食う（2.2 で 1まい 約4MB）
  }
  function pump() {
    if (running) return;
    const job = queue.shift();
    if (!job) return;
    running = true;
    render(job.player, job.pose, resolution()).catch(function () { return null; }).then(function (out) {
      if (!out) cache[job.key] = false;   // 作れなかった（WebGL が 使えない など）＝いつもの 3D の まま
      delete pending[job.key];
      running = false;
      /* 1つずつ すきまを あけて（たたかいの じゃまを しない）。1まい CPU ×4 で 約90ms＝タブレットでも タップを 待たせない ように あいだを あける */
      setTimeout(function () { if (window.requestIdleCallback) requestIdleCallback(pump, { timeout: 1500 }); else pump(); }, 250);
    });
  }
  /* たたかいの はじめに ポーズを ぜんぶ 作って おく（1つずつ） */
  function warm(player, poses) {
    if (!ok() || !MQ.ui.v3) return;
    const src = srcOf(player);
    poses.forEach(function (pose) {
      const key = keyOf(src, pose);
      if (cache[key] || pending[key]) return;
      pending[key] = true;
      queue.push({ player: player, pose: pose, key: key });
    });
    pump();
  }
  /* カットインに 出す 絵（まだ なければ null）。fig＝カットインの 器の 大きさ */
  function get(player, pose, fig) {
    if (!ok()) return null;
    const e = cache[keyOf(srcOf(player), pose)];
    if (e === false) return null;
    if (!e) { warm(player, [pose]); return null; }
    const k = fig / S;
    const wrap = document.createElement('span');
    wrap.className = 'cisnap ci__fig mo-ci';
    wrap.style.width = fig + 'px';
    wrap.style.height = fig + 'px';
    const cv = e.cv;   // 同じ canvas を 使いまわす（カットインは 1つずつ しか 出ない）
    cv.className = 'cisnap__cv';
    cv.style.left = (e.x * k) + 'px';
    cv.style.top = (e.y * k) + 'px';
    cv.style.width = (e.w * k) + 'px';
    cv.style.height = (e.h * k) + 'px';
    wrap.appendChild(cv);
    return wrap;
  }
  MQ.ui = MQ.ui || {};
  MQ.ui.ciSnap = { timing: timing, ok: ok, warm: warm, get: get, render: render, S: S, cache: cache,
    busy: function () { return running || queue.length > 0; },   // まだ 作って いる ところ（見本の ページが「じゅんび中」を 出す）
    clear: function () { Object.keys(cache).forEach(function (k) { delete cache[k]; }); } };
})();
