/* ---------------------------------------------------------
   ぴかぴか あつめ（v13.16）

   **DOM を 知らない。** 画面は js/ui/map.js（ステージの たからもの・ゾーンの かんむり）、
   js/ui/dex.js（メニュー「もちもの」の カード）、js/ui/result.js（けっか画面の 1行）。

   なぜ 作ったか（v13.15 の 壁打ちの ③）：
     たからものは ★3（ぜんもん せいかい）で 金色（ぴかぴか）に なる。
     でも それが 見えるのは メニューの たなの 中だけで、
     「どの ステージが まだ ぴかぴかに なって いないか」が 地図から わからなかった。
     → ぴかぴかを **地図・メニュー・けっか画面で 見せて**、
       もう一度 パーフェクトを めざす（＝ふくしゅう）きっかけに する。

   ごほうび
     ・ぴかぴかを 5こ あつめる たびに カプセルの むりょうけん 1まい
       （おうちの人が カプセルを かくして いる 子は かわりに コイン 10まい。levelup.js と 同じ）
     ・エリアの 開いて いる ステージが ぜんぶ ぴかぴか → 地図の ゾーンに 金の かんむり（見せる だけ）
   数えるのは ぜんぶの 学年の ぴかぴか（たからものの id は 学年を またいで かぶらない）。

   2回 もらわない ために、はらった 数（5こを 1つと 数える）を p.pikaPaid に おぼえる。
   もう あそんで いる 子は いまの 数まで はらった ことに する（これまでの ぶんは なし）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.pika = (function () {
  const EVERY = 5;           // 何こごとに むりょうけん
  const TICKET_COINS = 10;   // カプセルを かくして いる 子への かわり（カプセル 1回ぶん）

  function goldCount(p) {
    const t = (p && p.treasure) || {};
    return Object.keys(t).filter(function (k) { return t[k] >= 2; }).length;
  }
  function capsuleOn(p) { return !(p && p.capsuleOff === true); }

  /* エリアの ようす（いま あそんで いる 学年・開いて いる ステージだけ）
     { area, rows: [{ stage, tr, lv }], total, got, gold, complete } … lv 0=まだ 1=ふつう 2=ぴかぴか */
  function areaInfo(p, area) {
    const rows = [];
    ((area && area.stages) || []).forEach(function (st) {
      if (MQ.content && MQ.content.isAvailable && !MQ.content.isAvailable(st)) return;
      const tr = MQ.treasure ? MQ.treasure.forStage(st.id) : null;
      if (!tr) return;
      const lv = (p && p.treasure && p.treasure[tr.id]) || 0;
      rows.push({ stage: st, tr: tr, lv: lv });
    });
    const gold = rows.filter(function (r) { return r.lv >= 2; }).length;
    const got = rows.filter(function (r) { return r.lv >= 1; }).length;
    return { area: area, rows: rows, total: rows.length, got: got, gold: gold, complete: rows.length > 0 && gold === rows.length };
  }

  // いまの 学年の 教科ぜんぶ（塔は のぞく）
  function overview(p) {
    const areas = (MQ.content && MQ.content.subjectAreas) ? MQ.content.subjectAreas() : [];
    return areas.map(function (a) { return areaInfo(p, a); }).filter(function (x) { return x.total > 0; });
  }

  // つぎの むりょうけんまで { have, at, left, ratio }
  function next(p) {
    const have = goldCount(p);
    const at = (Math.floor(have / EVERY) + 1) * EVERY;
    return { have: have, at: at, left: at - have, ratio: (have % EVERY) / EVERY };
  }

  function init(p) {
    if (!p) return;
    if (typeof p.pikaPaid === 'number' && p.pikaPaid >= 0) return;
    p.pikaPaid = Math.floor(goldCount(p) / EVERY);
  }

  /* たからものを わたした あとに よぶ。まだ はらって いない ぶんを わたす。
     かえり値 { count, tickets, coins }（なにも なければ tickets も coins も 0） */
  function claim(p) {
    const out = { count: 0, tickets: 0, coins: 0 };
    if (!p) return out;
    init(p);
    const have = goldCount(p);
    out.count = have;
    const m = Math.floor(have / EVERY);
    const n = m - p.pikaPaid;
    if (n <= 0) return out;
    p.pikaPaid = m;
    if (capsuleOn(p)) {
      if (MQ.levelup && MQ.levelup.addTickets) MQ.levelup.addTickets(p, n);
      else {
        if (!p.capsule || typeof p.capsule !== 'object') p.capsule = {};
        p.capsule.tickets = (p.capsule.tickets || 0) + n;
      }
      out.tickets = n;
    } else {
      p.coins = (p.coins || 0) + n * TICKET_COINS;
      out.coins = n * TICKET_COINS;
    }
    return out;
  }

  /* けっか画面の ひとこと用：この ステージの たからもの（ふつうの まま なら「パーフェクトで ぴかぴか」） */
  function stageTreasure(p, stageId) {
    const tr = MQ.treasure ? MQ.treasure.forStage(stageId) : null;
    if (!tr) return null;
    return { tr: tr, lv: (p && p.treasure && p.treasure[tr.id]) || 0 };
  }

  return {
    EVERY: EVERY, TICKET_COINS: TICKET_COINS,
    goldCount: goldCount, areaInfo: areaInfo, overview: overview, next: next,
    init: init, claim: claim, stageTreasure: stageTreasure
  };
})();
