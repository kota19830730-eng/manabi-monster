/* =========================================================
   相棒の わざの 光（v14.37・Canvas）
   ユーザー「相棒システムやけど 主人公も 必殺技 出すから よく わからん。特別感も ない」
   → 数えたら 相棒が 動く 瞬間の 7〜9わりが 主人公の わざと 同じ 瞬間・同じ ことば「ひっさつ」だった。
   → 相棒だけの ターン（js/ui/battle.js の palTurnAttack）に、系統ごとの 名前と 光を つける。
   ・名前と 系統の 表は js/core/pals.js の MOVE_KINDS／moveKindOf（9しゅるい・カタカナ 2語）
   ・台本は ひっさつわざと 同じ Canvas（js/ui/fxcanvas.js）に MQ.ui.fxc.define で 足す。
     Hr＝相棒の 絵の まん中・F＝てきの 絵。IMP（ms）で てきに 当たる（battle.js の PT_HIT と そろえる）
   ・主人公の わざ（紺・青）と 見分けが つく ように、あたたかい 色（金・赤・オレンジ）を 多めに
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};
  if (!MQ.ui || !MQ.ui.fxc || !MQ.ui.fxc.define) return;
  const K = MQ.ui.fxc.kit;
  const P = K.P, R = K.R, at = K.at, during = K.during, n = K.n;
  const RAMP = K.RAMP, ramp = K.ramp;
  const IMP = 380;                   // 相棒が とびかかって 当たる 時間（battle.js の PT_HIT）

  const RED = ramp(['#ffffff', '#ffd0c8', '#ff5a4a', '#c0181a', '#5a0408']);
  const PURPLE = ramp(['#ffffff', '#f0d8ff', '#c48bff', '#7a2ad0', '#2a0a5a']);
  const SAND = ramp(['#fff6e0', '#e8c890', '#b08a50', '#6a4a28']);
  const AQUA = ramp(['#ffffff', '#d8f8ff', '#5fd8ff', '#1a8ad8', '#0a3a80']);
  const HOLY = ramp(['#ffffff', '#fffbe6', '#ffe9a8', '#ffc94d', '#c08a10']);

  /* 当たった ところの 光（どの わざも）：白い 一しゅん → わ → 火花 → 光の すじ */
  function hit(E, F, hex, rp, o) {
    o = o || {};
    K.flash(E, '#ffffff', o.fl || 0.35, 180);
    K.ring(E, F.x, F.y, 10, o.r || 120, 520, hex, 6, 1);
    K.burst(E, F.x, F.y, o.k || 30, { ramp: rp, v0: 160, v1: 520, g: 420 });
    K.rays(E, F.x, F.y, o.rays || 10, 70, 380, hex, 1.2);
  }
  /* 相棒が 走る あとに のこる 光 */
  function trailIn(E, F, rp, size) { K.trail(E, E.Hr, F, 60, IMP, rp, 3, size || 9); }

  const S = {
    /* きずな ストライク（きほん）：金の 光の すじ → 星が はじける */
    'pm-bond': { dur: 1100, run: function (E, F) {
      trailIn(E, F, RAMP.gold, 10);
      if (at(E, IMP)) {
        hit(E, F, '#ffc94d', RAMP.gold, { k: 34, rays: 12 });
        for (let i = 0; i < n(E, 7); i++) {
          const a = R(E, 0, Math.PI * 2), v = R(E, 120, 320);
          K.starP(E, F.x, F.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, ay: 420, drag: 0.8, life: R(E, 520, 820), s0: R(E, 10, 16), s1: 4 });
        }
      }
      if (at(E, IMP + 160)) K.ring(E, F.x, F.y, 30, 150, 460, '#fff4c2', 4, 1);
    } },

    /* ファング クラッシュ（オオカミ・サメ など）：赤い 光で とびかかり X の かみつき */
    'pm-fang': { dur: 1100, run: function (E, F) {
      trailIn(E, F, RED, 8);
      if (at(E, IMP)) {
        hit(E, F, '#ff5a4a', RED, { k: 26, r: 100 });
        K.slash(E, F.x - 4, F.y - 2, F.h * 0.5 + 22, -Math.PI * 0.7, Math.PI * 0.9, 380, '#ff8a70', 16);
      }
      if (at(E, IMP + 70)) K.slash(E, F.x + 6, F.y + 2, F.h * 0.46 + 18, Math.PI * 0.3, Math.PI * 0.9, 360, '#ffe0d8', 13);
      if (at(E, IMP + 40)) K.chunks(E, F.x, F.bot - 4, 8, '#8a5a3a', { up: true, lift: 120, s0: 4, s1: 8 });
    } },

    /* ブレイズ ブレス（ドラゴン・マグマ）：走りながら ほのおを はく → ほのおの 柱 */
    'pm-blaze': { dur: 1150, run: function (E, F) {
      if (during(E, 90, IMP) && E.step % 2 === 0) {
        const q = K.trailPos(E, E.Hr, F, 60, IMP);
        const a = Math.atan2(F.y - q.y, F.x - q.x);
        K.flameP(E, q.x + 14, q.y - 6, { vx: Math.cos(a) * R(E, 420, 640), vy: Math.sin(a) * R(E, 420, 640), life: R(E, 200, 300), s0: R(E, 8, 12), s1: R(E, 14, 22), a: 0.7 });
      }
      if (at(E, IMP)) { hit(E, F, '#ff7a1e', RAMP.fire, { k: 30 }); K.firePillar(E, F, 480); }
      if (during(E, IMP, IMP + 360)) {
        for (let i = 0; i < n(E, 2); i++) K.flameP(E, F.x + R(E, -F.w * 0.5, F.w * 0.5), F.bot + R(E, -4, 4), { vx: R(E, -25, 25), vy: R(E, -200, -340), ay: -60, drag: 0.5, life: R(E, 340, 520), s0: R(E, 9, 16), s1: 2 });
      }
      if (during(E, IMP + 100, IMP + 500) && E.step % 3 === 0) K.smoke(E, F.x, F.top, 1);
    } },

    /* ヘビー タックル（ゴーレム・カメ など）：どすんと 体当たり → 地面が われて 土けむり */
    'pm-heavy': { dur: 1100, run: function (E, F) {
      trailIn(E, F, SAND, 9);
      if (at(E, IMP)) {
        hit(E, F, '#e8c890', SAND, { k: 22, fl: 0.45, rays: 8 });
        K.ring(E, F.x, F.bot, 8, 150, 620, '#d8b070', 7, 0.3);
        K.chunks(E, F.x, F.bot - 4, 14, '#8a6a4a', { up: true, lift: 160, s0: 5, s1: 11 });
      }
      if (during(E, IMP, IMP + 300) && E.step % 2 === 0) K.smoke(E, F.x + R(E, -F.w * 0.5, F.w * 0.5), F.bot - 6, 2, { ramp: RAMP.dust, a: 0.55 });
    } },

    /* スカイ ダイブ（とり・タカ など）：空から 光が おちて きて たてに 一閃 */
    'pm-sky': { dur: 1100, run: function (E, F) {
      if (during(E, 40, IMP) && E.step % 2 === 0) {
        P(E, { x: F.x + R(E, -30, 30), y: -10, vx: R(E, -20, 20), vy: R(E, 520, 760), life: R(E, 240, 360), s0: R(E, 3, 6), s1: 1, ramp: RAMP.wind, fo: 0.4 });
      }
      if (at(E, IMP)) {
        hit(E, F, '#d6f0ff', RAMP.wind, { k: 28, rays: 12 });
        K.slash(E, F.x, F.y - 6, F.h * 0.55 + 26, -Math.PI * 1.1, Math.PI * 0.72, 400, '#eaf8ff', 16);
      }
      if (at(E, IMP + 80)) K.tornado(E, F, 460, [200, 236, 255]);
    } },

    /* ボルト シュート（かみなり・UFO など）：空から かみなりが 2本 → 電気が はじける */
    'pm-bolt': { dur: 1100, run: function (E, F) {
      trailIn(E, F, RAMP.bolt, 7);
      if (at(E, IMP - 60)) { K.bolt(E, F.x - 18, -10, F.x - 4, F.top + 6, 320, { hex: '#9fd8ff', w: 3, jit: 0.3 }); K.flash(E, '#c8e8ff', 0.3, 160); }
      if (at(E, IMP)) {
        K.bolt(E, F.x + 22, -10, F.x + 6, F.top + 10, 300, { hex: '#ffffff', w: 2.4, jit: 0.34 });
        hit(E, F, '#78c8ff', RAMP.bolt, { k: 34, rays: 14 });
      }
      if (during(E, IMP, IMP + 360) && E.step % 2 === 0) {
        for (let i = 0; i < n(E, 2); i++) {
          const a = R(E, 0, Math.PI * 2);
          P(E, { x: F.x + Math.cos(a) * F.w * 0.5, y: F.y + Math.sin(a) * F.h * 0.5, vx: Math.cos(a) * R(E, 60, 160), vy: Math.sin(a) * R(E, 60, 160), life: R(E, 120, 220), s0: R(E, 2, 4), s1: 1, ramp: RAMP.bolt, fo: 0.3 });
        }
      }
    } },

    /* アクア バースト（タコ・さかな など）：足もとから 水が ふき上がる → 水しぶき */
    'pm-aqua': { dur: 1150, run: function (E, F) {
      trailIn(E, F, AQUA, 8);
      if (at(E, IMP)) { hit(E, F, '#5fd8ff', AQUA, { k: 30 }); K.ring(E, F.x, F.bot, 8, 130, 520, '#9fe6ff', 6, 0.3); K.orb(E, F.x, F.y, 4, 40, 380, '#bff4ff'); }
      if (during(E, IMP - 40, IMP + 320)) {
        for (let i = 0; i < n(E, 3); i++) {
          P(E, { x: F.x + R(E, -F.w * 0.5, F.w * 0.5), y: F.bot, vx: R(E, -60, 60), vy: R(E, -300, -520), ay: 700, drag: 0.3, life: R(E, 420, 640), s0: R(E, 4, 8), s1: 2, ramp: AQUA, fo: 0.4, sway: R(E, 10, 30), ph: R(E, 0, 6) });
        }
      }
    } },

    /* シャドウ スラッシュ（にんじゃ・ゆうれい など）：むらさきの かげが 3回 きりつける */
    'pm-shadow': { dur: 1100, run: function (E, F) {
      trailIn(E, F, PURPLE, 8);
      if (during(E, 80, IMP) && E.step % 3 === 0) { const q = K.trailPos(E, E.Hr, F, 60, IMP); K.smoke(E, q.x, q.y, 1, { ramp: ramp(['#5a3a78', '#2a1848', '#100820']), a: 0.5 }); }
      if (at(E, IMP)) { hit(E, F, '#c48bff', PURPLE, { k: 26, rays: 8 }); K.slash(E, F.x - 6, F.y - 4, F.h * 0.5 + 24, -Math.PI * 0.65, Math.PI * 0.9, 340, '#d8b0ff', 15); }
      if (at(E, IMP + 90)) K.slash(E, F.x + 6, F.y, F.h * 0.48 + 20, Math.PI * 0.35, Math.PI * 0.9, 340, '#f0d8ff', 13);
      if (at(E, IMP + 180)) K.slash(E, F.x, F.y + 6, F.h * 0.52 + 22, -Math.PI * 1.05, Math.PI * 0.8, 340, '#ffffff', 12);
      if (during(E, IMP, IMP + 400) && E.step % 3 === 0) K.smoke(E, F.x, F.y, 1, { ramp: ramp(['#5a3a78', '#2a1848', '#100820']), a: 0.45 });
    } },

    /* シャイン ブレイカー（きし・ユニコーン など）：光の 柱が たって 金の 光が はじける */
    'pm-holy': { dur: 1150, run: function (E, F) {
      trailIn(E, F, HOLY, 9);
      if (at(E, IMP - 100)) K.lightPillar(E, F.x, Math.max(0, F.top - 60), F.bot, 44, 520);
      if (at(E, IMP)) { hit(E, F, '#ffe9a8', HOLY, { k: 34, rays: 16, fl: 0.45 }); K.glint(E, F.x, F.y - F.h * 0.3, 34, 420); }
      if (at(E, IMP + 140)) { K.ring(E, F.x, F.y, 20, 150, 480, '#fff4c2', 4, 1); K.glint(E, F.x + F.w * 0.35, F.y + 10, 24, 380); }
      if (during(E, IMP, IMP + 300) && E.step % 2 === 0) P(E, { x: F.x + R(E, -F.w * 0.6, F.w * 0.6), y: F.bot, vx: R(E, -20, 20), vy: R(E, -160, -300), drag: 0.6, life: R(E, 400, 640), s0: R(E, 2, 4), s1: 1, ramp: HOLY, fo: 0.45 });
    } }
  };
  Object.keys(S).forEach(function (id) { MQ.ui.fxc.define(id, S[id]); });
})();
