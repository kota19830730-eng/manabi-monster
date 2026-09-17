/* =========================================================
   セットわざの 画面（v14.2）：ゲージと わざの 光の 台本
   ・表（名前・ルビ・詠唱・色）は js/content/setwaza.js、ルール（ゲージ・ダメージ）は js/core/battle.js。
   ・わざの 光は js/ui/fxcanvas.js の しくみに 台本を 足す（MQ.ui.fxc.define・道具は MQ.ui.fxc.kit）。
   ・出す 流れ（カットイン・技名の 帯・3D の 動き）は ひっさつわざと 同じ（js/ui/battle.js の playSpecial）。
   使い方： MQ.ui.setwaza.sync(アリーナ)＝ゲージを ぬる／MQ.ui.setwaza.sp(id)＝playSpecial に わたす わざ
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};
  MQ.ui = MQ.ui || {};
  // MQ.util は あとから 使う（tools/fxcheck/sheet.html は fxcanvas.js と この ファイルだけ 読む）
  function h(tag, attrs, children) { return MQ.util.h(tag, attrs, children); }

  /* ---------- ゲージ（主人公の 足もと・ふきだしの 上） ---------- */
  function sync(arena) {
    if (!arena) return;
    const info = MQ.battle && MQ.battle.setInfo ? MQ.battle.setInfo() : null;
    let el = arena.querySelector('.setgauge');
    const w = info && MQ.setwaza ? MQ.setwaza.byId(info.id) : null;
    if (!w) { if (el) el.remove(); return; }
    if (!el) {
      el = h('div', { class: 'setgauge', 'aria-hidden': 'true' }, [
        h('span', { class: 'setgauge__gem' }),
        h('span', { class: 'setgauge__dots' })
      ]);
      arena.appendChild(el);
    }
    el.style.setProperty('--sw', w.color);
    const dots = el.querySelector('.setgauge__dots');
    if (dots.children.length !== info.need) {
      dots.textContent = '';
      for (let i = 0; i < info.need; i++) dots.appendChild(h('i'));
    }
    const done = info.used >= info.max;
    for (let i = 0; i < dots.children.length; i++) dots.children[i].classList.toggle('is-on', !done && i < info.gauge);
    el.classList.toggle('is-done', done);
    el.classList.toggle('is-near', !done && info.gauge >= info.need - 1);   // あと 1つ で 光る
    el.dataset.left = String(info.max - info.used);
  }

  /* ---------- 技名（漢字＋ルビ）----------
     なめらかな ふちの SVG は js/ui/fxtext.js に まとめた（ひっさつわざ・アイテムの わざ名と 同じ しくみ）。
     色は MQ.ui.fxtext.STYLE の 'set-<グレード>' */
  function nameEl(sp) {
    return MQ.ui.fxtext.name(sp.name, sp.id, { size: 36, ruby: sp.ruby, ls: 2, raw: true, cls: 'fxname--set' });
  }

  /* ---------- playSpecial に わたす わざ ---------- */
  function sp(id) {
    const w = MQ.setwaza ? MQ.setwaza.byId(id) : null;
    if (!w || !w.ready) return null;
    return {
      id: w.id, tier: w.tier || 4, min: 0, ms: w.ms || 2200, name: w.name, ruby: w.ruby, set: true,
      color: w.color, lines: w.lines, pose: w.pose || 'charge',
      motion: { scene: w.scene || null, hit: w.hit || 550, down: w.down || 1600, mo: w.mo || 'nova' }
    };
  }

  /* =========================================================
     わざの 光の 台本
     E.t＝はじまってから の ミリ秒。F＝てき（x,y＝中心・w,h・top・bot）、S＝けんの 先、Hr＝主人公の 中心
     当たる 時間（hit）は js/content/setwaza.js と そろえる
     ========================================================= */
  function defineAll() {
    const fxc = MQ.ui.fxc;
    if (!fxc || !fxc.define || !fxc.kit) return;
    const K = fxc.kit;
    const P = K.P, n = K.n, R = K.R, at = K.at, during = K.during, thing = K.thing;
    const RAMP = K.RAMP, ramp = K.ramp, rgbOf = K.rgbOf, css = K.css, mesh = K.mesh, glowOf = K.glowOf, SH = K.shapes;
    const DARK = ramp(['#ffffff', '#f0d8ff', '#c77dff', '#8a2be2', '#4a1580', '#1a0630']);
    const CRIM = ramp(['#ffffff', '#ffd0dc', '#ff5a8a', '#c0144a', '#4a0418']);
    const SHADE = ramp(['#3a1a5a', '#24103c', '#120820']);
    const STREAK = ramp(['#f4e6ff', '#c77dff', '#8a2be2', '#4a1580']);                       // すいこまれる 光（白い 針に 見えない ように むらさきから）
    const DFLAME = ramp(['#fbeaff', '#e0a8ff', '#b04dff', '#7a22c8', '#3c0a6a', '#14021f']);  // むらさきの ほのお
    /* 黒い 羽（3D の はっぱの 形を 黒く）が ひらひら おちる */
    function feathers(E, k) {
      const W = K.size().W;
      for (let i = 0; i < n(E, k); i++) {
        P(E, { x: R(E, 20, W - 20), y: R(E, -30, -4), vx: R(E, -20, 20), vy: R(E, 40, 90), drag: 0.2, sway: R(E, 30, 60), ph: R(E, 0, 6),
          life: R(E, 1000, 1500), s0: R(E, 7, 11), s1: 6, m: 'M', mesh: SH.LEAF, col: i % 5 ? [34, 14, 58] : [120, 50, 190], sx: 0.55, sy: 1.25, sz: 1,
          rx: R(E, 0, 6), ry: R(E, 0, 6), rz: R(E, 0, 6), vrx: R(E, -3, 3), vry: R(E, -5, 5), vrz: R(E, -3, 3), edge: 0.35, spec: 0.7, fi: 0.1, fo: 0.8 });
      }
    }

    /* やみの たま：まん中が 黒く、ふちが むらさきに 光る（光を 足さずに ぬる＝暗く なる）。
       r0→r1 に ふくらみ、shrinkAt から あとは しぼむ。a＝まん中の こさ（てきが うっすら すける） */
    function voidOrb(E, x, y, r0, r1, life, o) {
      o = o || {};
      thing(E, { life: life, top: !!o.top, draw: function (g, u) {
        const grow = o.shrinkAt && u > o.shrinkAt ? 1 - Math.pow((u - o.shrinkAt) / (1 - o.shrinkAt), 2) : 1 - Math.pow(1 - Math.min(1, u / (o.growTo || 0.35)), 3);
        const r = (r0 + (r1 - r0) * grow) * (1 + Math.sin(u * 50) * 0.03);
        if (r < 1) return;
        g.globalCompositeOperation = 'source-over';
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(6,0,14,' + (o.a || 0.9) + ')');
        gr.addColorStop(0.62, 'rgba(22,4,44,' + ((o.a || 0.9) * 0.9) + ')');
        gr.addColorStop(0.86, 'rgba(90,20,160,.55)');
        gr.addColorStop(1, 'rgba(90,20,160,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        // ふちの 光（日食の コロナ）
        g.globalCompositeOperation = 'lighter';
        g.beginPath(); g.arc(x, y, r * 0.8, 0, Math.PI * 2);
        g.lineWidth = Math.max(2, r * 0.12); g.strokeStyle = 'rgba(190,110,255,.55)'; g.stroke();
        g.lineWidth = Math.max(1, r * 0.035); g.strokeStyle = 'rgba(255,240,255,.9)'; g.stroke();
      } });
    }
    /* 日食の 光の すじ（黒い たまの うしろから のびる。ゆっくり 回る） */
    function corona(E, x, y, len, life) {
      thing(E, { life: life, draw: function (g, u) {
        const a = u < 0.2 ? u / 0.2 : u > 0.75 ? (1 - u) / 0.25 : 1;
        g.globalCompositeOperation = 'lighter';
        const N = 14, base = u * 1.4;
        for (let i = 0; i < N; i++) {
          const an = base + i * Math.PI * 2 / N, l = len * (i % 2 ? 0.7 : 1) * (0.85 + 0.15 * Math.sin(u * 20 + i)), hw = i % 2 ? 0.05 : 0.08;
          const gr = g.createLinearGradient(x, y, x + Math.cos(an) * l, y + Math.sin(an) * l);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(210,140,255,' + (0.75 * a) + ')'); gr.addColorStop(1, 'rgba(120,40,200,0)');
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(x, y);
          g.lineTo(x + Math.cos(an - hw) * l, y + Math.sin(an - hw) * l);
          g.lineTo(x + Math.cos(an + hw) * l, y + Math.sin(an + hw) * l);
          g.closePath(); g.fill();
        }
      } });
    }
    /* 黒い 結晶の かけら（3D）が とびちる */
    function darkShards(E, x, y, k, o) {
      o = o || {};
      for (let i = 0; i < n(E, k); i++) {
        const a = R(E, 0, Math.PI * 2), v = R(E, o.v0 || 160, o.v1 || 480);
        P(E, { x: x + R(E, -6, 6), y: y + R(E, -6, 6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 60), ay: o.g == null ? 420 : o.g, drag: 0.6,
          life: R(E, 620, 1000), s0: R(E, o.s0 || 7, o.s1 || 13), s1: 2, m: 'M', mesh: i % 3 ? SH.GEM : SH.CHIPS[i % 4],
          col: i % 4 === 0 ? [150, 60, 230] : [46, 18, 80], rx: R(E, 0, 6), ry: R(E, 0, 6), rz: R(E, 0, 6), vrx: R(E, -9, 9), vry: R(E, -10, 10), vrz: R(E, -7, 7),
          edge: 0.55, spec: 0.8, fo: 0.7 });
      }
    }
    /* 黒い けむり（光を 足さない 四角）が 地面から たちのぼる */
    function shadowRise(E, x, y, k, spread) {
      for (let i = 0; i < n(E, k); i++) {
        P(E, { x: x + R(E, -spread, spread), y: y + R(E, -4, 4), vx: R(E, -20, 20), vy: R(E, -120, -50), drag: 0.9, life: R(E, 520, 900),
          s0: R(E, 6, 10), s1: R(E, 14, 22), m: 'm', ramp: SHADE, a: 0.55, fi: 0.15, fo: 0.45 });
      }
    }

    /* ---- 漆黒ノ終焉（エンド・オブ・ダークネス）：やみの セット ----
       0〜540   ため：主人公の まわりから やみが たちのぼり、けんの 先に 黒い たま。むらさきの 光が うずを まいて すいこまれる
       560〜700 斬：むらさき と あかの 大きな 一閃が X に（ここで 当たる）
       700〜1560 終焉：てきを 黒い たま（日食）が のみこむ。うしろに むらさきの 光の すじ・3D の 黒い 結晶の 輪が 回る
       1580〜   崩壊：たまが しぼんで 大ばくはつ（まっしろ → むらさき）・しょうげきの わ 3つ・黒い 結晶が とびちる・やみの 火柱
       1800〜   よいん：むらさきの 火の粉が のぼる */
    fxc.define('set-yami', { dur: 2300, run: function (E, F, S, Hr) {
      // ---- ため ----
      if (at(E, 10)) {
        voidOrb(E, S.x, S.y - 10, 2, 30, 560, { shrinkAt: 0.86, growTo: 0.75, a: 0.95 });
        K.ring(E, Hr.x, Hr.y + 40, 6, 90, 520, '#8a2be2', 5, 0.3);
        K.orb(E, S.x, S.y - 10, 4, 26, 540, '#8a2be2', { shrinkAt: 0.88 });
      }
      if (E.t < 540) {
        if (E.step % 2 === 0) shadowRise(E, Hr.x, Hr.y + 40, 2, 34);
        if (E.step % 2 === 1) {   // 主人公の まわりに むらさきの ほのお
          K.flameP(E, Hr.x + R(E, -32, 32), Hr.y + 34, { ramp: DFLAME, vx: R(E, -20, 20), vy: R(E, -210, -120), ay: -40, drag: 0.5,
            life: R(E, 380, 560), s0: R(E, 8, 14), s1: 2, a: 0.55 });
        }
        for (let i = 0; i < n(E, 2); i++) {
          P(E, { m: 'o', draw: 's', cx: S.x, cy: S.y - 10, ang: R(E, 0, 6.3), rad: R(E, 70, 150), w: 5, dr: -R(E, 180, 320), rise: 0, oy: 0, sq: 0.9,
            life: 520, s0: 2.6, s1: 1.2, ramp: i % 3 ? STREAK : CRIM, orbit: true, kill: 6 });
        }
      }
      // ---- 斬（X の 一閃）----
      if (at(E, 540)) { K.flash(E, '#c77dff', 0.35, 200); K.glint(E, S.x, S.y - 6, 90, 300); }
      if (at(E, 560)) {
        K.slash(E, F.x - 4, F.y, F.h * 0.6 + 30, -Math.PI * 0.75, Math.PI * 1.0, 440, '#b04dff', 22);
        K.burst(E, F.x, F.y, 30, { ramp: DARK, v0: 180, v1: 520, g: 260 });
        darkShards(E, F.x, F.y, 8, { v0: 140, v1: 380 });
      }
      if (at(E, 640)) {
        K.slash(E, F.x + 6, F.y + 2, F.h * 0.55 + 26, -Math.PI * 0.25, Math.PI * 0.95, 420, '#ff3d7a', 18);
        K.burst(E, F.x, F.y, 20, { ramp: CRIM, v0: 160, v1: 460, g: 260 });
        K.ring(E, F.x, F.bot, 8, 150, 560, '#8a2be2', 7, 0.3);
      }
      // ---- 終焉（日食が のみこむ）----
      if (at(E, 720)) {
        const r = Math.max(F.w, F.h) * 0.62 + 18;
        corona(E, F.x, F.y, r * 2.3, 880);
        voidOrb(E, F.x, F.y, 6, r, 880, { shrinkAt: 0.84, growTo: 0.3, a: 0.82, top: true });
        K.crystalRing(E, F.x, F.y, r * 0.8, r * 1.35, 10, -1.05, 880, { spin: 4, size: 12, cols: [[190, 110, 255], [70, 26, 120], [255, 70, 130], [120, 50, 200]] });
      }
      if (during(E, 720, 1500)) {
        // まわりの 光を すいこむ
        for (let i = 0; i < n(E, 2); i++) {
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 120, 230), w: 3.4, dr: -R(E, 260, 420), rise: 0, oy: 0, sq: 0.8,
            life: 560, s0: 2.4, s1: 1.2, ramp: (E.step + i) % 4 ? STREAK : CRIM, orbit: true, kill: 10 });
        }
        if (E.step % 3 === 0) shadowRise(E, F.x, F.bot, 1, F.w * 0.6);
      }
      // ---- 崩壊（大ばくはつ）----
      if (at(E, 1580)) {
        K.flash(E, '#ffffff', 0.85, 280);
        K.flash(E, '#8a2be2', 0.4, 700);
        K.orb(E, F.x, F.y, 10, 60, 420, '#c77dff');
        [0, 90, 190].forEach(function (d, i) {
          E.later.push({ at: 1580 + d, fn: function () { K.ring(E, F.x, F.y, 12, 330 - i * 50, 760, ['#ffffff', '#c77dff', '#ff3d7a'][i], 10 - i * 2, 1); } });
        });
        K.ring(E, F.x, F.bot, 10, 230, 700, '#8a2be2', 7, 0.3);
        K.rays(E, F.x, F.y, 16, 280, 820, '#b04dff', -0.5);
        K.burst(E, F.x, F.y, 70, { ramp: DARK, v0: 200, v1: 640, g: 160, drag: 1.1, l0: 600, l1: 1100, s: 3 });
        K.burst(E, F.x, F.y, 26, { ramp: CRIM, v0: 180, v1: 520, g: 200 });
        darkShards(E, F.x, F.y, 20, { v0: 200, v1: 560, lift: 120, s0: 8, s1: 15 });
        K.pillar(E, F.x, F.bot, 12, F.bot + 20, 620, '#b04dff');
        K.smoke(E, F.x, F.y, 6, { ramp: SHADE, a: 0.5 });
        feathers(E, 10);
      }
      if (during(E, 1640, 2000) && E.step % 6 === 0) feathers(E, 1);   // 黒い 羽が ひらひら（よいん）
      if (during(E, 1580, 2100) && E.step % 2 === 0) {
        P(E, { x: F.x + R(E, -F.w * 0.7, F.w * 0.7), y: F.bot + R(E, -6, 4), vx: R(E, -30, 30), vy: R(E, -260, -140), ay: -30, drag: 0.5,
          life: R(E, 520, 820), s0: R(E, 3, 5), s1: 1, ramp: E.step % 6 ? DARK : CRIM, fo: 0.5 });
      }
    } });

    /* =========================================================
       のこり 7つ（v14.2・2026-09-14）。どれも 2300ms・大ばくはつは 1500〜1560ms（てきが たおれる down と そろえる）。
       体の 動き（3D）は ひっさつわざの 動きを 借りる（js/content/setwaza.js の mo／scene／hit）。
       てきを 四角い 箱で とじこめない（v13.7 の ユーザー指示）。
       ========================================================= */
    const rgb = function (hexes) { return hexes.map(rgbOf); };

    /* ---- 共通の 部品 ---- */
    // 3D の 宝石の かけら（色つき・光の にじみつき）
    function gemShards(E, x, y, k, cols, o) {
      o = o || {};
      for (let i = 0; i < n(E, k); i++) {
        const a = o.up ? -Math.PI / 2 + R(E, -1.3, 1.3) : R(E, 0, Math.PI * 2), v = R(E, o.v0 || 160, o.v1 || 460);
        P(E, { x: x + R(E, -6, 6), y: y + R(E, -6, 6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 60), ay: o.g == null ? 420 : o.g, drag: 0.6,
          life: R(E, o.l0 || 600, o.l1 || 950), s0: R(E, o.s0 || 7, o.s1 || 13), s1: 2, m: 'M', mesh: o.mesh || SH.GEM, col: cols[i % cols.length], glow: o.glow !== false,
          sx: o.sx || 1, sy: o.sy || 1, sz: o.sz || 1,
          rx: R(E, 0, 6), ry: R(E, 0, 6), rz: R(E, 0, 6), vrx: R(E, -9, 9), vry: R(E, -10, 10), vrz: R(E, -7, 7), edge: 0.6, spec: 0.8, fo: 0.7 });
      }
    }
    // しょうげきの わ を じゅんに 3つ（大ばくはつ）
    function rings3(E, x, y, t0, cols, r1) {
      [0, 90, 190].forEach(function (d, i) {
        E.later.push({ at: t0 + d, fn: function () { K.ring(E, x, y, 12, (r1 || 330) - i * 50, 760, cols[i], 10 - i * 2, 1); } });
      });
    }
    // 三日月の 波が とぶ（主人公 → てき）。咆哮の 声・カプセルを 切る 斬撃
    function wave(E, x0, y0, x1, y1, life, c0, c1, big) {
      const a0 = rgbOf(c0), a1 = rgbOf(c1 || '#ffffff');
      thing(E, { life: life, draw: function (g, u) {
        const e = 1 - (1 - u) * (1 - u), x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e;
        const r = (big || 16) + 40 * e, a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85 * 0.6;
        g.globalCompositeOperation = 'lighter';
        g.beginPath(); g.arc(x - r * 0.7, y, r, -0.95, 0.95);
        g.lineWidth = 11; g.strokeStyle = css(a0, 0.3 * a); g.stroke();
        g.lineWidth = 5; g.strokeStyle = css(a0, 0.75 * a); g.stroke();
        g.lineWidth = 2; g.strokeStyle = css(a1, a); g.stroke();
      } });
    }
    // 3D の 輪を つみ上げた たつまき（色つき。kit.tornado は 水色 きまり）
    function bandTornado(E, F, life, col, alpha) {
      const NR = 7, rs = [];
      for (let i = 0; i < NR; i++) rs.push({ k: i / (NR - 1), ry: R(E, 0, 6), sp: (i % 2 ? 12 : 16) + R(E, -2, 2), ph: R(E, 0, 6) });
      thing(E, { life: life, draw: function (g, u) {
        const grow = Math.min(1, u / 0.15), fade = u > 0.85 ? (1 - u) / 0.15 : 1;
        const H0 = (F.h + 50) * (0.35 + 0.65 * grow), step = H0 / NR;
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < NR; i++) {
          const r = rs[i], k = r.k, rad = (12 + (F.w * 0.36 + 22) * k) * (0.6 + 0.4 * grow);
          const y = F.bot - 4 - step * (i + 0.5), wob = Math.sin(u * 16 + k * 3.5 + r.ph) * 8 * k;
          mesh(g, SH.BAND, { x: F.x + wob, y: y, s: rad, sy: step * 0.62 / rad, rx: -0.28, ry: r.ry + u * r.sp * 1.6, col: col, a: (alpha || 0.3) * fade, both: true, emis: true, edge: 0.25 * fade });
        }
      } });
    }
    // ふる 羽（はっぱの 形を のばす）。col＝色の ならび
    function feathersOf(E, k, cols, o) {
      o = o || {};
      const W = K.size().W;
      for (let i = 0; i < n(E, k); i++) {
        P(E, { x: o.x == null ? R(E, 20, W - 20) : o.x + R(E, -o.spread, o.spread), y: o.y == null ? R(E, -30, -4) : o.y, vx: R(E, -20, 20), vy: R(E, o.v0 || 40, o.v1 || 90), drag: 0.2,
          sway: R(E, 30, 60), ph: R(E, 0, 6), life: R(E, 1000, 1500), s0: R(E, 7, 11), s1: 6, m: 'M', mesh: SH.LEAF, col: cols[i % cols.length], glow: o.glow || false,
          sx: 0.55, sy: 1.25, sz: 1, rx: R(E, 0, 6), ry: R(E, 0, 6), rz: R(E, 0, 6), vrx: R(E, -3, 3), vry: R(E, -5, 5), vrz: R(E, -3, 3), edge: 0.4, spec: 0.7, fi: 0.1, fo: 0.8, emis: !!o.emis });
      }
    }
    // 空から おちる 3D の ほうき星（星の 形＋光の 尾）。着いたら onHit
    function comet(E, x0, y0, x1, y1, dur, size, col, rp, onHit) {
      const t = thing(E, { life: dur, x: x0, y: y0, hit: false, top: true, ry: R(E, 0, 6),
        update: function (dt) {
          const u = Math.min(1, t.age / dur), e = u * u;
          const nx = x0 + (x1 - x0) * e, ny = y0 + (y1 - y0) * e, vx = (nx - t.x) / dt * 1000, vy = (ny - t.y) / dt * 1000;
          t.x = nx; t.y = ny; t.ry += dt * 0.02;
          for (let i = 0; i < n(E, 2); i++) {
            const back = size * 0.6 / (Math.hypot(vx, vy) || 1);
            P(E, { x: t.x - vx * back + R(E, -3, 3), y: t.y - vy * back + R(E, -3, 3), vx: -vx * 0.1, vy: -vy * 0.1, drag: 2, life: R(E, 220, 380), s0: size * R(E, 0.25, 0.4), s1: 1, ramp: rp, fo: 0.3 });
          }
          if (!t.hit && t.age >= dur - K.STEP) { t.hit = true; if (onHit) onHit(x1, y1); }
        },
        draw: function (g) {
          if (t.hit) return;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8;
          g.drawImage(glowOf(col), t.x - size * 2, t.y - size * 2, size * 4, size * 4);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          mesh(g, SH.STAR5, { x: t.x, y: t.y, s: size, rx: -0.3, ry: t.ry, rz: t.ry * 0.3, col: col, edge: 0.7, spec: 0.9 });
        } });
      return t;
    }

    /* ---- 翠嵐ノ咆哮（エメラルド・テンペスト）：かわの セット ----
       0〜380  ため：足もとから みどりの かぜ・はっぱが 主人公を 回る。咆哮の 声（三日月の 波）が 4つ てきへ とぶ
       380     当たる：大きな 一閃 → みどりの 3D の たつまき（輪）が てきを つつむ・エメラルドの 輪が 回る
       900／1200 嵐の 咆哮（しょうげきの わ）
       1560    大ばくはつ：エメラルドの かけら・はっぱが とびちる・光の 柱
       1600〜  はっぱが ひらひら */
    const EMER = ramp(['#ffffff', '#e2ffd8', '#7ee06a', '#2fbf6a', '#146a3a']);
    const GREENS3 = rgb(['#7ee06a', '#2fbf6a', '#b8f07a', '#18a060']);
    fxc.define('set-kihon', { dur: 2300, run: function (E, F, S, Hr) {
      if (at(E, 10)) { K.ring(E, Hr.x, Hr.y + 40, 6, 90, 440, '#7ee06a', 5, 0.3); K.orb(E, S.x, S.y - 6, 4, 22, 400, '#7ee06a', { shrinkAt: 0.85 }); }
      if (E.t < 380) {
        K.leafP(E, 0, 0, { cx: Hr.x, cy: Hr.y + 36, ang: R(E, 0, 6.3), rad: R(E, 26, 44), w: R(E, 8, 11), dr: 0, rise: R(E, 90, 150), sq: 0.35, oy: 0, orbit: true,
          life: R(E, 380, 520), s0: R(E, 9, 12), s1: 6 });
        if (E.step % 2 === 0) P(E, { x: Hr.x + 30, y: Hr.y - 20 + R(E, -34, 30), vx: R(E, 700, 950), vy: R(E, -40, 40), life: 380, s0: 2.2, s1: 1, m: 's', trail: 0.05, ramp: EMER, a: 0.8 });
      }
      [40, 120, 200, 280].forEach(function (t0) { if (at(E, t0)) wave(E, Hr.x + 36, Hr.y - 22, F.x - 16, F.y, 300, '#7ee06a', '#f0ffe8'); });
      if (at(E, 380)) {
        K.flash(E, '#c8ffa8', 0.4, 220);
        K.slash(E, F.x, F.y, F.h * 0.55 + 26, -Math.PI * 0.85, Math.PI * 0.95, 400, '#7ee06a', 18);
        K.burst(E, F.x, F.y, 30, { ramp: EMER, v0: 160, v1: 460, g: 200 });
        K.ring(E, F.x, F.bot, 8, 150, 520, '#7ee06a', 6, 0.3);
        bandTornado(E, F, 1200, [150, 240, 140], 0.32);
        K.crystalRing(E, F.x, F.y + 8, F.w * 0.5 + 10, F.w * 0.72 + 26, 8, -1.2, 1180, { spin: 5, size: 12, cols: GREENS3 });
      }
      if (during(E, 380, 1540)) {
        for (let i = 0; i < n(E, 2); i++) {
          K.leafP(E, 0, 0, { cx: F.x, cy: F.bot, ang: R(E, 0, 6.3), rad: 20, cone: 0.5, w: R(E, 10, 15), dr: 0, rise: R(E, 130, 230), oy: -R(E, 0, 20), sq: 0.32, orbit: true,
            life: R(E, 500, 700), s0: R(E, 9, 13), s1: 6 });
        }
        P(E, { m: 'o', draw: 's', cx: F.x, cy: F.bot, ang: R(E, 0, 6.3), rad: 8, cone: 0.5, w: R(E, 11, 16), dr: 0, rise: R(E, 140, 240), oy: -R(E, 0, 30), sq: 0.3,
          life: R(E, 420, 620), s0: 2.4, s1: 1, ramp: EMER, orbit: true, a: 0.9 });
        if (E.step % 3 === 0) K.smoke(E, F.x, F.bot - 4, 1, { ramp: K.RAMP.dust, a: 0.3 });
      }
      [900, 1200].forEach(function (t0) {
        if (at(E, t0)) {
          K.ring(E, F.x, F.y, 14, 190, 560, '#b8f07a', 7, 1);
          wave(E, Hr.x + 36, Hr.y - 22, F.x - 16, F.y, 260, '#b8f07a', '#ffffff', 22);
          K.burst(E, F.x, F.y, 16, { ramp: EMER, v0: 140, v1: 380, g: 160 });
        }
      });
      if (at(E, 1560)) {
        K.flash(E, '#ffffff', 0.7, 260); K.flash(E, '#3fbf4a', 0.35, 620);
        rings3(E, F.x, F.y, 1560, ['#ffffff', '#7ee06a', '#2fbf6a']);
        K.ring(E, F.x, F.bot, 10, 230, 700, '#7ee06a', 7, 0.3);
        K.rays(E, F.x, F.y, 16, 270, 820, '#7ee06a', 0.6);
        K.burst(E, F.x, F.y, 64, { ramp: EMER, v0: 200, v1: 640, g: 160, drag: 1.1, l0: 600, l1: 1050, s: 3 });
        gemShards(E, F.x, F.y, 16, GREENS3, { v0: 200, v1: 560, lift: 120, s0: 8, s1: 14 });
        for (let i = 0; i < n(E, 18); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 160, 460);
          K.leafP(E, F.x, F.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, ay: 160, drag: 1.2, life: R(E, 700, 1100), s0: R(E, 12, 18), s1: 7 });
        }
        K.pillar(E, F.x, F.bot, 12, F.bot + 20, 640, '#7ee06a');
      }
      if (during(E, 1620, 2150) && E.step % 5 === 0) feathersOf(E, 1, GREENS3, { emis: true });
    } });

    /* ---- 鋼鉄ノ断罪（スチール・ジャッジメント）：てつの セット ----
       0〜560  ため：けんに 火花。てきの 上の 空に 大きな 3D の 鋼の けんが あらわれる
       600     落下：大きな けんが てきに つき立つ（主人公の 落下斬りと 同時）・地面の いたが めくれる・火花
       800〜1150 小さな けんが 3本 ふってくる
       1500    断罪：けんが ぜんぶ くだけて 鋼の かけらと 火花の 大ばくはつ・十字の 光 */
    const SPARK = ramp(['#ffffff', '#fff3c0', '#ffc24a', '#ff7a1e', '#8a2a0a']);
    const STEELR = ramp(['#ffffff', '#eef3fa', '#c9d8ee', '#8aa0c0', '#4a5a78']);
    const STEEL = [196, 208, 226], GOLD = [240, 190, 64], GRIP = [92, 60, 44];
    const BLADE = { v: [[-1, -1, 0], [0, -1, -0.35], [1, -1, 0], [0, -1, 0.35], [-1, 0.62, 0], [0, 0.62, -0.35], [1, 0.62, 0], [0, 0.62, 0.35], [0, 1, 0]],
      f: [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 8], [5, 6, 8], [6, 7, 8], [7, 4, 8], [3, 2, 1, 0]] };
    // X の 光の はしら（断罪）：ななめ 2本の 光が いっきに のびて 消える
    function xBeams(E, x, y, len, life, col) {
      thing(E, { life: life, draw: function (g, u) {
        const e = 1 - Math.pow(1 - Math.min(1, u / 0.18), 3), a = u < 0.35 ? 1 : 1 - (u - 0.35) / 0.65;
        const L = len * e, T = 16 * (1 - u * 0.6);
        g.globalCompositeOperation = 'lighter';
        [Math.PI / 4, -Math.PI / 4].forEach(function (an) {
          g.save(); g.translate(x, y); g.rotate(an);
          const gr = g.createLinearGradient(0, -T, 0, T);
          gr.addColorStop(0, css(col, 0)); gr.addColorStop(0.35, css(col, 0.7 * a)); gr.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
          gr.addColorStop(0.65, css(col, 0.7 * a)); gr.addColorStop(1, css(col, 0));
          g.fillStyle = gr; g.fillRect(-L, -T, L * 2, T * 2);
          g.restore();
        });
      } });
    }
    // 3D の けん を 1本 描く（x＝まん中・tipY＝先の 高さ・len＝刃の 長さ・ry＝回り・a＝こさ）
    function drawSword(g, x, tipY, len, ry, a, glowA) {
      const s = len / 2, cy = tipY - s, top = tipY - len;
      if (glowA) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = glowA;
        g.drawImage(glowOf([190, 215, 255]), x - len * 0.35, top - 10, len * 0.7, len + 20);
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
      mesh(g, BLADE, { x: x, y: cy, s: s, sx: 0.15, sy: 1, sz: 0.15, ry: ry, rx: -0.12, col: STEEL, a: a, edge: 0.55, spec: 1 });
      mesh(g, SH.BOX, { x: x, y: top - len * 0.03, s: len * 0.5, sx: 0.3, sy: 0.045, sz: 0.09, ry: ry, rx: -0.12, col: GOLD, a: a, edge: 0.4, spec: 0.9 });
      mesh(g, SH.BOX, { x: x, y: top - len * 0.16, s: len * 0.5, sx: 0.05, sy: 0.18, sz: 0.05, ry: ry, rx: -0.12, col: GRIP, a: a, spec: 0.3 });
      mesh(g, SH.GEM, { x: x, y: top - len * 0.27, s: len * 0.06, ry: ry, col: GOLD, a: a, edge: 0.5 });
    }
    // 空から おちて つき立つ けん（drop＝おちはじめ・fall＝おちる 長さ・breakAt＝くだける 時間。どれも この 物の 年れい ms）
    function fallingSword(E, x, tipY, len, o) {
      const t = thing(E, { life: o.breakAt, top: true, landed: false, ry: o.ry || 0.5,
        update: function () { if (!t.landed && t.age >= o.drop + o.fall) { t.landed = true; if (o.onLand) o.onLand(); } },
        draw: function (g) {
          const age = t.age;
          let y, a = 1, sc = 1;
          const far = o.far || 1, hy = o.hoverY == null ? tipY - o.rise : o.hoverY;   // 上で まつ ときの 先の 高さ・大きさ（遠く に 見える）
          if (age < o.drop) {   // 空から ゆっくり おりて きて、上で とまる
            const k = age / o.drop;
            a = Math.min(1, age / Math.max(1, o.drop * 0.5));
            sc = far;
            y = hy - (1 - k) * (1 - k) * (o.from || 0) + Math.sin(age * 0.012) * 3;
          }
          else { const k = Math.min(1, (age - o.drop) / o.fall), e = k * k; y = hy + (tipY - hy) * e; sc = far + (1 - far) * e; }
          if (t.landed) y = tipY + Math.sin(age * 0.09) * Math.max(0, 1 - (age - o.drop - o.fall) / 200) * 3;   // つき立った あと ぶるっと
          const ry = t.ry + (t.landed ? 0 : age * 0.004);
          drawSword(g, x, y, len * sc, ry, a, t.landed ? 0.55 : 0.35);
        } });
      return t;
    }
    fxc.define('set-tetsu', { dur: 2300, run: function (E, F, S, Hr) {
      const big = Math.min(Math.max(150, F.h * 1.9), F.bot + 4);   // 地面に つき立った とき 上が 画面に のこる 長さ
      if (at(E, 10)) {
        K.ring(E, Hr.x, Hr.y + 40, 6, 86, 460, '#c9d8ee', 5, 0.3);
        fallingSword(E, F.x, F.bot + 8, big, { far: 0.55, hoverY: Math.max(big * 0.55 + 12, F.top - 6), from: 90, drop: 520, fall: 80, breakAt: 1490, ry: 0.6,
          onLand: function () {
            K.flash(E, '#ffffff', 0.8, 200); K.flash(E, '#9fb2cc', 0.3, 520);
            K.ring(E, F.x, F.bot, 10, 190, 600, '#d8e2f0', 8, 0.3);
            K.burst(E, F.x, F.bot - 4, 50, { ramp: SPARK, v0: 220, v1: 640, g: 520, drag: 1.2, l0: 360, l1: 700, s: 2.4, up: true });
            K.slabs(E, F, 10);
            K.chunks(E, F.x, F.bot - 2, 10, '#7a8494', { up: true, lift: 170, v0: 160, v1: 440, s0: 5, s1: 10 });
            K.glint(E, F.x, F.bot - big * 0.9, 110, 420);
          } });
      }
      if (E.t < 560) {
        if (E.step % 2 === 0) P(E, { x: S.x + R(E, -10, 10), y: S.y + R(E, -10, 10), vx: R(E, -160, 160), vy: R(E, -220, -40), ay: 520, drag: 0.8, life: R(E, 220, 420), s0: 2.2, s1: 0.8, m: 's', ramp: SPARK });
        // 空の けんの まわりに 光が あつまる
        if (E.step % 2 === 1) P(E, { m: 'o', draw: 's', cx: F.x, cy: F.top - 30, ang: R(E, 0, 6.3), rad: R(E, 60, 110), w: 4, dr: -R(E, 160, 260), rise: 0, oy: 0, sq: 0.7,
          life: 500, s0: 2.2, s1: 1, ramp: STEELR, orbit: true, kill: 6 });
      }
      if (at(E, 600)) {
        K.slash(E, F.x - 4, F.y, F.h * 0.55 + 28, -Math.PI * 0.62, Math.PI * 0.95, 420, '#d8e2f0', 18);
        K.slash(E, F.x + 4, F.y, F.h * 0.5 + 24, -Math.PI * 0.38, -Math.PI * 0.95, 420, '#ffc24a', 12);
      }
      [[800, -46, 0.25], [950, 44, 0.8], [1100, -12, 1.4]].forEach(function (s) {
        if (at(E, s[0] - 140)) {
          fallingSword(E, F.x + s[1], F.bot + 4, big * 0.42, { rise: big * 1.6, drop: 60, fall: 80, breakAt: 1490 - (s[0] - 140), ry: s[2],
            onLand: function () {
              K.flash(E, '#e8f0ff', 0.2, 120);
              K.ring(E, F.x + s[1], F.bot, 6, 80, 380, '#d8e2f0', 4, 0.35);
              K.burst(E, F.x + s[1], F.bot - 4, 20, { ramp: SPARK, v0: 160, v1: 420, g: 520, up: true });
              K.chunks(E, F.x + s[1], F.bot - 2, 4, '#7a8494', { up: true });
            } });
        }
      });
      if (during(E, 700, 1480) && E.step % 3 === 0) P(E, { x: F.x + R(E, -8, 8), y: F.bot - R(E, 0, big * 0.8), vx: R(E, -120, 120), vy: R(E, -160, 40), ay: 500, life: R(E, 200, 360), s0: 2, s1: 0.6, m: 's', ramp: SPARK });
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.85, 280); K.flash(E, '#8aa0c0', 0.35, 700);
        // 十字の 光（断罪）
        xBeams(E, F.x, F.y, F.h + 150, 620, [220, 232, 250]);
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#c9d8ee', '#ffc24a']);
        K.rays(E, F.x, F.y, 12, 280, 800, '#d8e2f0', 0.5);
        K.burst(E, F.x, F.y, 70, { ramp: SPARK, v0: 220, v1: 680, g: 420, drag: 1.1, l0: 500, l1: 900, s: 2.6 });
        gemShards(E, F.x, F.y - F.h * 0.2, 22, [STEEL, [230, 238, 250], [150, 166, 190]], { mesh: SH.CHIPS[1], v0: 200, v1: 560, lift: 140, s0: 7, s1: 13, glow: false });
        gemShards(E, F.x, F.y, 8, [GOLD], { v0: 160, v1: 420, s0: 6, s1: 10 });
        K.smoke(E, F.x, F.bot - 6, 6, { ramp: K.RAMP.smoke, a: 0.45 });
      }
      if (during(E, 1520, 2100) && E.step % 3 === 0) P(E, { x: R(E, F.x - 90, F.x + 70), y: -4, vx: R(E, -20, 20), vy: R(E, 90, 160), ay: 200, life: 900, s0: 2, s1: 1, m: 's', ramp: SPARK, fo: 0.6 });
    } });

    /* ---- 煉獄龍皇波（インフェルノ・ドラグーン）：りゅうの セット ----
       0〜300   ため：主人公が うかび、けんに ほのおが あつまる
       300〜560 ほのおの 竜（3D の ほのおを つないだ 体）が けんから とび出し、うねりながら てきへ
       560     竜の 頭が ぶつかる → 700〜1380 竜が てきの まわりを とぐろを まく
       1400〜1560 竜が 上へ のぼって まっさかさまに → 1560 煉獄の 大ふん火 */
    const INFER = ramp(['#ffffff', '#fff0a0', '#ffb030', '#ff5a1a', '#c0200a', '#4a0602']);
    const DRAGONC = ramp(['#ffd24a', '#ff9a2a', '#ff5a1a', '#e0300e', '#a01606']);   // 竜の 体（頭 → しっぽ）
    function dragon(E, F, S, Hr) {
      const NS = 16, LAG = 24, R0 = F.w * 0.62 + 26;
      const startX = S.x + 6, startY = S.y - 12;
      const pos = function (t) {   // 竜の 頭の 場所（t＝わざの ms）
        if (t < 300) return { x: startX, y: startY, z: 0 };
        if (t < 560) {
          const u = (t - 300) / 260, e = u * u * (3 - 2 * u);
          return { x: startX + (F.x - 20 - startX) * e, y: startY + (F.y - startY) * e + Math.sin(u * Math.PI * 2) * 34 * (1 - u), z: 0 };
        }
        if (t < 1380) {
          const a = Math.PI + (t - 560) * 0.0095;
          return { x: F.x + Math.cos(a) * R0, y: F.y + 10 + Math.sin(a) * R0 * 0.42, z: Math.sin(a) };
        }
        const a0 = Math.PI + (1380 - 560) * 0.0095, sx = F.x + Math.cos(a0) * R0, sy = F.y + 10 + Math.sin(a0) * R0 * 0.42;
        if (t < 1480) { const u = (t - 1380) / 100; return { x: sx + (F.x - sx) * u, y: sy + (F.top - 70 - sy) * u, z: 0 }; }
        const u = Math.min(1, (t - 1480) / 80);
        return { x: F.x, y: F.top - 70 + (F.y - (F.top - 70)) * u * u, z: 0 };
      };
      thing(E, { life: 1560, top: true, draw: function (g) {
        const t = E.t;
        if (t < 300) return;
        const segs = [];
        for (let i = NS - 1; i >= 0; i--) {
          const tt = t - i * LAG;
          if (tt < 300) continue;
          const p = pos(tt), q = pos(tt - 12);
          segs.push({ i: i, p: p, dx: p.x - q.x, dy: p.y - q.y });
        }
        segs.forEach(function (sg) {
          const i = sg.i, p = sg.p, k = 1 - i / NS;
          const s = 11 + 21 * k, back = p.z < -0.2 ? 0.55 : 1;           // てきの うしろを 通る ときは うすく
          const col = DRAGONC.c[Math.min(11, Math.floor(i * 0.75))];
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * back;
          g.drawImage(glowOf(col), p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          const rz = Math.atan2(-sg.dx, sg.dy || 0.001);                      // ほのおの 先を うしろ向きに
          mesh(g, SH.FLAME, { x: p.x, y: p.y, s: s, sx: 0.9, sy: 1.25, sz: 0.9, rz: rz, ry: t * 0.01 + i, col: col, a: 0.95 * back, emis: true, edge: 0.3 });
          if (i === 0) {   // 頭：つの 2本と 光る 目
            const an = Math.atan2(sg.dy, sg.dx || 0.001), cx = Math.cos(an), sy = Math.sin(an);
            const hx = p.x + cx * 6, hy = p.y + sy * 6;
            [-1, 1].forEach(function (side) {
              const ox = -sy * side * 9, oy = cx * side * 9;
              mesh(g, SH.GEM, { x: hx - cx * 14 + ox * 1.2, y: hy - sy * 14 + oy * 1.2 - 8, s: 11, sx: 0.45, sy: 1.5, sz: 0.45, rz: an - Math.PI / 2 - side * 0.55, col: [255, 220, 110], a: back, edge: 0.6, spec: 1 });
              g.globalCompositeOperation = 'lighter';
              g.drawImage(glowOf([255, 250, 200]), hx + ox * 0.45 - 6, hy + oy * 0.45 - 6, 12, 12);
              g.fillStyle = 'rgba(255,255,230,' + back + ')'; g.fillRect(hx + ox * 0.45 - 2, hy + oy * 0.45 - 2, 4, 4);
              g.globalCompositeOperation = 'source-over';
            });
          }
        });
      } });
      return pos;
    }
    fxc.define('set-ryu', { dur: 2300, run: function (E, F, S, Hr) {
      if (at(E, 10)) { K.ring(E, Hr.x, Hr.y + 40, 6, 96, 480, '#ff6a2a', 6, 0.3); K.orb(E, S.x, S.y - 12, 4, 30, 300, '#ff8a2a', { shrinkAt: 0.9 }); E.dragonPos = dragon(E, F, S, Hr); }
      if (E.t < 320) {
        K.flameP(E, Hr.x + R(E, -34, 34), Hr.y + 36, { ramp: INFER, vx: R(E, -20, 20), vy: R(E, -220, -130), ay: -40, drag: 0.5, life: R(E, 360, 520), s0: R(E, 8, 13), s1: 2, a: 0.55 });
        P(E, { m: 'o', draw: 's', cx: S.x, cy: S.y - 12, ang: R(E, 0, 6.3), rad: R(E, 60, 120), w: 5, dr: -R(E, 200, 320), rise: 0, oy: 0, sq: 0.9, life: 420, s0: 2.6, s1: 1.2, ramp: INFER, orbit: true, kill: 6 });
      }
      if (at(E, 300)) { K.flash(E, '#ffb050', 0.35, 200); K.glint(E, S.x, S.y - 12, 90, 300); }
      // 竜の 体から ほのおの 粒
      if (during(E, 300, 1560) && E.dragonPos) {
        const p = E.dragonPos(E.t - 3 * 26);
        K.flameP(E, p.x + R(E, -6, 6), p.y + R(E, -6, 6), { ramp: INFER, vx: R(E, -40, 40), vy: R(E, -120, -40), drag: 1, life: R(E, 260, 420), s0: R(E, 6, 10), s1: 2, a: 0.5 });
        if (E.step % 2 === 0) P(E, { x: p.x, y: p.y, vx: R(E, -80, 80), vy: R(E, -140, 20), ay: 300, drag: 0.8, life: R(E, 300, 520), s0: 2.4, s1: 0.8, m: 's', ramp: INFER });
      }
      if (at(E, 560)) {
        K.flash(E, '#ffffff', 0.55, 200); K.flash(E, '#ff6a2a', 0.3, 480);
        K.ring(E, F.x, F.bot, 8, 160, 560, '#ff6a2a', 7, 0.3);
        K.burst(E, F.x, F.y, 40, { ramp: INFER, v0: 200, v1: 560, g: 380 });
        K.chunks(E, F.x, F.bot - 4, 8, '#6a3a22', { up: true, lift: 150 });
      }
      if (during(E, 700, 1400) && E.step % 2 === 0) {
        K.flameP(E, F.x + R(E, -F.w * 0.6, F.w * 0.6), F.bot + R(E, -4, 4), { ramp: INFER, vx: R(E, -20, 20), vy: R(E, -220, -120), ay: -40, drag: 0.5, life: R(E, 320, 520), s0: R(E, 8, 14), s1: 2, a: 0.5 });
      }
      if (at(E, 1560)) {
        K.flash(E, '#ffffff', 0.85, 280); K.flash(E, '#ff5a1a', 0.4, 720);
        K.firePillar(E, F, 760);
        rings3(E, F.x, F.y, 1560, ['#ffffff', '#ffb030', '#ff3a1a']);
        K.ring(E, F.x, F.bot, 12, 250, 760, '#ff6a2a', 8, 0.3);
        K.rays(E, F.x, F.y, 18, 300, 860, '#ff8a2a', 0.7);
        K.burst(E, F.x, F.y, 70, { ramp: INFER, v0: 220, v1: 680, g: 300, drag: 1.1, l0: 560, l1: 1000, s: 3 });
        K.chunks(E, F.x, F.bot - 6, 14, '#5a2a18', { up: true, lift: 200, v0: 180, v1: 500, s0: 6, s1: 12 });
        K.smoke(E, F.x, F.top, 8, { ramp: K.RAMP.smoke, a: 0.5 });
      }
      if (during(E, 1560, 2200) && E.step % 2 === 0) {
        P(E, { x: F.x + R(E, -F.w * 0.8, F.w * 0.8), y: F.bot + R(E, -6, 4), vx: R(E, -40, 40), vy: R(E, -300, -160), ay: -30, drag: 0.5, life: R(E, 520, 820), s0: R(E, 3, 5), s1: 1, ramp: INFER, fo: 0.5 });
      }
    } });

    /* ---- 天光ノ聖剣（セイクリッド・ブレイド）：でんせつの セット ----
       0〜460   ため：天から 主人公に 光が さし、光の つばさが ひらく・金の 羽
       460〜500 天から 光の 大剣が てきに ふりおろされる（主人公の たて斬りと 同時）
       560〜1400 聖なる 十字・てきの まわりに 光の 柱が 6本・天使の わ・白い 羽が ふる
       1000 よこの 一閃（十字斬り）／1540 聖なる 大ばくはつ */
    const HOLY = ramp(['#ffffff', '#fffbe0', '#ffe27a', '#ffc24a', '#c08a10']);
    const HOLYC = rgb(['#ffe27a', '#fff6c8', '#ffd24a', '#ffffff']);
    // 光の つばさ（主人公の ダッシュに ついて いく。F が あれば 0〜506ms で てきの 手まえへ＝mo-dash-sp の 22%）
    function wings(E, x0, y0, life, F) {
      thing(E, { life: life, draw: function (g, u) {
        const a = u < 0.25 ? u / 0.25 : u > 0.7 ? (1 - u) / 0.3 : 1, flap = Math.sin(u * 14) * 0.08;
        const q = F ? K.trailPos(E, { x: x0, y: y0 }, F, 0, 506) : { x: x0, y: y0 }, x = q.x, y = q.y;
        g.globalCompositeOperation = 'lighter';
        // 天からの 光（つばさの 上に ほそく）
        const gb = g.createLinearGradient(0, 0, 0, y + 50);
        gb.addColorStop(0, 'rgba(255,236,150,0)'); gb.addColorStop(0.6, 'rgba(255,240,180,' + 0.35 * a + ')'); gb.addColorStop(1, 'rgba(255,255,255,' + 0.55 * a + ')');
        g.fillStyle = gb; g.fillRect(x - 9, 0, 18, y + 50);
        [-1, 1].forEach(function (side) {
          for (let i = 0; i < 6; i++) {
            const an = -Math.PI / 2 + side * (0.5 + i * 0.22 + flap), len = 78 - i * 6, wd = 8 - i * 0.6;
            const ex = x + Math.cos(an) * len, ey = y + Math.sin(an) * len * 0.8;
            const gr = g.createLinearGradient(x, y, ex, ey);
            gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(0.4, 'rgba(255,236,150,' + 0.55 * a + ')'); gr.addColorStop(1, 'rgba(255,255,255,' + 0.85 * a + ')');
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(ex + Math.cos(an + Math.PI / 2) * wd, ey + Math.sin(an + Math.PI / 2) * wd);
            g.lineTo(ex + Math.cos(an) * 6, ey + Math.sin(an) * 6);
            g.lineTo(ex - Math.cos(an + Math.PI / 2) * wd, ey - Math.sin(an + Math.PI / 2) * wd);
            g.closePath(); g.fill();
          }
        });
        g.globalAlpha = a * 0.7;
        g.drawImage(glowOf([255, 236, 160]), x - 50, y - 50, 100, 100);
      } });
    }
    // 天から ふりおろす 光の 大剣（まん中は 白・まわりが 金）。grow＝のびる ms
    function lightBlade(E, x, yBot, w, life) {
      thing(E, { life: life, draw: function (g, u) {
        const grow = Math.min(1, u / 0.18), a = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5, top = -30, hh = (yBot - top) * grow;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = a;
        g.drawImage(glowOf([255, 226, 122]), x - w * 3, top, w * 6, hh + 30);
        g.globalAlpha = 1;
        const gr = g.createLinearGradient(x - w, 0, x + w, 0);
        gr.addColorStop(0, 'rgba(255,200,60,0)'); gr.addColorStop(0.3, 'rgba(255,220,110,' + 0.7 * a + ')'); gr.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
        gr.addColorStop(0.7, 'rgba(255,220,110,' + 0.7 * a + ')'); gr.addColorStop(1, 'rgba(255,200,60,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - w, top); g.lineTo(x + w, top); g.lineTo(x + w * 0.9, top + hh - w * 1.6); g.lineTo(x, top + hh); g.lineTo(x - w * 0.9, top + hh - w * 1.6); g.closePath(); g.fill();
      } });
    }
    // 聖なる 十字（たて と よこの 光の 棒が ひろがる）
    function holyCross(E, x, y, size, life) {
      thing(E, { life: life, draw: function (g, u) {
        const e = 1 - Math.pow(1 - Math.min(1, u / 0.3), 3), a = u < 0.4 ? 1 : 1 - (u - 0.4) / 0.6;
        const L = size * e, T = 6 + 10 * (1 - u);
        g.globalCompositeOperation = 'lighter';
        [[L * 0.8, T], [T, L * 1.2]].forEach(function (b) {
          const gw = g.createRadialGradient(x, y, 0, x, y, Math.max(b[0], b[1]));
          gw.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gw.addColorStop(0.5, 'rgba(255,226,122,' + 0.8 * a + ')'); gw.addColorStop(1, 'rgba(255,200,60,0)');
          g.fillStyle = gw;
          g.fillRect(x - b[0], y - b[1] * 0.62, b[0] * 2, b[1] * 2 * 0.62 + (b[1] > b[0] ? b[1] * 0.3 : 0));
        });
      } });
    }
    fxc.define('set-densetsu', { dur: 2300, run: function (E, F, S, Hr) {
      if (at(E, 10)) {
        wings(E, Hr.x - 4, Hr.y - 18, 500, F);
        K.ring(E, Hr.x, Hr.y + 40, 6, 90, 460, '#ffe27a', 5, 0.3);
      }
      if (E.t < 460 && E.step % 2 === 0) {
        P(E, { x: Hr.x + R(E, -50, 50), y: Hr.y + R(E, -40, 50), vx: 0, vy: R(E, -170, -90), life: 420, s0: 3, s1: 1, ramp: HOLY });
        if (E.step % 4 === 0) feathersOf(E, 1, [[255, 250, 230], [255, 236, 170]], { x: Hr.x, y: Hr.y - 60, spread: 50, v0: 30, v1: 60, emis: true });
      }
      if (at(E, 440)) { K.flash(E, '#fff6c8', 0.45, 220); lightBlade(E, F.x, F.bot + 6, 20, 620); }
      if (at(E, 500)) {
        K.slash(E, F.x - 6, F.y, F.h * 0.6 + 30, -Math.PI * 0.62, Math.PI * 0.95, 440, '#ffe27a', 20);
        K.burst(E, F.x, F.y, 40, { ramp: HOLY, v0: 180, v1: 540, g: 260 });
        K.ring(E, F.x, F.bot, 8, 170, 560, '#ffe27a', 7, 0.3);
        holyCross(E, F.x, F.y, F.h * 0.9 + 30, 760);
      }
      // 光の 柱が てきの まわりに 1本ずつ
      for (let i = 0; i < 6; i++) {
        if (at(E, 600 + i * 70)) {
          const an = Math.PI + i * Math.PI * 2 / 6, px = F.x + Math.cos(an) * (F.w * 0.6 + 24), py = F.bot + Math.sin(an) * (F.w * 0.6 + 24) * 0.3;
          K.pillar(E, px, py, 5, F.h + 60, 900 - i * 40, i % 2 ? '#fff6c8' : '#ffd24a');
          K.burst(E, px, py, 6, { ramp: HOLY, v0: 60, v1: 180, g: 120, up: true });
        }
      }
      if (at(E, 620)) K.ring(E, F.x, F.top - 18, 10, F.w * 0.42 + 8, 820, '#ffe27a', 4, 0.28);   // 天使の わ
      if (during(E, 620, 1440) && E.step % 4 === 0) feathersOf(E, 1, [[255, 252, 240], [255, 240, 190]], { x: F.x, y: -8, spread: 110, emis: true });
      if (at(E, 1000)) {
        K.slash(E, F.x, F.y + 4, F.h * 0.55 + 26, -Math.PI * 0.05, -Math.PI * 0.95, 400, '#ffffff', 16);
        K.flash(E, '#fff6c8', 0.25, 160);
        K.burst(E, F.x, F.y, 24, { ramp: HOLY, v0: 160, v1: 440, g: 220 });
      }
      if (at(E, 1540)) {
        K.flash(E, '#ffffff', 0.9, 300); K.flash(E, '#ffd24a', 0.35, 700);
        holyCross(E, F.x, F.y, F.h + 90, 900);
        rings3(E, F.x, F.y, 1540, ['#ffffff', '#ffe27a', '#ffc24a']);
        K.rays(E, F.x, F.y, 20, 300, 900, '#ffe27a', 0.5);
        K.burst(E, F.x, F.y, 70, { ramp: HOLY, v0: 220, v1: 660, g: 160, drag: 1.1, l0: 600, l1: 1050, s: 3 });
        gemShards(E, F.x, F.y, 14, HOLYC, { v0: 200, v1: 520, lift: 120, s0: 7, s1: 13 });
        K.crystalRing(E, F.x, F.y, 16, 170, 10, -1.1, 900, { spin: 4, size: 13, cols: HOLYC });
        K.glint(E, F.x, F.y, 170, 620);
      }
      if (during(E, 1560, 2200) && E.step % 2 === 0) P(E, { x: F.x + R(E, -F.w, F.w), y: F.bot + R(E, -8, 4), vx: R(E, -20, 20), vy: R(E, -220, -120), drag: 0.6, life: R(E, 520, 820), s0: R(E, 2.5, 4), s1: 1, ramp: HOLY, fo: 0.5 });
    } });

    /* ---- 星辰ノ黙示録（アストラル・アポカリプス）：ほしの セット ----
       0〜560   てきの まわりに 星座（3D の 星 7つ）が あらわれ、線で つながる・地面に 魔法じん
       620     星座が 光って、星から てきへ 光の 線 → 当たる
       700〜1400 ほうき星が つぎつぎ ふる
       1500    黙示録：天から 光の 柱・星が とびちる 大ばくはつ */
    const ASTR = ramp(['#ffffff', '#e8f0ff', '#8fb8ff', '#6a7cff', '#3a2a9a']);
    const ASTRC = rgb(['#8fb8ff', '#d6a8ff', '#ffffff', '#6ad0ff', '#b8c8ff']);
    const CONST = [[-74, -46], [-36, -76], [14, -60], [58, -34], [66, 20], [26, 50], [-44, 40]];
    function constellation(E, F, life) {
      thing(E, { life: life, top: true, draw: function (g, u) {
        const age = this.age, a = age > life - 240 ? (life - age) / 240 : 1;
        const W = K.size().W, pts = CONST.map(function (c) { return [Math.max(12, Math.min(W - 12, F.x + c[0] * (F.w / 84))), Math.max(12, F.y + c[1] * (F.h / 84))]; });   // 画面の はしで 切れない
        g.globalCompositeOperation = 'lighter';
        // 線（じゅんに のびる）
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i], q = pts[(i + 1) % pts.length], k = Math.max(0, Math.min(1, (age - 80 - i * 60) / 90));
          if (k <= 0) continue;
          const flash = age > 600 && age < 700 ? 1 : 0.6;
          g.strokeStyle = 'rgba(160,200,255,' + (0.35 * a * flash) + ')'; g.lineWidth = 5;
          g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k); g.stroke();
          g.strokeStyle = 'rgba(235,245,255,' + (0.9 * a * flash) + ')'; g.lineWidth = 1.5; g.stroke();
        }
        // 星座から てきへ 光の 線（620〜760）
        if (age > 620 && age < 780) {
          const k = (age - 620) / 160;
          pts.forEach(function (p) {
            g.strokeStyle = 'rgba(214,168,255,' + (0.8 * (1 - k)) + ')'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(F.x, F.y); g.stroke();
          });
        }
        // 星（3D）
        pts.forEach(function (p, i) {
          const k = Math.max(0, Math.min(1, (age - i * 60) / 120));
          if (k <= 0) return;
          const s = (6 + (i % 3) * 2) * k * (1 + Math.sin(age * 0.02 + i) * 0.12);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
          g.drawImage(glowOf(ASTRC[i % ASTRC.length]), p[0] - s * 2.6, p[1] - s * 2.6, s * 5.2, s * 5.2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          mesh(g, SH.STAR5, { x: p[0], y: p[1], s: s, rx: -0.3, ry: age * 0.006 + i, rz: i, col: ASTRC[i % ASTRC.length], a: a, edge: 0.7 });
        });
      } });
    }
    // 地面の 魔法じん（だ円・六芒星・回る もじの 四角）
    function magicCircle(E, x, y, r, life, c0, c1) {
      const A = rgbOf(c0), B = rgbOf(c1);
      thing(E, { life: life, draw: function (g, u) {
        const a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1, rot = u * 2.4, sq = 0.3;
        const rr = r * (0.7 + 0.3 * Math.min(1, u / 0.15));
        g.save(); g.translate(x, y); g.scale(1, sq);
        g.globalCompositeOperation = 'lighter';
        g.lineWidth = 3; g.strokeStyle = css(A, 0.7 * a);
        g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1.6; g.strokeStyle = css(B, 0.8 * a);
        g.beginPath(); g.arc(0, 0, rr * 0.82, 0, Math.PI * 2); g.stroke();
        // 六芒星
        g.lineWidth = 2; g.strokeStyle = css(A, 0.75 * a);
        [0, Math.PI / 3].forEach(function (off) {
          g.beginPath();
          for (let i = 0; i <= 3; i++) { const an = rot + off + i * Math.PI * 2 / 3; const px = Math.cos(an) * rr * 0.82, py = Math.sin(an) * rr * 0.82; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
          g.stroke();
        });
        // もじの 四角
        g.fillStyle = css([255, 255, 255], 0.85 * a);
        for (let i = 0; i < 14; i++) { const an = -rot * 1.3 + i * Math.PI * 2 / 14; g.fillRect(Math.cos(an) * rr * 0.91 - 2.5, Math.sin(an) * rr * 0.91 - 2.5, 5, 5); }
        g.restore();
      } });
    }
    fxc.define('set-hoshi', { dur: 2300, run: function (E, F, S, Hr) {
      if (at(E, 10)) {
        constellation(E, F, 1480);
        magicCircle(E, F.x, F.bot + 2, F.w * 0.8 + 34, 1560, '#8fb8ff', '#d6a8ff');
        K.pillar(E, S.x, S.y, 5, S.y + 20, 520, '#8fb8ff');
      }
      if (E.t < 560) {
        if (E.step % 2 === 0) P(E, { x: S.x + R(E, -40, 40), y: S.y + R(E, -10, 40), vx: 0, vy: R(E, -160, -80), life: 380, s0: 3, s1: 1, ramp: ASTR });
        if (E.step % 3 === 0) P(E, { x: R(E, 0, K.size().W), y: R(E, 0, F.bot), vx: 0, vy: 0, life: R(E, 300, 600), s0: R(E, 1.5, 3), s1: 0.5, ramp: ASTR, fi: 0.4 });
      }
      if (at(E, 620)) {
        K.flash(E, '#cfe0ff', 0.5, 240);
        K.orb(E, F.x, F.y, 8, 40, 360, '#8fb8ff');
        K.burst(E, F.x, F.y, 40, { ramp: ASTR, v0: 180, v1: 520, g: 200 });
        K.ring(E, F.x, F.y, 10, 180, 560, '#d6a8ff', 7, 1);
      }
      [[700, -40], [800, 36], [880, -8], [980, 52], [1060, -56], [1160, 14], [1250, -24], [1330, 40]].forEach(function (c, i) {
        if (at(E, c[0] - 300)) {
          const tx = F.x + c[1], ty = F.bot - R(E, 0, F.h * 0.5), col = ASTRC[i % ASTRC.length];
          comet(E, tx - R(E, 150, 230), -40, tx, ty, 300, R(E, 11, 15), col, ASTR, function (x, y) {
            K.flash(E, '#cfe0ff', 0.14, 120);
            K.ring(E, x, y, 6, 70, 360, '#8fb8ff', 4, 0.5);
            K.burst(E, x, y, 16, { ramp: ASTR, v0: 120, v1: 360, g: 300 });
            K.starP(E, x, y, { col: col, vx: R(E, -120, 120), vy: R(E, -260, -120), ay: 400, drag: 0.4, life: 700, s0: 7, s1: 3 });
          });
        }
      });
      if (at(E, 1440)) K.lightPillar(E, F.x, -20, F.bot + 4, 30, 700);
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.85, 300); K.flash(E, '#6a7cff', 0.4, 760);
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#8fb8ff', '#d6a8ff']);
        K.ring(E, F.x, F.bot, 12, 250, 760, '#8fb8ff', 8, 0.3);
        K.rays(E, F.x, F.y, 16, 300, 900, '#8fb8ff', -0.6);
        K.burst(E, F.x, F.y, 70, { ramp: ASTR, v0: 200, v1: 660, g: 100, drag: 1.1, l0: 600, l1: 1100, s: 2.8 });
        for (let i = 0; i < n(E, 22); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 180, 560);
          K.starP(E, F.x, F.y, { col: ASTRC[i % ASTRC.length], vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 80, drag: 1.1, life: R(E, 700, 1150), s0: R(E, 9, 17), s1: 3 });
        }
        K.crystalRing(E, F.x, F.y, 20, 190, 12, -1.1, 1000, { spin: 3.5, size: 14, cols: ASTRC });
        K.glint(E, F.x, F.y, 180, 640);
      }
      if (E.t > 1500 && E.t < 2200 && E.step % 3 === 0) K.starP(E, R(E, 10, K.size().W - 10), -10, { col: ASTRC[E.step % ASTRC.length], vx: R(E, -30, 30), vy: R(E, 120, 220), ay: 80, life: R(E, 700, 1000), s0: R(E, 5, 8), s1: 3, fo: 0.7 });
    } });

    /* ---- 禁断ノ匣（パンドラ・カプセル）：カプセルの セット ----
       0〜340   大きな 3D の カプセルが おりて きて てきの 上に うかぶ（くさりで ふうじて ある）。主人公の 斬撃が 2つ とぶ
       340     くさりが 切れる → 400〜940 カプセルが ゆれて ヒビから 光が もれる
       950     カプセルが われて ひらく → 中から 宝石・星・箱が うずまいて てきに ふりそそぐ
       1500    禁断の 大ばくはつ（水色 と ピンク） */
    const PANDORA = ramp(['#ffffff', '#e0f8ff', '#4fd3ff', '#ff7ad0', '#7a2ab8']);
    const PANC = rgb(['#4fd3ff', '#ff7ad0', '#ffe27a', '#b07cff', '#7cf9c4']);
    // 半分の 球（ふた・底）。まん中を 少し 下に ずらして おく（面の 向きの 計算を 正しく する ため）
    const HEMI = (function () {
      const v = [[0, -0.65, 0]], f = [], N = 10, L = 3;
      for (let j = 1; j <= L; j++) {
        const la = j / L * Math.PI / 2, y = -Math.cos(la) + 0.35, r = Math.sin(la);
        for (let i = 0; i < N; i++) { const a = i * 2 * Math.PI / N; v.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
      }
      for (let i = 0; i < N; i++) f.push([0, 1 + i, 1 + (i + 1) % N]);
      for (let l = 1; l < L; l++) { const a0 = 1 + (l - 1) * N, a1 = 1 + l * N; for (let i = 0; i < N; i++) { const j = (i + 1) % N; f.push([a0 + i, a0 + j, a1 + j, a1 + i]); } }
      const eq = []; for (let i = 0; i < N; i++) eq.push(1 + (L - 1) * N + i);
      f.push(eq);
      return { v: v, f: f };
    })();
    function capsule(E, F) {
      const r = Math.max(26, F.w * 0.36), hy = Math.max(F.top - r - 12, r + 10);   // 上が 画面から 切れない 高さ
      const t = thing(E, { life: 1500, top: true, draw: function (g) {
        const age = t.age;
        if (age > 1500) return;
        const open = age >= 950, ko = open ? Math.min(1, (age - 950) / 420) : 0;
        const fall = Math.min(1, age / 300), cy = -r * 2 + (hy + r * 2) * (1 - (1 - fall) * (1 - fall)) + Math.sin(age * 0.008) * 3;
        const shake = age > 400 && !open ? Math.sin(age * 0.09) * (0.04 + 0.1 * (age - 400) / 550) : 0;
        const ry = age * 0.004, a = age > 1300 ? Math.max(0, 1 - (age - 1300) / 200) : 1;
        // うしろの 光
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = (0.5 + (open ? 0.5 : Math.max(0, (age - 400) / 550) * 0.5)) * a;
        g.drawImage(glowOf(open ? [255, 122, 208] : [79, 211, 255]), F.x - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        const topX = F.x - ko * 70, topY = cy - r * 0.35 - ko * 60, botX = F.x + ko * 60, botY = cy + r * 0.35 + ko * 20;
        // この アプリの カプセル（上が すける 色・下が 白）。まん中に 黒い おびは つけない（ほかの 作品の ボールに にる）
        mesh(g, HEMI, { x: botX, y: botY, s: r, sy: 1.12, rz: Math.PI + shake + ko * 1.2, ry: ry, rx: -0.25, col: [240, 244, 255], a: a, edge: 0.12, spec: 0.9 });
        if (!open) {   // すけた ふたの 中で 光が うずまく
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * a;
          g.drawImage(glowOf([255, 150, 230]), F.x - r * 0.8 + Math.sin(age * 0.01) * 6, cy - r * 1.1, r * 1.6, r * 1.2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        mesh(g, HEMI, { x: topX, y: topY, s: r, sy: 1.12, rz: shake - ko * 1.6, ry: ry, rx: -0.25, col: [110, 214, 255], a: 0.78 * a, edge: 0.16, spec: 1 });
        if (!open) {
          // くさり（340 まで）
          if (age < 340) {
            for (let i = -5; i <= 5; i++) {
              [1, -1].forEach(function (dir) {
                const px = F.x + i * r * 0.21, py = cy + dir * i * r * 0.21;
                g.fillStyle = 'rgba(70,64,96,.95)'; g.fillRect(px - 3.5, py - 3.5, 7, 7);
                g.fillStyle = 'rgba(170,166,200,.95)'; g.fillRect(px - 3.5, py - 3.5, 5, 3);
              });
            }
          }
          // ヒビ（光が もれる）
          if (age > 480) {
            const k = Math.min(1, (age - 480) / 420);
            g.globalCompositeOperation = 'lighter';
            g.strokeStyle = 'rgba(255,220,250,' + (0.9 * k) + ')'; g.lineWidth = 2;
            g.beginPath();
            g.moveTo(F.x - r * 0.1, cy - r * 0.8); g.lineTo(F.x + r * 0.15, cy - r * 0.4); g.lineTo(F.x - r * 0.12, cy); g.lineTo(F.x + r * 0.2 * k, cy + r * 0.5 * k);
            g.moveTo(F.x + r * 0.15, cy - r * 0.4); g.lineTo(F.x + r * 0.6 * k, cy - r * 0.55 * k);
            g.stroke();
            g.globalCompositeOperation = 'source-over';
          }
        }
      } });
      return { x: F.x, y: hy, r: r };
    }
    fxc.define('set-capsule', { dur: 2300, run: function (E, F, S, Hr) {
      if (at(E, 10)) { E.cap = capsule(E, F); K.ring(E, Hr.x, Hr.y + 40, 6, 86, 440, '#4fd3ff', 5, 0.3); }
      const cp = E.cap || { x: F.x, y: F.top - 40, r: 30 };
      if (E.t < 340 && E.step % 2 === 0) P(E, { x: S.x + R(E, -12, 12), y: S.y + R(E, -12, 12), vx: R(E, -60, 60), vy: R(E, -140, -60), life: 320, s0: 3, s1: 1, ramp: PANDORA });
      [180, 270].forEach(function (t0) { if (at(E, t0)) wave(E, Hr.x + 36, Hr.y - 30, cp.x - 10, cp.y, 170, '#4fd3ff', '#ffffff', 18); });
      if (at(E, 340)) {
        K.flash(E, '#e0f8ff', 0.4, 200);
        K.glint(E, cp.x, cp.y, 100, 360);
        K.burst(E, cp.x, cp.y, 24, { ramp: PANDORA, v0: 140, v1: 400, g: 300 });
        for (let i = 0; i < n(E, 14); i++) {   // くさりの かけら
          const a = R(E, 0, Math.PI * 2), v = R(E, 120, 320);
          P(E, { x: cp.x + R(E, -cp.r, cp.r), y: cp.y + R(E, -cp.r * 0.6, cp.r * 0.6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, ay: 700, drag: 0.4, life: R(E, 500, 800),
            s0: R(E, 4, 7), s1: 2, m: 'M', mesh: SH.BOX, col: [130, 130, 150], rx: R(E, 0, 6), ry: R(E, 0, 6), vrx: R(E, -9, 9), vry: R(E, -9, 9), spec: 0.6, fo: 0.7 });
        }
      }
      if (during(E, 480, 950) && E.step % 3 === 0) {
        const a = R(E, 0, Math.PI * 2);
        P(E, { x: cp.x + Math.cos(a) * cp.r * 0.6, y: cp.y + Math.sin(a) * cp.r * 0.6, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, drag: 1.5, life: 360, s0: 2.4, s1: 1, m: 's', ramp: PANDORA });
      }
      if (at(E, 950)) {
        K.flash(E, '#ffffff', 0.75, 260); K.flash(E, '#ff7ad0', 0.3, 520);
        K.ring(E, cp.x, cp.y, 10, 200, 620, '#ff7ad0', 8, 1);
        K.rays(E, cp.x, cp.y, 14, 220, 700, '#4fd3ff', 0.8);
        K.burst(E, cp.x, cp.y, 50, { ramp: PANDORA, v0: 160, v1: 520, g: 200 });
      }
      // 中から あふれる 宝石・星・箱（うずを まいて てきへ）
      if (during(E, 960, 1440)) {
        for (let i = 0; i < n(E, 2); i++) {
          const kind = (E.step + i) % 3, col = PANC[(E.step + i) % PANC.length];
          const o = { x: cp.x + R(E, -10, 10), y: cp.y + R(E, -6, 6), vx: R(E, -220, 220), vy: R(E, -80, 60), ay: 900, drag: 0.9, life: R(E, 500, 760), s0: R(E, 7, 12), s1: 3,
            m: 'M', col: col, glow: true, rx: R(E, 0, 6), ry: R(E, 0, 6), rz: R(E, 0, 6), vrx: R(E, -9, 9), vry: R(E, -10, 10), vrz: R(E, -7, 7), edge: 0.6, spec: 0.8, fo: 0.7 };
          o.mesh = kind === 0 ? SH.GEM : kind === 1 ? SH.STAR5 : SH.BOX;
          if (kind === 2) { o.s0 *= 0.7; o.glow = false; }
          P(E, o);
        }
        if (E.step % 2 === 0) P(E, { m: 'o', draw: 'g', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 60, 110), w: 6, dr: -R(E, 120, 200), rise: 0, oy: 0, sq: 0.6, life: 500, s0: 3.2, s1: 1, ramp: PANDORA, orbit: true, kill: 8 });
      }
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.85, 300); K.flash(E, '#b07cff', 0.4, 720);
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#4fd3ff', '#ff7ad0']);
        K.ring(E, F.x, F.bot, 12, 240, 740, '#ff7ad0', 8, 0.3);
        K.rays(E, F.x, F.y, 16, 290, 860, '#ff7ad0', 0.6);
        K.burst(E, F.x, F.y, 70, { ramp: PANDORA, v0: 220, v1: 680, g: 140, drag: 1.1, l0: 600, l1: 1050, s: 3 });
        gemShards(E, F.x, F.y, 20, PANC, { v0: 200, v1: 560, lift: 110, s0: 8, s1: 14 });
        K.crystalRing(E, F.x, F.y, 18, 180, 12, -1.1, 950, { spin: -4, size: 14, cols: PANC });
        K.smoke(E, F.x, F.y, 5, { ramp: ramp(['#6a3a8a', '#3a1a5a', '#1a0a2a']), a: 0.45 });
      }
      if (during(E, 1520, 2200) && E.step % 2 === 0) P(E, { x: R(E, 0, K.size().W), y: -4, vx: R(E, -20, 20), vy: R(E, 60, 110), life: 1000, s0: R(E, 2, 4), s1: 1.5, ramp: PANDORA });
    } });

    /* ---- 極光ノ神域（オーロラ・サンクチュアリ）：オーロラの セット ----
       0〜500   空に オーロラの カーテン・主人公が 光を まとって 走る
       500〜1100 連続の 突き（主人公）ごとに 光の すじ。てきの まわりに 結晶の 柱が 1本ずつ たつ（神域）・天使の わ
       1100〜1450 柱から てきへ 光の 線
       1500    神域の さばき：天から オーロラの 柱・柱が くだけて 大ばくはつ */
    const AUR = ramp(['#ffffff', '#eafff6', '#7cf9c4', '#4fd3ff', '#8a5ae0']);
    const AURC = rgb(['#7cf9c4', '#4fd3ff', '#c48bff', '#b8ffe6', '#ff9ee0']);
    function sanctuary(E, F, life) {
      const NP = 6, R0 = F.w * 0.66 + 26, list = [];
      for (let i = 0; i < NP; i++) list.push({ an: Math.PI * 0.5 + i * Math.PI * 2 / NP, h: (F.h * 0.6 + 38) * R(E, 0.85, 1.15), ry: R(E, 0, 6), delay: 520 + i * 90, c: AURC[i % AURC.length] });
      thing(E, { life: life, draw: function (g) {
        const age = this.age, fade = age > life - 160 ? (life - age) / 160 : 1;
        const L = list.map(function (p) { return { p: p, z: Math.sin(p.an + age * 0.0012) }; }).sort(function (a, b) { return a.z - b.z; });   // 奥から
        L.forEach(function (o) {
          const p = o.p, k = Math.max(0, Math.min(1, (age - p.delay) / 160));
          if (k <= 0) return;
          const an = p.an + age * 0.0012, x = F.x + Math.cos(an) * R0, yb = F.bot + Math.sin(an) * R0 * 0.3, hh = p.h * (1 - (1 - k) * (1 - k));
          const back = o.z < 0 ? 0.55 : 1;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * fade * back;
          g.drawImage(glowOf(p.c), x - 22, yb - hh - 10, 44, hh + 20);
          g.globalAlpha = 1;
          mesh(g, SH.PRISM6, { x: x, y: yb - hh / 2, s: 9, sy: hh / 2 / 9, rx: -0.12, ry: p.ry + age * 0.004, col: p.c, a: 0.55 * fade * back, emis: true, edge: 0.6 * fade });
          // 柱から てきへ 光の 線
          if (age > 1100 && age < 1480) {
            const q = (age - 1100) / 380;
            g.strokeStyle = css(p.c, 0.7 * (1 - q) + 0.2); g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(x, yb - hh); g.lineTo(F.x, F.y); g.stroke();
          }
        });
        g.globalCompositeOperation = 'source-over';
      } });
    }
    fxc.define('set-aurora', { dur: 2300, run: function (E, F, S, Hr) {
      K.trail(E, Hr, F, 40, 500, AUR, 4, 9);
      if (at(E, 10)) { K.aurora(E, 2250, ['#7cf9c4', '#4fd3ff', '#c48bff', '#b8ffe6', '#ff9ee0', '#7cf9c4']); K.ring(E, Hr.x, Hr.y + 40, 6, 90, 460, '#7cf9c4', 5, 0.3); sanctuary(E, F, 1480); }
      if (E.t < 500 && E.step % 2 === 0) P(E, { x: R(E, 0, K.size().W), y: R(E, 0, 80), vx: R(E, -10, 10), vy: R(E, 30, 70), life: 700, s0: R(E, 2, 3.5), s1: 1, ramp: AUR, fi: 0.3 });
      // 連続の 突き（主人公の 動き mo-sp-starburst と 合わせる）
      [500, 610, 720, 830, 940, 1050].forEach(function (t0, i) {
        if (at(E, t0)) {
          const c = ['#7cf9c4', '#4fd3ff', '#c48bff', '#b8ffe6', '#ff9ee0', '#ffffff'][i];
          K.slash(E, F.x, F.y, F.h * 0.45 + 22, -Math.PI * (0.2 + i * 0.31) - Math.PI * 0.5, Math.PI * 0.85, 320, c, 13);
          K.burst(E, F.x, F.y, 14, { ramp: AUR, v0: 120, v1: 380, g: 180 });
          gemShards(E, F.x, F.y, 3, [rgbOf(c)], { v0: 120, v1: 320, s0: 6, s1: 10 });
        }
      });
      if (at(E, 700)) K.ring(E, F.x, F.top - 22, 10, F.w * 0.44 + 10, 820, '#b8ffe6', 4, 0.28);
      if (during(E, 700, 1480) && E.step % 2 === 0) {
        P(E, { m: 'o', draw: 'g', cx: F.x, cy: F.bot, ang: R(E, 0, 6.3), rad: R(E, 40, F.w * 0.7 + 26), w: R(E, 2, 4), dr: 0, rise: R(E, 60, 130), oy: 0, sq: 0.3, life: R(E, 520, 760), s0: 3, s1: 1, ramp: AUR, orbit: true });
      }
      if (at(E, 1420)) {
        // 天から オーロラの 柱
        thing(E, { life: 520, draw: function (g, u) {
          const grow = Math.min(1, u / 0.2), a = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5, w = 34 * (1 - u * 0.4), hh = (F.bot + 6) * grow;
          g.globalCompositeOperation = 'lighter';
          const gr = g.createLinearGradient(F.x - w, 0, F.x + w, 0);
          gr.addColorStop(0, 'rgba(124,249,196,0)'); gr.addColorStop(0.25, 'rgba(79,211,255,' + 0.6 * a + ')'); gr.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
          gr.addColorStop(0.75, 'rgba(196,139,255,' + 0.6 * a + ')'); gr.addColorStop(1, 'rgba(196,139,255,0)');
          g.fillStyle = gr; g.fillRect(F.x - w, 0, w * 2, hh);
        } });
      }
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.85, 300); K.flash(E, '#7cf9c4', 0.35, 720);
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#7cf9c4', '#c48bff'], 360);
        K.ring(E, F.x, F.bot, 12, 250, 760, '#4fd3ff', 8, 0.3);
        K.rays(E, F.x, F.y, 18, 300, 900, '#b8ffe6', -0.6);
        K.burst(E, F.x, F.y, 76, { ramp: AUR, v0: 220, v1: 680, g: 120, drag: 1.1, l0: 600, l1: 1100, s: 2.8 });
        gemShards(E, F.x, F.y, 22, AURC, { mesh: SH.PRISM6, sx: 0.4, sy: 1, sz: 0.4, v0: 200, v1: 560, lift: 120, s0: 8, s1: 14 });
        K.crystalRing(E, F.x, F.y, 20, 200, 14, -1.1, 1050, { spin: 3, size: 15, cols: AURC });
        K.glint(E, F.x, F.y, 190, 640);
      }
      if (E.t > 1500 && E.t < 2250 && E.step % 2 === 0) P(E, { x: R(E, 0, K.size().W), y: -4, vx: R(E, -20, 20), vy: R(E, 50, 100), life: 1000, s0: R(E, 2, 4), s1: 1.5, ramp: AUR });
    } });

    /* =========================================================
       カプセル 第2弾の セットわざ（2026-09-17）
       ユーザー「プリズムと ギンガの 一式 揃えた 時の 必殺技」→ 分光烈破／超新星ノ轟砲
       ========================================================= */

    /* ---- 分光烈破（スペクトル・ブレイク）：プリズムの セット ----
       0〜360   主人公の 上に 3D の 大きな 水晶（三角の 柱）。けんの 先から 白い 光が 入り、7色に 分かれて ひろがる
       360〜1060 7色の 斬撃が 1本ずつ（赤 → むらさき）。色ごとに 水晶の かけら
       1100〜1460 7色の 光が うずを まいて てきに あつまる（虹の 輪が しまる）
       1500    分光の 大ばくはつ：まっしろ → 虹の わ 3つ・水晶の 柱が とびちる */
    const SPEC7 = ['#ff4a5a', '#ff9a2a', '#ffe23a', '#5ae06a', '#3ad6ff', '#4a78ff', '#b25aff'];
    const SPECC = rgb(SPEC7);
    const PRISMR = ramp(['#ffffff', '#f2fbff', '#bfefff', '#9ab8ff', '#c79bff']);
    // 3D の 三角の 柱（水晶）
    const TRIPRISM = (function () {
      const v = [], f = [];
      for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; v.push([Math.cos(a), k ? 1 : -1, Math.sin(a)]); }
      f.push([0, 1, 2], [5, 4, 3]);
      for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; f.push([i, 3 + i, 3 + j, j]); }
      return { v: v, f: f };
    })();
    function bigPrism(E, x, y, life, size) {
      const t = thing(E, { life: life, top: true, draw: function (g, u) {
        const grow = 1 - Math.pow(1 - Math.min(1, u / 0.3), 3), a = u > 0.85 ? (1 - u) / 0.15 : 1, s = size * grow;
        if (s < 1) return;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * a;
        g.drawImage(glowOf([200, 236, 255]), x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        mesh(g, TRIPRISM, { x: x, y: y + Math.sin(u * 9) * 3, s: s, sx: 1.15, sz: 1.15, sy: 1.35, rx: -0.5, ry: 0.5 + u * 4, rz: 0.15, col: [150, 210, 255], a: 0.62 * a, edge: 1, spec: 1 });
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) { g.fillStyle = css(SPECC[i], 0.35 * a); g.fillRect(x - s * 0.5 + i * s * 0.15, y - s * 0.9 + ((i * 7 + (u * 60 | 0)) % 9) * s * 0.18, s * 0.12, s * 0.5); }
        g.globalCompositeOperation = 'source-over';
      } });
      return t;
    }
    // 7色の 光の すじ（x0,y0 から 扇に ひろがる）
    function spectrumFan(E, x0, y0, x1, y1, life) {
      thing(E, { life: life, draw: function (g, u) {
        const a = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8, grow = Math.min(1, u / 0.35);
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) * grow, base = Math.atan2(dy, dx);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const an = base + (i - 3) * 0.075, ex = x0 + Math.cos(an) * L, ey = y0 + Math.sin(an) * L;
          const gr = g.createLinearGradient(x0, y0, ex, ey);
          gr.addColorStop(0, css([255, 255, 255], 0.9 * a)); gr.addColorStop(0.3, css(SPECC[i], 0.85 * a)); gr.addColorStop(1, css(SPECC[i], 0));
          g.strokeStyle = gr; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = css([255, 255, 255], 0.5 * a); g.lineWidth = 1.5; g.stroke();
        }
      } });
    }
    fxc.define('set-prism', { dur: 2300, run: function (E, F, S, Hr) {
      const PX = Hr.x + 30, PY = Math.max(40, Hr.y - 64);
      if (at(E, 10)) {
        bigPrism(E, PX, PY, 1080, 22);
        K.ring(E, Hr.x, Hr.y + 40, 6, 90, 440, '#bfefff', 5, 0.3);
      }
      // けんの 先から 白い 光が 水晶へ
      if (at(E, 90)) {
        thing(E, { life: 300, draw: function (g, u) {
          const a = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
          g.globalCompositeOperation = 'lighter';
          g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 5; g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(PX, PY); g.stroke();
          g.strokeStyle = 'rgba(200,236,255,' + 0.5 * a + ')'; g.lineWidth = 12; g.stroke();
        } });
        K.glint(E, PX, PY, 80, 300);
      }
      if (at(E, 220)) { spectrumFan(E, PX, PY, F.x, F.y, 900); K.flash(E, '#f2fbff', 0.3, 180); }
      if (E.t < 360 && E.step % 2 === 0) P(E, { x: PX + R(E, -24, 24), y: PY + R(E, -24, 24), vx: R(E, -40, 40), vy: R(E, -80, -20), life: 360, s0: 3, s1: 1, ramp: PRISMR });
      // 7色の 斬撃
      for (let i = 0; i < 7; i++) {
        if (at(E, 360 + i * 110)) {
          const c = SPEC7[i];
          K.slash(E, F.x + R(E, -6, 6), F.y + R(E, -6, 6), F.h * 0.5 + 24, -Math.PI * (0.15 + i * 0.29) - Math.PI * 0.5, Math.PI * 0.9, 340, c, i === 6 ? 17 : 13);
          K.burst(E, F.x, F.y, 12, { ramp: ramp(['#ffffff', c, c]), v0: 120, v1: 380, g: 200 });
          gemShards(E, F.x, F.y, 3, [SPECC[i]], { mesh: TRIPRISM, sx: 0.45, sy: 1, sz: 0.45, v0: 130, v1: 340, s0: 6, s1: 10 });
          if (i % 2 === 0) K.flash(E, c, 0.12, 120);
        }
      }
      if (at(E, 400)) K.ring(E, F.x, F.bot, 8, 140, 560, '#bfefff', 6, 0.3);
      // 7色が うずを まいて あつまる
      if (during(E, 1100, 1460)) {
        for (let i = 0; i < n(E, 2); i++) {
          const c = SPEC7[(E.step + i) % 7];
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 90, 180), w: 5, dr: -R(E, 240, 360), rise: 0, oy: 0, sq: 0.8,
            life: 460, s0: 3, s1: 1.2, ramp: ramp(['#ffffff', c, c]), orbit: true, kill: 8 });
        }
      }
      if (at(E, 1100)) K.crystalRing(E, F.x, F.y, F.w * 0.7 + 40, 18, 7, -1.05, 400, { spin: -6, size: 12, cols: SPECC });
      if (at(E, 1480)) K.glint(E, F.x, F.y, 120, 260);
      // 分光の 大ばくはつ
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.9, 300); K.flash(E, '#9ab8ff', 0.3, 700);
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#ffe23a', '#3ad6ff']);
        [0, 60, 120].forEach(function (d, j) {
          E.later.push({ at: 1520 + d, fn: function () { K.ring(E, F.x, F.y, 10, 250 - j * 40, 700, [SPEC7[0], SPEC7[3], SPEC7[6]][j], 6, 1); } });
        });
        K.ring(E, F.x, F.bot, 12, 250, 760, '#bfefff', 8, 0.3);
        K.rays(E, F.x, F.y, 21, 300, 900, '#ffffff', 0.5);
        K.burst(E, F.x, F.y, 72, { rainbow: true, v0: 220, v1: 680, g: 120, drag: 1.1, l0: 600, l1: 1100, s: 2.8 });
        gemShards(E, F.x, F.y, 22, SPECC, { mesh: TRIPRISM, sx: 0.45, sy: 1, sz: 0.45, v0: 200, v1: 560, lift: 120, s0: 8, s1: 14 });
        K.crystalRing(E, F.x, F.y, 20, 200, 14, -1.1, 1050, { spin: 3.5, size: 14, cols: SPECC });
      }
      if (E.t > 1520 && E.t < 2250 && E.step % 2 === 0) P(E, { x: R(E, 0, K.size().W), y: -4, vx: R(E, -20, 20), vy: R(E, 60, 110), life: 1000, s0: R(E, 2, 4), s1: 1.5, ramp: ramp(['#ffffff', SPEC7[E.step % 7], SPEC7[E.step % 7]]) });
    } });

    /* ---- 超新星ノ轟砲（スーパーノヴァ・カノン）：ギンガの セット ----
       0〜540   けんの 先に 星雲の うず（腕の ある 銀河）。まわりの 星が うずを まいて すいこまれ、まん中が 光る
       560〜1000 轟砲：太い 光の 大砲が てきを つらぬく（ここで 当たる）。光の 中を 星が ながれる
       1000〜1460 てきの まわりに 大きな 星雲の うず。まん中の 星が ぎゅっと ちぢむ
       1500    超新星：まっしろ → むらさき の 大ばくはつ・しょうげきの わ・3D の 星が とびちる */
    const NEBU = ramp(['#ffffff', '#e8ecff', '#b8c4ff', '#9a6aff', '#4a2aa8', '#141040']);
    const GINC = rgb(['#e8ecff', '#b8c4ff', '#c79bff', '#8a6aff', '#ffffff']);
    // 腕の ある 銀河の うず（ss＝大きさ・rot＝回る 速さ）
    function galaxy(E, x, y, life, r0, r1, o) {
      o = o || {};
      const seeds = [];
      for (let i = 0; i < 70; i++) seeds.push({ arm: i % 3, d: R(E, 0.08, 1), j: R(E, -0.25, 0.25), s: R(E, 1, 2.6), c: GINC[i % GINC.length] });
      thing(E, { life: life, top: !!o.top, draw: function (g, u) {
        const grow = o.shrinkAt && u > o.shrinkAt ? 1 - Math.pow((u - o.shrinkAt) / (1 - o.shrinkAt), 2) : 1 - Math.pow(1 - Math.min(1, u / 0.35), 3);
        const rr = (r0 + (r1 - r0) * grow), a = u > 0.9 ? (1 - u) / 0.1 : 1, rot = u * (o.spin || 6);
        if (rr < 2) return;
        g.globalCompositeOperation = 'lighter';
        // うすい 星雲の もや
        g.globalAlpha = 0.5 * a; g.drawImage(glowOf([120, 90, 230]), x - rr * 1.5, y - rr * 0.9, rr * 3, rr * 1.8);
        g.globalAlpha = 0.8 * a; g.drawImage(glowOf([230, 236, 255]), x - rr * 0.45, y - rr * 0.3, rr * 0.9, rr * 0.6);
        g.globalAlpha = 1;
        // 3本の うでを 光の 帯で（外ほど ほそく・うすく）
        for (let arm = 0; arm < 3; arm++) {
          [[rr * 0.12, [120, 90, 230], 0.28], [rr * 0.07, [200, 190, 255], 0.55], [rr * 0.022, [255, 255, 255], 0.8]].forEach(function (b) {
            g.beginPath();
            for (let k = 0; k <= 24; k++) {
              const d = 0.06 + k / 24 * 0.94, an = rot + arm * Math.PI * 2 / 3 + d * 3.4, px = x + Math.cos(an) * rr * d, py = y + Math.sin(an) * rr * d * 0.5;
              if (k) g.lineTo(px, py); else g.moveTo(px, py);
            }
            g.lineWidth = Math.max(1, b[0]); g.lineCap = 'round'; g.strokeStyle = css(b[1], b[2] * a); g.stroke();
          });
        }
        g.globalAlpha = a; g.drawImage(glowOf([255, 255, 255]), x - rr * 0.3, y - rr * 0.3, rr * 0.6, rr * 0.6); g.globalAlpha = 1;
        for (let i = 0; i < seeds.length; i++) {
          const p = seeds[i], an = rot + p.arm * Math.PI * 2 / 3 + p.d * 3.4 + p.j, rad = rr * p.d;
          const px = x + Math.cos(an) * rad, py = y + Math.sin(an) * rad * 0.5, sz = p.s * (0.6 + 0.4 * grow);
          g.fillStyle = css(p.c, (1 - p.d * 0.6) * a);
          g.fillRect(px - sz, py - sz, sz * 2, sz * 2);
        }
      } });
    }
    // 光の 大砲（x0,y0 → x1,y1。はじめ ふとく、ゆっくり ほそく なる）
    function cannon(E, x0, y0, x1, y1, life, w) {
      thing(E, { life: life, top: true, draw: function (g, u) {
        const reach = Math.min(1, u / 0.12), a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3, ww = w * (u < 0.12 ? 0.6 + u * 3.3 : 1 - (u - 0.12) * 0.45) * (1 + Math.sin(u * 90) * 0.06);
        const ex = x0 + (x1 - x0) * reach, ey = y0 + (y1 - y0) * reach, an = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(an), ny = Math.cos(an);
        g.globalCompositeOperation = 'lighter';
        [[ww * 1.9, [120, 80, 230], 0.35], [ww, [184, 196, 255], 0.75], [ww * 0.42, [255, 255, 255], 1]].forEach(function (b) {
          g.fillStyle = css(b[1], b[2] * a);
          g.beginPath();
          g.moveTo(x0 + nx * b[0] * 0.4, y0 + ny * b[0] * 0.4); g.lineTo(ex + nx * b[0], ey + ny * b[0]);
          g.lineTo(ex - nx * b[0], ey - ny * b[0]); g.lineTo(x0 - nx * b[0] * 0.4, y0 - ny * b[0] * 0.4);
          g.closePath(); g.fill();
        });
        g.globalAlpha = a; g.drawImage(glowOf([200, 210, 255]), ex - ww * 3, ey - ww * 3, ww * 6, ww * 6); g.globalAlpha = 1;
      } });
    }
    fxc.define('set-ginga', { dur: 2300, run: function (E, F, S, Hr) {
      // ---- ため：けんの 先に 銀河 ----
      if (at(E, 10)) {
        galaxy(E, S.x + 6, S.y - 6, 620, 6, 62, { shrinkAt: 0.86, spin: 7 });
        K.ring(E, Hr.x, Hr.y + 40, 6, 90, 520, '#9a6aff', 5, 0.3);
      }
      if (E.t < 540) {
        for (let i = 0; i < n(E, 2); i++) {
          P(E, { m: 'o', draw: 's', cx: S.x + 6, cy: S.y - 6, ang: R(E, 0, 6.3), rad: R(E, 80, 170), w: 5, dr: -R(E, 220, 340), rise: 0, oy: 0, sq: 0.55,
            life: 520, s0: 2.6, s1: 1, ramp: NEBU, orbit: true, kill: 8 });
        }
        if (E.step % 4 === 0) K.starP(E, S.x + R(E, -90, 90), S.y + R(E, -60, 40), { col: GINC[E.step % GINC.length], vx: 0, vy: 0, life: 360, s0: R(E, 5, 8), s1: 2, fi: 0.3 });
      }
      if (at(E, 500)) { K.orb(E, S.x + 6, S.y - 6, 4, 30, 160, '#e8ecff', { shrinkAt: 0.5 }); K.glint(E, S.x + 6, S.y - 6, 110, 260); }
      // ---- 轟砲 ----
      if (at(E, 540)) {
        K.flash(E, '#e8ecff', 0.55, 220);
        cannon(E, S.x + 10, S.y - 6, F.x, F.y, 520, 20);
      }
      if (at(E, 560)) {
        K.burst(E, F.x, F.y, 36, { ramp: NEBU, v0: 180, v1: 540, g: 200 });
        K.ring(E, F.x, F.y, 10, 170, 520, '#b8c4ff', 7, 1);
        K.starOut(E, F.x, F.y, 8, { v0: 160, v1: 420, s0: 7, s1: 12 });
      }
      if (during(E, 560, 1000) && E.step % 2 === 0) {
        const k = R(E, 0, 1);
        P(E, { x: S.x + (F.x - S.x) * k, y: S.y + (F.y - S.y) * k + R(E, -10, 10), vx: (F.x - S.x) * 1.4, vy: (F.y - S.y) * 1.4, drag: 0.8, life: R(E, 180, 300), s0: R(E, 2, 4), s1: 1, ramp: NEBU });
      }
      // ---- 星雲の うずが てきを つつむ ----
      if (at(E, 980)) galaxy(E, F.x, F.y, 540, F.w * 0.45 + 24, Math.max(F.w * 0.6 + 30, Math.min(F.w * 0.9 + 56, K.size().W - F.x + 24)), { shrinkAt: 0.6, spin: -5, top: true });
      if (during(E, 1000, 1460)) {
        for (let i = 0; i < n(E, 2); i++) {
          P(E, { m: 'o', draw: 's', cx: F.x, cy: F.y, ang: R(E, 0, 6.3), rad: R(E, 130, 230), w: 3.6, dr: -R(E, 280, 440), rise: 0, oy: 0, sq: 0.6,
            life: 520, s0: 2.6, s1: 1, ramp: NEBU, orbit: true, kill: 10 });
        }
        if (E.step % 5 === 0) K.starIn(E, F, 1, 120, 200);
      }
      if (at(E, 1300)) K.orb(E, F.x, F.y, 30, 4, 200, '#ffffff');
      // ---- 超新星 ----
      if (at(E, 1500)) {
        K.flash(E, '#ffffff', 0.95, 320); K.flash(E, '#6a4aff', 0.45, 800);
        K.orb(E, F.x, F.y, 12, 80, 460, '#e8ecff');
        rings3(E, F.x, F.y, 1500, ['#ffffff', '#b8c4ff', '#9a6aff'], 380);
        K.ring(E, F.x, F.bot, 12, 260, 780, '#9a6aff', 8, 0.3);
        K.rays(E, F.x, F.y, 20, 320, 950, '#e8ecff', -0.4);
        K.burst(E, F.x, F.y, 80, { ramp: NEBU, v0: 220, v1: 720, g: 90, drag: 1.1, l0: 650, l1: 1150, s: 3 });
        for (let i = 0; i < n(E, 22); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 200, 600);
          K.starP(E, F.x, F.y, { col: GINC[i % GINC.length], vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 60, drag: 1.1, life: R(E, 750, 1200), s0: R(E, 9, 17), s1: 3 });
        }
        K.crystalRing(E, F.x, F.y, 20, 210, 14, -1.1, 1050, { spin: -3, size: 14, cols: GINC });
        K.glint(E, F.x, F.y, 200, 660);
      }
      if (E.t > 1520 && E.t < 2250 && E.step % 2 === 0) {
        P(E, { x: R(E, 0, K.size().W), y: R(E, 0, F.bot), vx: 0, vy: R(E, 10, 30), life: R(E, 500, 900), s0: R(E, 1.5, 3), s1: 0.5, ramp: NEBU, fi: 0.3 });
      }
    } });
  }
  defineAll();

  MQ.ui.setwaza = { sync: sync, sp: sp, nameEl: nameEl };
})();
