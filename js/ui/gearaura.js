/* ---------------------------------------------------------
   そうびの オーラ（v13.19）：同じ グレードを 5点 そろえて つけると、主人公の まわりに グレードごとの 光
   ユーザー「装備品を もっと 見た目を カッコ良く」→ 見くらべの C 案 →「全部いいので オススメで」（2026-09-14）。
   前は オーロラ（げきレア）だけ 光って いた。いまは どの グレードでも「そろえた ごほうび」の 光が 出る。

   3D の 図には filter も box-shadow も つけない きまり → **うしろと 手前の 2D の 要素**で 光らせる。
   見た目は css/gearaura.css（.gaura--<グレード>）。1em ＝ バトルの 主人公（84px）で 10px。
   動かすのは transform と opacity だけ。
   --------------------------------------------------------- */
(function () {
  const h = MQ.util.h;
  // つぶの 数と 動く 長さ（グレードごと）。[左 %, 待ち 秒]
  const BACK = [[8, .3], [30, 1.1], [62, .6], [90, 1.7], [20, 2.1], [48, 1.5], [78, .9], [38, 2.4]];
  const FRONT = [[14, 0], [82, .7], [22, 1.4], [74, 2.0]];
  const DUR = { kihon: 3.0, tetsu: 2.4, ryu: 1.5, densetsu: 2.2, hoshi: 2.8, yami: 3.2, capsule: 2.6, aurora: 2.4 };
  const PILLARS = { densetsu: [26, 70], aurora: [18, 40, 62, 80] };

  function grade(player) {
    return MQ.hero && MQ.hero.fullSetGrade ? MQ.hero.fullSetGrade(player) : null;
  }

  function layer(gid, front, k) {
    const a = h('div', { class: 'gaura gaura--' + gid + ' gaura--' + (front ? 'front' : 'back'), style: '--k:' + (k || 1), 'aria-hidden': 'true' });
    if (!front) {
      a.appendChild(h('i', { class: 'gaura__glow' }));
      a.appendChild(h('i', { class: 'gaura__floor' }));
      (PILLARS[gid] || []).forEach(function (x, i) {
        a.appendChild(h('i', { class: 'gaura__pillar', style: 'left:' + x + '%;animation-delay:' + (-i * 0.6) + 's' }));
      });
    }
    const d = DUR[gid] || 2.4;
    (front ? FRONT : BACK).forEach(function (p, i) {
      a.appendChild(h('i', { class: 'gaura__p', style: 'left:' + p[0] + '%;--d:' + (d + (i % 3) * 0.3) + 's;--w:' + (-p[1]) + 's' }));
    });
    return a;
  }

  /* box の 中に オーラを つける（前の オーラは 外す）。box は 主人公の 絵の 入れもの（.hero など）。
     うしろの 光は box の いちばん 前（z-index −1）、手前の つぶは いちばん うしろ（z-index 1）に 入れる。
     かえりちは つけた グレード（そろって いなければ null） */
  function attach(box, player, k) {
    if (!box) return null;
    Array.prototype.slice.call(box.querySelectorAll(':scope > .gaura')).forEach(function (e) { e.remove(); });
    const gid = grade(player);
    box.classList.toggle('has-gaura', !!gid);
    if (!gid) return null;
    box.insertBefore(layer(gid, false, k), box.firstChild);
    box.appendChild(layer(gid, true, k));
    return gid;
  }

  MQ.ui = MQ.ui || {};
  MQ.ui.gearAura = { attach: attach, grade: grade, layer: layer };
})();
