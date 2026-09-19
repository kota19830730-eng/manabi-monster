/* =========================================================
   ボスの 先制こうげきの 光（2026-09-19・Canvas）
   ユーザー「派手さを もっと 派手に。ドラゴン系なら 火を 吐くなど」
   ・ボスの しゅるいごとに 6つの 大わざ（ほのお／かみなり／こおり／大ぎり／じしん／やみ・こばん）。
   ・ひっさつわざと 同じ Canvas（js/ui/fxcanvas.js）に 台本を 足す（MQ.ui.fxc.define）。
     ねらう 先は 主人公（Hr）の 前の たて（T）。F＝ボスの 絵の 大きさ。
   ・時間は ため の はじまりが 0。IMP（ms）で 主人公に 当たる（js/ui/battle.js の AMB と そろえる）。
   ・どの ボスが どの わざかは battle.js の AMB_STYLE。口の 場所は set({ mouth: [よこ, たて] })（絵の 左上から の わりあい）
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};
  if (!MQ.ui || !MQ.ui.fxc || !MQ.ui.fxc.define) return;
  const K = MQ.ui.fxc.kit;
  const P = K.P, R = K.R, at = K.at, during = K.during, thing = K.thing, n = K.n;
  const RAMP = K.RAMP, ramp = K.ramp, css = K.css, rgbOf = K.rgbOf, glowOf = K.glowOf;
  const IMP = 750;                   // ため 0〜450 → はなつ 450〜750 → 当たる 750
  let mouth = [0.3, 0.4];

  const RED = ramp(['#ffffff', '#ffd0c8', '#ff5a4a', '#d0181a', '#5a0408']);
  const PURPLE = ramp(['#ffffff', '#f0d8ff', '#c48bff', '#8a3ae8', '#3a0a6a']);
  const GOLDR = RAMP.gold;
  const DARKSMOKE = ramp(['#5a3a78', '#3a2450', '#1c1028']);

  // 口（はなつ ところ）と ねらう ところ
  function M(E) { const F = E.F; return { x: F.x - F.w / 2 + F.w * mouth[0], y: F.top + F.h * mouth[1] }; }
  function T(E) { return { x: E.Hr.x + 30, y: E.Hr.y - 4 }; }
  function heroFeet(E) { return E.Hr.y + 40; }

  // まわりから 光が すいこまれて たまる（ため）
  function gather(E, x, y, rp, k, r0, r1) {
    for (let i = 0; i < n(E, k); i++) {
      const a = R(E, 0, Math.PI * 2), r = R(E, r0 || 36, r1 || 80), life = R(E, 220, 320);
      P(E, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r / (life / 1000), vy: -Math.sin(a) * r / (life / 1000),
        life: life, s0: R(E, 2, 4), s1: 1, ramp: rp, fi: 0.3, fo: 0.3 });
    }
  }
  // はなった 粒が 主人公へ まっすぐ とぶ（v＝はやさ px/秒・spread＝ひろがり）
  function toward(E, from, to, v, spread) {
    const a = Math.atan2(to.y - from.y, to.x - from.x) + R(E, -spread, spread);
    const d = Math.hypot(to.x - from.x, to.y - from.y);
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: d / v * 1000 + R(E, 40, 160) };
  }
  // 当たった ところの 大きな 光（どの わざも）
  function impact(E, x, y, hex, rp, big) {
    K.flash(E, '#ffffff', big ? 0.55 : 0.4, 200);
    K.ring(E, x, y, 8, big ? 150 : 110, 520, hex, 7, 1);
    K.ring(E, x, heroFeet(E), 6, 130, 600, hex, 5, 0.3);
    K.burst(E, x, y, big ? 46 : 34, { ramp: rp, v0: 180, v1: 560, g: 380 });
    K.rays(E, x, y, 12, 80, 420, hex, 1.5);
  }

  const SCRIPTS = {
    /* ---- ほのおの ブレス（ドラゴン・たいほう）：口に 火が たまる → 3D の ほのおが ごうごうと 主人公へ → 大ばくはつ ---- */
    'amb-fire': { dur: 1600, run: function (E) {
      const m = M(E), t = T(E);
      if (at(E, 0)) K.orb(E, m.x, m.y, 2, 16, 470, '#ff8a2a', { shrinkAt: 0.9 });
      if (during(E, 0, 450)) gather(E, m.x, m.y, RAMP.fire, 3, 30, 70);
      if (at(E, 450)) { K.flash(E, '#ffb050', 0.3, 200); K.ring(E, m.x, m.y, 4, 60, 300, '#ff7a1e', 5, 1); }
      if (during(E, 450, 900)) {
        for (let i = 0; i < n(E, 3); i++) {
          const v = toward(E, m, t, R(E, 620, 820), 0.1);
          K.flameP(E, m.x, m.y, { vx: v.vx, vy: v.vy, life: v.life, s0: R(E, 7, 10), s1: R(E, 20, 30), a: 0.7, fo: 0.3 });
        }
        const v2 = toward(E, m, t, R(E, 700, 900), 0.16);
        P(E, { x: m.x, y: m.y, vx: v2.vx, vy: v2.vy, life: v2.life, s0: R(E, 6, 10), s1: 3, ramp: RAMP.fire, fo: 0.3 });
      }
      if (during(E, 700, 1000)) {   // たてに ぶつかって 上下に しぶく
        for (let i = 0; i < n(E, 2); i++) K.flameP(E, t.x + R(E, -6, 10), t.y + R(E, -14, 14), { vx: R(E, -80, 120), vy: R(E, -300, 200), life: R(E, 280, 420), s0: R(E, 10, 16), s1: 3 });
      }
      if (at(E, IMP)) {
        impact(E, t.x, t.y, '#ff7a1e', RAMP.ember, true);
        for (let i = 0; i < n(E, 14); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 160, 380);
          K.flameP(E, t.x, t.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, drag: 1.4, life: R(E, 420, 640), s0: R(E, 14, 22), s1: 4, a: 0.7 });
        }
      }
      if (during(E, 820, 1300) && E.step % 3 === 0) K.smoke(E, t.x, t.y - 10, 1);
    } },

    /* ---- かみなり（ナマズ・メカ・グリフォン）：体に 電気が はしる → 口から いなずま → 空から 2本 → ドカン ---- */
    'amb-bolt': { dur: 1500, run: function (E) {
      const m = M(E), t = T(E), F = E.F;
      if (at(E, 0)) K.orb(E, m.x, m.y, 2, 14, 470, '#4a9cff', { shrinkAt: 0.9 });
      if (during(E, 0, 450) && E.step % 4 === 0) K.bolt(E, F.x + R(E, -F.w * 0.4, F.w * 0.4), F.top + R(E, 0, F.h * 0.4), F.x + R(E, -F.w * 0.4, F.w * 0.4), F.bot - R(E, 0, F.h * 0.3), 110, { w: 1.4 });
      if (during(E, 0, 450)) gather(E, m.x, m.y, RAMP.bolt, 2, 30, 70);
      if (at(E, 450)) { K.flash(E, '#d8f0ff', 0.35, 160); K.bolt(E, m.x, m.y, t.x, t.y, 420, { w: 3.4, br: 3, jit: 0.22 }); }
      if (at(E, 600)) K.bolt(E, t.x - 20, 0, t.x - 4, t.y, 300, { w: 3, br: 2 });
      if (at(E, 700)) K.bolt(E, t.x + 26, 0, t.x + 6, t.y, 300, { w: 3.6, br: 3 });
      if (at(E, IMP)) impact(E, t.x, t.y, '#4a9cff', RAMP.bolt, true);
      if (during(E, IMP, 1150) && E.step % 5 === 0) K.bolt(E, t.x + R(E, -30, 30), t.y + R(E, -30, 20), t.x + R(E, -30, 30), t.y + R(E, -30, 30), 100, { w: 1.4 });
    } },

    /* ---- ふぶき・みずの ブレス（ミズチ・ブリザード）：こおりの つぶてが ふきつける → 足もとから 氷の 柱 ---- */
    'amb-ice': { dur: 1600, run: function (E) {
      const m = M(E), t = T(E), fy = heroFeet(E);
      if (at(E, 0)) K.orb(E, m.x, m.y, 2, 15, 470, '#9fe6ff', { shrinkAt: 0.9 });
      if (during(E, 0, 450)) gather(E, m.x, m.y, RAMP.ice, 3, 30, 80);
      if (at(E, 450)) K.flash(E, '#e6fbff', 0.3, 200);
      if (during(E, 450, 880)) {
        for (let i = 0; i < n(E, 3); i++) {
          const v = toward(E, m, t, R(E, 820, 1000), 0.14);
          P(E, { x: m.x, y: m.y, vx: v.vx, vy: v.vy, life: v.life, s0: R(E, 1.6, 2.6), s1: 1.6, m: 'k', ramp: RAMP.ice, fo: 0.2 });
        }
        for (let i = 0; i < n(E, 2); i++) {
          const v2 = toward(E, m, t, R(E, 560, 760), 0.2);
          P(E, { x: m.x, y: m.y, vx: v2.vx, vy: v2.vy, life: v2.life, s0: R(E, 5, 8), s1: R(E, 10, 16), ramp: RAMP.ice, a: 0.8, fo: 0.35 });
        }
        if (E.step % 2 === 0) { const v3 = toward(E, m, t, 760, 0.08); P(E, { x: m.x, y: m.y, vx: v3.vx, vy: v3.vy, life: v3.life, m: 'x', s0: R(E, 8, 11), s1: 12, rot: R(E, 0, 6), vr: 8, fo: 0.2 }); }
      }
      if (at(E, IMP)) {
        impact(E, t.x, t.y, '#4fb4f0', RAMP.ice, true);
        K.chunks(E, t.x, t.y, 12, '#bfe9ff', { v0: 160, v1: 420, s0: 4, s1: 8 });
        for (let i = 0; i < 5; i++) P(E, { x: t.x - 40 + i * 20 + R(E, -4, 4), y: fy - 10, vx: 0, vy: -20, life: 700, m: 'x', s0: 4, s1: 16 + (i % 2) * 8, rot: R(E, -0.3, 0.3), fi: 0.02, fo: 0.3 });
      }
      if (during(E, 800, 1300) && E.step % 2 === 0) P(E, { x: t.x + R(E, -60, 60), y: R(E, 0, 40), vx: R(E, -40, 20), vy: R(E, 60, 140), life: 800, s0: 2.4, s1: 1.4, ramp: RAMP.wind });
    } },

    /* ---- 大ぎり（鬼・はにわ・テング・ダークロード・かいぞく）：赤い 気が 立つ → つっこんで X の 大ぎり ---- */
    'amb-slash': { dur: 1400, run: function (E) {
      const F = E.F, t = T(E);
      if (during(E, 0, 450) && E.step % 2 === 0) P(E, { x: F.x + R(E, -F.w * 0.5, F.w * 0.5), y: F.bot, vx: R(E, -20, 20), vy: R(E, -260, -160), life: R(E, 360, 520), s0: R(E, 5, 9), s1: 2, ramp: RED, fo: 0.4 });
      if (at(E, 0)) K.orb(E, F.x, F.y, 10, 44, 460, '#ff3b30', { shrinkAt: 0.92 });
      if (during(E, 450, 720)) for (let i = 0; i < n(E, 2); i++) P(E, { x: R(E, t.x + 30, F.x), y: t.y + R(E, -40, 40), vx: -900, vy: 0, life: 160, s0: 2, s1: 1, m: 's', trail: 0.05, ramp: RED });
      if (at(E, 700)) K.slash(E, t.x, t.y, 44, -Math.PI * 0.95, Math.PI * 1.0, 420, '#ff3b30', 22);
      if (at(E, 760)) K.slash(E, t.x + 4, t.y, 38, -Math.PI * 0.2, Math.PI * 0.95, 400, '#ffb0a0', 16);
      if (at(E, IMP)) impact(E, t.x, t.y, '#ff3b30', RED, true);
      if (at(E, 820)) K.glint(E, t.x, t.y - 10, 70, 360);
    } },

    /* ---- じしん（サイ・タイタン・スライム）：地ひびき → 体当たり → 足もとが われて 岩が とびだす ---- */
    'amb-quake': { dur: 1500, run: function (E) {
      const F = E.F, t = T(E), fy = heroFeet(E);
      if (during(E, 0, 450) && E.step % 3 === 0) K.chunks(E, F.x + R(E, -F.w * 0.4, F.w * 0.4), F.bot, 1, '#8a6a4a', { up: true, v0: 60, v1: 140, lift: 40, s0: 3, s1: 5 });
      if (during(E, 0, 450) && E.step % 4 === 0) K.smoke(E, F.x, F.bot, 1, { ramp: RAMP.dust, a: 0.5 });
      if (during(E, 450, 760) && E.step % 2 === 0) K.smoke(E, R(E, t.x, F.x), fy, 1, { ramp: RAMP.dust, a: 0.55 });
      if (at(E, IMP)) {
        impact(E, t.x, t.y, '#ffb050', RAMP.dust, true);
        K.ring(E, t.x, fy, 10, 200, 700, '#ffd08a', 8, 0.28);
        K.slabs(E, { x: t.x, bot: fy, w: 70 }, 9);
        K.chunks(E, t.x, fy, 16, '#7a5a3a', { up: true, v0: 220, v1: 520, lift: 180, s0: 5, s1: 11 });
        K.smoke(E, t.x, fy, 8, { ramp: RAMP.dust, a: 0.6 });
      }
      if (at(E, 880)) K.ring(E, t.x, fy, 10, 170, 600, '#ffd08a', 6, 0.28);
    } },

    /* ---- やみの 魔法（まおう・ハデス・おばけ・マジン・フデ）：むらさきの 玉を ためて ぶつける → やみの ばくはつ ---- */
    'amb-dark': darkScript('#b070ff', PURPLE, DARKSMOKE, false),
    /* ---- こばん シャワー（コバンネズミ）：金の 玉 → 小判が はじける ---- */
    'amb-gold': darkScript('#ffc24a', GOLDR, RAMP.dust, true)
  };

  function darkScript(hex, rp, sm, coins) {
    return { dur: 1600, run: function (E) {
      const m = M(E), t = T(E);
      const ox = m.x - 20, oy = m.y - 10;
      if (at(E, 0)) K.orb(E, ox, oy, 3, 22, 470, hex, { shrinkAt: 0.97 });
      if (during(E, 0, 450)) gather(E, ox, oy, rp, 4, 40, 90);
      if (at(E, 120)) K.rays(E, ox, oy, 10, 60, 360, hex, 3);
      if (at(E, 450)) {
        K.flash(E, hex, 0.25, 180);
        // 玉が とんで いく
        thing(E, { life: 300, draw: function (g, u) {
          const e = u * u, x = ox + (t.x - ox) * e, y = oy + (t.y - oy) * e - Math.sin(u * Math.PI) * 26;
          const c = rgbOf(hex), r = 22;
          const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
          gr.addColorStop(0, css([255, 255, 255], 1)); gr.addColorStop(0.3, css(c, 0.9)); gr.addColorStop(1, css(c, 0));
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = gr; g.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
        } });
      }
      if (during(E, 450, 750)) {
        const u = (E.t - 450) / 300, e = u * u, x = ox + (t.x - ox) * e, y = oy + (t.y - oy) * e - Math.sin(u * Math.PI) * 26;
        for (let i = 0; i < n(E, 3); i++) P(E, { x: x + R(E, -8, 8), y: y + R(E, -8, 8), vx: R(E, 20, 90), vy: R(E, -60, 60), drag: 1.6, life: R(E, 240, 420), s0: R(E, 4, 8), s1: 1, ramp: rp, fo: 0.4 });
      }
      if (at(E, IMP)) {
        impact(E, t.x, t.y, hex, rp, true);
        if (coins) K.chunks(E, t.x, t.y, 18, '#ffd447', { v0: 180, v1: 460, lift: 160, s0: 6, s1: 10 });
        else K.starOut(E, t.x, t.y, 10, { v0: 140, v1: 420, s0: 6, s1: 12, l0: 500, l1: 900 });
      }
      if (coins && during(E, 450, 750) && E.step % 2 === 0) {
        const u = (E.t - 450) / 300, e = u * u;
        K.chunks(E, ox + (t.x - ox) * e, oy + (t.y - oy) * e - Math.sin(u * Math.PI) * 26, 1, '#ffd447', { v0: 40, v1: 120, lift: 60, s0: 5, s1: 8 });
      }
      if (during(E, 800, 1300) && E.step % 2 === 0) K.smoke(E, t.x, t.y, 1, { ramp: sm, a: 0.55 });
    } };
  }

  Object.keys(SCRIPTS).forEach(function (id) { MQ.ui.fxc.define(id, SCRIPTS[id]); });
  MQ.ui.bossfx = {
    IMP: IMP,
    ids: Object.keys(SCRIPTS),
    set: function (o) { if (o && o.mouth) mouth = o.mouth; }
  };
})();
