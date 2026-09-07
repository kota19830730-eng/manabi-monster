/* カプセル専用モンスターの 進化形（2・3段階め）を 組み立てる 部品ライブラリ

   考え方は tools/king/kit.js（王さま形）と tools/son/build.js（息子さんの 4体）と 同じ。
   **手で 48×48 の 座標を 打たない。** 1段階めの 絵に 部品を かさねて 作る。

   きまり（v8.6 の 教訓から）
     ・**1段階めの かたちを 変えない。** 足すのは かんむり・つばさ・マント・ぶき・オーラ だけ。
       （引いた 子が「同じ 子だ」と 分かる こと。姿が 別物に なると あつめる たのしさが 消える）
     ・**かざりは 本体の 外がわに 出す。** うしろに 置いた ものが 7わり いじょう かくれると
       build.js が 名ざしで 教える（かくれる かざりは 足す いみが ない）。
     ・**つばさは 階段**（3〜4段の 四角）。45度 回した 四角（d）は ひし形に 見えて 羽に ならない。
     ・**光の わは o（まわりだけ）に しない。** 中が 黒く 抜けて 四角い わくに 見える。
       → 光る 金の 円ばん（solid ＋ gn）を 頭の うしろに おく。
     ・**きば・トゲは 四角 2つで 先ぼそり。** 1つだと ただの 白い はこに 見える。
     ・**カプセルの 宝石（j1/j2）は 3段階とも のこす。**「カプセルの 子」の しるし なので
       compose() が いちばん 前に もう一度 置き直す。

   **どこまで 足すか（2026-09-07・いまの 王さま形 44体と ならべて 決め直した）**
   facelab の #zoom で ガンセキオウ／ホネノミカド／メカテイオウ を 見ると、足して あるのは
     ・頭の 上の **小さな** 金の おび ＋ 宝石 1つ
     ・体の うしろの **1色の マント**（どうたいより すこし 広いだけ）
     ・手に もつ もの（**もとから ぶきを 持って いない 子だけ**）
     ・かたあて・おびの 金
   だけ。**浮いた 光の つぶは 1つも ない。**
   1回目は 四すみに 光る つぶを まいたが、36体 ぜんぶが 同じ 顔に 見え、
   ずかんの 52px では つぶしか 見えなく なった。
   → **sparks は 作らない。orbit は 小さく 3つまで。かんむりは 小さく。**
     **もとから ぶきを 持って いる 子に ぶきを 足さない**（かさなって 2本に 見える）。

   色キー：A/B/C/D＝体（自動で できる）／y＝金／r＝赤／w＝白／k＝黒／e＝水色
           m＝マント／j1・j2＝カプセルの 宝石（1段階めから 引きつぐ）
   フラグ：h＝左上ハイライト g＝光る n＝影なし d＝45度 o＝まわりだけ            */

/* ---------------- はかる ---------------- */
function bbox(art) {
  let x0 = 99, y0 = 99, x1 = -99, y1 = -99;
  art.forEach(function (r) {
    x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]);
    x1 = Math.max(x1, r[0] + r[2]); y1 = Math.max(y1, r[1] + r[3]);
  });
  return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cx: Math.round((x0 + x1) / 2) };
}

/* 上の ほうで いちばん 広い ブロック＝頭 */
function headCtx(art) {
  const bb = bbox(art);
  const band = bb.y0 + Math.max(6, Math.round(bb.h * 0.34));
  let best = null;
  art.forEach(function (r) { if (r[1] <= band && (!best || r[2] > best[2])) best = r; });
  best = best || art[0];
  return { hcx: Math.round(best[0] + best[2] / 2), top: best[1], hw: best[2] };
}

/* どうたい＝まん中の あたりで いちばん 広い ブロック。
   **マントの 大きさは これで 決める。** bbox で 決めると けん・たて・ゆみまで 入って しまい、
   マントが 画面いっぱいの 四角に なって「うしろに 色を しいた だけ」に 見える（1回目の 失敗）。 */
function torsoOf(art) {
  const bb = bbox(art);
  const y1 = bb.y0 + bb.h * 0.28, y2 = bb.y0 + bb.h * 0.78;
  let best = null;
  art.forEach(function (r) {
    const cy = r[1] + r[3] / 2;
    if (cy < y1 || cy > y2) return;
    if (!best || r[2] > best[2]) best = r;
  });
  best = best || art[0];
  return {
    x0: best[0], x1: best[0] + best[2], w: best[2], cx: Math.round(best[0] + best[2] / 2),
    y0: best[1], y1: best[1] + best[3], h: best[3]
  };
}

/* 絵を 少し 小さく して 上に すきまを 作る（下は そのまま・まん中を そろえる）。
   48マス いっぱいの げきレアに かんむりを のせる ときに つかう。 */
function fitTop(art, top) {
  const bb = bbox(art);
  if (bb.y0 >= top) return art;
  const k = (bb.y1 - top) / (bb.y1 - bb.y0);
  return art.map(function (r) {
    return [
      Math.round(bb.cx + (r[0] - bb.cx) * k),
      Math.round(bb.y1 - (bb.y1 - r[1]) * k),
      Math.max(1, Math.round(r[2] * k)),
      Math.max(1, Math.round(r[3] * k)),
      r[4], r[5]
    ];
  });
}

/* 絵を **まん中で** 小さく して 48マスの まん中に おき直す。
   しんじゅう 3体は x も y も 0〜48 を つかいきって いる ので、
   **先に 小さく しないと 外がわに 何も 足せない**（かんむりを のせるのが やっと だった＝
   「げきレアなのに 姿が ほとんど 変わらない」の 原因）。
   小さく した ぶんは オーラの わで うめる ので、**ぜんたいの 大きさは かえって 大きく なる**。 */
function scaleTo(art, k) {
  const bb = bbox(art);
  const cx = bb.cx, cy = (bb.y0 + bb.y1) / 2;
  return art.map(function (r) {
    return [
      Math.round(24 + (r[0] - cx) * k),
      Math.round(24 + (r[1] - cy) * k),
      Math.max(1, Math.round(r[2] * k)),
      Math.max(1, Math.round(r[3] * k)),
      r[4], r[5]
    ];
  });
}

/* オーラの わ（**げきレアの しんじゅう 3体だけ**）。
   まん中（24,24）から はんけい r の ところに ブロックを ならべる。
   これが「いちばん すごい 子」の しるしに なる ので、
   ふつう・レアには つけない（つけると また ぜんぶ 同じ 顔に なる）。
   **45度 まわさない**（`d`）：ひしがたに すると 宝石が ちらばった ように 見え、
   ユーザーが 前に「キラキラの表現が幼稚」と 言った 方向に なる。
   この ゲームは 四角の つみかさねで できて いる ので、わも 四角の まま。
   大きさを 大小 まぜる ことで ほのお／トゲ／いなずま を 書き分ける。
   o = { r, n, keys[], sizes[], from, to（度）, full（一周する）, flags } */
function arcBlocks(o) {
  const n = o.n, from = (o.from == null ? 0 : o.from), to = (o.to == null ? 360 : o.to);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (n === 1) ? 0 : (i / (o.full ? n : (n - 1)));
    const a = (from + (to - from) * t) * Math.PI / 180;
    const sz = o.sizes ? o.sizes[i % o.sizes.length] : 5;
    const x = Math.round(24 + Math.cos(a) * o.r - sz / 2);
    const y = Math.round(24 + Math.sin(a) * o.r - sz / 2);
    if (x < 0 || y < 0 || x + sz > 48 || y + sz > 48) continue;
    out.push([x, y, sz, sz, o.keys[i % o.keys.length], o.flags || 'gn']);
  }
  return out;
}

/* 体を 大きく する（下を そろえて 上へ のばす）。ミニな きしを たくましく する ため */
function grow(art, px) {
  if (!px) return art;
  const bb = bbox(art);
  const k = (bb.h + px) / bb.h;
  return art.map(function (r) {
    return [
      Math.round(bb.cx + (r[0] - bb.cx) * k),
      Math.round(bb.y1 - (bb.y1 - r[1]) * k),
      Math.max(1, Math.round(r[2] * k)),
      Math.max(1, Math.round(r[3] * k)),
      r[4], r[5]
    ];
  });
}

/* 下に さげる（かんむりの ぶんの すきまが 足りない ときだけ） */
function moveDown(art, dy) {
  if (dy <= 0) return art;
  return art.map(function (r) { return [r[0], r[1] + dy, r[2], r[3], r[4], r[5]]; });
}

/* カプセルの 宝石（j1/j2）を 取り出す。進化で かくれない よう 前に 置き直す ため */
function gemOf(art) {
  return art.filter(function (r) { return r[4] === 'j1' || r[4] === 'j2'; })
    .map(function (r) { return r.slice(); });
}

/* ================= かんむり（頭の 上）=================
   ctx = { hcx（頭の まんなか）, top（頭の 上の y）, hw（頭の はば）}          */
const CROWNS = {
  /* 3つとがり＋band＋赤い 宝石（王道） */
  spike3: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2), sp = Math.max(3, Math.round(w / 6));
    return [
      [x, c.top - 4, sp, 5, 'y'], [c.hcx - Math.round(sp / 2), c.top - 6, sp, 7, 'y'], [x + w - sp, c.top - 4, sp, 5, 'y'],
      [x, c.top - 2, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 2, 4, 4, 'r', 'g']
    ];
  },
  /* 5つとがり（いちばん えらい） */
  spike5: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2), sp = 2;
    const gap = Math.max(1, Math.round((w - sp * 5) / 4));
    const out = [];
    for (let i = 0; i < 5; i++) {
      const hh = (i === 2) ? 7 : (i % 2 ? 4 : 5);
      out.push([x + i * (sp + gap), c.top - hh, sp, hh + 1, 'y']);
    }
    out.push([x, c.top - 2, w, 4, 'y', 'h']);
    out.push([c.hcx - 2, c.top - 2, 4, 4, 'r', 'g']);
    return out;
  },
  /* 2本の つの（けもの・りゅう） */
  horns: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2);
    return [
      [x - 2, c.top - 5, 3, 6, 'y'], [x - 3, c.top - 8, 2, 4, 'y'],
      [x + w - 1, c.top - 5, 3, 6, 'y'], [x + w, c.top - 8, 2, 4, 'y'],
      [x, c.top - 2, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 2, 4, 4, 'r', 'g']
    ];
  },
  /* かざり羽（きしの かぶとの 上）。マントと 色を そろえる */
  plume: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2);
    return [
      [c.hcx - 2, c.top - 8, 5, 7, 'r', 'h'], [c.hcx - 5, c.top - 5, 3, 4, 'r'],
      [c.hcx + 3, c.top - 5, 3, 4, 'r'],
      [x, c.top - 2, w, 4, 'y', 'h']
    ];
  },
  /* ほのおの かんむり */
  flame: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 1, c.top - 5, 4, 6, 'r', 'g'], [c.hcx - 2, c.top - 8, 5, 9, 'r', 'g'], [x + w - 5, c.top - 5, 4, 6, 'r', 'g'],
      [c.hcx - 2, c.top - 6, 4, 4, 'y', 'gn'],
      [x, c.top - 2, w, 4, 'y', 'h']
    ];
  },
  /* つららの かんむり */
  ice: function (c) {
    const w = Math.max(14, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [
      [x + 1, c.top - 8, 4, 8, 'e', 'g'], [c.hcx - 2, c.top - 12, 4, 12, 'e', 'g'], [x + w - 5, c.top - 8, 4, 8, 'e', 'g'],
      [x, c.top - 3, w, 4, 'w', 'h']
    ];
  },
  /* 星の かんむり（ほしの モンスターむけ） */
  star: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2);
    return [
      [c.hcx - 4, c.top - 9, 7, 7, 'y', 'dg'],
      [x, c.top - 2, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 2, 4, 4, 'e', 'g']
    ];
  },
  /* ほそい band ＋ 大きな 宝石（かるい 進化） */
  tiara: function (c) {
    const w = Math.max(12, Math.min(c.hw - 2, 22)), x = c.hcx - Math.round(w / 2);
    return [[x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 3, c.top - 7, 6, 5, 'r', 'g']];
  },
  /* かぶとの ふち（2段階め用・ひかえめ） */
  band: function (c) {
    const w = Math.max(12, Math.min(c.hw, 24)), x = c.hcx - Math.round(w / 2);
    return [[x, c.top - 3, w, 4, 'y', 'h'], [c.hcx - 2, c.top - 6, 4, 4, 'r', 'g']];
  },
  none: function () { return []; }
};

/* ================= 背中（体の うしろ）=================
   bb ＝ 本体の 大きさ、ctx ＝ 頭の ところ                                     */
const BACKS = {
  /* ながい マント（**3段階めだけ**）。はばは **どうたい ＋ 8〜14**。
     bbox（けん・たて・ゆみを ふくむ）で 作ると 画面いっぱいの 板に なって
     「うしろに 色を しいた だけ」に 見える（1回目の 失敗）。
     2段階めの みじかい マントは やめた：**2段階めは 金の かざり 1〜2つだけ**に する
     （いまの ゲームの 2段階め＝ゴールドスカル・メカロボ は 色が 変わる だけ）。 */
  capeLong: function (bb, ctx, torso) {
    const t = torso || bb;
    const top = Math.min(42, bb.y0 + Math.round(bb.h * 0.26));
    const bottom = Math.min(48, bb.y1 + 1);
    if (bottom - top < 12) return [];
    const h1 = Math.round((bottom - top) * 0.42), h2 = bottom - top - h1;
    const w1 = Math.min(40, t.w + 12), w2 = Math.min(46, t.w + 18);
    const x1 = Math.max(0, Math.min(48 - w1, t.cx - Math.round(w1 / 2)));
    const x2 = Math.max(0, Math.min(48 - w2, t.cx - Math.round(w2 / 2)));
    return [[x1, top, w1, h1, 'm'], [x2, top + h1, w2, h2, 'm'], [x2, bottom - 3, w2, 3, 'y', 'n']];
  },
  /* 光の わ（頭の うしろ）。**わの ふち 3本**（上・左・右）だけ で 作る。
     ・**o（まわりだけ）は つかわない**：中が 黒く 抜けて 四角い わくに 見える。
     ・**ぬりつぶした 板にも しない**：フェニクス・コマオウの ように 頭が 大きくて
       絵の まん中に ある 子だと、光る 金の 板が 顔を のみこんで
       **ただの 金の かたまり**に なった（2回目の 失敗）。
     下は あけて ある（そこは 体が うめる）。 */
  disc: function (bb, ctx) {
    const hw = Math.max(14, Math.min(ctx.hw, 26));
    const w = Math.min(30, hw + 8);
    const x = Math.max(0, Math.min(48 - w, ctx.hcx - Math.round(w / 2)));
    const y = Math.max(0, ctx.top - 9);
    return [
      [x, y, w, 3, 'y', 'gn'],
      [x, y + 3, 3, 8, 'y', 'gn'],
      [x + w - 3, y + 3, 3, 8, 'y', 'gn']
    ];
  },
  none: function () { return []; }
};

/* つばさに ついて（2026-09-07・実測して やめた）
   階段の つばさ（wingsFeather / wingsStar）も 作って みたが、
   **この 18体は どれも 横に 広い**（けん・たて・ゆみ・もとから ある つばさが
   bbox を 0〜48 まで ひろげて いる）ので、左右に 足した つばさが 本体に かさなり
   9わり かくれた。→ つばさは やめ、かんむり・マント・光の 円ばん・まわる 星で 強く する。
   せまい 体の 子を あとで 足す ときは、bbox の はばが 34 いか かを 見てから 入れる。 */

/* ================= 手に もつ もの（右がわ）================= */
const HANDS = {
  sword: function (bb) {
    const x = Math.min(41, bb.x1), y = Math.max(2, bb.y0 + 2);
    return [[x - 2, y + 20, 7, 5, 'A'], [x + 1, y, 4, 21, 'C'], [x - 1, y + 20, 8, 3, 'y', 'h'], [x + 2, y + 23, 2, 5, 'y']];
  },
  bigSword: function (bb) {
    const x = Math.min(39, bb.x1), y = Math.max(0, bb.y0);
    return [[x - 2, y + 24, 8, 6, 'A'], [x, y, 7, 25, 'C', 'h'], [x - 2, y + 24, 11, 4, 'y', 'h'], [x + 2, y + 28, 3, 6, 'y']];
  },
  lance: function (bb) {
    const x = Math.min(42, bb.x1), y = Math.max(0, bb.y0);
    return [[x - 3, y + 22, 7, 5, 'A'], [x + 1, y + 5, 4, 30, 'C'], [x, y, 6, 6, 'y', 'h'], [x + 2, y - 3, 2, 4, 'y']];
  },
  axe: function (bb) {
    const x = Math.min(40, bb.x1), y = Math.max(4, bb.y0 + 4);
    return [[x - 2, y + 12, 7, 5, 'A'], [x + 2, y, 3, 26, 'C'], [x, y, 8, 9, 'C', 'h'], [x + 5, y + 2, 3, 5, 'y', 'n']];
  },
  hammer: function (bb) {
    const x = Math.min(38, bb.x1), y = Math.max(3, bb.y0 + 3);
    return [[x - 2, y + 13, 7, 5, 'A'], [x + 3, y + 2, 3, 24, 'C'], [x, y, 10, 10, 'C', 'h'], [x + 2, y + 2, 6, 3, 'y', 'n']];
  },
  staff: function (bb) {
    const x = Math.min(41, bb.x1), y = Math.max(4, bb.y0 + 3);
    return [[x - 2, y + 16, 7, 5, 'A'], [x + 2, y + 6, 3, 26, 'C'], [x, y, 7, 7, 'e', 'g']];
  },
  bow: function (bb) {
    const x = Math.max(0, bb.x0 - 8), y = Math.max(2, bb.y0 + 4);
    return [[x, y + 4, 5, 24, 'C', 'h'], [x + 4, y, 5, 6, 'C'], [x + 4, y + 26, 5, 6, 'C'], [x + 3, y + 6, 3, 20, 'j2', 'n'],
      [x + 6, y + 12, 7, 5, 'A']];
  },
  dagger: function (bb) {
    const x = Math.min(42, bb.x1), y = Math.max(8, bb.y0 + 8);
    return [[x - 3, y + 8, 7, 5, 'A'], [x + 1, y, 4, 11, 'C'], [x, y + 10, 6, 3, 'y', 'h']];
  },
  orb: function (bb) {
    const x = Math.min(40, bb.x1 + 1), y = Math.max(8, bb.y0 + Math.round(bb.h * 0.4));
    return [[x - 3, y + 1, 6, 5, 'A'], [x + 1, y - 2, 8, 8, 'e', 'g']];
  },
  none: function () { return []; }
};

/* ================= おまけ =================
   **ぜんぶ どうたい（torso）を もとに 置く。** bbox を もとに すると
   けん・たて・ゆみまで はばに 入って しまい、
   ・金の ベルトが はば 38px の「ものさし」に なって 体を つきぬけ、
   ・かたあてが かたでは なく **たてと けんの 上**に 浮いた
   （2回目の 失敗。1.6ばいに 拡大して 見て やっと 分かった）。          */
const EXTRAS = {
  /* かたあて（どうたいの 左右の 上）*/
  shoulder: function (bb, t) {
    const y = t.y0;
    return [[Math.max(0, t.x0 - 4), y, 7, 6, 'y', 'h'], [Math.min(41, t.x1 - 3), y, 7, 6, 'y', 'h']];
  },
  /* 金の ベルト（どうたいの 下の ほう）*/
  belt: function (bb, t) {
    const y = Math.min(44, t.y1 - 5);
    const w = Math.max(10, t.w), x = Math.max(0, Math.min(48 - w, t.cx - Math.round(w / 2)));
    return [[x, y, w, 4, 'y', 'h'], [t.cx - 2, y, 4, 4, 'r', 'gn']];
  },
  /* せなかの トゲ（どうたいの かたの 上・先ぼそり）*/
  spikes: function (bb, t) {
    const y = Math.max(3, t.y0 - 2);
    return [
      [t.x0 + 1, y, 4, 5, 'y'], [t.x0 + 2, y - 3, 2, 4, 'y'],
      [t.x1 - 5, y, 4, 5, 'y'], [t.x1 - 4, y - 3, 2, 4, 'y']
    ];
  },
  /* 金の えりまき（どうたいの 上の ほうを よこに 走る）。
     **むねの 宝石は 作らない**：カプセルの 宝石が まん中に ある ので 宝石が 2つ ならんで
     どちらが しるしか 分からなく なる。 */
  collar: function (bb, t) {
    const y = t.y0 + Math.max(1, Math.round(t.h * 0.22));
    const w = Math.max(8, t.w - 4), x = Math.max(0, Math.min(48 - w, t.cx - Math.round(w / 2)));
    return [[x, y, w, 4, 'y', 'h']];
  },
  /* こての 金わく（どうたいの すぐ 外・うでの ところ） */
  bracer: function (bb, t) {
    const y = t.y0 + Math.round(t.h * 0.55);
    return [[Math.max(0, t.x0 - 5), y, 5, 5, 'y', 'h'], [Math.min(43, t.x1), y, 5, 5, 'y', 'h']];
  },
  /* きば（fangs）は やめた：体の まん中に 白い 四角が のる だけで、
     ヘビでも きしでも 口には ならなかった。口の 形は 1段階めの 絵の 仕事。 */

  /* まわる 小さな 星（**ほしの モンスターの 3段階めだけ・3つまで・4px**）。
     1回目は 四すみの 光る つぶ（sparks）と 6つの 星を ばらまいた ところ、
     36体 ぜんぶが 光の つぶだらけで 同じ 顔に 見え、ずかんの 52px では
     もとの 絵が つぶれた。**いまの 王さま形 44体に 浮いた 光は 1つも ない。**
     → sparks は 作らない。 */
  orbit: function (bb, t, key) {
    const k = key || 'e';
    const out = [];
    const cy = bb.y0 + Math.round(bb.h / 2);
    const pts = [
      [bb.x0 - 5, cy - 15], [bb.x1 + 1, cy - 11], [bb.x1 - 2, cy + 14]
    ];
    pts.forEach(function (p) {
      /* はみ出す ぶんは 画面の 中に よせる。**とばさない**：
         48マス いっぱいの 子（リングボール・ソラクジラ）だと 3つとも 消えて しまう */
      const x = Math.max(0, Math.min(44, p[0])), y = Math.max(0, Math.min(44, p[1]));
      out.push([x, y, 4, 4, k, 'gnd']);
    });
    return out;
  },
  none: function () { return []; }
};

/* かんむり・光の わが 頭の 上に ほしい すきま（px）。
   これを つかって compose が **fitTop を 自動で いちばん 小さく**する。
   手で 8 とか 11 とか 書いて いた ころは 入れすぎて いて、
   3段階めが 2段階めより **小さく** なって いた（進化なのに ちぢむ）。 */
const CROWN_NEED = {
  spike3: 7, spike5: 8, horns: 9, plume: 9, flame: 9,
  star: 10, tiara: 8, band: 7, ice: 13, disc: 10, none: 0
};

/* ================= 組み立て =================
   d = {
     grow      … 体を 大きく する px（きし用）
     scale     … まん中で 小さく する（0〜1）。**げきレアの オーラの わを 出す ため**。
                 48マスを つかいきった 絵は これを しないと 外がわに 何も 足せない
     ring      … オーラの わ（arcBlocks の 引数）。うしろに 置かれる
     fitTop    … 上に すきまを 作る。**ふつうは 書かない**：
                 かんむりと 光の わの ぶんを compose が 自動で 計算して
                 いちばん 小さい ちぢめ方を えらぶ（CROWN_NEED）
     headIndex … かんむりを のせる ブロックの ばんごう（**もとの 絵の ならびの ばんごう**）。
                 fitTop / grow の あとの 場所を 自動で 追いかける ので、
                 座標を 手で 打つ より 安全。書かないと いちばん 広い 上の ブロックを さがす
     back      … 手で 置く うしろの 四角
     front     … 手で 置く 前の 四角
     spec      … { crown, crowns[], back, backs[], hand, extras[], sparkKey }
   }
   ならび：うしろ → もとの 絵 → 前 → おまけ → かんむり → 手に もつ もの → 宝石   */
function compose(base, d) {
  d = d || {};
  const spec = d.spec || {};

  let src = base.map(function (r) { return r.slice(); });
  if (d.grow) src = grow(src, d.grow);
  if (d.fitTop) src = fitTop(src, d.fitTop);
  if (d.scale) src = scaleTo(src, d.scale);  // まん中で 小さく して オーラの ばしょを 作る
  if (d.down) src = moveDown(src, d.down);   // 下に さげて 頭の 上に すきまを 作る

  /* かんむりの ぶんの すきまが 足りなければ 体を 下げる */
  const crowns = (spec.crowns || (spec.crown ? [spec.crown] : []));
  const hasHead = typeof d.headIndex === 'number';
  if (crowns.length && !hasHead) {
    const need = (crowns.indexOf('star') !== -1 || crowns.indexOf('ice') !== -1) ? 13 : 10;
    const bb0 = bbox(src);
    src = moveDown(src, Math.min(Math.max(0, need - bb0.y0), Math.max(0, 48 - bb0.y1)));
  }

  /* かんむり・光の わの ぶんの すきまを **自動で** 作る（fitTop を 書いて いない ときだけ）。
     いる ぶんだけ ちぢめる ので、3段階めが 2段階めより 小さく ならない。 */
  if (!d.fitTop && hasHead) {
    let need = 0;
    crowns.forEach(function (k) { need = Math.max(need, CROWN_NEED[k] || 8); });
    const backs = spec.backs || (spec.back ? [spec.back] : []);
    if (backs.indexOf('disc') !== -1) need = Math.max(need, CROWN_NEED.disc);
    if (need) {
      const bb0 = bbox(src), h0 = src[d.headIndex][1];
      const R = (bb0.y1 - h0) / (bb0.y1 - bb0.y0);
      if (R > 0.05) {
        const f = Math.ceil(bb0.y1 - (bb0.y1 - need) / R);
        if (f > bb0.y0) src = fitTop(src, Math.min(f, 16));
      }
    }
  }

  const bb = bbox(src);
  const torso = torsoOf(src);
  let ctx;
  if (hasHead) {
    const hr = src[d.headIndex];
    if (!hr) throw new Error('headIndex が ない: ' + d.headIndex);
    ctx = { hcx: Math.round(hr[0] + hr[2] / 2), top: hr[1], hw: hr[2] };
  } else {
    ctx = headCtx(src);
  }

  /* うしろ */
  let back = (d.back || []).slice();
  if (d.ring) back = back.concat(arcBlocks(d.ring));
  (spec.backs || (spec.back ? [spec.back] : [])).forEach(function (k) {
    back = back.concat((BACKS[k] || BACKS.none)(bb, ctx, torso));
  });

  /* 前 */
  let after = (d.front || []).slice();
  (spec.extras || []).forEach(function (k) {
    after = after.concat((EXTRAS[k] || EXTRAS.none)(bb, torso, spec.sparkKey));
  });
  crowns.forEach(function (k) { after = after.concat((CROWNS[k] || CROWNS.none)(ctx)); });
  if (spec.hand) after = after.concat((HANDS[spec.hand] || HANDS.none)(bb));

  /* カプセルの 宝石は いちばん 前に 置き直す（進化で かくれない ように） */
  const gem = gemOf(src);

  const art = back.concat(src, after, gem)
    .filter(function (r) { return r && r[2] > 0 && r[3] > 0; })
    .map(function (r) {
      const x = Math.max(0, Math.min(47, r[0])), y = Math.max(0, Math.min(47, r[1]));
      return [x, y, Math.min(48 - x, r[2]), Math.min(48 - y, r[3]), r[4], r[5]];
    });
  return { art: art, backCount: back.length };
}

module.exports = {
  CROWN_NEED: CROWN_NEED,
  scaleTo: scaleTo, arcBlocks: arcBlocks,
  bbox: bbox, torsoOf: torsoOf, headCtx: headCtx, fitTop: fitTop, grow: grow, gemOf: gemOf, compose: compose,
  CROWNS: CROWNS, BACKS: BACKS, HANDS: HANDS, EXTRAS: EXTRAS
};
