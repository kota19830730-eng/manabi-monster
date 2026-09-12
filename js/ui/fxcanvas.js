/* =========================================================
   ひっさつわざの 光の エフェクト（v13.6・Canvas）
   ユーザー「必殺技の 炎や 雷を 3Dか 解像度 あげて 綺麗に」「こどもは 派手なの 好き」（2026-09-13）

   ・バトル画面（アリーナ）の 上に Canvas を 1枚 かさねて、光る 粒を 1回に 数百こ 描く。
     粒の 形は 四角（マイクラの 火の粉・雷と 同じ）。重なった ところほど 明るい（'lighter'）。
   ・岩・氷の かけらは 回る 立体の 箱（Canvas に 3面を 描く＝CSS 3D より ずっと 軽い）。
   ・わざが ない あいだは 何も 描かない（rAF も 止まる）。
   ・時間は 1/60秒 きざみで すすめる → seek(ms) で 同じ 絵が 出る（harness で 止めて 撮れる）。
   ・画像ファイルは 使わない。
   使い方： MQ.ui.fxc.attach(親) → MQ.ui.fxc.play(id, { foe, hero, height }) / seek(ms) / stop()
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};
  MQ.ui = MQ.ui || {};

  const STEP = 1000 / 60;
  const MAXP = 900;            // 粒の 上限
  let cv = null, cx = null, W = 400, H = 240, K = 1;
  let job = null, raf = 0, last = 0, acc = 0, slow = 0;
  let quality = 1;             // おそい 端末では 自動で 粒を へらす

  /* ---------- 乱数（seek で 同じ 絵に なるように 種を きめる） ---------- */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000003) / 1000003; };
  }

  /* ---------- 色 ---------- */
  function rgbOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function css(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }
  // 色の ならび → 12だんの 色（粒は 生まれて から 消えるまでに この 順に 色が かわる）
  function ramp(hexes) {
    const cs = hexes.map(rgbOf), out = [];
    for (let i = 0; i < 12; i++) {
      const u = i / 11 * (cs.length - 1), j = Math.min(cs.length - 2, Math.floor(u)), f = u - j;
      const a = cs[j], b = cs[j + 1];
      out.push([Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)]);
    }
    return { c: out, s: out.map(function (c) { return css(c); }) };
  }
  const RAMP = {
    fire:  ramp(['#ffffff', '#fff3a8', '#ffc24a', '#ff7a1e', '#e2361a', '#6e1206']),
    ember: ramp(['#fffbe0', '#ffd45a', '#ff8a2a', '#c83a14']),
    leaf:  ramp(['#ffffff', '#eaffcc', '#9cf07a', '#3fbf4a']),
    ice:   ramp(['#ffffff', '#e6fbff', '#9fe6ff', '#4fb4f0', '#2a6fc0']),
    wind:  ramp(['#ffffff', '#f0fcff', '#c4f0ff', '#8fd4f0']),
    bolt:  ramp(['#ffffff', '#eaf6ff', '#9fd8ff', '#4a9cff', '#3050d0']),
    gold:  ramp(['#ffffff', '#fff6c8', '#ffd447', '#ffa91e', '#d4560c']),
    smoke: ramp(['#7a6a66', '#554a47', '#342c2a']),
    dust:  ramp(['#d8c8a0', '#a8946c', '#6e5e44'])
  };
  const RAINBOW = ['#ff5e7a', '#ffd447', '#7cf9c4', '#4fd3ff', '#c48bff', '#ffffff'].map(function (c) { return ramp(['#ffffff', c, c]); });

  /* 光の にじみ（まるい ぼかし）を 色ごとに 1まい 作って 使いまわす */
  const glowCache = {};
  function glowOf(c) {
    const key = c[0] + ',' + c[1] + ',' + c[2];
    if (glowCache[key]) return glowCache[key];
    const g = document.createElement('canvas');
    g.width = g.height = 64;
    const x = g.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, css(c, 0.9));
    gr.addColorStop(0.28, css(c, 0.42));
    gr.addColorStop(1, css(c, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    glowCache[key] = g;
    return g;
  }

  /* ---------- 画面の 用意 ---------- */
  function attach(parent) {
    if (cv && cv.parentNode === parent) return cv;
    cv = document.createElement('canvas');
    cv.className = 'fxc';
    cv.hidden = true;
    cx = cv.getContext && cv.getContext('2d');
    if (!cx) { cv = null; return null; }
    parent.appendChild(cv);
    return cv;
  }
  function ok() { return !!(cv && cx); }
  function fit(h) {
    W = 400; H = Math.max(120, Math.round(h || 240));
    const sc = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    const dpr = window.devicePixelRatio || 1;
    K = Math.min(3, sc * dpr);
    while (W * K * H * K > 2400000 && K > 1) K -= 0.25;   // 大きすぎる 画面は 少し あらく（重さ）
    cv.style.height = H + 'px';
    cv.width = Math.round(W * K);
    cv.height = Math.round(H * K);
  }

  /* ---------- 粒 ---------- */
  function P(E, o) {
    if (E.parts.length >= MAXP) return null;
    const p = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, age: 0, life: 500, s0: 5, s1: 1, a: 1, fi: 0.06, fo: 0.55,
      m: 'g', ramp: RAMP.fire, rot: 0, vr: 0, sway: 0, ph: 0 };
    for (const k in o) p[k] = o[k];
    p.px = p.x; p.py = p.y;
    E.parts.push(p);
    return p;
  }
  function n(E, k) { return Math.max(1, Math.round(k * E.q)); }   // おそい 端末では 数を へらす
  function R(E, a, b) { return a + (b - a) * E.rnd(); }
  function at(E, ms) { return E.pt < ms && E.t >= ms; }
  function during(E, a, b) { return E.t >= a && E.t < b; }
  function thing(E, o) { o.t0 = E.t; o.age = 0; E.things.push(o); return o; }

  // はじける 火花（線を ひく 粒）
  function burst(E, x, y, k, o) {
    o = o || {};
    for (let i = 0; i < n(E, k); i++) {
      const a = o.up ? -Math.PI / 2 + R(E, -1.4, 1.4) : R(E, 0, Math.PI * 2);
      const v = R(E, o.v0 || 160, o.v1 || 460);
      P(E, { x: x + R(E, -4, 4), y: y + R(E, -4, 4), vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: o.g == null ? 420 : o.g,
        drag: o.drag == null ? 1.1 : o.drag, life: R(E, o.l0 || 380, o.l1 || 760), s0: o.s || 2.6, s1: 0.8, m: 's',
        ramp: o.rainbow ? RAINBOW[i % RAINBOW.length] : (o.ramp || RAMP.ember), fo: 0.5 });
    }
  }
  // 回る 箱の かけら（岩・氷）
  function chunks(E, x, y, k, col, o) {
    o = o || {};
    for (let i = 0; i < n(E, k); i++) {
      const a = o.up ? -Math.PI / 2 + R(E, -1.2, 1.2) : R(E, 0, Math.PI * 2);
      const v = R(E, o.v0 || 120, o.v1 || 360);
      P(E, { x: x + R(E, -8, 8), y: y + R(E, -8, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 80), ay: 720, drag: 0.4,
        life: R(E, 520, 900), s0: R(E, o.s0 || 4, o.s1 || 9), s1: 0, m: 'c', col: rgbOf(col), rot: R(E, 0, 6), vr: R(E, -9, 9), rot2: R(E, 0, 6), vr2: R(E, -7, 7), fo: 0.7 });
    }
  }
  function smoke(E, x, y, k, o) {
    o = o || {};
    for (let i = 0; i < n(E, k); i++) {
      P(E, { x: x + R(E, -14, 14), y: y + R(E, -8, 8), vx: R(E, -40, 40), vy: R(E, -70, -20), drag: 1.2, life: R(E, 600, 1000),
        s0: R(E, 8, 12), s1: R(E, 22, 34), m: 'm', ramp: o.ramp || RAMP.smoke, a: o.a || 0.4, fi: 0.15, fo: 0.4 });
    }
  }

  /* 走る あとに のこる 光（主人公が てきへ ダッシュする わざ）。t0〜t1 の あいだ、主人公の 位置 → てきの 手まえ */
  function trail(E, from, to, t0, t1, rp, k, size) {
    if (!during(E, t0, t1)) return;
    const u = (E.t - t0) / (t1 - t0), e = 1 - (1 - u) * (1 - u);
    const x = from.x + (to.x - 58 - from.x) * e, y = from.y + (to.y - from.y) * 0.3 * e;
    for (let i = 0; i < n(E, k); i++) {
      P(E, { x: x + R(E, -14, 8), y: y + R(E, -26, 26), vx: R(E, -80, -20), vy: R(E, -90, 10), drag: 1.5, life: R(E, 260, 460), s0: R(E, size * 0.5, size), s1: 1, ramp: rp, fo: 0.4 });
    }
  }
  /* ---------- 大きな もの（一閃・雷・わ・光） ---------- */
  function flash(E, hex, a, life) {
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = css(c, a * (1 - u) * (1 - u));
      g.fillRect(0, 0, W, H);
    } });
  }
  function ring(E, x, y, r0, r1, life, hex, w, sq) {
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      const e = 1 - (1 - u) * (1 - u) * (1 - u);
      const r = r0 + (r1 - r0) * e, a = 1 - u;
      g.save(); g.translate(x, y); g.scale(1, sq || 1);
      g.globalCompositeOperation = 'lighter';
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
      g.lineWidth = w * 3.2 * (1 - u * 0.5); g.strokeStyle = css(c, a * 0.28); g.stroke();
      g.lineWidth = w * (1 - u * 0.6); g.strokeStyle = css([255, 255, 255], a * 0.9); g.stroke();
      g.restore();
    } });
  }
  // 三日月の 一閃。ang＝はじまりの 向き（ラジアン）・span＝どこまで ふるか
  function slash(E, x, y, rad, ang, span, life, hex, thick) {
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      const pr = Math.min(1, u / 0.3), a = u < 0.3 ? 1 : 1 - (u - 0.3) / 0.7;
      const N = 18;
      const draw = function (wk, col) {
        g.beginPath();
        for (let i = 0; i <= N; i++) {
          const f = i / N, an = ang + span * pr * f, w = thick * wk * Math.sin(Math.PI * Math.min(1, f * 1.05)) * (0.4 + 0.6 * f);
          const r = rad + w / 2;
          if (i === 0) g.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r); else g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
        }
        for (let i = N; i >= 0; i--) {
          const f = i / N, an = ang + span * pr * f, w = thick * wk * Math.sin(Math.PI * Math.min(1, f * 1.05)) * (0.4 + 0.6 * f);
          const r = rad - w / 2;
          g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
        }
        g.closePath(); g.fillStyle = col; g.fill();
      };
      g.globalCompositeOperation = 'lighter';
      draw(2.2, css(c, a * 0.32));
      draw(1.0, css(c, a * 0.85));
      draw(0.38, css([255, 255, 255], a));
    } });
  }
  // ジグザグの 雷。道は 45ミリ秒ごとに 作り直す（ぴかぴか ゆれる）
  function zig(E, x0, y0, x1, y1, disp, depth, out) {
    if (depth === 0) { out.push([x1, y1]); return; }
    const mx = (x0 + x1) / 2 + R(E, -disp, disp), my = (y0 + y1) / 2 + R(E, -disp, disp) * 0.35;
    zig(E, x0, y0, mx, my, disp / 2, depth - 1, out);
    zig(E, mx, my, x1, y1, disp / 2, depth - 1, out);
  }
  function boltPath(E, x0, y0, x1, y1, jit, branches) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const main = [[x0, y0]];
    zig(E, x0, y0, x1, y1, len * jit, 6, main);
    const lines = [main];
    for (let b = 0; b < branches; b++) {
      const i = Math.floor(R(E, 0.15, 0.7) * main.length), s = main[i];
      const dir = Math.atan2(y1 - y0, x1 - x0) + (E.rnd() < 0.5 ? -1 : 1) * R(E, 0.35, 0.9);
      const bl = len * R(E, 0.18, 0.38);
      const br = [[s[0], s[1]]];
      zig(E, s[0], s[1], s[0] + Math.cos(dir) * bl, s[1] + Math.sin(dir) * bl, bl * jit, 4, br);
      lines.push(br);
    }
    // 2px の ます目に そろえる（ドットの ギザギザ）
    lines.forEach(function (l) { l.forEach(function (pt) { pt[0] = Math.round(pt[0] / 2) * 2; pt[1] = Math.round(pt[1] / 2) * 2; }); });
    return lines;
  }
  const FLICK = [1, 0.25, 1, 0.9, 0.35, 1, 0.8, 0.45, 1, 0.6];
  function bolt(E, x0, y0, x1, y1, life, o) {
    o = o || {};
    const c = rgbOf(o.hex || '#9fd8ff'), w = o.w || 2.4;
    const t = thing(E, { life: life, lines: boltPath(E, x0, y0, x1, y1, o.jit || 0.26, o.br || 0), next: 45,
      update: function (dt) {
        t.next -= dt;
        if (t.next <= 0) { t.next = 45; t.lines = boltPath(E, x0 + R(E, -3, 3), y0, x1 + R(E, -3, 3), y1, o.jit || 0.26, o.br || 0); }
      },
      draw: function (g, u) {
        const f = FLICK[Math.floor(t.age / 45) % FLICK.length] * (u < 0.7 ? 1 : (1 - u) / 0.3);
        g.globalCompositeOperation = 'lighter';
        g.lineJoin = 'miter'; g.lineCap = 'square';
        t.lines.forEach(function (l, li) {
          const k = li === 0 ? 1 : 0.55;
          g.beginPath(); g.moveTo(l[0][0], l[0][1]);
          for (let i = 1; i < l.length; i++) g.lineTo(l[i][0], l[i][1]);
          g.lineWidth = w * 5 * k; g.strokeStyle = css(c, 0.18 * f); g.stroke();
          g.lineWidth = w * 2 * k; g.strokeStyle = css(c, 0.7 * f); g.stroke();
          g.lineWidth = Math.max(1, w * 0.7 * k); g.strokeStyle = css([255, 255, 255], f); g.stroke();
        });
      } });
    return t;
  }
  // 中心から のびる 光の すじ
  function rays(E, x, y, k, len, life, hex, spin) {
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      const a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      const gr = g.createRadialGradient(x, y, 0, x, y, len * (0.6 + u * 0.5));
      gr.addColorStop(0, css([255, 255, 255], a)); gr.addColorStop(0.35, css(c, a * 0.7)); gr.addColorStop(1, css(c, 0));
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.beginPath();
      const base = (spin || 0) * u;
      for (let i = 0; i < k; i++) {
        const an = base + i * Math.PI * 2 / k, hw = i % 2 ? 0.035 : 0.06;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(an - hw) * len * 1.4, y + Math.sin(an - hw) * len * 1.4);
        g.lineTo(x + Math.cos(an + hw) * len * 1.4, y + Math.sin(an + hw) * len * 1.4);
        g.closePath();
      }
      g.fill();
    } });
  }
  // まるい 光の たま（ためる ところ）
  function orb(E, x, y, r0, r1, life, hex, o) {
    o = o || {};
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      const r = (r0 + (r1 - r0) * (o.shrinkAt && u > o.shrinkAt ? 1 - (u - o.shrinkAt) / (1 - o.shrinkAt) : Math.min(1, u / (o.shrinkAt || 1)))) * (1 + Math.sin(u * 40) * 0.08);
      const a = o.shrinkAt ? 1 : (u < 0.8 ? 1 : (1 - u) / 0.2);
      if (r <= 0.5) return;
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
      gr.addColorStop(0, css([255, 255, 255], a)); gr.addColorStop(0.3, css(c, a * 0.85)); gr.addColorStop(1, css(c, 0));
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr; g.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    } });
  }
  // 地面から たつ 光の 柱
  function pillar(E, x, y, w, h, life, hex) {
    const c = rgbOf(hex);
    thing(E, { life: life, draw: function (g, u) {
      const grow = Math.min(1, u / 0.25), a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
      const hh = h * grow;
      const gr = g.createLinearGradient(0, y - hh, 0, y);
      gr.addColorStop(0, css(c, 0)); gr.addColorStop(0.5, css(c, a * 0.8)); gr.addColorStop(1, css([255, 255, 255], a));
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.fillRect(x - w * 1.6, y - hh, w * 3.2, hh);
      g.fillStyle = css([255, 255, 255], a * 0.9);
      g.fillRect(x - w * 0.3, y - hh, w * 0.6, hh);
    } });
  }
  // 4つの とがりの きらめき
  function glint(E, x, y, size, life) {
    thing(E, { life: life, draw: function (g, u) {
      const s = size * (u < 0.2 ? u / 0.2 : 1 - (u - 0.2) * 0.4), a = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = css([255, 255, 255], a);
      const dia = function (l, w, r) {
        g.save(); g.translate(x, y); g.rotate(r);
        g.beginPath(); g.moveTo(-l, 0); g.lineTo(0, -w); g.lineTo(l, 0); g.lineTo(0, w); g.closePath(); g.fill();
        g.restore();
      };
      dia(s, s * 0.06, 0); dia(s * 0.7, s * 0.05, Math.PI / 2); dia(s * 0.32, s * 0.04, Math.PI / 4); dia(s * 0.32, s * 0.04, -Math.PI / 4);
      g.drawImage(glowOf([200, 240, 255]), x - s * 0.5, y - s * 0.5, s, s);
    } });
  }
  // 空の オーロラ（スターバースト）
  function aurora(E, life, hexes) {
    const cs = hexes.map(rgbOf);
    thing(E, { life: life, draw: function (g, u) {
      const a = u < 0.2 ? u / 0.2 : u > 0.8 ? (1 - u) / 0.2 : 1;
      g.globalCompositeOperation = 'lighter';
      const hh = H * 0.62;
      cs.forEach(function (c, i) {
        const gr = g.createLinearGradient(0, 0, 0, hh);
        gr.addColorStop(0, css(c, 0)); gr.addColorStop(0.35, css(c, a * 0.5)); gr.addColorStop(1, css(c, 0));
        g.fillStyle = gr;
        g.beginPath();
        const bx = 20 + i * (W - 40) / (cs.length - 1), tt = u * 6 + i * 1.3;
        for (let y = 0; y <= hh; y += 8) g.lineTo(bx + Math.sin(y * 0.03 + tt) * 16 - 14, y);
        for (let y = hh; y >= 0; y -= 8) g.lineTo(bx + Math.sin(y * 0.03 + tt) * 16 + 14, y);
        g.closePath(); g.fill();
      });
    } });
  }
  // 地面から つき出す 氷の 柱（立体の 角柱）。break で くだける
  function spike(E, x, y, w, h, grow, life, onBreak) {
    const t = thing(E, { life: life, done: false,
      update: function () { if (!t.done && t.age >= life - STEP) { t.done = true; if (onBreak) onBreak(x, y, w, h); } },
      draw: function (g, u) {
        const e = Math.min(1, t.age / grow), hh = h * (1 - (1 - e) * (1 - e));
        const d = w * 0.45;
        g.globalCompositeOperation = 'source-over';
        // 右の 面
        g.fillStyle = 'rgba(58,138,208,.92)';
        g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2 + d, y - d * 0.6); g.lineTo(x + w / 2 + d, y - hh - d * 0.6); g.lineTo(x + w / 2, y - hh); g.closePath(); g.fill();
        // 前の 面
        const gr = g.createLinearGradient(0, y - hh, 0, y);
        gr.addColorStop(0, 'rgba(250,255,255,.96)'); gr.addColorStop(1, 'rgba(120,200,245,.92)');
        g.fillStyle = gr; g.fillRect(x - w / 2, y - hh, w, hh);
        // 上の とがり
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(x - w / 2, y - hh); g.lineTo(x, y - hh - w * 0.9); g.lineTo(x + w / 2 + d, y - hh - d * 0.6); g.lineTo(x + w / 2, y - hh); g.closePath(); g.fill();
        // ふちの 光
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(160,230,255,.35)';
        g.fillRect(x - w / 2 - 3, y - hh - 4, w + d + 6, hh + 6);
      } });
    return t;
  }
  // 空から おちる いん石（回る 岩の 箱＋火の 尾）。着いたら onHit
  function meteor(E, x0, y0, x1, y1, dur, size, onHit) {
    const t = thing(E, { life: dur, x: x0, y: y0, rot: R(E, 0, 6), rot2: R(E, 0, 6), hit: false,
      update: function (dt) {
        const u = Math.min(1, t.age / dur), e = u * u;
        const nx = x0 + (x1 - x0) * e, ny = y0 + (y1 - y0) * e;
        const vx = (nx - t.x) / dt * 1000, vy = (ny - t.y) / dt * 1000;
        t.x = nx; t.y = ny; t.rot += dt * 0.012; t.rot2 += dt * 0.009;
        for (let i = 0; i < n(E, 3); i++) {
          P(E, { x: t.x + R(E, -size * 0.4, size * 0.4), y: t.y + R(E, -size * 0.4, size * 0.4), vx: -vx * 0.08 + R(E, -30, 30), vy: -vy * 0.08 + R(E, -30, 30),
            drag: 2, life: R(E, 300, 480), s0: size * R(E, 0.6, 1.1), s1: 1, ramp: RAMP.fire, fo: 0.3 });
        }
        if (!t.hit && t.age >= dur - STEP) { t.hit = true; if (onHit) onHit(x1, y1); }
      },
      draw: function (g) {
        if (t.hit) return;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(glowOf([255, 190, 80]), t.x - size * 2.4, t.y - size * 2.4, size * 4.8, size * 4.8);
        g.globalCompositeOperation = 'source-over';
        cube(g, t.x, t.y, size, t.rot, t.rot2, [138, 92, 58], 1);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(255,200,110,.55)';
        g.fillRect(t.x - size * 0.35, t.y - size * 0.35, size * 0.7, size * 0.7);
      } });
    return t;
  }

  /* 回る 箱を 描く（3面・ななめ上から）。s＝1辺・r1/r2＝回転・col＝色 */
  const FACES = [[0, 1, 2, 3, 0, 0, -1], [5, 4, 7, 6, 0, 0, 1], [4, 0, 3, 7, -1, 0, 0], [1, 5, 6, 2, 1, 0, 0], [4, 5, 1, 0, 0, -1, 0], [3, 2, 6, 7, 0, 1, 0]];
  const LIGHT = [-0.45, -0.7, -0.55];
  function cube(g, x, y, s, r1, r2, col, alpha) {
    const h = s / 2, c1 = Math.cos(r1), s1 = Math.sin(r1), c2 = Math.cos(r2), s2 = Math.sin(r2);
    const V = [];
    for (let i = 0; i < 8; i++) {
      const vx = (i & 1) ^ ((i >> 1) & 1) ? h : -h, vy = i & 2 ? h : -h, vz = i & 4 ? h : -h;
      // y 軸 → x 軸 の じゅんに 回す
      const x1 = vx * c1 + vz * s1, z1 = -vx * s1 + vz * c1;
      const y2 = vy * c2 - z1 * s2, z2 = vy * s2 + z1 * c2;
      V.push([x + x1, y + y2, z2]);
    }
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      // 面の 向き（回したあと）
      let nx = F[4], ny = F[5], nz = F[6];
      const nx1 = nx * c1 + nz * s1, nz1 = -nx * s1 + nz * c1;
      const ny2 = ny * c2 - nz1 * s2, nz2 = ny * s2 + nz1 * c2;
      if (nz2 >= 0) continue;                           // うしろ向きの 面は 描かない
      const sh = 0.62 + 0.55 * Math.max(0, nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2]);
      g.fillStyle = css([Math.min(255, col[0] * sh) | 0, Math.min(255, col[1] * sh) | 0, Math.min(255, col[2] * sh) | 0], alpha);
      g.beginPath();
      g.moveTo(V[F[0]][0], V[F[0]][1]); g.lineTo(V[F[1]][0], V[F[1]][1]); g.lineTo(V[F[2]][0], V[F[2]][1]); g.lineTo(V[F[3]][0], V[F[3]][1]);
      g.closePath(); g.fill();
    }
  }

  /* ---------- 3D の 氷（v13.6.1）：多面体を 回して 光を あてて 描く 小さな 3D ----------
     mesh＝{ v: [[x,y,z]…]（まん中が 0・大きさ 1 くらい）, f: [[頂点の 番号…]…] }。凸の 形なので
     面の 向きは「まん中 → 面の まん中」で 外がわに そろえ、手まえ（z＜0）を 向く 面だけ 奥から じゅんに ぬる。
     光は 左上の 手まえから。面の ふちに 白い 線＝結晶の カット面に 見える */
  const CRYSTAL = (function () {
    const v = [], f = [], r = 0.3;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; v.push([Math.cos(a) * r, 1, Math.sin(a) * r]); }       // 0〜5 下の 六角
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; v.push([Math.cos(a) * r, -0.45, Math.sin(a) * r]); }   // 6〜11 上の 六角
    v.push([0, -1, 0]);                                                                                             // 12 とがった 先
    for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; f.push([i, j, j + 6, i + 6]); f.push([i + 6, j + 6, 12]); }
    f.push([5, 4, 3, 2, 1, 0]);
    return { v: v, f: f };
  })();
  const BOX = { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    f: [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7]] };
  const L3 = (function () { const x = -0.45, y = -0.75, z = -0.5, l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; })();
  /* o: x,y＝画面の まん中・s＝大きさ(px)・sx/sy/sz＝形の のばし・rx/ry/rz＝回転・col＝色・a＝すけ具合・edge＝ふちの 白線 */
  function mesh(g, M, o) {
    const czz = Math.cos(o.rz || 0), szz = Math.sin(o.rz || 0), cyy = Math.cos(o.ry || 0), syy = Math.sin(o.ry || 0), cxx = Math.cos(o.rx || 0), sxx = Math.sin(o.rx || 0);
    const R3 = [], P2 = [];
    for (let i = 0; i < M.v.length; i++) {
      let x = M.v[i][0] * (o.sx || 1), y = M.v[i][1] * (o.sy || 1), z = M.v[i][2] * (o.sz || 1);
      let t = x * czz - y * szz; y = x * szz + y * czz; x = t;          // Z（かたむき）
      t = x * cyy + z * syy; z = -x * syy + z * cyy; x = t;              // Y（まわる）
      t = y * cxx - z * sxx; z = y * sxx + z * cxx; y = t;               // X（上から 見る）
      const k = 5 / (5 + z);
      R3.push([x, y, z]); P2.push([o.x + x * o.s * k, o.y + y * o.s * k]);
    }
    const vis = [];
    for (let fi = 0; fi < M.f.length; fi++) {
      const F = M.f[fi], a = R3[F[0]], b = R3[F[1]], c = R3[F[2]];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      let mx = 0, my = 0, mz = 0;
      for (let k = 0; k < F.length; k++) { mx += R3[F[k]][0]; my += R3[F[k]][1]; mz += R3[F[k]][2]; }
      mx /= F.length; my /= F.length; mz /= F.length;
      if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }   // 外がわ むきに
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      if (nz > -0.02) continue;                                              // うしろ むきは 描かない
      vis.push({ F: F, z: mz, d: Math.max(0, nx * L3[0] + ny * L3[1] + nz * L3[2]) });
    }
    vis.sort(function (p, q) { return q.z - p.z; });
    const col = o.col, al = o.a == null ? 1 : o.a;
    for (let i = 0; i < vis.length; i++) {
      const v = vis[i], sh = 0.42 + 0.62 * v.d, sp = Math.pow(v.d, 6) * 0.9;
      const r = Math.min(255, col[0] * sh + 255 * sp) | 0, gg = Math.min(255, col[1] * sh + 255 * sp) | 0, bb = Math.min(255, col[2] * sh + 255 * sp) | 0;
      g.beginPath();
      g.moveTo(P2[v.F[0]][0], P2[v.F[0]][1]);
      for (let k = 1; k < v.F.length; k++) g.lineTo(P2[v.F[k]][0], P2[v.F[k]][1]);
      g.closePath();
      g.fillStyle = 'rgba(' + r + ',' + gg + ',' + bb + ',' + al + ')';
      g.fill();
      if (o.edge) { g.strokeStyle = 'rgba(255,255,255,' + (o.edge * al) + ')'; g.lineWidth = o.lw || 1; g.stroke(); }
    }
  }
  const ICE = [170, 226, 255];
  // 3D の 氷の 刃：主人公の そばで 生まれ（0〜35%）、回りながら てきへ とぶ（35〜100%）
  function iceBlade(E, from, to, i) {
    const sx0 = from.x + 30, sy0 = from.y - 8 - i * 18, tx = to.x - 6, ty = to.y + (i - 1) * 16;
    const spin0 = R(E, 0, 6), life = 340 - i * 55;
    const t = thing(E, { life: life, x: sx0, y: sy0,
      update: function () {
        const u = t.age / life;
        if (u > 0.35) {
          const e = (u - 0.35) / 0.65, ee = e * e;
          t.x = sx0 + (tx - sx0) * ee; t.y = sy0 + (ty - sy0) * ee;
          if (E.step % 1 === 0) P(E, { x: t.x + R(E, -6, 6), y: t.y + R(E, -6, 6), vx: R(E, -60, -10), vy: R(E, -30, 30), drag: 2, life: R(E, 200, 360), s0: R(E, 3, 6), s1: 1, ramp: RAMP.ice });
        }
        if (t.age >= life - STEP && !t.hit) { t.hit = true; burst(E, tx, ty, 10, { ramp: RAMP.ice, v0: 80, v1: 260, g: 160 }); }
      },
      draw: function (g, u) {
        if (t.hit) return;
        const grow = Math.min(1, u / 0.3), dir = Math.atan2(ty - sy0, tx - sx0);
        const size = 30 + 8 * (2 - i);
        g.globalCompositeOperation = 'lighter';
        g.drawImage(glowOf([140, 220, 255]), t.x - size * 1.8, t.y - size * 1.8, size * 3.6, size * 3.6);
        g.globalCompositeOperation = 'source-over';
        mesh(g, CRYSTAL, { x: t.x, y: t.y, s: size * grow, sx: 1.0, sy: 1.9, sz: 0.5, rz: dir + Math.PI / 2, ry: spin0 + u * 14, rx: -0.3, col: ICE, a: 0.9, edge: 0.75 });
      } });
  }
  // てきを とじこめる 3D の 氷の 箱（すけて なかが 見える）
  function iceCage(E, F, life) {
    thing(E, { life: life, draw: function (g, u) {
      const a = Math.min(1, u / 0.12) * (u > 0.9 ? (1 - u) / 0.1 : 1);
      const s = F.h * 0.72, sx = (F.w * 0.78) / s;
      const shake = u > 0.8 ? Math.sin(u * 180) * 1.5 : 0;
      g.globalCompositeOperation = 'source-over';
      mesh(g, BOX, { x: F.x + shake, y: F.y + F.h * 0.04, s: s, sx: sx, sy: 1, sz: sx * 0.8, rx: -0.3, ry: 0.55 + Math.sin(u * 3) * 0.04, col: [150, 215, 250], a: 0.42 * a, edge: 1.8, lw: 2.4 });
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(210,245,255,' + (0.22 * a) + ')';
      g.fillRect(F.x - F.w * 0.5, F.y - F.h * 0.5, F.w * 0.18, F.h * 0.9);          // ななめの 光の すじ
    } });
  }
  // 地面から 花のように ひらく 3D の 結晶
  function iceBloom(E, F, until) {
    const list = [];
    [-1.55, -1.2, -0.85, -0.5, 0.5, 0.85, -0.16, 0.2].forEach(function (k, i) {   // 右は 画面の はしに 近い ので 左に 多め
      list.push({ dx: k * (F.w * 0.5 + 14), rz: Math.max(-1, Math.min(1, k)) * R(E, 0.4, 0.75), h: (F.h * 0.36 + 14) * R(E, 0.8, 1.15) * (1.15 - Math.min(1, Math.abs(k)) * 0.35),
        ry: R(E, 0, 6), delay: Math.abs(k) * 70, w: R(E, 0.9, 1.25) });
    });
    list.sort(function (p, q) { return Math.abs(p.dx) - Math.abs(q.dx); });
    thing(E, { life: until, draw: function (g) {
      g.globalCompositeOperation = 'source-over';
      const age = this.age;
      for (let i = 0; i < list.length; i++) {
        const c = list[i], e = Math.max(0, Math.min(1, (age - c.delay) / 120));
        if (e <= 0) continue;
        const gr = 1 - (1 - e) * (1 - e) * (1 - e);
        const bx = F.x + c.dx, by = F.bot + 4, sy = gr;
        const cx = bx + Math.sin(c.rz) * c.h * sy, cy = by - Math.cos(c.rz) * c.h * sy;
        mesh(g, CRYSTAL, { x: cx, y: cy, s: c.h, sx: 1.05 * c.w, sy: sy, sz: 1.05 * c.w, rz: c.rz, ry: c.ry, rx: -0.25, col: ICE, a: 0.9, edge: 0.7 });
      }
    } });
  }

  /* =========================================================
     わざごとの 台本。E.t＝はじまってから の ミリ秒。
     F＝てき（x,y＝中心・w,h・top・bot＝足もと）、S＝けんの 先、Hr＝主人公の 中心
     当たる 時間は battle.js の SP_MOTION.hit と そろえて ある
     ========================================================= */
  const SCRIPTS = {
    /* ---- ほのお ギリ（算数）：火の粉を けんに あつめ → たての 一閃 → 火柱が ふき上がる ---- */
    fire: { dur: 1100, run: function (E, F, S) {
      trail(E, E.Hr, F, 40, 470, RAMP.fire, 5, 12);
      if (at(E, 470)) flash(E, '#ffb050', 0.4, 240);
      if (at(E, 490)) slash(E, F.x - 6, F.y, F.h * 0.55 + 26, -Math.PI * 0.62, Math.PI * 0.95, 400, '#ff8a2a', 18);
      if (at(E, 540)) slash(E, F.x + 8, F.y + 4, F.h * 0.45 + 20, -Math.PI * 0.2, Math.PI * 0.8, 360, '#ffd45a', 13);
      if (at(E, 500)) {
        ring(E, F.x, F.bot, 8, 130, 560, '#ff7a1e', 7, 0.3);
        burst(E, F.x, F.y, 54, { up: true, v0: 200, v1: 520, g: 520 });
        chunks(E, F.x, F.bot - 4, 8, '#8a5a3a', { up: true, lift: 120, s0: 3, s1: 7 });
      }
      if (during(E, 500, 920)) {
        const u = (E.t - 500) / 420;
        for (let i = 0; i < n(E, 10); i++) {
          P(E, { x: F.x + R(E, -F.w * 0.55, F.w * 0.55) * (1 - u * 0.4), y: F.bot + R(E, -4, 4), vx: R(E, -30, 30), vy: R(E, -190, -380), ay: -80, drag: 0.4,
            life: R(E, 380, 660), s0: R(E, 9, 18), s1: 1.5, ramp: RAMP.fire, sway: R(E, 30, 70), ph: R(E, 0, 6), fo: 0.45 });
        }
      }
      if (during(E, 560, 900) && E.step % 3 === 0) smoke(E, F.x, F.top, 1);
    } },

    /* ---- はっぱ カッター（国語）：X の 2連斬り → はっぱの うずまき ---- */
    leaf: { dur: 1100, run: function (E, F, S, Hr) {
      trail(E, Hr, F, 40, 330, RAMP.leaf, 3, 7);
      if (E.t < 320) {
        for (let i = 0; i < n(E, 1); i++) {
          const y = R(E, 10, F.bot);
          P(E, { x: R(E, -10, 60), y: y, vx: (F.x - 30) * 2.4, vy: (F.y - y) * 1.2, life: 400, s0: 5, s1: 4, m: 'l', col: rgbOf(['#7ee06a', '#3fbf4a', '#b8f07a'][i % 3]), rot: R(E, 0, 6), vr: 10 });
        }
      }
      if (at(E, 330)) {
        flash(E, '#c8ffa8', 0.3, 200);
        slash(E, F.x, F.y, F.h * 0.5 + 24, -Math.PI * 0.85, Math.PI * 0.9, 340, '#7ee06a', 15);
        burst(E, F.x, F.y, 26, { ramp: RAMP.leaf, v0: 120, v1: 360, g: 200 });
        ring(E, F.x, F.bot, 8, 110, 480, '#7ee06a', 5, 0.3);
      }
      if (at(E, 520)) {
        slash(E, F.x, F.y, F.h * 0.5 + 24, -Math.PI * 0.15, -Math.PI * 0.9, 340, '#b8f07a', 15);
        burst(E, F.x, F.y, 26, { ramp: RAMP.leaf, v0: 120, v1: 360, g: 200 });
      }
      if (during(E, 330, 900)) {
        for (let i = 0; i < n(E, 3); i++) {
          const leafy = i % 3 !== 2;
          P(E, { m: leafy ? 'l' : 'o', draw: leafy ? 'l' : 'g', cx: F.x, cy: F.bot - 8, ang: R(E, 0, 6.3), rad: R(E, 18, 44), w: R(E, 7, 11), dr: R(E, 20, 60), rise: R(E, 70, 150), sq: 0.38,
            life: R(E, 520, 760), s0: leafy ? R(E, 4, 7) : 3, s1: leafy ? 4 : 1, col: rgbOf(['#7ee06a', '#3fbf4a', '#b8f07a', '#2f8f3a'][i % 4]), ramp: RAMP.leaf, rot: R(E, 0, 6), vr: R(E, -12, 12), orbit: true, oy: 0 });
        }
      }
    } },

    /* ---- こおりの やいば（理科・社会・v13.6.1 で 3D に）：3D の 氷の 刃が 3本 とぶ → てきを 氷の 箱に とじこめ、
       地面から 結晶が 花のように ひらく → てきが たおれる 直前（790ms）に くだけて 3D の かけらが とびちる ---- */
    ice: { dur: 1150, run: function (E, F, S, Hr) {
      trail(E, Hr, F, 20, 360, RAMP.ice, 3, 7);
      if (E.t < 300 && E.step % 2 === 0) {
        const a = R(E, 0, Math.PI * 2), r = R(E, 30, 60);
        P(E, { x: Hr.x + 26 + Math.cos(a) * r, y: Hr.y - 40 + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: -Math.sin(a) * r * 3, life: 280, s0: 3, s1: 4, ramp: RAMP.ice, fi: 0.3, fo: 0.7 });
      }
      if (at(E, 10)) iceBlade(E, Hr, F, 0);
      if (at(E, 60)) iceBlade(E, Hr, F, 1);
      if (at(E, 110)) iceBlade(E, Hr, F, 2);
      if (at(E, 360)) {
        flash(E, '#dff6ff', 0.55, 260);
        ring(E, F.x, F.bot, 8, 150, 600, '#9fe6ff', 6, 0.3);
        burst(E, F.x, F.y, 30, { ramp: RAMP.ice, v0: 140, v1: 420, g: 300 });
        iceCage(E, F, 430);
        iceBloom(E, F, 430);
      }
      if (at(E, 790)) {
        flash(E, '#ffffff', 0.5, 220);
        ring(E, F.x, F.y, 10, 170, 520, '#e6fbff', 7, 1);
        for (let i = 0; i < n(E, 34); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 140, 420);
          P(E, { x: F.x + R(E, -F.w * 0.4, F.w * 0.4), y: F.y + R(E, -F.h * 0.4, F.h * 0.45), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, ay: 760, drag: 0.3,
            life: R(E, 520, 820), s0: R(E, 9, 18), s1: 3, m: 'x', rot: R(E, 0, 6), vr: R(E, -10, 10), rot2: R(E, 0, 6), vr2: R(E, -8, 8), fo: 0.7 });
        }
        burst(E, F.x, F.y, 40, { ramp: RAMP.ice, v0: 160, v1: 480, g: 260 });
      }
      if (E.t > 360 && E.step % 3 === 0) {
        P(E, { x: R(E, 0, W), y: -4, vx: R(E, -20, 20), vy: R(E, 40, 90), life: 900, s0: R(E, 2, 4), s1: 2, ramp: RAMP.ice, fo: 0.7 });
      }
    } },

    /* ---- かぜの たつまき（英語）：風の すじ → たつまきが てきを つつむ ---- */
    wind: { dur: 1150, run: function (E, F, S, Hr) {
      trail(E, Hr, F, 40, 380, RAMP.wind, 3, 7);
      if (E.t < 400 && E.step % 2 === 0) {
        P(E, { x: -20, y: R(E, 12, F.bot), vx: R(E, 700, 1000), vy: R(E, -20, 20), life: 450, s0: 2, s1: 1, m: 's', trail: 0.05, ramp: RAMP.wind, a: 0.7 });
      }
      if (at(E, 380)) {
        flash(E, '#ffffff', 0.28, 200);
        ring(E, F.x, F.bot, 10, 120, 500, '#e6f6ff', 6, 0.3);
        burst(E, F.x, F.bot - 10, 20, { ramp: RAMP.wind, v0: 120, v1: 300, g: 100 });
      }
      if (during(E, 380, 980)) {
        for (let i = 0; i < n(E, 6); i++) {
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.bot, ang: R(E, 0, 6.3), rad: 8, cone: 0.42, w: R(E, 11, 16), dr: 0, rise: R(E, 120, 220), oy: -R(E, 0, 30), sq: 0.3,
            life: R(E, 420, 640), s0: 2.4, s1: 1, ramp: RAMP.wind, orbit: true, a: 0.9 });
        }
        if (E.step % 2 === 0) smoke(E, F.x, F.bot - 4, 1, { ramp: RAMP.dust, a: 0.35 });
        if (E.step % 5 === 0) P(E, { m: 'o', draw: 'c', cx: F.x, cy: F.bot, ang: R(E, 0, 6.3), rad: 20, cone: 0.42, w: 9, rise: R(E, 90, 160), oy: 0, sq: 0.3, life: 700, s0: R(E, 3, 6), s1: 2, col: rgbOf('#9a7a4a'), rot: 0, vr: 8, rot2: 0, vr2: 6, orbit: true });
      }
    } },

    /* ---- いなずま おとし（8コンボ）：空が 光る → ふとい 雷が てきに 落ちる → 地面に ひび ---- */
    bolt: { dur: 1250, run: function (E, F) {
      if (at(E, 140)) { flash(E, '#cfe6ff', 0.25, 90); bolt(E, R(E, 30, 180), -10, R(E, 40, 200), R(E, 40, 90), 150, { w: 1.4 }); }
      if (at(E, 300)) { flash(E, '#cfe6ff', 0.25, 90); bolt(E, R(E, 220, 380), -10, R(E, 200, 360), R(E, 40, 90), 150, { w: 1.4 }); }
      if (at(E, 600)) {
        flash(E, '#ffffff', 0.75, 150);
        flash(E, '#6aa8ff', 0.25, 460);
        bolt(E, F.x + R(E, -12, 12), -24, F.x, F.top + 8, 520, { w: 3.6, br: 4, jit: 0.24 });
        burst(E, F.x, F.bot - 6, 64, { ramp: RAMP.bolt, v0: 220, v1: 640, g: 300, drag: 2.2, l0: 260, l1: 560, s: 2.2 });
        ring(E, F.x, F.bot, 6, 150, 460, '#9fd8ff', 6, 0.3);
        for (let i = 0; i < 6; i++) {
          const dir = i < 3 ? -1 : 1, len = R(E, 40, 90);
          bolt(E, F.x + dir * 6, F.bot, F.x + dir * len, F.bot + R(E, -4, 6), 600, { w: 1.3, jit: 0.18 });
        }
      }
      if (at(E, 650)) bolt(E, F.x - 50 + R(E, -10, 10), -24, F.x - 36, F.bot, 330, { w: 2.2, br: 2 });
      if (at(E, 700)) bolt(E, F.x + 44 + R(E, -10, 10), -24, F.x + 34, F.bot, 330, { w: 2.2, br: 2 });
      if (during(E, 640, 1100) && E.step % 4 === 0) {
        const a = R(E, 0, 6.3), b = a + R(E, 1.2, 2.6);
        bolt(E, F.x + Math.cos(a) * F.w * 0.5, F.y + Math.sin(a) * F.h * 0.5, F.x + Math.cos(b) * F.w * 0.5, F.y + Math.sin(b) * F.h * 0.5, 100, { w: 1.1, jit: 0.3 });
      }
    } },

    /* ---- ひかりの メテオ（12コンボ）：けんから 光の 柱 → いん石が つぎつぎ → 大ばくはつ ---- */
    star: { dur: 1500, run: function (E, F, S) {
      if (at(E, 120)) pillar(E, S.x, S.y, 5, S.y + 20, 520, '#ffd447');
      if (E.t < 520) P(E, { x: S.x + R(E, -50, 50), y: S.y + R(E, -10, 40), vx: 0, vy: R(E, -160, -80), life: 380, s0: 3, s1: 1, ramp: RAMP.gold });
      const hits = [[430, -52, 0], [520, 46, 0], [620, 0, 1], [740, -28, 0], [860, 58, 0], [980, 14, 0]];
      hits.forEach(function (hh) {
        const t0 = hh[0] - 380;
        if (at(E, Math.max(1, t0))) {
          const big = hh[2] === 1, tx = F.x + hh[1], ty = big ? F.y : F.bot - R(E, 0, 10);
          meteor(E, tx - R(E, 170, 250), -46, tx, ty, 380, big ? 30 : R(E, 15, 19), function (x, y) {
            if (big) {
              flash(E, '#ffffff', 0.7, 200); flash(E, '#ffc24a', 0.35, 600);
              ring(E, x, y, 12, 280, 700, '#ffd447', 9, 1);
              ring(E, x, F.bot, 10, 200, 620, '#ffa91e', 7, 0.3);
              rays(E, x, y, 16, 220, 760, '#ffd447', 0.6);
              glint(E, x, y, 120, 520);
              burst(E, x, y, 80, { ramp: RAMP.gold, v0: 200, v1: 620, g: 360, l0: 500, l1: 1000, s: 3 });
              chunks(E, x, y, 14, '#8a6a4a', { v0: 150, v1: 420 });
              smoke(E, x, y, 8);
            } else {
              flash(E, '#ffd890', 0.18, 140);
              ring(E, x, y, 6, 70, 380, '#ffd447', 4, 0.4);
              burst(E, x, y, 22, { ramp: RAMP.gold, v0: 120, v1: 380, g: 420 });
              chunks(E, x, y, 5, '#8a6a4a', { up: true });
              smoke(E, x, y, 2);
            }
          });
        }
      });
    } },

    /* ---- ぎんがの ビッグバン（16コンボ）：星を すいこむ → まっしろ → 虹の わと 銀河の うず ---- */
    nova: { dur: 2000, run: function (E, F) {
      if (E.t < 520) {
        for (let i = 0; i < n(E, 4); i++) {
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 150, 290), w: 4, dr: -R(E, 380, 560), rise: 0, oy: 0, sq: 1,
            life: 560, s0: 2.4, s1: 1.4, ramp: RAINBOW[i % RAINBOW.length], orbit: true, kill: 5 });
        }
      }
      if (at(E, 30)) orb(E, F.x, F.y, 4, 30, 540, '#c48bff', { shrinkAt: 0.9 });
      if (at(E, 550)) {
        flash(E, '#ffffff', 0.95, 460);
        ['#ff5e7a', '#ffd447', '#7cf9c4', '#4fd3ff'].forEach(function (c, i) {
          E.later.push({ at: 550 + i * 60, fn: function () { ring(E, F.x, F.y, 10, 320, 760, c, 9, 1); } });
        });
        rays(E, F.x, F.y, 18, 300, 1300, '#c48bff', 0.8);
        burst(E, F.x, F.y, 110, { rainbow: true, v0: 160, v1: 560, g: 60, drag: 1.3, l0: 700, l1: 1200, s: 2.8 });
        glint(E, F.x, F.y, 160, 700);
      }
      if (during(E, 560, 1500)) {
        for (let i = 0; i < n(E, 3); i++) {
          const arm = i % 2;
          P(E, { m: 'o', draw: 'g', cx: F.x, cy: F.y, ang: arm * Math.PI + R(E, -0.25, 0.25) + E.t * 0.004, rad: R(E, 4, 18), w: 2.6, dr: R(E, 110, 190), rise: 0, oy: 0, sq: 0.55,
            life: 950, s0: 4, s1: 1, ramp: RAINBOW[(E.step + i) % RAINBOW.length], orbit: true, fo: 0.4 });
        }
      }
      if (E.t > 900 && E.step % 2 === 0) P(E, { x: R(E, 0, W), y: -4, vx: R(E, -20, 20), vy: R(E, 40, 80), life: 1100, s0: R(E, 2, 4), s1: 1.5, ramp: RAINBOW[E.step % RAINBOW.length] });
    } },

    /* ---- スターバースト ストライク（20コンボ）：オーロラ → 4れんぞく 一閃 → 光の 柱 → 大きな 星の かがやき ---- */
    starburst: { dur: 2300, run: function (E, F, S, Hr) {
      trail(E, Hr, F, 40, 500, RAINBOW[E.step % RAINBOW.length], 4, 9);
      if (at(E, 10)) aurora(E, 2200, ['#7cf9c4', '#4fd3ff', '#c48bff', '#ffd447', '#ff8ec4', '#7cf9c4']);
      const sl = [[500, 0.2, '#7cf9c4'], [620, 0.85, '#4fd3ff'], [740, 0.5, '#c48bff'], [860, -0.1, '#ffd447']];
      sl.forEach(function (s) {
        if (at(E, s[0])) {
          slash(E, F.x, F.y, F.h * 0.5 + 26, -Math.PI * s[1] - Math.PI * 0.5, Math.PI * 0.95, 360, s[2], 15);
          flash(E, s[2], 0.16, 140);
          burst(E, F.x, F.y, 22, { rainbow: true, v0: 140, v1: 420, g: 200 });
        }
      });
      if (at(E, 1000)) [-48, -24, 0, 24, 48].forEach(function (dx, i) { E.later.push({ at: 1000 + i * 40, fn: function () { pillar(E, F.x + dx, F.bot, 6, F.bot + 10, 420, i % 2 ? '#7cf9c4' : '#ffd447'); } }); });
      if (during(E, 1000, 1300)) {
        for (let i = 0; i < n(E, 3); i++) {
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 90, 160), w: 3, dr: -R(E, 300, 420), rise: 0, oy: 0, sq: 1, life: 400, s0: 2.2, s1: 1, ramp: RAINBOW[i % RAINBOW.length], orbit: true, kill: 6 });
        }
      }
      if (at(E, 1300)) {
        flash(E, '#ffffff', 0.9, 420);
        glint(E, F.x, F.y, 200, 800);
        ring(E, F.x, F.y, 12, 320, 800, '#b8ffe6', 9, 1);
        ring(E, F.x, F.bot, 10, 220, 700, '#c48bff', 7, 0.3);
        rays(E, F.x, F.y, 20, 300, 1000, '#7cf9c4', -0.6);
        burst(E, F.x, F.y, 120, { rainbow: true, v0: 180, v1: 620, g: 120, drag: 1.2, l0: 700, l1: 1200, s: 2.8 });
      }
      if (E.t > 1300 && E.step % 2 === 0) P(E, { x: R(E, 0, W), y: -4, vx: R(E, -20, 20), vy: R(E, 50, 100), life: 1000, s0: R(E, 2, 4), s1: 1.5, ramp: RAINBOW[E.step % RAINBOW.length] });
    } }
  };

  /* ---------- すすめる・描く ---------- */
  function stepJob(dt) {
    const E = job;
    E.pt = E.t; E.t += dt; E.step++;
    for (let i = E.later.length - 1; i >= 0; i--) if (E.t >= E.later[i].at) { const f = E.later[i].fn; E.later.splice(i, 1); f(); }
    if (E.t <= E.dur) E.script.run(E, E.F, E.S, E.Hr);
    const s = dt / 1000;
    const ps = E.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) { ps.splice(i, 1); continue; }
      p.px = p.x; p.py = p.y;
      if (p.orbit) {
        p.ang += p.w * s;
        p.oy -= p.rise * s;
        const rad = p.cone ? 8 + (-p.oy) * p.cone : (p.rad += p.dr * s);
        if (p.kill && rad < p.kill) { ps.splice(i, 1); continue; }
        p.x = p.cx + Math.cos(p.ang) * rad;
        p.y = p.cy + Math.sin(p.ang) * rad * p.sq + p.oy;
      } else {
        p.vx += p.ax * s; p.vy += p.ay * s;
        if (p.drag) { const k = Math.max(0, 1 - p.drag * s); p.vx *= k; p.vy *= k; }
        p.x += p.vx * s + (p.sway ? Math.sin(p.age / 90 + p.ph) * p.sway * s : 0);
        p.y += p.vy * s;
      }
      p.rot += p.vr * s;
      if (p.vr2) p.rot2 += p.vr2 * s;
    }
    for (let i = E.things.length - 1; i >= 0; i--) {
      const t = E.things[i];
      t.age += dt;
      if (t.update) t.update(dt);
      if (t.age >= t.life) E.things.splice(i, 1);
    }
  }

  function alphaOf(p, u) {
    let a = p.a;
    if (u < p.fi) a *= u / p.fi;
    if (u > p.fo) a *= (1 - u) / (1 - p.fo);
    return a;
  }
  function render() {
    const g = cx, E = job;
    g.setTransform(K, 0, 0, K, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!E) return;
    // 1) 立体の かけら・けむり・はっぱ（ふつうの ぬり）
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < E.parts.length; i++) {
      const p = E.parts[i], u = p.age / p.life, m = p.draw || p.m;
      if (m !== 'c' && m !== 'm' && m !== 'l' && m !== 'x') continue;
      const s = p.s0 + (p.s1 - p.s0) * u, a = alphaOf(p, u);
      if (s <= 0.3 || a <= 0.01) continue;
      if (m === 'c') cube(g, p.x, p.y, s, p.rot, p.rot2 || 0, p.col, a);
      else if (m === 'x') mesh(g, CRYSTAL, { x: p.x, y: p.y, s: s, sx: 0.6, sy: 1, sz: 0.6, rz: p.rot, ry: p.rot2 || 0, rx: -0.3, col: ICE, a: a * 0.92, edge: 0.6 });
      else if (m === 'm') {
        g.globalAlpha = a;
        const c = p.ramp.c[Math.min(11, (u * 11) | 0)];
        g.fillStyle = css(c);
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        g.globalAlpha = 1;
      } else {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = css(p.col, a); g.fillRect(-s, -s * 0.5, s * 2, s);
        g.fillStyle = css([Math.min(255, p.col[0] + 70), Math.min(255, p.col[1] + 70), Math.min(255, p.col[2] + 50)], a); g.fillRect(-s, -s * 0.5, s, s * 0.5);
        g.restore();
      }
    }
    // 2) 大きな もの（一閃・雷・わ など）
    for (let i = 0; i < E.things.length; i++) {
      const t = E.things[i];
      g.save();
      t.draw(g, Math.min(1, t.age / t.life));
      g.restore();
    }
    // 3) 光る 粒（かさなるほど 明るく）
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < E.parts.length; i++) {
      const p = E.parts[i], u = p.age / p.life, m = p.draw || p.m;
      if (m === 'c' || m === 'm' || m === 'l' || m === 'x') continue;
      const s = p.s0 + (p.s1 - p.s0) * u, a = alphaOf(p, u);
      if (s <= 0.2 || a <= 0.01) continue;
      const ci = Math.min(11, (u * 11) | 0), c = p.ramp.c[ci];
      g.globalAlpha = a;
      if (m === 's') {
        const dx = p.x - p.px, dy = p.y - p.py;
        const k = p.trail ? p.trail * 60 : 2.4;
        g.strokeStyle = p.ramp.s[ci];
        g.lineWidth = s;
        g.beginPath(); g.moveTo(p.x - dx * k, p.y - dy * k); g.lineTo(p.x, p.y); g.stroke();
        g.drawImage(glowOf(c), p.x - s * 2.5, p.y - s * 2.5, s * 5, s * 5);
      } else if (m === 'k') {
        // こおりの つぶて：すすむ 向きに 長い ひし形
        const an = Math.atan2(p.vy, p.vx);
        g.save(); g.translate(p.x, p.y); g.rotate(an);
        g.fillStyle = p.ramp.s[3];
        g.beginPath(); g.moveTo(-s * 5, 0); g.lineTo(0, -s * 0.8); g.lineTo(s * 2, 0); g.lineTo(0, s * 0.8); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-s * 3, -0.8, s * 4, 1.6);
        g.restore();
        g.drawImage(glowOf(c), p.x - s * 3, p.y - s * 3, s * 6, s * 6);
      } else {
        g.drawImage(glowOf(c), p.x - s * 1.8, p.y - s * 1.8, s * 3.6, s * 3.6);
        g.fillStyle = p.ramp.s[ci];
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function tick(ts) {
    raf = 0;
    if (!job) return;
    const dt = last ? Math.min(100, ts - last) : STEP;
    last = ts;
    // おそい 端末（1コマ 30ms こえが つづく）は 粒を へらす
    if (dt > 30) { slow++; if (slow > 8 && quality > 0.5) { quality -= 0.25; slow = 0; job.q = quality; } } else slow = Math.max(0, slow - 1);
    acc += dt;
    let k = 0;
    while (acc >= STEP && k < 5) { stepJob(STEP); acc -= STEP; k++; }
    if (k === 5) acc = 0;
    render();
    if (job.t > job.dur + 200 && !job.parts.length && !job.things.length) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }

  /* わざを はじめる。o.foe／o.hero＝{x,y,w,h}（アリーナの 左上から の px）・o.height＝Canvas の 高さ */
  function begin(id, o) {
    const sc = SCRIPTS[id];
    if (!sc || !ok()) return null;
    fit(o.height);
    const f = o.foe || { x: 320, y: 120, w: 64, h: 64 };
    const hr = o.hero || { x: 90, y: 140, w: 84, h: 84 };
    const F = { x: f.x, y: f.y, w: f.w, h: f.h, top: f.y - f.h / 2, bot: f.y + f.h / 2 };
    job = { id: id, script: sc, dur: sc.dur, t: 0, pt: 0, step: 0, parts: [], things: [], later: [], q: o.seek ? 1 : quality,
      rnd: rng(o.seed || 20260913), F: F, Hr: { x: hr.x, y: hr.y }, S: { x: hr.x + hr.w * 0.28, y: hr.y - hr.h * 0.46 } };
    clearTimeout(fadeT);
    cv.classList.remove('is-fade');
    cv.hidden = false;
    return job;
  }
  function play(id, o) {
    stop();
    if (!begin(id, o || {})) return false;
    last = 0; acc = 0;
    raf = requestAnimationFrame(tick);
    return true;
  }
  // harness 用：ms まで すすめて 1まい 描く（本当の 時計は 使わない）
  function seek(ms, id, o) {
    if (id) { stop(); if (!begin(id, Object.assign({ seek: true }, o || {}))) return false; }
    if (!job) return false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    while (job.t < ms) stepJob(STEP);
    render();
    return { parts: job.parts.length, things: job.things.length };
  }
  let fadeT = null;
  function stop() {
    clearTimeout(fadeT);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    job = null;
    if (cx) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); }
    if (cv) { cv.hidden = true; cv.classList.remove('is-fade'); }
  }
  // わざの おわり：0.25秒で うすく して 止める（粒は うごいた まま）
  function fade() {
    if (!cv || cv.hidden) return;
    cv.classList.add('is-fade');
    clearTimeout(fadeT);
    fadeT = setTimeout(stop, 260);
  }

  MQ.ui.fxc = { attach: attach, ok: ok, play: play, seek: seek, stop: stop, fade: fade, has: function (id) { return !!SCRIPTS[id]; },
    ids: Object.keys(SCRIPTS), state: function () { return job ? { t: job.t, parts: job.parts.length, things: job.things.length, q: job.q } : null; } };
})();
