/* 王さま形（3段階め）の 部品ライブラリ（v8.1）
   もとの 形 [x, y, w, h, 色キー, フラグ] の ならびに 部品を 足して
   **1体ずつ ちがう すがた**を 作る。

   色キー：A/B/C/D＝体（自動）／y＝金／r＝赤い 宝石／w＝白／k＝黒／e＝水色
           m＝マント（その 王さまの colors に 書く）／g2＝もう1つの さし色

   フラグ：h＝左上ハイライト g＝光る n＝影なし d＝45度 o＝まわりだけ          */

function bbox(art) {
  let x0 = 99, y0 = 99, x1 = -99, y1 = -99;
  art.forEach(function (r) {
    x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]);
    x1 = Math.max(x1, r[0] + r[2]); y1 = Math.max(y1, r[1] + r[3]);
  });
  return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cx: Math.round((x0 + x1) / 2) };
}

/* 上の ほうで いちばん 広い ブロック＝頭 */
function headOf(art, bb) {
  const band = bb.y0 + Math.max(6, Math.round(bb.h * 0.34));
  let best = null;
  art.forEach(function (r) { if (r[1] <= band && (!best || r[2] > best[2])) best = r; });
  return best || art[0];
}

/* ---------------- かんむり（頭の 上）----------------
   ctx = { hcx（頭の まんなか）, top（かんむりの 下の y）, hw（頭の はば）} */
const CROWNS = {
  // 3つとがり＋band＋赤い 宝石
  spike3: function (c) {
    const w = Math.max(14, Math.min(c.hw, 26)), x = c.hcx - Math.round(w / 2), sp = Math.max(4, Math.round(w / 5));
    return [
      [x, c.top - 6, sp, 6, 'y'], [c.hcx - Math.round(sp / 2), c.top - 8, sp, 8, 'y'], [x + w - sp, c.top - 6, sp, 6, 'y'],
      [x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 3, 4, 4, 'r', 'g']
    ];
  },
  // 5つとがり（皇帝）
  spike5: function (c) {
    const w = Math.max(16, Math.min(c.hw + 2, 28)), x = c.hcx - Math.round(w / 2), sp = 3, gap = Math.round((w - sp * 5) / 4);
    const out = [];
    for (let i = 0; i < 5; i++) {
      const hh = (i === 2) ? 9 : (i % 2 ? 5 : 7);
      out.push([x + i * (sp + gap), c.top - hh, sp, hh, 'y']);
    }
    out.push([x, c.top - 3, w, 4, 'y', 'h']);
    out.push([c.hcx - 2, c.top - 3, 4, 4, 'r', 'g']);
    return out;
  },
  // 2本の つの＋band
  horns: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x - 2, c.top - 7, 4, 7, 'y'], [x - 4, c.top - 10, 4, 4, 'y'],
      [x + w - 2, c.top - 7, 4, 7, 'y'], [x + w, c.top - 10, 4, 4, 'y'],
      [x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 3, 4, 4, 'r', 'g']
    ];
  },
  // 光の わ（天使）
  halo: function (c) {
    const w = Math.max(16, Math.min(c.hw + 4, 26)), x = c.hcx - Math.round(w / 2);
    return [[x, c.top - 10, w, 6, 'y', 'og']];
  },
  // かぶと（スリットの 目）
  helm: function (c) {
    const w = Math.max(16, Math.min(c.hw + 2, 28)), x = c.hcx - Math.round(w / 2);
    return [
      [x, c.top - 9, w, 8, 'y', 'h'], [x + 2, c.top - 5, w - 4, 3, 'k', 'n'],
      [c.hcx - 2, c.top - 14, 4, 6, 'r', 'g']
    ];
  },
  // 月けいの かんむり（つきの わ）
  laurel: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x - 3, c.top - 6, 5, 4, 'g2'], [x - 1, c.top - 9, 5, 4, 'g2'],
      [x + w - 2, c.top - 6, 5, 4, 'g2'], [x + w - 4, c.top - 9, 5, 4, 'g2'],
      [x, c.top - 3, w, 3, 'y', 'h'], [c.hcx - 2, c.top - 4, 4, 4, 'r', 'g']
    ];
  },
  // ほそい band ＋ 大きな 宝石
  tiara: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [[x, c.top - 4, w, 4, 'y', 'h'], [c.hcx - 3, c.top - 9, 6, 6, 'r', 'g']];
  },
  // ほのおの かんむり
  flame: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 1, c.top - 7, 5, 7, 'r', 'g'], [c.hcx - 3, c.top - 11, 6, 11, 'r', 'g'], [x + w - 6, c.top - 7, 5, 7, 'r', 'g'],
      [c.hcx - 2, c.top - 8, 4, 5, 'y', 'gn'],
      [x, c.top - 3, w, 4, 'y', 'h']
    ];
  },
  // つららの かんむり
  ice: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 1, c.top - 8, 4, 8, 'e', 'g'], [c.hcx - 2, c.top - 12, 4, 12, 'e', 'g'], [x + w - 5, c.top - 8, 4, 8, 'e', 'g'],
      [x, c.top - 3, w, 4, 'w', 'h']
    ];
  },
  // アンテナ（ロボ）
  antenna: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 2, c.top - 9, 3, 9, 'y'], [x + 1, c.top - 13, 5, 5, 'r', 'g'],
      [x + w - 5, c.top - 9, 3, 9, 'y'], [x + w - 6, c.top - 13, 5, 5, 'e', 'g'],
      [x, c.top - 3, w, 4, 'y', 'h']
    ];
  },
  // 星の かんむり
  star: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [c.hcx - 5, c.top - 13, 10, 10, 'y', 'dg'],
      [x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 3, 4, 4, 'r', 'g']
    ];
  },
  // はねかざり（3枚）
  feather: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 1, c.top - 8, 4, 8, 'w'], [c.hcx - 2, c.top - 12, 4, 12, 'w'], [x + w - 5, c.top - 8, 4, 8, 'w'],
      [x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 3, 4, 4, 'r', 'g']
    ];
  }
};

/* ---------------- 背中（体の うしろ）---------------- */
const BACKS = {
  cape: function (bb) {
    const top = Math.min(44, bb.y0 + Math.round(bb.h * 0.28)), bottom = Math.min(48, bb.y1 + 2);
    const h1 = Math.round((bottom - top) * 0.45), h2 = bottom - top - h1;
    if (h1 < 3 || h2 < 4) return [];
    const w1 = Math.min(46, bb.w + 6), w2 = Math.min(46, bb.w + 12);
    const x1 = Math.max(1, Math.min(47 - w1, bb.cx - Math.round(w1 / 2)));
    const x2 = Math.max(1, Math.min(47 - w2, bb.cx - Math.round(w2 / 2)));
    return [[x1, top, w1, h1, 'm'], [x2, top + h1, w2, h2, 'm'], [x2, bottom - 3, w2, 3, 'y', 'n']];
  },
  capeTall: function (bb) {
    const top = Math.max(0, bb.y0 + 2), bottom = Math.min(48, bb.y1 + 2);
    const w = Math.min(34, bb.w + 3), x = Math.max(1, Math.min(47 - w, bb.cx - Math.round(w / 2)));
    if (bottom - top < 10) return [];
    return [[x, top, w, bottom - top, 'm'], [x, bottom - 3, w, 3, 'y', 'n']];
  },
  wingsFeather: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.22), l = Math.max(0, bb.x0 - 12), r = Math.min(48, bb.x1 + 12);
    return [
      [l, y + 4, 12, 8, 'w'], [l + 2, y, 10, 6, 'w'],
      [r - 12, y + 4, 12, 8, 'w'], [r - 12, y, 10, 6, 'w']
    ];
  },
  wingsBat: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.2), l = Math.max(0, bb.x0 - 13), r = Math.min(48, bb.x1 + 13);
    return [
      [l, y + 2, 13, 12, 'm'], [l + 1, y + 12, 9, 5, 'm'],
      [r - 13, y + 2, 13, 12, 'm'], [r - 10, y + 12, 9, 5, 'm']
    ];
  },
  wingsBug: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.25), l = Math.max(0, bb.x0 - 11), r = Math.min(48, bb.x1 + 11);
    return [
      [l, y, 11, 7, 'e', 'g'], [l + 2, y + 8, 9, 6, 'e', 'g'],
      [r - 11, y, 11, 7, 'e', 'g'], [r - 11, y + 8, 9, 6, 'e', 'g']
    ];
  },
  aura: function (bb) {
    const out = [];
    const cx = bb.cx, cy = bb.y0 + Math.round(bb.h / 2);
    const rx = Math.min(23, Math.round(bb.w / 2) + 6), ry = Math.min(23, Math.round(bb.h / 2) + 6);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * 2 * i / 8 + 0.39;
      const sz = (i % 2) ? 4 : 6;
      const x = Math.round(cx + Math.cos(a) * rx) - Math.round(sz / 2);
      const y = Math.round(cy + Math.sin(a) * ry) - Math.round(sz / 2);
      if (x < 0 || y < 0 || x + sz > 48 || y + sz > 48) continue;
      out.push([x, y, sz, sz, 'e', 'gnd']);
    }
    return out;
  },
  shell: function (bb) {
    const w = Math.min(46, bb.w + 8), x = Math.max(1, bb.cx - Math.round(w / 2));
    const y = Math.max(0, bb.y0 - 3);
    return [[x, y, w, Math.round(bb.h * 0.55), 'm', 'h'], [x, y + 3, w, 3, 'y', 'n']];
  },
  none: function () { return []; }
};

/* ---------------- 手に もつ もの（右がわ）---------------- */
const HANDS = {
  scepter: function (bb) {
    if (bb.x1 > 43) return [];
    const x = Math.min(44, bb.x1 + 1), y = Math.max(10, bb.y0 + Math.round(bb.h * 0.45));
    return [[x, y, 3, Math.min(16, 46 - y), 'y'], [x - 1, y - 5, 5, 5, 'r', 'g']];
  },
  sword: function (bb) {
    if (bb.x1 > 41) return [];
    const x = Math.min(42, bb.x1 + 1), y = Math.max(4, bb.y0 + 2);
    return [[x + 1, y, 4, 20, 'w'], [x, y + 20, 6, 3, 'y'], [x + 2, y + 23, 2, 5, 'y']];
  },
  orb: function (bb) {
    if (bb.x1 > 40) return [];
    const x = Math.min(41, bb.x1 + 2), y = Math.max(8, bb.y0 + Math.round(bb.h * 0.4));
    return [[x, y, 7, 7, 'e', 'g']];
  },
  trident: function (bb) {
    if (bb.x1 > 42) return [];
    const x = Math.min(43, bb.x1 + 1), y = Math.max(6, bb.y0 + 2);
    return [[x + 1, y + 6, 3, Math.min(20, 44 - y), 'y'], [x - 1, y, 2, 7, 'y'], [x + 2, y - 2, 2, 9, 'y'], [x + 5, y, 2, 7, 'y'], [x - 1, y + 6, 8, 2, 'y']];
  },
  staff: function (bb) {
    if (bb.x1 > 42) return [];
    const x = Math.min(43, bb.x1 + 1), y = Math.max(8, bb.y0 + 4);
    return [[x + 1, y + 5, 3, Math.min(22, 46 - y), 'y'], [x - 1, y, 7, 6, 'y', 'o'], [x + 1, y + 1, 3, 3, 'r', 'g']];
  },
  none: function () { return []; }
};

/* ---------------- おまけ ---------------- */
const EXTRAS = {
  shoulder: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.32);
    return [[Math.max(0, bb.x0 - 3), y, 8, 5, 'y', 'h'], [Math.min(44, bb.x1 - 5), y, 8, 5, 'y', 'h']];
  },
  chest: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.52);
    return [[bb.cx - 3, y, 6, 6, 'r', 'gd']];
  },
  belt: function (bb) {
    const y = Math.min(45, bb.y1 - Math.round(bb.h * 0.28));
    const w = Math.min(40, bb.w - 2), x = bb.cx - Math.round(w / 2);
    return [[x, y, w, 4, 'y', 'h'], [bb.cx - 2, y, 4, 4, 'r', 'gn']];
  },
  fangs: function (bb) {
    const y = bb.y0 + Math.round(bb.h * 0.62);
    return [[bb.cx - 7, y, 4, 5, 'w', 'n'], [bb.cx + 3, y, 4, 5, 'w', 'n']];
  },
  spikes: function (bb) {
    const y = Math.max(0, bb.y0 + 1);
    return [[bb.x0 + 2, y, 3, 5, 'y'], [bb.cx - 1, y - 2, 3, 5, 'y'], [bb.x1 - 5, y, 3, 5, 'y']];
  },
  beard: function (bb) {
    const y = Math.min(44, bb.y0 + Math.round(bb.h * 0.62));
    const w = Math.min(24, bb.w - 6), x = bb.cx - Math.round(w / 2);
    return [[x, y, w, 6, 'w', 'h'], [x + 3, y + 6, w - 6, 4, 'w', 'n']];
  },
  none: function () { return []; }
};

/* ---------------- 王さま形を 組み立てる ----------------
   spec = { crown, back, hand, extras: [], grow: 0〜3（体を 大きく する px）} */
function makeKing(art, spec) {
  spec = spec || {};
  let src = art.map(function (r) { return r.slice(); });

  // 体を すこし 大きく する（下を そろえて 上へ のばす）
  const g = spec.grow || 0;
  if (g) {
    const bb0 = bbox(src);
    const k = (bb0.h + g) / bb0.h;
    src = src.map(function (r) {
      const nx = Math.round(bb0.cx + (r[0] - bb0.cx) * k);
      const ny = Math.round(bb0.y1 - (bb0.y1 - r[1]) * k);
      return [nx, ny, Math.max(1, Math.round(r[2] * k)), Math.max(1, Math.round(r[3] * k)), r[4], r[5]];
    });
  }

  // かんむりの ぶんの すきま（足りなければ 体を 下げる）
  const need = spec.crown === 'halo' || spec.crown === 'star' ? 12 : 9;
  let bb = bbox(src);
  const dy = Math.min(Math.max(0, need - bb.y0), Math.max(0, 48 - bb.y1));
  if (dy > 0) src.forEach(function (r) { r[1] += dy; });
  bb = bbox(src);

  const head = headOf(src, bb);
  const ctx = { hcx: Math.round(head[0] + head[2] / 2), top: head[1], hw: head[2] };

  const back = (BACKS[spec.back] || BACKS.none)(bb);
  const crown = (CROWNS[spec.crown] || CROWNS.spike3)(ctx);
  const hand = (HANDS[spec.hand] || HANDS.none)(bb);
  let extra = [];
  (spec.extras || []).forEach(function (k) { extra = extra.concat((EXTRAS[k] || EXTRAS.none)(bb)); });

  const out = back.concat(src, extra, crown, hand);
  // 48×48 に おさめる（はみ出しは けずる）
  return out.filter(function (r) { return r[2] > 0 && r[3] > 0; }).map(function (r) {
    const x = Math.max(0, Math.min(47, r[0])), y = Math.max(0, Math.min(47, r[1]));
    return [x, y, Math.min(48 - x, r[2]), Math.min(48 - y, r[3]), r[4], r[5]];
  });
}

module.exports = { makeKing: makeKing, bbox: bbox, CROWNS: CROWNS, BACKS: BACKS, HANDS: HANDS, EXTRAS: EXTRAS };
